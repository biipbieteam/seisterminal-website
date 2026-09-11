import { expect } from "chai";
import hre from "hardhat";

describe(
  "ARC V3 — Mock AMM Adversarial",
  function () {
    const WAD =
      10n ** 18n;

    const DEAD =
      "0x000000000000000000000000000000000000dEaD";

    const TOTAL_SUPPLY =
      1_000_000_000n * WAD;

    const LIQUIDITY_TOKENS =
      289_897_948_556635619639450000n;

    const LIQUIDITY_QUOTE =
      17_393_876913398137178368n;


    let ethers;

    let owner;
    let user1;
    let user2;

    let ammFactory;
    let token;


    beforeEach(
      async function () {
        ({ ethers } =
          await hre.network
            .getOrCreate());

        [
          owner,
          user1,
          user2,
        ] =
          await ethers
            .getSigners();


        /*
         * Candidate A needs ~17.4K native
         * quote for a 1B-token migration.
         */
        await ethers.provider.send(
          "hardhat_setBalance",
          [
            owner.address,
            ethers.toBeHex(
              30_000n * WAD
            ),
          ]
        );


        ammFactory =
          await ethers
            .deployContract(
              "MockAMMFactory"
            );

        await ammFactory
          .waitForDeployment();


        token =
          await ethers
            .deployContract(
              "MemeToken",
              [
                "ARC Adversarial",
                "ARCA",
                TOTAL_SUPPLY,
                owner.address,
              ]
            );

        await token
          .waitForDeployment();
      }
    );


    async function initializePool({
      tokenContract = token,
      tokenAmount =
        LIQUIDITY_TOKENS,
      quoteAmount =
        LIQUIDITY_QUOTE,
      lpRecipient =
        DEAD,
    } = {}) {
      const factoryAddress =
        await ammFactory
          .getAddress();

      const tokenAddress =
        await tokenContract
          .getAddress();


      await tokenContract.approve(
        factoryAddress,
        tokenAmount
      );


      await ammFactory
        .createPoolAndAddLiquidity(
          tokenAddress,
          tokenAmount,
          lpRecipient,
          {
            value:
              quoteAmount,
          }
        );


      const poolAddress =
        await ammFactory
          .poolForToken(
            tokenAddress
          );


      const pool =
        await ethers
          .getContractAt(
            "MockAMMPool",
            poolAddress
          );


      return {
        pool,
        poolAddress,
        tokenAddress,
      };
    }


    it(
      "blocks unauthorized direct pool initialization",
      async function () {
        /*
         * createPool() creates an empty pool.
         *
         * Its immutable factory is
         * MockAMMFactory — not owner/user1.
         */
        await ammFactory
          .createPool(
            await token
              .getAddress()
          );


        const poolAddress =
          await ammFactory
            .poolForToken(
              await token
                .getAddress()
            );


        const pool =
          await ethers
            .getContractAt(
              "MockAMMPool",
              poolAddress
            );


        await token.transfer(
          user1.address,
          10n * WAD
        );


        await token
          .connect(user1)
          .approve(
            poolAddress,
            10n * WAD
          );


        await expect(
          pool
            .connect(user1)
            .addInitialLiquidity(
              user1.address,
              user1.address,
              10n * WAD,
              {
                value:
                  10n * WAD,
              }
            )
        ).to.revert(ethers);


        expect(
          await pool.initialized()
        ).to.equal(false);


        expect(
          await pool.totalSupply()
        ).to.equal(0n);
      }
    );


    it(
      "rolls back pool creation when token transferFrom fails",
      async function () {
        const tokenAddress =
          await token
            .getAddress();


        /*
         * No approval is given.
         *
         * Factory first attempts createPool(),
         * then transferFrom() must fail.
         *
         * Entire transaction must rollback,
         * including pool deployment/mapping.
         */
        await expect(
          ammFactory
            .createPoolAndAddLiquidity(
              tokenAddress,
              LIQUIDITY_TOKENS,
              DEAD,
              {
                value:
                  LIQUIDITY_QUOTE,
              }
            )
        ).to.revert(ethers);


        expect(
          await ammFactory
            .poolForToken(
              tokenAddress
            )
        ).to.equal(
          ethers.ZeroAddress
        );


        expect(
          await ammFactory
            .allPoolsLength()
        ).to.equal(0n);


        expect(
          await ethers.provider
            .getBalance(
              await ammFactory
                .getAddress()
            )
        ).to.equal(0n);
      }
    );


    it(
      "does not mint LP when initialization transaction reverts",
      async function () {
        const tokenAddress =
          await token
            .getAddress();


        await expect(
          ammFactory
            .createPoolAndAddLiquidity(
              tokenAddress,
              LIQUIDITY_TOKENS,
              owner.address,
              {
                value:
                  LIQUIDITY_QUOTE,
              }
            )
        ).to.revert(ethers);


        expect(
          await ammFactory
            .poolForToken(
              tokenAddress
            )
        ).to.equal(
          ethers.ZeroAddress
        );
      }
    );


    it(
      "rejects duplicate pool creation after successful initialization",
      async function () {
        await initializePool();


        await expect(
          ammFactory.createPool(
            await token
              .getAddress()
          )
        ).to.revert(ethers);


        expect(
          await ammFactory
            .allPoolsLength()
        ).to.equal(1n);
      }
    );


    it(
      "prevents a second initial-liquidity operation",
      async function () {
        const {
          pool,
        } =
          await initializePool({
            lpRecipient:
              owner.address,
          });


        const reserveTokenBefore =
          await pool.tokenReserve();

        const reserveQuoteBefore =
          await pool.quoteReserve();

        const lpBefore =
          await pool.totalSupply();


        await expect(
          pool.addInitialLiquidity(
            owner.address,
            owner.address,
            1n * WAD,
            {
              value:
                1n * WAD,
            }
          )
        ).to.revert(ethers);


        expect(
          await pool.tokenReserve()
        ).to.equal(
          reserveTokenBefore
        );


        expect(
          await pool.quoteReserve()
        ).to.equal(
          reserveQuoteBefore
        );


        expect(
          await pool.totalSupply()
        ).to.equal(
          lpBefore
        );
      }
    );


    it(
      "keeps burned LP outside creator and Factory custody",
      async function () {
        const {
          pool,
        } =
          await initializePool({
            lpRecipient:
              DEAD,
          });


        const burnedLP =
          await pool.balanceOf(
            DEAD
          );


        expect(
          burnedLP
        ).to.be.gt(0n);


        expect(
          await pool.balanceOf(
            owner.address
          )
        ).to.equal(0n);


        expect(
          await pool.balanceOf(
            await ammFactory
              .getAddress()
          )
        ).to.equal(0n);


        expect(
          await pool.totalSupply()
        ).to.equal(
          burnedLP
        );
      }
    );


    it(
      "cannot create LP shares without real reserves",
      async function () {
        await ammFactory
          .createPool(
            await token
              .getAddress()
          );


        const poolAddress =
          await ammFactory
            .poolForToken(
              await token
                .getAddress()
            );


        const pool =
          await ethers
            .getContractAt(
              "MockAMMPool",
              poolAddress
            );


        expect(
          await pool.totalSupply()
        ).to.equal(0n);


        expect(
          await pool.tokenReserve()
        ).to.equal(0n);


        expect(
          await pool.quoteReserve()
        ).to.equal(0n);


        expect(
          await ethers.provider
            .getBalance(
              poolAddress
            )
        ).to.equal(0n);
      }
    );


    it(
      "rejects direct native quote injection",
      async function () {
        const {
          pool,
          poolAddress,
        } =
          await initializePool();


        const reserveBefore =
          await pool.quoteReserve();

        const physicalBefore =
          await ethers.provider
            .getBalance(
              poolAddress
            );


        await expect(
          owner.sendTransaction({
            to:
              poolAddress,
            value:
              1n * WAD,
          })
        ).to.revert(ethers);


        expect(
          await pool.quoteReserve()
        ).to.equal(
          reserveBefore
        );


        expect(
          await ethers.provider
            .getBalance(
              poolAddress
            )
        ).to.equal(
          physicalBefore
        );
      }
    );


    it(
      "does not treat unsolicited ERC20 transfers as accounted reserves",
      async function () {
        /*
         * ERC20 contracts cannot stop someone
         * from transferring tokens directly
         * to the pool.
         *
         * Accounting reserves must NOT silently
         * change because of such a transfer.
         */
        const {
          pool,
          poolAddress,
        } =
          await initializePool();


        const accountedBefore =
          await pool.tokenReserve();


        const extra =
          123n * WAD;


        await token.transfer(
          poolAddress,
          extra
        );


        expect(
          await pool.tokenReserve()
        ).to.equal(
          accountedBefore
        );


        expect(
          await token.balanceOf(
            poolAddress
          )
        ).to.equal(
          accountedBefore +
          extra
        );
      }
    );


    it(
      "keeps two token pools completely isolated",
      async function () {
        const token2 =
          await ethers
            .deployContract(
              "MemeToken",
              [
                "ARC Second",
                "ARC2",
                TOTAL_SUPPLY,
                owner.address,
              ]
            );


        await token2
          .waitForDeployment();


        const first =
          await initializePool({
            tokenContract:
              token,
            tokenAmount:
              100_000_000n *
              WAD,
            quoteAmount:
              5_000n *
              WAD,
          });


        const second =
          await initializePool({
            tokenContract:
              token2,
            tokenAmount:
              200_000_000n *
              WAD,
            quoteAmount:
              7_000n *
              WAD,
          });


        expect(
          first.poolAddress
        ).to.not.equal(
          second.poolAddress
        );


        expect(
          await first.pool
            .tokenReserve()
        ).to.equal(
          100_000_000n *
          WAD
        );


        expect(
          await first.pool
            .quoteReserve()
        ).to.equal(
          5_000n *
          WAD
        );


        expect(
          await second.pool
            .tokenReserve()
        ).to.equal(
          200_000_000n *
          WAD
        );


        expect(
          await second.pool
            .quoteReserve()
        ).to.equal(
          7_000n *
          WAD
        );


        expect(
          await ammFactory
            .allPoolsLength()
        ).to.equal(2n);
      }
    );


    it(
      "does not strand tokens in Factory across multiple pools",
      async function () {
        const token2 =
          await ethers
            .deployContract(
              "MemeToken",
              [
                "ARC Second",
                "ARC2",
                TOTAL_SUPPLY,
                owner.address,
              ]
            );


        await token2
          .waitForDeployment();


        await initializePool({
          tokenContract:
            token,
          tokenAmount:
            100_000_000n *
            WAD,
          quoteAmount:
            3_000n *
            WAD,
        });


        await initializePool({
          tokenContract:
            token2,
          tokenAmount:
            100_000_000n *
            WAD,
          quoteAmount:
            3_000n *
            WAD,
        });


        const factoryAddress =
          await ammFactory
            .getAddress();


        expect(
          await token.balanceOf(
            factoryAddress
          )
        ).to.equal(0n);


        expect(
          await token2.balanceOf(
            factoryAddress
          )
        ).to.equal(0n);
      }
    );


    it(
      "does not strand native quote in Factory across multiple pools",
      async function () {
        const token2 =
          await ethers
            .deployContract(
              "MemeToken",
              [
                "ARC Second",
                "ARC2",
                TOTAL_SUPPLY,
                owner.address,
              ]
            );


        await token2
          .waitForDeployment();


        await initializePool({
          tokenContract:
            token,
          tokenAmount:
            100_000_000n *
            WAD,
          quoteAmount:
            3_000n *
            WAD,
        });


        await initializePool({
          tokenContract:
            token2,
          tokenAmount:
            100_000_000n *
            WAD,
          quoteAmount:
            3_000n *
            WAD,
        });


        expect(
          await ethers.provider
            .getBalance(
              await ammFactory
                .getAddress()
            )
        ).to.equal(0n);
      }
    );


    it(
      "preserves LP supply and reserves after failed repeat initialization",
      async function () {
        const {
          pool,
          poolAddress,
        } =
          await initializePool({
            lpRecipient:
              DEAD,
          });


        const lpBefore =
          await pool.totalSupply();

        const tokenReserveBefore =
          await pool.tokenReserve();

        const quoteReserveBefore =
          await pool.quoteReserve();

        const physicalTokenBefore =
          await token.balanceOf(
            poolAddress
          );

        const physicalQuoteBefore =
          await ethers.provider
            .getBalance(
              poolAddress
            );


        await expect(
          pool.addInitialLiquidity(
            owner.address,
            DEAD,
            500n * WAD,
            {
              value:
                500n * WAD,
            }
          )
        ).to.revert(ethers);


        expect(
          await pool.totalSupply()
        ).to.equal(
          lpBefore
        );


        expect(
          await pool.tokenReserve()
        ).to.equal(
          tokenReserveBefore
        );


        expect(
          await pool.quoteReserve()
        ).to.equal(
          quoteReserveBefore
        );


        expect(
          await token.balanceOf(
            poolAddress
          )
        ).to.equal(
          physicalTokenBefore
        );


        expect(
          await ethers.provider
            .getBalance(
              poolAddress
            )
        ).to.equal(
          physicalQuoteBefore
        );
      }
    );


    it(
      "reverts cleanly when LP multiplication exceeds uint256 range",
      async function () {
        /*
         * Deploy MockAMMPool directly.
         *
         * Because owner deploys it, owner becomes
         * its immutable factory and may call
         * addInitialLiquidity().
         *
         * This lets us attack the LP math boundary
         * without changing production/mock code.
         */

        const hugeSupply =
          1n << 200n;


        const hugeToken =
          await ethers
            .deployContract(
              "MemeToken",
              [
                "Huge",
                "HUGE",
                hugeSupply,
                owner.address,
              ]
            );


        await hugeToken
          .waitForDeployment();


        const directPool =
          await ethers
            .deployContract(
              "MockAMMPool",
              [
                await hugeToken
                  .getAddress(),
              ]
            );


        await directPool
          .waitForDeployment();


        const directPoolAddress =
          await directPool
            .getAddress();


        const tokenAmount =
          1n << 200n;

        const quoteAmount =
          1n << 60n;


        /*
         * tokenAmount * quoteAmount = 2^260
         *
         * It does not fit uint256.
         */
        await hugeToken.approve(
          directPoolAddress,
          tokenAmount
        );


        await expect(
          directPool
            .addInitialLiquidity(
              owner.address,
              DEAD,
              tokenAmount,
              {
                value:
                  quoteAmount,
              }
            )
        ).to.revert(ethers);


        /*
         * Revert must be atomic.
         */
        expect(
          await directPool.initialized()
        ).to.equal(false);


        expect(
          await directPool.totalSupply()
        ).to.equal(0n);


        expect(
          await directPool.tokenReserve()
        ).to.equal(0n);


        expect(
          await directPool.quoteReserve()
        ).to.equal(0n);


        expect(
          await hugeToken.balanceOf(
            directPoolAddress
          )
        ).to.equal(0n);
      }
    );


    it(
      "Candidate A pool remains exactly solvent after initialization",
      async function () {
        const {
          pool,
          poolAddress,
        } =
          await initializePool();


        expect(
          await token.balanceOf(
            poolAddress
          )
        ).to.equal(
          await pool.tokenReserve()
        );


        expect(
          await ethers.provider
            .getBalance(
              poolAddress
            )
        ).to.equal(
          await pool.quoteReserve()
        );


        expect(
          await pool.tokenReserve()
        ).to.equal(
          LIQUIDITY_TOKENS
        );


        expect(
          await pool.quoteReserve()
        ).to.equal(
          LIQUIDITY_QUOTE
        );
      }
    );
  }
);