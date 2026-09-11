import { expect } from "chai";
import hre from "hardhat";

describe(
  "ARC V3 — Migration Adapter Adversarial",
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

    let token;
    let token2;
    let ammFactory;
    let adapter;


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


        await ethers.provider.send(
          "hardhat_setBalance",
          [
            owner.address,
            ethers.toBeHex(
              50_000n * WAD
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


        adapter =
          await ethers
            .deployContract(
              "MigrationAdapter",
              [
                await ammFactory
                  .getAddress(),
              ]
            );

        await adapter
          .waitForDeployment();


        token =
          await ethers
            .deployContract(
              "MemeToken",
              [
                "ARC Migration A",
                "ARCA",
                TOTAL_SUPPLY,
                owner.address,
              ]
            );

        await token
          .waitForDeployment();


        token2 =
          await ethers
            .deployContract(
              "MemeToken",
              [
                "ARC Migration B",
                "ARCB",
                TOTAL_SUPPLY,
                owner.address,
              ]
            );

        await token2
          .waitForDeployment();
      }
    );


    async function migrate({
      tokenContract = token,
      tokenAmount =
        LIQUIDITY_TOKENS,
      quoteAmount =
        LIQUIDITY_QUOTE,
    } = {}) {
      const adapterAddress =
        await adapter
          .getAddress();


      await tokenContract.approve(
        adapterAddress,
        tokenAmount
      );


      await adapter.migrate(
        await tokenContract
          .getAddress(),
        tokenAmount,
        {
          value:
            quoteAmount,
        }
      );


      const poolAddress =
        await adapter
          .migrationPool(
            await tokenContract
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
      };
    }


    it(
      "rejects zero AMM factory at deployment",
      async function () {
        await expect(
          ethers.deployContract(
            "MigrationAdapter",
            [
              ethers.ZeroAddress,
            ]
          )
        ).to.revert(ethers);
      }
    );


    it(
      "cannot migrate the same token twice even with a different caller",
      async function () {
        await migrate();


        await token.transfer(
          user1.address,
          100n * WAD
        );


        await token
          .connect(user1)
          .approve(
            await adapter
              .getAddress(),
            100n * WAD
          );


        await ethers.provider.send(
          "hardhat_setBalance",
          [
            user1.address,
            ethers.toBeHex(
              1_000n * WAD
            ),
          ]
        );


        await expect(
          adapter
            .connect(user1)
            .migrate(
              await token
                .getAddress(),
              100n * WAD,
              {
                value:
                  100n * WAD,
              }
            )
        ).to.revert(ethers);
      }
    );


    it(
      "keeps migrations of two tokens isolated",
      async function () {
        const a =
          await migrate({
            tokenContract:
              token,
            tokenAmount:
              100_000_000n *
              WAD,
            quoteAmount:
              5_000n *
              WAD,
          });


        const b =
          await migrate({
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
          a.poolAddress
        ).to.not.equal(
          b.poolAddress
        );


        expect(
          await a.pool
            .tokenReserve()
        ).to.equal(
          100_000_000n *
          WAD
        );


        expect(
          await a.pool
            .quoteReserve()
        ).to.equal(
          5_000n *
          WAD
        );


        expect(
          await b.pool
            .tokenReserve()
        ).to.equal(
          200_000_000n *
          WAD
        );


        expect(
          await b.pool
            .quoteReserve()
        ).to.equal(
          7_000n *
          WAD
        );
      }
    );


    it(
      "does not allow one migration to consume another token balance",
      async function () {
        const adapterAddress =
          await adapter
            .getAddress();


        /*
         * Send unrelated token2 directly to adapter.
         *
         * Migration of token1 must not consume token2.
         */
        const donation =
          123n * WAD;


        await token2.transfer(
          adapterAddress,
          donation
        );


        await token.approve(
          adapterAddress,
          LIQUIDITY_TOKENS
        );


        await adapter.migrate(
          await token
            .getAddress(),
          LIQUIDITY_TOKENS,
          {
            value:
              LIQUIDITY_QUOTE,
          }
        );


        expect(
          await token2.balanceOf(
            adapterAddress
          )
        ).to.equal(
          donation
        );
      }
    );


    it(
        "tolerates forced native balance without consuming it during migration",
        async function () {
          const adapterAddress =
            await adapter.getAddress();
      
          const tokenAddress =
            await token.getAddress();
      
          /*
           * Simulate unavoidable native funds
           * already existing in the adapter.
           */
          const forcedBalance =
            ethers.parseEther("7");
      
          await ethers.provider.send(
            "hardhat_setBalance",
            [
              adapterAddress,
              ethers.toBeHex(
                forcedBalance
              ),
            ]
          );
      
          expect(
            await ethers.provider.getBalance(
              adapterAddress
            )
          ).to.equal(
            forcedBalance
          );
      
          /*
           * Perform the normal Candidate A
           * migration through the existing helper.
           */
          const {
            pool,
            poolAddress,
          } = await migrate();
      
          /*
           * Migration must complete normally.
           */
          expect(
            await adapter.migrated(
              tokenAddress
            )
          ).to.equal(true);
      
          expect(
            await adapter.migrationPool(
              tokenAddress
            )
          ).to.equal(
            poolAddress
          );
      
          expect(
            await ammFactory.poolForToken(
              tokenAddress
            )
          ).to.equal(
            poolAddress
          );
      
          /*
           * The forced native balance must remain
           * exactly unchanged.
           */
          expect(
            await ethers.provider.getBalance(
              adapterAddress
            )
          ).to.equal(
            forcedBalance
          );
      
          /*
           * Only the current migration inventory
           * may move through the adapter.
           */
          expect(
            await token.balanceOf(
              adapterAddress
            )
          ).to.equal(0n);
      
          /*
           * Migration quote must arrive entirely
           * in the pool, not consume forced funds.
           */
          expect(
            await ethers.provider.getBalance(
              poolAddress
            )
          ).to.equal(
            LIQUIDITY_QUOTE
          );
      
          expect(
            await pool.quoteReserve()
          ).to.equal(
            LIQUIDITY_QUOTE
          );
      
          /*
           * Adapter must leave no AMM allowance.
           */
          expect(
            await token.allowance(
              adapterAddress,
              await ammFactory.getAddress()
            )
          ).to.equal(0n);
        }
      );

    

      it(
        "tolerates pre-existing migration-token donation without consuming it",
        async function () {
          const adapterAddress =
            await adapter.getAddress();
      
          const tokenAddress =
            await token.getAddress();
      
          /*
           * Simulate an unsolicited donation of the
           * exact same token that will later migrate.
           */
          const donatedAmount =
            ethers.parseEther("123");
      
          await token.transfer(
            adapterAddress,
            donatedAmount
          );
      
          expect(
            await token.balanceOf(
              adapterAddress
            )
          ).to.equal(
            donatedAmount
          );
      
          /*
           * Perform the normal Candidate A migration.
           *
           * The adapter must move only
           * LIQUIDITY_TOKENS into the AMM.
           */
          const {
            pool,
            poolAddress,
          } = await migrate();
      
          /*
           * Migration succeeds normally.
           */
          expect(
            await adapter.migrated(
              tokenAddress
            )
          ).to.equal(true);
      
          expect(
            await adapter.migrationPool(
              tokenAddress
            )
          ).to.equal(
            poolAddress
          );
      
          expect(
            await ammFactory.poolForToken(
              tokenAddress
            )
          ).to.equal(
            poolAddress
          );
      
          /*
           * The unsolicited token donation must
           * remain untouched in the adapter.
           */
          expect(
            await token.balanceOf(
              adapterAddress
            )
          ).to.equal(
            donatedAmount
          );
      
          /*
           * Only the intended Candidate A migration
           * inventory may enter the pool.
           */
          expect(
            await token.balanceOf(
              poolAddress
            )
          ).to.equal(
            LIQUIDITY_TOKENS
          );
      
          expect(
            await pool.tokenReserve()
          ).to.equal(
            LIQUIDITY_TOKENS
          );
      
          /*
           * Quote migration remains exact.
           */
          expect(
            await ethers.provider.getBalance(
              poolAddress
            )
          ).to.equal(
            LIQUIDITY_QUOTE
          );
      
          expect(
            await pool.quoteReserve()
          ).to.equal(
            LIQUIDITY_QUOTE
          );
      
          /*
           * No AMM allowance may remain after
           * successful migration.
           */
          expect(
            await token.allowance(
              adapterAddress,
              await ammFactory.getAddress()
            )
          ).to.equal(0n);
        }
      );

      
    it(
      "does not leave partial migration state when AMM pool already exists",
      async function () {
        const tokenAddress =
          await token
            .getAddress();


        /*
         * Pre-create the pool directly in the AMM.
         */
        await ammFactory
          .createPool(
            tokenAddress
          );


        await token.approve(
          await adapter
            .getAddress(),
          LIQUIDITY_TOKENS
        );


        const ownerTokenBefore =
          await token.balanceOf(
            owner.address
          );


        await expect(
          adapter.migrate(
            tokenAddress,
            LIQUIDITY_TOKENS,
            {
              value:
                LIQUIDITY_QUOTE,
            }
          )
        ).to.revert(ethers);


        expect(
          await adapter
            .migrated(
              tokenAddress
            )
        ).to.equal(false);


        expect(
          await adapter
            .migrationPool(
              tokenAddress
            )
        ).to.equal(
          ethers.ZeroAddress
        );


        expect(
          await token.balanceOf(
            owner.address
          )
        ).to.equal(
          ownerTokenBefore
        );


        expect(
          await token.balanceOf(
            await adapter
              .getAddress()
          )
        ).to.equal(0n);
      }
    );


    it(
      "preserves caller funds when migration fails after approval",
      async function () {
        const adapterAddress =
          await adapter
            .getAddress();


        await token.approve(
          adapterAddress,
          LIQUIDITY_TOKENS
        );


        /*
         * Make AMM migration impossible by pre-creating pool.
         */
        await ammFactory
          .createPool(
            await token
              .getAddress()
          );


        const callerTokenBefore =
          await token.balanceOf(
            owner.address
          );


        await expect(
          adapter.migrate(
            await token
              .getAddress(),
            LIQUIDITY_TOKENS,
            {
              value:
                LIQUIDITY_QUOTE,
            }
          )
        ).to.revert(ethers);


        expect(
          await token.balanceOf(
            owner.address
          )
        ).to.equal(
          callerTokenBefore
        );
      }
    );


    it(
      "leaves no AMM allowance after successful migration",
      async function () {
        await migrate();


        expect(
          await token.allowance(
            await adapter
              .getAddress(),
            await ammFactory
              .getAddress()
          )
        ).to.equal(0n);
      }
    );


    it(
      "burn address receives all LP supply",
      async function () {
        const {
          pool,
        } =
          await migrate();


        const totalLP =
          await pool.totalSupply();


        expect(
          totalLP
        ).to.be.gt(0n);


        expect(
          await pool.balanceOf(
            DEAD
          )
        ).to.equal(
          totalLP
        );
      }
    );


    it(
      "creator cannot receive LP through migrate",
      async function () {
        const {
          pool,
        } =
          await migrate();


        expect(
          await pool.balanceOf(
            owner.address
          )
        ).to.equal(0n);


        expect(
          await pool.balanceOf(
            user1.address
          )
        ).to.equal(0n);


        expect(
          await pool.balanceOf(
            user2.address
          )
        ).to.equal(0n);
      }
    );


    it(
      "adapter cannot retain LP custody",
      async function () {
        const {
          pool,
        } =
          await migrate();


        expect(
          await pool.balanceOf(
            await adapter
              .getAddress()
          )
        ).to.equal(0n);
      }
    );


    it(
      "AMM factory cannot retain LP custody",
      async function () {
        const {
          pool,
        } =
          await migrate();


        expect(
          await pool.balanceOf(
            await ammFactory
              .getAddress()
          )
        ).to.equal(0n);
      }
    );


    it(
      "pool reserves remain exact after unrelated ERC20 donation",
      async function () {
        const {
          pool,
          poolAddress,
        } =
          await migrate();


        const tokenReserveBefore =
          await pool
            .tokenReserve();


        const quoteReserveBefore =
          await pool
            .quoteReserve();


        const extra =
          10n * WAD;


        await token.transfer(
          poolAddress,
          extra
        );


        expect(
          await pool
            .tokenReserve()
        ).to.equal(
          tokenReserveBefore
        );


        expect(
          await pool
            .quoteReserve()
        ).to.equal(
          quoteReserveBefore
        );


        expect(
          await token.balanceOf(
            poolAddress
          )
        ).to.equal(
          tokenReserveBefore +
          extra
        );
      }
    );


    it(
      "cannot corrupt a completed migration by calling fallback",
      async function () {
        await migrate();


        const tokenAddress =
          await token
            .getAddress();


        const poolBefore =
          await adapter
            .migrationPool(
              tokenAddress
            );


        await expect(
          owner.sendTransaction({
            to:
              await adapter
                .getAddress(),
            data:
              "0x12345678",
            value:
              1n,
          })
        ).to.revert(ethers);


        expect(
          await adapter
            .migrated(
              tokenAddress
            )
        ).to.equal(true);


        expect(
          await adapter
            .migrationPool(
              tokenAddress
            )
        ).to.equal(
          poolBefore
        );
      }
    );


    it(
      "migration state remains immutable after completion",
      async function () {
        const {
          poolAddress,
        } =
          await migrate();


        const tokenAddress =
          await token
            .getAddress();


        expect(
          await adapter
            .migrated(
              tokenAddress
            )
        ).to.equal(true);


        expect(
          await adapter
            .migrationPool(
              tokenAddress
            )
        ).to.equal(
          poolAddress
        );


        /*
         * No method exists to clear migrated,
         * replace the pool, rescue LP, or withdraw.
         */
        expect(
          await adapter
            .migrated(
              tokenAddress
            )
        ).to.equal(true);
      }
    );
  }
);