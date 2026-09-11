import { expect } from "chai";
import hre from "hardhat";

describe(
  "ARC V3 — Migration Adapter",
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

    let token;
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
        ] =
          await ethers
            .getSigners();


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
                "ARC Migration",
                "ARCM",
                TOTAL_SUPPLY,
                owner.address,
              ]
            );

        await token
          .waitForDeployment();
      }
    );


    async function migrateCandidateA({
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


      const tx =
        await adapter.migrate(
          await tokenContract
            .getAddress(),
          tokenAmount,
          {
            value:
              quoteAmount,
          }
        );


      const receipt =
        await tx.wait();


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
        tx,
        receipt,
        pool,
        poolAddress,
        tokenAmount,
        quoteAmount,
      };
    }


    it(
      "stores the configured AMM factory",
      async function () {
        expect(
          await adapter
            .ammFactory()
        ).to.equal(
          await ammFactory
            .getAddress()
        );
      }
    );


    it(
      "migrates exact Candidate A token liquidity",
      async function () {
        const {
          pool,
        } =
          await migrateCandidateA();


        expect(
          await pool
            .tokenReserve()
        ).to.equal(
          LIQUIDITY_TOKENS
        );
      }
    );


    it(
      "migrates exact Candidate A native quote liquidity",
      async function () {
        const {
          pool,
        } =
          await migrateCandidateA();


        expect(
          await pool
            .quoteReserve()
        ).to.equal(
          LIQUIDITY_QUOTE
        );
      }
    );


    it(
      "physical pool token balance matches accounting reserve",
      async function () {
        const {
          pool,
          poolAddress,
        } =
          await migrateCandidateA();


        expect(
          await token.balanceOf(
            poolAddress
          )
        ).to.equal(
          await pool
            .tokenReserve()
        );
      }
    );


    it(
      "physical pool native quote matches accounting reserve",
      async function () {
        const {
          pool,
          poolAddress,
        } =
          await migrateCandidateA();


        expect(
          await ethers.provider
            .getBalance(
              poolAddress
            )
        ).to.equal(
          await pool
            .quoteReserve()
        );
      }
    );


    it(
      "marks the token as migrated",
      async function () {
        await migrateCandidateA();


        expect(
          await adapter
            .migrated(
              await token
                .getAddress()
            )
        ).to.equal(true);
      }
    );


    it(
      "stores the exact migrated pool",
      async function () {
        const {
          poolAddress,
        } =
          await migrateCandidateA();


        expect(
          await adapter
            .migrationPool(
              await token
                .getAddress()
            )
        ).to.equal(
          poolAddress
        );


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
      "mints LP to the burn address",
      async function () {
        const {
          pool,
        } =
          await migrateCandidateA();


        expect(
          await pool
            .balanceOf(
              DEAD
            )
        ).to.be.gt(0n);
      }
    );


    it(
      "leaves creator with zero LP",
      async function () {
        const {
          pool,
        } =
          await migrateCandidateA();


        expect(
          await pool
            .balanceOf(
              owner.address
            )
        ).to.equal(0n);
      }
    );


    it(
      "leaves adapter with zero LP",
      async function () {
        const {
          pool,
        } =
          await migrateCandidateA();


        expect(
          await pool
            .balanceOf(
              await adapter
                .getAddress()
            )
        ).to.equal(0n);
      }
    );


    it(
      "leaves AMM factory with zero LP",
      async function () {
        const {
          pool,
        } =
          await migrateCandidateA();


        expect(
          await pool
            .balanceOf(
              await ammFactory
                .getAddress()
            )
        ).to.equal(0n);
      }
    );


    it(
      "leaves adapter with zero migration tokens",
      async function () {
        await migrateCandidateA();


        expect(
          await token.balanceOf(
            await adapter
              .getAddress()
          )
        ).to.equal(0n);
      }
    );


    it(
      "leaves adapter with zero native quote",
      async function () {
        await migrateCandidateA();


        expect(
          await ethers.provider
            .getBalance(
              await adapter
                .getAddress()
            )
        ).to.equal(0n);
      }
    );


    it(
      "clears AMM token allowance after migration",
      async function () {
        await migrateCandidateA();


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
      "allows only one migration per token",
      async function () {
        await migrateCandidateA();


        await token.approve(
          await adapter
            .getAddress(),
          1n * WAD
        );


        await expect(
          adapter.migrate(
            await token
              .getAddress(),
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
      "rejects zero token address",
      async function () {
        await expect(
          adapter.migrate(
            ethers.ZeroAddress,
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
      "rejects zero token amount",
      async function () {
        await expect(
          adapter.migrate(
            await token
              .getAddress(),
            0n,
            {
              value:
                1n * WAD,
            }
          )
        ).to.revert(ethers);
      }
    );


    it(
      "rejects zero quote amount",
      async function () {
        await token.approve(
          await adapter
            .getAddress(),
          1n * WAD
        );


        await expect(
          adapter.migrate(
            await token
              .getAddress(),
            1n * WAD
          )
        ).to.revert(ethers);
      }
    );


    it(
      "rejects direct native transfers",
      async function () {
        await expect(
          owner.sendTransaction({
            to:
              await adapter
                .getAddress(),
            value:
              1n * WAD,
          })
        ).to.revert(ethers);


        expect(
          await ethers.provider
            .getBalance(
              await adapter
                .getAddress()
            )
        ).to.equal(0n);
      }
    );


    it(
      "rolls back migrated flag when caller token approval is missing",
      async function () {
        const tokenAddress =
          await token
            .getAddress();


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
      }
    );


    it(
      "rolls back all adapter state when migration fails",
      async function () {
        const tokenAddress =
          await token
            .getAddress();


        /*
         * Approve less than requested.
         */
        await token.approve(
          await adapter
            .getAddress(),
          1n * WAD
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
            await adapter
              .getAddress()
          )
        ).to.equal(0n);


        expect(
          await ethers.provider
            .getBalance(
              await adapter
                .getAddress()
            )
        ).to.equal(0n);
      }
    );


    it(
      "does not leave migration tokens stranded in AMM factory",
      async function () {
        await migrateCandidateA();


        expect(
          await token.balanceOf(
            await ammFactory
              .getAddress()
          )
        ).to.equal(0n);
      }
    );


    it(
      "does not leave native quote stranded in AMM factory",
      async function () {
        await migrateCandidateA();


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
      "opens the Candidate A pool at approximately 60K market cap",
      async function () {
        const {
          pool,
        } =
          await migrateCandidateA();


        const spotPrice =
          await pool
            .spotPrice();


        const marketCap =
          (
            spotPrice *
            TOTAL_SUPPLY
          ) /
          WAD;


        const target =
          60_000n * WAD;


        const diff =
          marketCap >
          target
            ? marketCap -
              target
            : target -
              marketCap;


        /*
         * Tight tolerance:
         * 0.000001 native quote.
         */
        expect(
          diff
        ).to.be.lte(
          1_000_000_000_000n
        );
      }
    );
  }
);