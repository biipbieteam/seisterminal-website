import { expect } from "chai";
import hre from "hardhat";

describe(
  "LaunchFactory V3 — Migration Integration",
  function () {
    let ethers;

    let creator;
    let migrator;

    let ammFactory;
    let migrationAdapter;
    let factory;

    const WAD =
      10n ** 18n;

    const TOTAL_SUPPLY =
      1_000_000_000n;

    async function deployFixture() {
      ({ ethers } =
        await hre.network.getOrCreate());

      [
        creator,
        migrator,
      ] =
        await ethers.getSigners();

      /*
       * Candidate A graduation requires
       * approximately 17,393.8769 native quote.
       */
      await ethers.provider.send(
        "hardhat_setBalance",
        [
          creator.address,
          ethers.toBeHex(
            30_000n * WAD
          ),
        ]
      );

      ammFactory =
        await ethers.deployContract(
          "MockAMMFactory"
        );

      await ammFactory
        .waitForDeployment();

      migrationAdapter =
        await ethers.deployContract(
          "MigrationAdapter",
          [
            await ammFactory
              .getAddress(),
          ]
        );

      await migrationAdapter
        .waitForDeployment();

      factory =
        await ethers.deployContract(
          "LaunchFactory",
          [
            await migrationAdapter
              .getAddress(),
          ]
        );

      await factory
        .waitForDeployment();
    }

    beforeEach(
      async function () {
        await deployFixture();
      }
    );

    it(
      "migrates an exact graduated Candidate A launch into the AMM",
      async function () {
        /*
         * Create launch with no dev buy.
         */
        await factory
          .connect(creator)
          .launchFairToken(
            "ARC Migration",
            "ARCM");

        let launch =
          await factory
            .fairLaunches(0);

        const tokenAddress =
          launch.token;

        const token =
          await ethers.getContractAt(
            "MemeToken",
            tokenAddress
          );

        /*
         * Determine exact remaining graduation
         * cost from the Factory's own quote path.
         */

        /*
         * quoteBuy(1 wei) is not the final cost.
         *
         * Get Candidate A graduation inventory
         * directly from launch state and use the
         * V3 harness for the exact curve cost.
         */
        const harness =
          await ethers.deployContract(
            "BondingCurveV3Harness"
          );

        await harness
          .waitForDeployment();

        const graduationCost =
          await harness.quoteForTokens(
            launch.totalSupply,
            0,
            launch.bondingSupply
          );

        await factory
          .connect(creator)
          .buyFairToken(
            0,
            launch.bondingSupply,
            {
              value:
                graduationCost,
            }
          );

        launch =
          await factory
            .fairLaunches(0);

        expect(
          launch.status
        ).to.equal(1n);

        expect(
          launch.tokensSold
        ).to.equal(
          launch.bondingSupply
        );

        const liquiditySupply =
          launch.liquiditySupply;

        const quoteReserve =
          launch.quoteReserve;

        expect(
          await token.balanceOf(
            await factory.getAddress()
          )
        ).to.equal(
          liquiditySupply
        );

        /*
         * Migration is permissionless once the
         * launch is GRADUATING.
         */
        await factory
          .connect(migrator)
          .migrateFairLaunch(0);

        launch =
          await factory
            .fairLaunches(0);

        expect(
          launch.status
        ).to.equal(2n);

        expect(
          launch.quoteReserve
        ).to.equal(0n);

        const poolAddress =
          await migrationAdapter
            .migrationPool(
              tokenAddress
            );

        expect(
          poolAddress
        ).to.not.equal(
          ethers.ZeroAddress
        );

        const pool =
          await ethers.getContractAt(
            "MockAMMPool",
            poolAddress
          );

        /*
         * Exact Candidate A migration inventory.
         */
        expect(
          await token.balanceOf(
            poolAddress
          )
        ).to.equal(
          liquiditySupply
        );

        expect(
          await pool.tokenReserve()
        ).to.equal(
          liquiditySupply
        );

        /*
         * Exact actual launch quote reserve.
         */
        expect(
          await ethers.provider.getBalance(
            poolAddress
          )
        ).to.equal(
          quoteReserve
        );

        expect(
          await pool.quoteReserve()
        ).to.equal(
          quoteReserve
        );

        /*
         * Factory no longer holds this launch's
         * migration inventory.
         */
        expect(
          await token.balanceOf(
            await factory.getAddress()
          )
        ).to.equal(0n);

        /*
         * Adapter records completed migration.
         */
        expect(
          await migrationAdapter.migrated(
            tokenAddress
          )
        ).to.equal(true);

        expect(
          await ammFactory.poolForToken(
            tokenAddress
          )
        ).to.equal(
          poolAddress
        );

        /*
         * No residual Factory -> Adapter allowance.
         */
        expect(
          await token.allowance(
            await factory.getAddress(),
            await migrationAdapter
              .getAddress()
          )
        ).to.equal(0n);
      }
    );

    it(
        "rejects migration before the launch reaches GRADUATING",
        async function () {
          /*
           * Create a normal launch.
           *
           * No bonding inventory has been sold yet,
           * therefore status must remain ACTIVE.
           */
          await factory
            .connect(creator)
            .launchFairToken(
              "ARC Active",
              "ARCA");
      
          const launchBefore =
            await factory
              .fairLaunches(0);
      
          expect(
            launchBefore.status
          ).to.equal(0n);
      
          const tokenAddress =
            launchBefore.token;
      
          const factoryAddress =
            await factory.getAddress();
      
          const token =
            await ethers.getContractAt(
              "MemeToken",
              tokenAddress
            );
      
          const tokenBalanceBefore =
            await token.balanceOf(
              factoryAddress
            );
      
          const quoteBalanceBefore =
            await ethers.provider.getBalance(
              factoryAddress
            );
      
          /*
           * Nobody — creator or unrelated caller —
           * may trigger migration while ACTIVE.
           */
          await expect(
            factory
              .connect(migrator)
              .migrateFairLaunch(0)
          ).to.be.revert(
            ethers,
            "LaunchNotGraduating"
          );
      
          const launchAfter =
            await factory
              .fairLaunches(0);
      
          /*
           * Failed migration must not modify
           * launch accounting.
           */
          expect(
            launchAfter.status
          ).to.equal(0n);
      
          expect(
            launchAfter.tokensSold
          ).to.equal(
            launchBefore.tokensSold
          );
      
          expect(
            launchAfter.quoteReserve
          ).to.equal(
            launchBefore.quoteReserve
          );
      
          /*
           * Physical inventory must remain untouched.
           */
          expect(
            await token.balanceOf(
              factoryAddress
            )
          ).to.equal(
            tokenBalanceBefore
          );
      
          expect(
            await ethers.provider.getBalance(
              factoryAddress
            )
          ).to.equal(
            quoteBalanceBefore
          );
      
          /*
           * Adapter and AMM must remain completely
           * untouched.
           */
          expect(
            await migrationAdapter.migrated(
              tokenAddress
            )
          ).to.equal(false);
      
          expect(
            await migrationAdapter
              .migrationPool(
                tokenAddress
              )
          ).to.equal(
            ethers.ZeroAddress
          );
      
          expect(
            await ammFactory.poolForToken(
              tokenAddress
            )
          ).to.equal(
            ethers.ZeroAddress
          );
        }
      );

      it(
        "rejects a second migration after the launch is GRADUATED",
        async function () {
          /*
           * Create Candidate A launch.
           */
          await factory
            .connect(creator)
            .launchFairToken(
              "ARC Once",
              "ARCO");
      
          let launch =
            await factory
              .fairLaunches(0);
      
          const tokenAddress =
            launch.token;
      
          const token =
            await ethers.getContractAt(
              "MemeToken",
              tokenAddress
            );
      
          /*
           * Fill the exact remaining bonding inventory.
           */
          const harness =
            await ethers.deployContract(
              "BondingCurveV3Harness"
            );
      
          await harness
            .waitForDeployment();
      
          const graduationCost =
            await harness.quoteForTokens(
              launch.totalSupply,
              0,
              launch.bondingSupply
            );
      
          await factory
            .connect(creator)
            .buyFairToken(
              0,
              launch.bondingSupply,
              {
                value:
                  graduationCost,
              }
            );
      
          launch =
            await factory
              .fairLaunches(0);
      
          expect(
            launch.status
          ).to.equal(1n);
      
          /*
           * First migration succeeds.
           */
          await factory
            .connect(migrator)
            .migrateFairLaunch(0);
      
          launch =
            await factory
              .fairLaunches(0);
      
          expect(
            launch.status
          ).to.equal(2n);
      
          expect(
            launch.quoteReserve
          ).to.equal(0n);
      
          const poolAddress =
            await migrationAdapter
              .migrationPool(
                tokenAddress
              );
      
          const pool =
            await ethers.getContractAt(
              "MockAMMPool",
              poolAddress
            );
      
          /*
           * Snapshot the completed migration.
           */
          const poolTokenBefore =
            await token.balanceOf(
              poolAddress
            );
      
          const poolQuoteBefore =
            await ethers.provider.getBalance(
              poolAddress
            );
      
          const lpSupplyBefore =
            await pool.totalSupply();
      
          /*
           * Second migration must fail at the
           * LaunchFactory boundary.
           */
          await expect(
            factory
              .connect(creator)
              .migrateFairLaunch(0)
          ).to.be.revert(
            ethers,
            "MigrationAlreadyCompleted"
          );
      
          /*
           * Completed state remains immutable.
           */
          const launchAfter =
            await factory
              .fairLaunches(0);
      
          expect(
            launchAfter.status
          ).to.equal(2n);
      
          expect(
            launchAfter.quoteReserve
          ).to.equal(0n);
      
          expect(
            await migrationAdapter.migrated(
              tokenAddress
            )
          ).to.equal(true);
      
          expect(
            await migrationAdapter
              .migrationPool(
                tokenAddress
              )
          ).to.equal(
            poolAddress
          );
      
          /*
           * No second token / quote / LP movement.
           */
          expect(
            await token.balanceOf(
              poolAddress
            )
          ).to.equal(
            poolTokenBefore
          );
      
          expect(
            await ethers.provider.getBalance(
              poolAddress
            )
          ).to.equal(
            poolQuoteBefore
          );
      
          expect(
            await pool.totalSupply()
          ).to.equal(
            lpSupplyBefore
          );
        }
      );

      it(
        "rolls back the entire LaunchFactory migration when the AMM migration fails",
        async function () {
          /*
           * Create launch and reach exact graduation.
           */
          await factory
            .connect(creator)
            .launchFairToken(
              "ARC Rollback",
              "ARCR");
      
          let launch =
            await factory
              .fairLaunches(0);
      
          const tokenAddress =
            launch.token;
      
          const token =
            await ethers.getContractAt(
              "MemeToken",
              tokenAddress
            );
      
          const factoryAddress =
            await factory.getAddress();
      
          const adapterAddress =
            await migrationAdapter
              .getAddress();
      
          const harness =
            await ethers.deployContract(
              "BondingCurveV3Harness"
            );
      
          await harness
            .waitForDeployment();
      
          const graduationCost =
            await harness.quoteForTokens(
              launch.totalSupply,
              0,
              launch.bondingSupply
            );
      
          await factory
            .connect(creator)
            .buyFairToken(
              0,
              launch.bondingSupply,
              {
                value:
                  graduationCost,
              }
            );
      
          launch =
            await factory
              .fairLaunches(0);
      
          expect(
            launch.status
          ).to.equal(1n);
      
          /*
           * Snapshot all Factory liabilities and
           * physical balances before migration.
           */
          const tokenBalanceBefore =
            await token.balanceOf(
              factoryAddress
            );
      
          const factoryQuoteBefore =
            await ethers.provider.getBalance(
              factoryAddress
            );
      
          const quoteReserveBefore =
            launch.quoteReserve;
      
          const tokensSoldBefore =
            launch.tokensSold;
      
          /*
           * Poison the downstream migration path:
           * create the token's AMM pool before the
           * MigrationAdapter attempts to create it.
           */
          await ammFactory.createPool(
            tokenAddress
          );
      
          const existingPool =
            await ammFactory.poolForToken(
              tokenAddress
            );
      
          expect(
            existingPool
          ).to.not.equal(
            ethers.ZeroAddress
          );
      
          /*
           * Real LaunchFactory -> real Adapter ->
           * real MockAMMFactory migration must fail.
           */
          await expect(
            factory
              .connect(migrator)
              .migrateFairLaunch(0)
          ).to.be.revert(
            ethers
          );
      
          /*
           * LaunchFactory state must roll back
           * completely.
           */
          const launchAfter =
            await factory
              .fairLaunches(0);
      
          expect(
            launchAfter.status
          ).to.equal(1n);
      
          expect(
            launchAfter.quoteReserve
          ).to.equal(
            quoteReserveBefore
          );
      
          expect(
            launchAfter.tokensSold
          ).to.equal(
            tokensSoldBefore
          );
      
          expect(
            launchAfter.liquiditySupply
          ).to.equal(
            launch.liquiditySupply
          );
      
          /*
           * No launch assets may have escaped.
           */
          expect(
            await token.balanceOf(
              factoryAddress
            )
          ).to.equal(
            tokenBalanceBefore
          );
      
          expect(
            await ethers.provider.getBalance(
              factoryAddress
            )
          ).to.equal(
            factoryQuoteBefore
          );
      
          /*
           * Factory -> Adapter approval created inside
           * the failed transaction must also roll back.
           */
          expect(
            await token.allowance(
              factoryAddress,
              adapterAddress
            )
          ).to.equal(0n);
      
          /*
           * Adapter must not retain partial state.
           */
          expect(
            await migrationAdapter.migrated(
              tokenAddress
            )
          ).to.equal(false);
      
          expect(
            await migrationAdapter
              .migrationPool(
                tokenAddress
              )
          ).to.equal(
            ethers.ZeroAddress
          );
      
          expect(
            await token.balanceOf(
              adapterAddress
            )
          ).to.equal(0n);
      
          expect(
            await ethers.provider.getBalance(
              adapterAddress
            )
          ).to.equal(0n);
      
          /*
           * The pre-created empty pool still exists,
           * but failed migration must not initialize it
           * or move launch assets into it.
           */
          const pool =
            await ethers.getContractAt(
              "MockAMMPool",
              existingPool
            );
      
          expect(
            await pool.initialized()
          ).to.equal(false);
      
          expect(
            await pool.tokenReserve()
          ).to.equal(0n);
      
          expect(
            await pool.quoteReserve()
          ).to.equal(0n);
      
          expect(
            await token.balanceOf(
              existingPool
            )
          ).to.equal(0n);
      
          expect(
            await ethers.provider.getBalance(
              existingPool
            )
          ).to.equal(0n);
        }
      );

      it(
        "isolates migration assets between two fair launches",
        async function () {
          /*
           * Create Launch A.
           */
          await factory
            .connect(creator)
            .launchFairToken(
              "ARC Alpha",
              "ARCA");
      
          /*
           * Create Launch B.
           */
          await factory
            .connect(creator)
            .launchFairToken(
              "ARC Beta",
              "ARCB");
      
          let launchA =
            await factory
              .fairLaunches(0);
      
          let launchB =
            await factory
              .fairLaunches(1);
      
          const tokenA =
            await ethers.getContractAt(
              "MemeToken",
              launchA.token
            );
      
          const tokenB =
            await ethers.getContractAt(
              "MemeToken",
              launchB.token
            );
      
          const harness =
            await ethers.deployContract(
              "BondingCurveV3Harness"
            );
      
          await harness
            .waitForDeployment();
      
          /*
           * Fully graduate Launch A.
           */
          const graduationCostA =
            await harness.quoteForTokens(
              launchA.totalSupply,
              0,
              launchA.bondingSupply
            );
      
          await factory
            .connect(creator)
            .buyFairToken(
              0,
              launchA.bondingSupply,
              {
                value:
                  graduationCostA,
              }
            );
      
          /*
           * Give Launch B a real outstanding
           * quote liability, but keep it ACTIVE.
           */
          const partialBuyB =
            250n * WAD;
      
          await factory
            .connect(creator)
            .buyFairToken(
              1,
              0,
              {
                value:
                  partialBuyB,
              }
            );
      
          launchA =
            await factory
              .fairLaunches(0);
      
          launchB =
            await factory
              .fairLaunches(1);
      
          expect(
            launchA.status
          ).to.equal(1n);
      
          expect(
            launchB.status
          ).to.equal(0n);
      
          const factoryAddress =
            await factory.getAddress();
      
          /*
           * Snapshot every Launch B liability
           * before Launch A migration.
           */
          const launchBQuoteBefore =
            launchB.quoteReserve;
      
          const launchBTokensSoldBefore =
            launchB.tokensSold;
      
          const tokenBFactoryBalanceBefore =
            await tokenB.balanceOf(
              factoryAddress
            );
      
          const factoryNativeBefore =
            await ethers.provider.getBalance(
              factoryAddress
            );
      
          const launchAQuoteBefore =
            launchA.quoteReserve;
      
          /*
           * Factory native balance should currently
           * cover both launch liabilities.
           */
          expect(
            factoryNativeBefore
          ).to.equal(
            launchAQuoteBefore +
            launchBQuoteBefore
          );
      
          /*
           * Migrate Launch A only.
           */
          await factory
            .connect(migrator)
            .migrateFairLaunch(0);
      
          launchA =
            await factory
              .fairLaunches(0);
      
          launchB =
            await factory
              .fairLaunches(1);
      
          expect(
            launchA.status
          ).to.equal(2n);
      
          expect(
            launchA.quoteReserve
          ).to.equal(0n);
      
          /*
           * Launch B must remain completely unchanged.
           */
          expect(
            launchB.status
          ).to.equal(0n);
      
          expect(
            launchB.quoteReserve
          ).to.equal(
            launchBQuoteBefore
          );
      
          expect(
            launchB.tokensSold
          ).to.equal(
            launchBTokensSoldBefore
          );
      
          expect(
            await tokenB.balanceOf(
              factoryAddress
            )
          ).to.equal(
            tokenBFactoryBalanceBefore
          );
      
          /*
           * After A migrates, Factory native balance
           * must equal exactly B's remaining liability.
           */
          expect(
            await ethers.provider.getBalance(
              factoryAddress
            )
          ).to.equal(
            launchBQuoteBefore
          );
      
          /*
           * Launch A's exact liquidity inventory
           * must be in A's pool.
           */
          const poolAAddress =
            await migrationAdapter
              .migrationPool(
                launchA.token
              );
      
          expect(
            poolAAddress
          ).to.not.equal(
            ethers.ZeroAddress
          );
      
          expect(
            await tokenA.balanceOf(
              poolAAddress
            )
          ).to.equal(
            launchA.liquiditySupply
          );
      
          expect(
            await ethers.provider.getBalance(
              poolAAddress
            )
          ).to.equal(
            launchAQuoteBefore
          );
      
          /*
           * Launch B must have no migration state.
           */
          expect(
            await migrationAdapter.migrated(
              launchB.token
            )
          ).to.equal(false);
      
          expect(
            await migrationAdapter
              .migrationPool(
                launchB.token
              )
          ).to.equal(
            ethers.ZeroAddress
          );
      
          expect(
            await ammFactory.poolForToken(
              launchB.token
            )
          ).to.equal(
            ethers.ZeroAddress
          );
        }
      );

      it(
        "sends all migration LP to the burn address and leaves no usable LP custody",
        async function () {
          /*
           * Create launch.
           */
          await factory
            .connect(creator)
            .launchFairToken(
              "ARC Burn",
              "ARCBRN");
      
          let launch =
            await factory
              .fairLaunches(0);
      
          const tokenAddress =
            launch.token;
      
          /*
           * Reach exact Candidate A graduation.
           */
          const harness =
            await ethers.deployContract(
              "BondingCurveV3Harness"
            );
      
          await harness
            .waitForDeployment();
      
          const graduationCost =
            await harness.quoteForTokens(
              launch.totalSupply,
              0,
              launch.bondingSupply
            );
      
          await factory
            .connect(creator)
            .buyFairToken(
              0,
              launch.bondingSupply,
              {
                value:
                  graduationCost,
              }
            );
      
          launch =
            await factory
              .fairLaunches(0);
      
          expect(
            launch.status
          ).to.equal(1n);
      
          /*
           * Permissionless migration.
           */
          await factory
            .connect(migrator)
            .migrateFairLaunch(0);
      
          const poolAddress =
            await migrationAdapter
              .migrationPool(
                tokenAddress
              );
      
          expect(
            poolAddress
          ).to.not.equal(
            ethers.ZeroAddress
          );
      
          const pool =
            await ethers.getContractAt(
              "MockAMMPool",
              poolAddress
            );
      
          const burnAddress =
            await migrationAdapter
              .LP_BURN_ADDRESS();
      
          const lpTotalSupply =
            await pool.totalSupply();
      
          expect(
            lpTotalSupply
          ).to.be.gt(0n);
      
          /*
           * Entire LP supply must sit at the
           * configured burn address.
           */
          expect(
            await pool.balanceOf(
              burnAddress
            )
          ).to.equal(
            lpTotalSupply
          );
      
          /*
           * No usable LP custody remains with
           * any protocol or participant address.
           */
          expect(
            await pool.balanceOf(
              creator.address
            )
          ).to.equal(0n);
      
          expect(
            await pool.balanceOf(
              migrator.address
            )
          ).to.equal(0n);
      
          expect(
            await pool.balanceOf(
              await factory.getAddress()
            )
          ).to.equal(0n);
      
          expect(
            await pool.balanceOf(
              await migrationAdapter.getAddress()
            )
          ).to.equal(0n);
      
          expect(
            await pool.balanceOf(
              await ammFactory.getAddress()
            )
          ).to.equal(0n);
        }
      );

      it(
        "preserves the Candidate A 60K market cap across full LaunchFactory migration",
        async function () {
          await factory
            .connect(creator)
            .launchFairToken(
              "ARC Continuity",
              "ARCC");
      
          let launch =
            await factory
              .fairLaunches(0);
      
          const tokenAddress =
            launch.token;
      
          const harness =
            await ethers.deployContract(
              "BondingCurveV3Harness"
            );
      
          await harness
            .waitForDeployment();
      
          /*
           * Exact cost required to sell the complete
           * Candidate A bonding inventory.
           */
          const graduationCost =
            await harness.quoteForTokens(
              launch.totalSupply,
              0,
              launch.bondingSupply
            );
      
          await factory
            .connect(creator)
            .buyFairToken(
              0,
              launch.bondingSupply,
              {
                value:
                  graduationCost,
              }
            );
      
          launch =
            await factory
              .fairLaunches(0);
      
          expect(
            launch.status
          ).to.equal(1n);
      
          const quoteReserveBefore =
            launch.quoteReserve;
      
          /*
           * Final bonding price at the exact
           * graduation state.
           */
          const finalBondingPrice =
          await harness.priceAt(
            launch.totalSupply,
            launch.tokensSold
          );
      
          /*
           * Full real migration path.
           */
          await factory
            .connect(migrator)
            .migrateFairLaunch(0);
      
          const poolAddress =
            await migrationAdapter
              .migrationPool(
                tokenAddress
              );
      
          const pool =
            await ethers.getContractAt(
              "MockAMMPool",
              poolAddress
            );
      
          const poolTokenReserve =
            await pool.tokenReserve();
      
          const poolQuoteReserve =
            await pool.quoteReserve();
      
          /*
           * Opening AMM price:
           *
           * quote reserve / token reserve
           * scaled to 1e18.
           */
          const dexOpeningPrice =
            (
              poolQuoteReserve *
              WAD
            ) /
            poolTokenReserve;
      
          /*
           * Market cap:
           *
           * opening price * physical total supply.
           */
          const totalSupplyWei =
            TOTAL_SUPPLY * WAD;
      
          const dexOpeningMarketCap =
            (
              dexOpeningPrice *
              totalSupplyWei
            ) /
            WAD;
      
          const targetMarketCap =
            60_000n * WAD;
      
          /*
           * Migration must use the complete real
           * quote reserve accumulated by bonding.
           */
          expect(
            poolQuoteReserve
          ).to.equal(
            quoteReserveBefore
          );
      
          expect(
            poolTokenReserve
          ).to.equal(
            launch.liquiditySupply
          );
      
          /*
           * Candidate A was mathematically designed
           * for bonding -> DEX price continuity.
           *
           * Integer arithmetic may differ by a tiny
           * number of wei, so use a very small
           * absolute tolerance rather than requiring
           * bit-for-bit equality.
           */
          const priceDifference =
            finalBondingPrice >
            dexOpeningPrice
              ? finalBondingPrice -
                dexOpeningPrice
              : dexOpeningPrice -
                finalBondingPrice;
      
          expect(
            priceDifference
          ).to.be.lte(1n);
      
          /*
           * Opening market cap should remain
           * effectively 60,000 quote units.
           */
          const mcDifference =
            dexOpeningMarketCap >
            targetMarketCap
              ? dexOpeningMarketCap -
                targetMarketCap
              : targetMarketCap -
                dexOpeningMarketCap;
      
          expect(
            mcDifference
          ).to.be.lte(
            1_000_000_000n
          );
      
          console.log(
            "\n    ARC FULL MIGRATION CONTINUITY"
          );
      
          console.log(
            "    final bonding price:",
            finalBondingPrice.toString()
          );
      
          console.log(
            "    DEX opening price:",
            dexOpeningPrice.toString()
          );
      
          console.log(
            "    DEX opening MC:",
            dexOpeningMarketCap.toString()
          );
        }
      );

      it(
        "rejects migration for an invalid launch ID without touching protocol state",
        async function () {
          const factoryAddress =
            await factory.getAddress();
      
          const adapterAddress =
            await migrationAdapter
              .getAddress();
      
          const factoryBalanceBefore =
            await ethers.provider.getBalance(
              factoryAddress
            );
      
          const adapterBalanceBefore =
            await ethers.provider.getBalance(
              adapterAddress
            );
      
          /*
           * No launch with ID 999 exists.
           */
          await expect(
            factory
              .connect(migrator)
              .migrateFairLaunch(999)
          ).to.be.revert(
            ethers,
            "InvalidLaunch"
          );
      
          /*
           * No native value may move.
           */
          expect(
            await ethers.provider.getBalance(
              factoryAddress
            )
          ).to.equal(
            factoryBalanceBefore
          );
      
          expect(
            await ethers.provider.getBalance(
              adapterAddress
            )
          ).to.equal(
            adapterBalanceBefore
          );
      
          /*
           * No AMM pool may have been created.
           */
          await expect(
            ammFactory.allPools(0)
          ).to.be.revert(
            ethers
          );
        }
      );

      it(
        "migrates only the launch quoteReserve and preserves forced native excess in LaunchFactory",
        async function () {
          await factory
            .connect(creator)
            .launchFairToken(
              "ARC Forced",
              "ARCF");
      
          let launch =
            await factory
              .fairLaunches(0);
      
          const tokenAddress =
            launch.token;
      
          const harness =
            await ethers.deployContract(
              "BondingCurveV3Harness"
            );
      
          await harness
            .waitForDeployment();
      
          const graduationCost =
            await harness.quoteForTokens(
              launch.totalSupply,
              0,
              launch.bondingSupply
            );
      
          /*
           * Reach exact graduation.
           */
          await factory
            .connect(creator)
            .buyFairToken(
              0,
              launch.bondingSupply,
              {
                value:
                  graduationCost,
              }
            );
      
          launch =
            await factory
              .fairLaunches(0);
      
          expect(
            launch.status
          ).to.equal(1n);
      
          const quoteReserve =
            launch.quoteReserve;
      
          const factoryAddress =
            await factory.getAddress();
      
          /*
           * Simulate native balance that exists outside
           * LaunchFactory's per-launch accounting.
           *
           * hardhat_setBalance is intentionally used here
           * to model an externally forced/excess balance
           * without requiring LaunchFactory.receive().
           */
          const forcedExcess =
            123n * WAD;
      
          await ethers.provider.send(
            "hardhat_setBalance",
            [
              factoryAddress,
              ethers.toBeHex(
                quoteReserve +
                forcedExcess
              ),
            ]
          );
      
          expect(
            await ethers.provider.getBalance(
              factoryAddress
            )
          ).to.equal(
            quoteReserve +
            forcedExcess
          );
      
          /*
           * Accounting must still recognize only the
           * real launch liability.
           */
          launch =
            await factory
              .fairLaunches(0);
      
          expect(
            launch.quoteReserve
          ).to.equal(
            quoteReserve
          );
      
          /*
           * Migrate the launch.
           */
          await factory
            .connect(migrator)
            .migrateFairLaunch(0);
      
          launch =
            await factory
              .fairLaunches(0);
      
          expect(
            launch.status
          ).to.equal(2n);
      
          expect(
            launch.quoteReserve
          ).to.equal(0n);
      
          const poolAddress =
            await migrationAdapter
              .migrationPool(
                tokenAddress
              );
      
          const pool =
            await ethers.getContractAt(
              "MockAMMPool",
              poolAddress
            );
      
          /*
           * Pool receives exactly the launch liability,
           * never the unrelated excess.
           */
          expect(
            await pool.quoteReserve()
          ).to.equal(
            quoteReserve
          );
      
          expect(
            await ethers.provider.getBalance(
              poolAddress
            )
          ).to.equal(
            quoteReserve
          );
      
          /*
           * Forced/excess balance must remain untouched
           * inside LaunchFactory.
           */
          expect(
            await ethers.provider.getBalance(
              factoryAddress
            )
          ).to.equal(
            forcedExcess
          );
      
          /*
           * Adapter must not retain any of either amount.
           */
          expect(
            await ethers.provider.getBalance(
              await migrationAdapter
                .getAddress()
            )
          ).to.equal(0n);
        }
      );

      it(
        "migrates two graduated launches sequentially without cross-launch contamination",
        async function () {

            await ethers.provider.send(
                "hardhat_setBalance",
                [
                  creator.address,
                  ethers.toBeHex(
                    50_000n * WAD
                  ),
                ]
              );

          /*
           * Create Launch A and Launch B.
           */
          await factory
            .connect(creator)
            .launchFairToken(
              "ARC Alpha",
              "ARCA");
      
          await factory
            .connect(creator)
            .launchFairToken(
              "ARC Beta",
              "ARCB");
      
          let launchA =
            await factory
              .fairLaunches(0);
      
          let launchB =
            await factory
              .fairLaunches(1);
      
          const tokenA =
            await ethers.getContractAt(
              "MemeToken",
              launchA.token
            );
      
          const tokenB =
            await ethers.getContractAt(
              "MemeToken",
              launchB.token
            );
      
          const harness =
            await ethers.deployContract(
              "BondingCurveV3Harness"
            );
      
          await harness
            .waitForDeployment();
      
          /*
           * Graduate Launch A.
           */
          const graduationCostA =
            await harness.quoteForTokens(
              launchA.totalSupply,
              0,
              launchA.bondingSupply
            );
      
          await factory
            .connect(creator)
            .buyFairToken(
              0,
              launchA.bondingSupply,
              {
                value:
                  graduationCostA,
              }
            );
      
          /*
           * Graduate Launch B.
           */
          const graduationCostB =
            await harness.quoteForTokens(
              launchB.totalSupply,
              0,
              launchB.bondingSupply
            );
      
          await factory
            .connect(creator)
            .buyFairToken(
              1,
              launchB.bondingSupply,
              {
                value:
                  graduationCostB,
              }
            );
      
          launchA =
            await factory
              .fairLaunches(0);
      
          launchB =
            await factory
              .fairLaunches(1);
      
          expect(
            launchA.status
          ).to.equal(1n);
      
          expect(
            launchB.status
          ).to.equal(1n);
      
          const quoteA =
            launchA.quoteReserve;
      
          const quoteB =
            launchB.quoteReserve;
      
          const liquidityA =
            launchA.liquiditySupply;
      
          const liquidityB =
            launchB.liquiditySupply;
      
          const factoryAddress =
            await factory.getAddress();
      
          /*
           * Before migration, Factory must hold
           * both launch liabilities.
           */
          expect(
            await ethers.provider.getBalance(
              factoryAddress
            )
          ).to.equal(
            quoteA + quoteB
          );
      
          expect(
            await tokenA.balanceOf(
              factoryAddress
            )
          ).to.equal(
            liquidityA
          );
      
          expect(
            await tokenB.balanceOf(
              factoryAddress
            )
          ).to.equal(
            liquidityB
          );
      
          /*
           * Migrate Launch A first.
           */
          await factory
            .connect(migrator)
            .migrateFairLaunch(0);
      
          launchA =
            await factory
              .fairLaunches(0);
      
          launchB =
            await factory
              .fairLaunches(1);
      
          expect(
            launchA.status
          ).to.equal(2n);
      
          expect(
            launchA.quoteReserve
          ).to.equal(0n);
      
          /*
           * Launch B must remain fully intact.
           */
          expect(
            launchB.status
          ).to.equal(1n);
      
          expect(
            launchB.quoteReserve
          ).to.equal(
            quoteB
          );
      
          expect(
            await tokenB.balanceOf(
              factoryAddress
            )
          ).to.equal(
            liquidityB
          );
      
          expect(
            await ethers.provider.getBalance(
              factoryAddress
            )
          ).to.equal(
            quoteB
          );
      
          const poolAAddress =
            await migrationAdapter
              .migrationPool(
                launchA.token
              );
      
          const poolA =
            await ethers.getContractAt(
              "MockAMMPool",
              poolAAddress
            );
      
          expect(
            await poolA.tokenReserve()
          ).to.equal(
            liquidityA
          );
      
          expect(
            await poolA.quoteReserve()
          ).to.equal(
            quoteA
          );
      
          /*
           * Migrate Launch B afterwards.
           */
          await factory
            .connect(migrator)
            .migrateFairLaunch(1);
      
          launchB =
            await factory
              .fairLaunches(1);
      
          expect(
            launchB.status
          ).to.equal(2n);
      
          expect(
            launchB.quoteReserve
          ).to.equal(0n);
      
          const poolBAddress =
            await migrationAdapter
              .migrationPool(
                launchB.token
              );
      
          const poolB =
            await ethers.getContractAt(
              "MockAMMPool",
              poolBAddress
            );
      
          expect(
            await poolB.tokenReserve()
          ).to.equal(
            liquidityB
          );
      
          expect(
            await poolB.quoteReserve()
          ).to.equal(
            quoteB
          );
      
          /*
           * Pools must be different and isolated.
           */
          expect(
            poolAAddress
          ).to.not.equal(
            poolBAddress
          );
      
          /*
           * Factory should retain no migration
           * liability after both migrations.
           */
          expect(
            await ethers.provider.getBalance(
              factoryAddress
            )
          ).to.equal(0n);
      
          expect(
            await tokenA.balanceOf(
              factoryAddress
            )
          ).to.equal(0n);
      
          expect(
            await tokenB.balanceOf(
              factoryAddress
            )
          ).to.equal(0n);
      
          /*
           * Both migrations must be permanently
           * recorded independently.
           */
          expect(
            await migrationAdapter.migrated(
              launchA.token
            )
          ).to.equal(true);
      
          expect(
            await migrationAdapter.migrated(
              launchB.token
            )
          ).to.equal(true);
      
          expect(
            await migrationAdapter
              .migrationPool(
                launchA.token
              )
          ).to.equal(
            poolAAddress
          );
      
          expect(
            await migrationAdapter
              .migrationPool(
                launchB.token
              )
          ).to.equal(
            poolBAddress
          );
        }
      );

      it(
        "rejects an EOA as the immutable MigrationAdapter dependency",
        async function () {
          /*
           * An immutable migration dependency must be
           * deployed contract code, not an EOA.
           *
           * Otherwise LaunchFactory could deploy
           * successfully but every future graduation
           * would become permanently unmigratable.
           */
          await expect(
            ethers.deployContract(
              "LaunchFactory",
              [
                creator.address,
              ]
            )
          ).to.be.revert(
            ethers,
            "InvalidMigrationAdapter"
          );
        }
      );

      it(
        "rejects a contract that does not implement the required MigrationAdapter boundary",
        async function () {
          const invalidAdapter =
            await ethers.deployContract(
              "InvalidMigrationAdapter"
            );
      
          await invalidAdapter
            .waitForDeployment();
      
          await expect(
            ethers.deployContract(
              "LaunchFactory",
              [
                await invalidAdapter
                  .getAddress(),
              ]
            )
          ).to.be.revert(
            ethers,
            "InvalidMigrationAdapter"
          );
        }
      );

      it(
        "prevents an external token holder from preempting official migration through the Adapter",
        async function () {
          /*
           * M.4 SECURITY REGRESSION
           *
           * A legitimate ARC token holder must not be
           * able to bypass LaunchFactory and consume
           * the token's migration slot directly through
           * MigrationAdapter.
           */
      
          const [
            creator,
            attacker,
          ] =
            await ethers.getSigners();
      
          /*
           * Deploy the real migration stack.
           */
          const ammFactory =
            await ethers.deployContract(
              "MockAMMFactory"
            );
      
          await ammFactory
            .waitForDeployment();
      
          const adapter =
            await ethers.deployContract(
              "MigrationAdapter",
              [
                await ammFactory
                  .getAddress(),
              ]
            );
      
          await adapter
            .waitForDeployment();
      
          const factory =
            await ethers.deployContract(
              "LaunchFactory",
              [
                await adapter
                  .getAddress(),
              ]
            );
      
          await factory
            .waitForDeployment();
      
          /*
           * Create a normal ARC fair launch.
           *
           * No dev buy, so it starts ACTIVE.
           */
          await factory
            .connect(creator)
            .launchFairToken(
              "M4 Attack Token",
              "M4ATK");
      
          const launch =
            await factory
              .fairLaunches(0);
      
          expect(
            launch.status
          ).to.equal(0n);
      
          const token =
            await ethers.getContractAt(
              "MemeToken",
              launch.token
            );
      
          /*
           * Attacker legitimately buys tokens.
           *
           * Being a real holder must NOT grant
           * migration authority.
           */
          const attackerBuy =
            ethers.parseEther("10");
      
          await factory
            .connect(attacker)
            .buyFairToken(
              0,
              0,
              {
                value: attackerBuy,
              }
            );
      
          const attackerBalance =
            await token.balanceOf(
              attacker.address
            );
      
          expect(
            attackerBalance
          ).to.be.gt(0n);
      
          const attackTokenAmount =
            attackerBalance / 2n;
      
          expect(
            attackTokenAmount
          ).to.be.gt(0n);
      
          /*
           * Attacker even gives the Adapter a valid
           * allowance.
           *
           * Authorization must still reject them.
           */
          await token
            .connect(attacker)
            .approve(
              await adapter.getAddress(),
              attackTokenAmount
            );
      
          /*
           * Critical security assertion:
           *
           * token.factory() is LaunchFactory,
           * while msg.sender here is attacker.
           *
           * Direct migration must therefore revert.
           */
          await expect(
            adapter
              .connect(attacker)
              .migrate(
                launch.token,
                attackTokenAmount,
                {
                  value:
                    ethers.parseEther("1"),
                }
              )
          ).to.be.revert(
            ethers,
            "UnauthorizedMigrationCaller"
          );
      
          /*
           * Unauthorized attempt must not consume
           * the official migration slot.
           */
          expect(
            await adapter.migrated(
              launch.token
            )
          ).to.equal(false);
      
          expect(
            await adapter.migrationPool(
              launch.token
            )
          ).to.equal(
            ethers.ZeroAddress
          );
      
          /*
           * No premature AMM pool may exist.
           */
          expect(
            await ammFactory.poolForToken(
              launch.token
            )
          ).to.equal(
            ethers.ZeroAddress
          );
      
          /*
           * Launch lifecycle remains untouched.
           */
          const launchAfter =
            await factory
              .fairLaunches(0);
      
          expect(
            launchAfter.status
          ).to.equal(0n);
      
          /*
           * No attacker tokens were pulled.
           */
          expect(
            await token.balanceOf(
              attacker.address
            )
          ).to.equal(
            attackerBalance
          );
      
          /*
           * Approval itself may still exist because
           * the attacker explicitly created it.
           *
           * The Adapter simply never gets to consume it.
           */
          expect(
            await token.allowance(
              attacker.address,
              await adapter.getAddress()
            )
          ).to.equal(
            attackTokenAmount
          );
        }
      );    
  });