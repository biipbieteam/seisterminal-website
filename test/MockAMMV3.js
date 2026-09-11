import { expect } from "chai";
import hre from "hardhat";

describe(
  "ARC V3 — Mock AMM Primitive",
  function () {
    const WAD =
      10n ** 18n;

    const DEAD =
      "0x000000000000000000000000000000000000dEaD";

    let ethers;

    let owner;
    let user1;

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
        ] =
          await ethers
            .getSigners();


        /*
        * Candidate A initial AMM liquidity for a
        * 1B launch requires ~17,393.876913 native
        * quote.
        *
        * Default Hardhat signer balance is only
        * ~10,000, so fund the isolated test signer.
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


        /*
         * MemeToken constructor from our
         * locked V3 baseline:
         *
         * name
         * symbol
         * totalSupply
         * creator
         * factory
         *
         * Supply is minted to factory_.
         *
         * For this isolated AMM test owner is
         * both creator and initial holder/factory.
         */
        token =
        await ethers.deployContract(
          "MemeToken",
          [
            "ARC Mock",
            "AMM",
            1_000_000_000n * WAD,
            owner.address,
          ]
        );

        await token
          .waitForDeployment();
      }
    );


    async function initializePool({
      tokenAmount =
        289_897_948_556635619639450000n,

      quoteAmount =
        17_393_876913398137178368n,

      lpRecipient =
        owner.address,
    } = {}) {
      const factoryAddress =
        await ammFactory
          .getAddress();


      await token.approve(
        factoryAddress,
        tokenAmount
      );


      const tx =
        await ammFactory
          .createPoolAndAddLiquidity(
            await token
              .getAddress(),
            tokenAmount,
            lpRecipient,
            {
              value:
                quoteAmount,
            }
          );


      await tx.wait();


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


      return {
        pool,
        poolAddress,
        tokenAmount,
        quoteAmount,
      };
    }


    it(
      "creates exactly one pool for a token",
      async function () {
        const {
          poolAddress,
        } =
          await initializePool();


        expect(
          poolAddress
        ).to.not.equal(
          ethers.ZeroAddress
        );


        expect(
          await ammFactory
            .allPoolsLength()
        ).to.equal(1n);


        expect(
          await ammFactory
            .poolForToken(
              await token
                .getAddress()
            )
        ).to.equal(
          poolAddress
        );
      }
    );


    it(
      "stores exact initial token and quote reserves",
      async function () {
        const {
          pool,
          tokenAmount,
          quoteAmount,
        } =
          await initializePool();


        expect(
          await pool.tokenReserve()
        ).to.equal(
          tokenAmount
        );


        expect(
          await pool.quoteReserve()
        ).to.equal(
          quoteAmount
        );
      }
    );


    it(
      "physical pool balances match reserve accounting",
      async function () {
        const {
          pool,
          poolAddress,
          tokenAmount,
          quoteAmount,
        } =
          await initializePool();


        expect(
          await token.balanceOf(
            poolAddress
          )
        ).to.equal(
          tokenAmount
        );


        expect(
          await ethers.provider
            .getBalance(
              poolAddress
            )
        ).to.equal(
          quoteAmount
        );


        expect(
          await pool.tokenReserve()
        ).to.equal(
          tokenAmount
        );


        expect(
          await pool.quoteReserve()
        ).to.equal(
          quoteAmount
        );
      }
    );


    it(
      "mints positive LP shares for initial liquidity",
      async function () {
        const {
          pool,
        } =
          await initializePool();


        const lpBalance =
          await pool.balanceOf(
            owner.address
          );


        expect(
          lpBalance
        ).to.be.gt(0n);


        expect(
          await pool.totalSupply()
        ).to.equal(
          lpBalance
        );
      }
    );


    it(
      "can mint initial LP directly to the burn address",
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
          await pool.totalSupply()
        ).to.equal(
          burnedLP
        );
      }
    );


    it(
      "prevents creating a second pool for the same token",
      async function () {
        await initializePool();


        await expect(
          ammFactory.createPool(
            await token
              .getAddress()
          )
        ).to.revert(ethers);
      }
    );


    it(
      "prevents initializing the same pool twice",
      async function () {
        const {
          pool,
        } =
          await initializePool();


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
      }
    );


    it(
      "rejects zero token liquidity",
      async function () {
        await expect(
          ammFactory
            .createPoolAndAddLiquidity(
              await token
                .getAddress(),
              0n,
              owner.address,
              {
                value:
                  1n * WAD,
              }
            )
        ).to.revert(ethers);
      }
    );


    it(
      "rejects zero quote liquidity",
      async function () {
        await token.approve(
          await ammFactory
            .getAddress(),
          1n * WAD
        );


        await expect(
          ammFactory
            .createPoolAndAddLiquidity(
              await token
                .getAddress(),
              1n * WAD,
              owner.address,
              {
                value: 0n,
              }
            )
        ).to.revert(ethers);
      }
    );


    it(
      "rejects direct native transfers to the pool",
      async function () {
        const {
          poolAddress,
        } =
          await initializePool();


        await expect(
          owner.sendTransaction({
            to:
              poolAddress,
            value:
              1n * WAD,
          })
        ).to.revert(ethers);
      }
    );


    it(
      "reports a positive constant-product invariant",
      async function () {
        const {
          pool,
        } =
          await initializePool();


        expect(
          await pool.invariant()
        ).to.be.gt(0n);
      }
    );


    it(
      "opens at approximately the 60K Candidate A market cap",
      async function () {
        const {
          pool,
        } =
          await initializePool();


        const spotPrice =
          await pool.spotPrice();


        /*
         * Market cap =
         *
         * spotPrice * 1B tokens
         *
         * spotPrice is 1e18-scaled.
         */
        const marketCap =
          spotPrice *
          (
            1_000_000_000n *
            WAD
          ) /
          WAD;


        const target =
          60_000n * WAD;


        /*
         * Factory execution reserve differs
         * from theoretical reserve by only
         * ~1 wei, so opening MC should be
         * essentially 60K.
         */
        const difference =
          marketCap > target
            ? marketCap - target
            : target - marketCap;


        /*
         * Extremely conservative tolerance:
         * < 0.000001 quote.
         */
        expect(
          difference
        ).to.be.lt(
          1_000_000_000_000n
        );
      }
    );


    it(
      "does not leave migration tokens stranded in MockAMMFactory",
      async function () {
        await initializePool();


        expect(
          await token.balanceOf(
            await ammFactory
              .getAddress()
          )
        ).to.equal(0n);
      }
    );


    it(
      "does not leave native quote stranded in MockAMMFactory",
      async function () {
        await initializePool();


        expect(
          await ethers.provider
            .getBalance(
              await ammFactory
                .getAddress()
            )
        ).to.equal(0n);
      }
    );
  }
);