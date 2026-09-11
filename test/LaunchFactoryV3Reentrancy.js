import { expect } from "chai";
import hre from "hardhat";

describe(
  "LaunchFactory V3 — Reentrancy Adversarial",
  function () {
    const WAD =
      10n ** 18n;

    let ethers;

    let owner;
    let user1;

    let factory;
    let attacker;


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


            const migrationAdapter =
            await ethers.deployContract(
              "MockMigrationAdapter"
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
          
          await factory.waitForDeployment();


        await factory
          .waitForDeployment();


        attacker =
          await ethers
            .deployContract(
              "LaunchFactoryV3ReentrancyAttacker",
              [
                await factory
                  .getAddress(),
              ]
            );


        await attacker
          .waitForDeployment();
      }
    );


    async function createLaunch(
        {
          name = "ARC Attack",
          symbol = "ATK",
        } = {}
      ) {
        const launchId =
          await factory
            .totalFairLaunches();
      
        const tx =
          await factory
            .launchFairToken(
              name,
              symbol
            );
      
        await tx.wait();
      
        const launch =
          await factory
            .fairLaunches(
              launchId
            );
      
        const token =
          await ethers
            .getContractAt(
              "MemeToken",
              launch.token
            );
      
        return {
          launchId,
          launch,
          token,
        };
      }




    it(
      "blocks reentrant SELL during native payout callback",
      async function () {
        const {
          launchId,
          token,
        } =
          await createLaunch();


        /*
         * Buy tokens directly to attacker
         * contract by having attacker perform
         * the outer BUY.
         *
         * We don't need refund callback attack
         * here, so use attackBuyRefund only as
         * a convenient way for attacker to own
         * curve tokens.
         */
        let buyValue =
          500n * WAD +
          987654321n;


        /*
         * For setup we intentionally allow
         * the attack callback to occur.
         * nonReentrant should block it.
         */
        await attacker
          .attackBuyRefund(
            launchId,
            0n,
            1n,
            {
              value:
                buyValue,
            }
          );


        const attackerAddress =
          await attacker
            .getAddress();


        const attackerTokens =
          await token.balanceOf(
            attackerAddress
          );


        expect(
          attackerTokens
        ).to.be.gt(0n);


        /*
         * Sell half so the attacker still
         * owns tokens during callback.
         * That makes the nested SELL a
         * meaningful attack attempt.
         */
        const sellAmount =
          attackerTokens / 2n;


        const expectedQuote =
          await factory
            .quoteSell(
              launchId,
              sellAmount
            );


        const before =
          await factory
            .fairLaunches(
              launchId
            );


        const attackerNativeBefore =
          await ethers.provider
            .getBalance(
              attackerAddress
            );


        await attacker
          .attackSellPayout(
            await token
              .getAddress(),
            launchId,
            sellAmount,
            0n
          );


        const after =
          await factory
            .fairLaunches(
              launchId
            );


        expect(
          await attacker
            .reentryAttempted()
        ).to.equal(
          true
        );


        expect(
          await attacker
            .reentrySucceeded()
        ).to.equal(
          false
        );


        expect(
          await attacker
            .callbackCount()
        ).to.be.gte(
          1n
        );


        /*
         * Exactly one SELL was applied.
         */
        expect(
          before.tokensSold -
          after.tokensSold
        ).to.equal(
          sellAmount
        );


        expect(
          before.quoteReserve -
          after.quoteReserve
        ).to.equal(
          expectedQuote
        );


        expect(
          await token.balanceOf(
            attackerAddress
          )
        ).to.equal(
          attackerTokens -
          sellAmount
        );


        const attackerNativeAfter =
          await ethers.provider
            .getBalance(
              attackerAddress
            );


        expect(
          attackerNativeAfter -
          attackerNativeBefore
        ).to.equal(
          expectedQuote
        );


        /*
         * No quote was stolen from Factory.
         */
        const factoryBalance =
          await ethers.provider
            .getBalance(
              await factory
                .getAddress()
            );


        expect(
          factoryBalance
        ).to.equal(
          after.quoteReserve
        );
      }
    );


    it(
      "preserves physical token conservation after blocked BUY reentrancy",
      async function () {
        const {
          launchId,
          token,
        } =
          await createLaunch();


        await attacker
          .attackBuyRefund(
            launchId,
            0n,
            1n,
            {
              value:
                250n * WAD +
                12345n,
            }
          );


        const launch =
          await factory
            .fairLaunches(
              launchId
            );


        const factoryTokens =
          await token.balanceOf(
            await factory
              .getAddress()
          );


        const attackerTokens =
          await token.balanceOf(
            await attacker
              .getAddress()
          );


        expect(
          factoryTokens +
          attackerTokens
        ).to.equal(
          launch.totalSupply
        );


        expect(
          attackerTokens
        ).to.equal(
          launch.tokensSold
        );
      }
    );


    it(
      "preserves token and quote conservation after blocked SELL reentrancy",
      async function () {
        const {
          launchId,
          token,
        } =
          await createLaunch();


        await attacker
          .attackBuyRefund(
            launchId,
            0n,
            1n,
            {
              value:
                750n * WAD +
                54321n,
            }
          );


        const attackerAddress =
          await attacker
            .getAddress();


        const bought =
          await token.balanceOf(
            attackerAddress
          );


        const sellAmount =
          bought / 3n;


        await attacker
          .attackSellPayout(
            await token
              .getAddress(),
            launchId,
            sellAmount,
            0n
          );


        const launch =
          await factory
            .fairLaunches(
              launchId
            );


        const attackerTokens =
          await token.balanceOf(
            attackerAddress
          );


        const factoryTokens =
          await token.balanceOf(
            await factory
              .getAddress()
          );


        /*
         * Only two token holders exist in
         * this test:
         *
         * Factory + attacker.
         */
        expect(
          factoryTokens +
          attackerTokens
        ).to.equal(
          launch.totalSupply
        );


        expect(
          attackerTokens
        ).to.equal(
          launch.tokensSold
        );


        expect(
          await ethers.provider
            .getBalance(
              await factory
                .getAddress()
            )
        ).to.equal(
          launch.quoteReserve
        );
      }
    );


    it(
      "does not allow repeated callback attempts to create extra state transitions",
      async function () {
        const {
          launchId,
        } =
          await createLaunch();


        const before =
          await factory
            .fairLaunches(
              launchId
            );


        const quote =
          333n * WAD +
          777777n;


        const preview =
          await factory
            .quoteBuy(
              launchId,
              quote
            );


        await attacker
          .attackBuyRefund(
            launchId,
            0n,
            1n,
            {
              value:
                quote,
            }
          );


        const after =
          await factory
            .fairLaunches(
              launchId
            );


        expect(
          after.tokensSold -
          before.tokensSold
        ).to.equal(
          preview[0]
        );


        expect(
          after.quoteReserve -
          before.quoteReserve
        ).to.equal(
          preview[1]
        );


        expect(
          await attacker
            .reentrySucceeded()
        ).to.equal(
          false
        );
      }
    );
  }
);