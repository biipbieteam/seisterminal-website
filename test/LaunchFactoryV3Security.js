import { expect } from "chai";
import hre from "hardhat";

describe(
  "LaunchFactory V3 — Security & Isolation",
  function () {
    const WAD = 10n ** 18n;

    let ethers;
    let owner;
    let user1;
    let user2;
    let user3;
    let factory;

    beforeEach(async function () {
      ({ ethers } =
        await hre.network.getOrCreate());

      [
        owner,
        user1,
        user2,
        user3,
      ] = await ethers.getSigners();

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

      await factory.waitForDeployment();
    });


    async function createLaunch({
        creator = owner,
        name = "ARC Test",
        symbol = "ARCT",
        value = 0n,
      } = {}) {
        const launchId =
          await factory.totalFairLaunches();
      
        const tx =
          await factory
            .connect(creator)
            .launchFairToken(
              name,
              symbol,
              {
                value,
              }
            );
      
        await tx.wait();
      
        const launch =
          await factory.fairLaunches(
            launchId
          );
      
        return {
          launchId,
          launch,
          tokenAddress:
            launch.token,
        };
      }


    async function getToken(
      tokenAddress
    ) {
      return ethers.getContractAt(
        "MemeToken",
        tokenAddress
      );
    }


    async function fund(
      signer,
      amount =
        50_000n * WAD
    ) {
      await ethers.provider.send(
        "hardhat_setBalance",
        [
          signer.address,
          ethers.toBeHex(
            amount
          ),
        ]
      );
    }


    async function findExactRemainingCost(
      launchId
    ) {
      /*
       * Graduation reserve is ~17.4K for
       * Candidate A.
       *
       * 30K is intentionally above it.
       */
      let low = 1n;
      let high =
        30_000n * WAD;

      while (low < high) {
        const mid =
          low +
          (
            high -
            low +
            1n
          ) /
          2n;

        try {
          await factory.quoteBuy(
            launchId,
            mid
          );

          low = mid;
        } catch {
          high =
            mid - 1n;
        }
      }

      return low;
    }


    async function graduateLaunch(
      launchId,
      buyer
    ) {
      await fund(
        buyer,
        50_000n * WAD
      );

      const exactCost =
        await findExactRemainingCost(
          launchId
        );

      await factory
        .connect(buyer)
        .buyFairToken(
          launchId,
          0n,
          {
            value:
              exactCost,
          }
        );

      return factory.fairLaunches(
        launchId
      );
    }


    it(
      "isolates token accounting between two launches",
      async function () {
        const launchA =
          await createLaunch({
            name: "Token A",
            symbol: "TKA",
          });

        const launchB =
          await createLaunch({
            name: "Token B",
            symbol: "TKB",
          });


        await factory
          .connect(user1)
          .buyFairToken(
            launchA.launchId,
            0n,
            {
              value:
                100n * WAD,
            }
          );


        const stateA =
          await factory.fairLaunches(
            launchA.launchId
          );

        const stateB =
          await factory.fairLaunches(
            launchB.launchId
          );


        expect(
          stateA.tokensSold
        ).to.be.gt(0n);

        expect(
          stateB.tokensSold
        ).to.equal(0n);

        expect(
          stateB.quoteReserve
        ).to.equal(0n);
      }
    );


    it(
      "isolates quote reserves between two launches",
      async function () {
        const launchA =
          await createLaunch({
            name: "Reserve A",
            symbol: "RSA",
          });

        const launchB =
          await createLaunch({
            name: "Reserve B",
            symbol: "RSB",
          });


        await factory
          .connect(user1)
          .buyFairToken(
            launchA.launchId,
            0n,
            {
              value:
                111n * WAD,
            }
          );


        await factory
          .connect(user2)
          .buyFairToken(
            launchB.launchId,
            0n,
            {
              value:
                222n * WAD,
            }
          );


        const stateA =
          await factory.fairLaunches(
            launchA.launchId
          );

        const stateB =
          await factory.fairLaunches(
            launchB.launchId
          );


        expect(
          stateA.quoteReserve
        ).to.be.gt(0n);

        expect(
          stateB.quoteReserve
        ).to.be.gt(0n);

        expect(
          stateA.quoteReserve
        ).to.not.equal(
          stateB.quoteReserve
        );
      }
    );


    it(
      "keeps total native balance equal to the sum of launch reserves",
      async function () {
        const launchA =
          await createLaunch({
            name: "Balance A",
            symbol: "BLA",
          });

        const launchB =
          await createLaunch({
            name: "Balance B",
            symbol: "BLB",
          });


        await factory
          .connect(user1)
          .buyFairToken(
            launchA.launchId,
            0n,
            {
              value:
                137n * WAD +
                12345n,
            }
          );


        await factory
          .connect(user2)
          .buyFairToken(
            launchB.launchId,
            0n,
            {
              value:
                291n * WAD +
                98765n,
            }
          );


        const stateA =
          await factory.fairLaunches(
            launchA.launchId
          );

        const stateB =
          await factory.fairLaunches(
            launchB.launchId
          );


        const balance =
          await ethers.provider
            .getBalance(
              await factory
                .getAddress()
            );


        expect(
          balance
        ).to.equal(
          stateA.quoteReserve +
          stateB.quoteReserve
        );
      }
    );


    it(
      "selling from launch A does not modify launch B reserve",
      async function () {
        const launchA =
          await createLaunch({
            name: "Sell A",
            symbol: "SLA",
          });

        const launchB =
          await createLaunch({
            name: "Sell B",
            symbol: "SLB",
          });


        await factory
          .connect(user1)
          .buyFairToken(
            launchA.launchId,
            0n,
            {
              value:
                500n * WAD,
            }
          );


        await factory
          .connect(user2)
          .buyFairToken(
            launchB.launchId,
            0n,
            {
              value:
                700n * WAD,
            }
          );


        const beforeA =
          await factory.fairLaunches(
            launchA.launchId
          );

        const beforeB =
          await factory.fairLaunches(
            launchB.launchId
          );


        const tokenA =
          await getToken(
            launchA.tokenAddress
          );


        const sellAmount =
          beforeA.tokensSold / 2n;


        await tokenA
          .connect(user1)
          .approve(
            await factory.getAddress(),
            sellAmount
          );


        await factory
          .connect(user1)
          .sellFairToken(
            launchA.launchId,
            sellAmount,
            0n
          );


        const afterA =
          await factory.fairLaunches(
            launchA.launchId
          );

        const afterB =
          await factory.fairLaunches(
            launchB.launchId
          );


        expect(
          afterA.quoteReserve
        ).to.be.lt(
          beforeA.quoteReserve
        );

        expect(
          afterB.quoteReserve
        ).to.equal(
          beforeB.quoteReserve
        );

        expect(
          afterB.tokensSold
        ).to.equal(
          beforeB.tokensSold
        );
      }
    );


    it(
      "preserves reserve solvency after cross-launch buy and sell activity",
      async function () {
        const launchA =
          await createLaunch({
            name: "Solvent A",
            symbol: "SVA",
          });

        const launchB =
          await createLaunch({
            name: "Solvent B",
            symbol: "SVB",
          });


        await factory
          .connect(user1)
          .buyFairToken(
            launchA.launchId,
            0n,
            {
              value:
                600n * WAD,
            }
          );


        await factory
          .connect(user2)
          .buyFairToken(
            launchB.launchId,
            0n,
            {
              value:
                900n * WAD,
            }
          );


        let stateA =
          await factory.fairLaunches(
            launchA.launchId
          );


        const tokenA =
          await getToken(
            launchA.tokenAddress
          );


        const sellAmount =
          stateA.tokensSold / 3n;


        await tokenA
          .connect(user1)
          .approve(
            await factory.getAddress(),
            sellAmount
          );


        await factory
          .connect(user1)
          .sellFairToken(
            launchA.launchId,
            sellAmount,
            0n
          );


        stateA =
          await factory.fairLaunches(
            launchA.launchId
          );

        const stateB =
          await factory.fairLaunches(
            launchB.launchId
          );


        const balance =
          await ethers.provider
            .getBalance(
              await factory
                .getAddress()
            );


        const totalLiability =
          stateA.quoteReserve +
          stateB.quoteReserve;


        expect(
          balance
        ).to.be.gte(
          totalLiability
        );

        expect(
          balance
        ).to.equal(
          totalLiability
        );
      }
    );


    it(
        "enforces the fixed 1B supply independently across multiple launches",
        async function () {
          const launchA =
            await createLaunch({
              name: "Fixed A",
              symbol: "FXA",
            });
      
          const launchB =
            await createLaunch({
              name: "Fixed B",
              symbol: "FXB",
            });
      
          const stateA =
            await factory.fairLaunches(
              launchA.launchId
            );
      
          const stateB =
            await factory.fairLaunches(
              launchB.launchId
            );
      
          const fixedSupply =
            1_000_000_000n * WAD;
      
          /*
           * Every ARC Fair Launch must use the
           * exact same protocol-defined 1B supply.
           */
          expect(
            stateA.totalSupply
          ).to.equal(
            fixedSupply
          );
      
          expect(
            stateB.totalSupply
          ).to.equal(
            fixedSupply
          );
      
          /*
           * Candidate A inventory must also be
           * deterministic for every fixed-1B launch.
           */
          expect(
            stateA.bondingSupply
          ).to.equal(
            stateB.bondingSupply
          );
      
          expect(
            stateA.liquiditySupply
          ).to.equal(
            stateB.liquiditySupply
          );
      
          /*
           * Each launch independently conserves
           * its complete physical token supply.
           */
          expect(
            stateA.bondingSupply +
            stateA.liquiditySupply
          ).to.equal(
            fixedSupply
          );
      
          expect(
            stateB.bondingSupply +
            stateB.liquiditySupply
          ).to.equal(
            fixedSupply
          );
      
          /*
           * Launches must still remain separate
           * protocol instances despite sharing
           * identical fixed economics.
           */
          expect(
            launchA.launchId
          ).to.not.equal(
            launchB.launchId
          );
      
          expect(
            launchA.tokenAddress
          ).to.not.equal(
            launchB.tokenAddress
          );
        }
      );


    it(
      "rejects BUY when minTokensOut exceeds actual output",
      async function () {
        const {
          launchId,
        } = await createLaunch();


        const quote =
          100n * WAD;


        const preview =
          await factory.quoteBuy(
            launchId,
            quote
          );


        const tokensOut =
          preview[0];


        await expect(
          factory
            .connect(user1)
            .buyFairToken(
              launchId,
              tokensOut + 1n,
              {
                value:
                  quote,
              }
            )
        ).to.revert(ethers);
      }
    );


    it(
      "rejects SELL when minQuoteOut exceeds actual output",
      async function () {
        const {
          launchId,
          tokenAddress,
        } = await createLaunch();


        await factory
          .connect(user1)
          .buyFairToken(
            launchId,
            0n,
            {
              value:
                500n * WAD,
            }
          );


        const launch =
          await factory.fairLaunches(
            launchId
          );


        const token =
          await getToken(
            tokenAddress
          );


        const sellAmount =
          launch.tokensSold / 2n;


        const quoteOut =
          await factory.quoteSell(
            launchId,
            sellAmount
          );


        await token
          .connect(user1)
          .approve(
            await factory.getAddress(),
            sellAmount
          );


        await expect(
          factory
            .connect(user1)
            .sellFairToken(
              launchId,
              sellAmount,
              quoteOut + 1n
            )
        ).to.revert(ethers);
      }
    );


    it(
      "failed SELL without ERC20 approval leaves state unchanged",
      async function () {
        const {
          launchId,
          tokenAddress,
        } = await createLaunch();


        await factory
          .connect(user1)
          .buyFairToken(
            launchId,
            0n,
            {
              value:
                500n * WAD,
            }
          );


        const before =
          await factory.fairLaunches(
            launchId
          );


        const token =
          await getToken(
            tokenAddress
          );


        const userBalanceBefore =
          await token.balanceOf(
            user1.address
          );


        const factoryBalanceBefore =
          await ethers.provider
            .getBalance(
              await factory.getAddress()
            );


        await expect(
          factory
            .connect(user1)
            .sellFairToken(
              launchId,
              before.tokensSold,
              0n
            )
        ).to.revert(ethers);


        const after =
          await factory.fairLaunches(
            launchId
          );


        expect(
          after.tokensSold
        ).to.equal(
          before.tokensSold
        );


        expect(
          after.quoteReserve
        ).to.equal(
          before.quoteReserve
        );


        expect(
          await token.balanceOf(
            user1.address
          )
        ).to.equal(
          userBalanceBefore
        );


        expect(
          await ethers.provider
            .getBalance(
              await factory.getAddress()
            )
        ).to.equal(
          factoryBalanceBefore
        );
      }
    );


    it(
      "rejects BUY after launch reaches GRADUATING",
      async function () {
        const {
          launchId,
        } = await createLaunch();


        const graduated =
          await graduateLaunch(
            launchId,
            user1
          );


        expect(
          graduated.status
        ).to.equal(1n);


        await expect(
          factory
            .connect(user2)
            .buyFairToken(
              launchId,
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
      "rejects SELL after launch reaches GRADUATING",
      async function () {
        const {
          launchId,
          tokenAddress,
        } = await createLaunch();


        await graduateLaunch(
          launchId,
          user1
        );


        const launch =
          await factory.fairLaunches(
            launchId
          );


        const token =
          await getToken(
            tokenAddress
          );


        await token
          .connect(user1)
          .approve(
            await factory.getAddress(),
            launch.tokensSold
          );


        await expect(
          factory
            .connect(user1)
            .sellFairToken(
              launchId,
              1n * WAD,
              0n
            )
        ).to.revert(ethers);
      }
    );


    it(
      "cannot execute a second final fill after GRADUATING",
      async function () {
        const {
          launchId,
        } = await createLaunch();


        await graduateLaunch(
          launchId,
          user1
        );


        const before =
          await factory.fairLaunches(
            launchId
          );


        await expect(
          factory
            .connect(user2)
            .buyFairToken(
              launchId,
              0n,
              {
                value:
                  1n * WAD,
              }
            )
        ).to.revert(ethers);


        const after =
          await factory.fairLaunches(
            launchId
          );


        expect(
          after.tokensSold
        ).to.equal(
          before.tokensSold
        );


        expect(
          after.quoteReserve
        ).to.equal(
          before.quoteReserve
        );


        expect(
          after.status
        ).to.equal(
          before.status
        );
      }
    );


    it(
      "one graduated launch does not freeze another ACTIVE launch",
      async function () {
        const launchA =
          await createLaunch({
            name: "Graduate A",
            symbol: "GRA",
          });

        const launchB =
          await createLaunch({
            name: "Active B",
            symbol: "ACB",
          });


        await graduateLaunch(
          launchA.launchId,
          user1
        );


        const beforeB =
          await factory.fairLaunches(
            launchB.launchId
          );


        expect(
          beforeB.status
        ).to.equal(0n);


        await factory
          .connect(user2)
          .buyFairToken(
            launchB.launchId,
            0n,
            {
              value:
                100n * WAD,
            }
          );


        const afterB =
          await factory.fairLaunches(
            launchB.launchId
          );


        expect(
          afterB.status
        ).to.equal(0n);

        expect(
          afterB.tokensSold
        ).to.be.gt(0n);
      }
    );


    it(
      "forced native balance does not modify per-launch reserve accounting",
      async function () {
        const {
          launchId,
        } = await createLaunch();


        await factory
          .connect(user1)
          .buyFairToken(
            launchId,
            0n,
            {
              value:
                100n * WAD,
            }
          );


        const before =
          await factory.fairLaunches(
            launchId
          );


        const factoryAddress =
          await factory.getAddress();


        const balanceBefore =
          await ethers.provider
            .getBalance(
              factoryAddress
            );


        /*
         * Simulate unrelated / forced native
         * balance at the address.
         *
         * This changes actual ETH/native balance,
         * but MUST NOT alter launch.quoteReserve.
         */
        await ethers.provider.send(
          "hardhat_setBalance",
          [
            factoryAddress,
            ethers.toBeHex(
              balanceBefore +
              777n * WAD
            ),
          ]
        );


        const after =
          await factory.fairLaunches(
            launchId
          );


        const balanceAfter =
          await ethers.provider
            .getBalance(
              factoryAddress
            );


        expect(
          after.quoteReserve
        ).to.equal(
          before.quoteReserve
        );


        expect(
          balanceAfter
        ).to.equal(
          balanceBefore +
          777n * WAD
        );


        expect(
          balanceAfter
        ).to.be.gt(
          after.quoteReserve
        );
      }
    );


    it(
      "sum of launch liabilities remains below or equal to Factory native balance after forced funds",
      async function () {
        const launchA =
          await createLaunch({
            name: "Liability A",
            symbol: "LIA",
          });

        const launchB =
          await createLaunch({
            name: "Liability B",
            symbol: "LIB",
          });


        await factory
          .connect(user1)
          .buyFairToken(
            launchA.launchId,
            0n,
            {
              value:
                123n * WAD,
            }
          );


        await factory
          .connect(user2)
          .buyFairToken(
            launchB.launchId,
            0n,
            {
              value:
                456n * WAD,
            }
          );


        const stateA =
          await factory.fairLaunches(
            launchA.launchId
          );

        const stateB =
          await factory.fairLaunches(
            launchB.launchId
          );


        const liabilities =
          stateA.quoteReserve +
          stateB.quoteReserve;


        const factoryAddress =
          await factory.getAddress();


        const balanceBefore =
          await ethers.provider
            .getBalance(
              factoryAddress
            );


        expect(
          balanceBefore
        ).to.equal(
          liabilities
        );


        await ethers.provider.send(
          "hardhat_setBalance",
          [
            factoryAddress,
            ethers.toBeHex(
              balanceBefore +
              10n * WAD
            ),
          ]
        );


        const balanceAfter =
          await ethers.provider
            .getBalance(
              factoryAddress
            );


        expect(
          balanceAfter
        ).to.be.gte(
          liabilities
        );
      }
    );


    it(
      "preserves physical inventory isolation across launches",
      async function () {
        const launchA =
          await createLaunch({
            name: "Inventory A",
            symbol: "IVA",
          });

        const launchB =
          await createLaunch({
            name: "Inventory B",
            symbol: "IVB",
          });


        const tokenA =
          await getToken(
            launchA.tokenAddress
          );

        const tokenB =
          await getToken(
            launchB.tokenAddress
          );


        await factory
          .connect(user1)
          .buyFairToken(
            launchA.launchId,
            0n,
            {
              value:
                333n * WAD,
            }
          );


        const stateA =
          await factory.fairLaunches(
            launchA.launchId
          );

        const stateB =
          await factory.fairLaunches(
            launchB.launchId
          );


        const factoryAddress =
          await factory.getAddress();


        expect(
          await tokenA.balanceOf(
            factoryAddress
          )
        ).to.equal(
          stateA.totalSupply -
          stateA.tokensSold
        );


        expect(
          await tokenB.balanceOf(
            factoryAddress
          )
        ).to.equal(
          stateB.totalSupply
        );


        expect(
          stateB.tokensSold
        ).to.equal(0n);
      }
    );


    it(
      "preserves accounting through dev buy plus public buy plus sell",
      async function () {
        const devQuote =
          100n * WAD;


        const {
          launchId,
          tokenAddress,
        } =
          await createLaunch({
            value:
              devQuote,
          });


        await factory
          .connect(user1)
          .buyFairToken(
            launchId,
            0n,
            {
              value:
                700n * WAD,
            }
          );


        let launch =
          await factory.fairLaunches(
            launchId
          );


        const token =
          await getToken(
            tokenAddress
          );


        const userBalance =
          await token.balanceOf(
            user1.address
          );


        const sellAmount =
          userBalance / 2n;


        await token
          .connect(user1)
          .approve(
            await factory.getAddress(),
            sellAmount
          );


        await factory
          .connect(user1)
          .sellFairToken(
            launchId,
            sellAmount,
            0n
          );


        launch =
          await factory.fairLaunches(
            launchId
          );


        const creatorBalance =
          await token.balanceOf(
            owner.address
          );

        const remainingUserBalance =
          await token.balanceOf(
            user1.address
          );

        const factoryTokenBalance =
          await token.balanceOf(
            await factory.getAddress()
          );


        expect(
          creatorBalance +
          remainingUserBalance
        ).to.equal(
          launch.tokensSold
        );


        expect(
          factoryTokenBalance +
          launch.tokensSold
        ).to.equal(
          launch.totalSupply
        );


        expect(
          await ethers.provider.getBalance(
            await factory.getAddress()
          )
        ).to.equal(
          launch.quoteReserve
        );
      }
    );


    it(
      "keeps graduated launch inventory exactly equal to liquiditySupply while another launch remains active",
      async function () {
        const launchA =
          await createLaunch({
            name: "Final A",
            symbol: "FNA",
          });

        const launchB =
          await createLaunch({
            name: "Live B",
            symbol: "LVB",
          });


        await graduateLaunch(
          launchA.launchId,
          user1
        );


        await factory
          .connect(user2)
          .buyFairToken(
            launchB.launchId,
            0n,
            {
              value:
                321n * WAD,
            }
          );


        const stateA =
          await factory.fairLaunches(
            launchA.launchId
          );

        const stateB =
          await factory.fairLaunches(
            launchB.launchId
          );


        const tokenA =
          await getToken(
            launchA.tokenAddress
          );

        const tokenB =
          await getToken(
            launchB.tokenAddress
          );


        const factoryAddress =
          await factory.getAddress();


        expect(
          stateA.status
        ).to.equal(1n);


        expect(
          await tokenA.balanceOf(
            factoryAddress
          )
        ).to.equal(
          stateA.liquiditySupply
        );


        expect(
          stateB.status
        ).to.equal(0n);


        expect(
          await tokenB.balanceOf(
            factoryAddress
          )
        ).to.equal(
          stateB.totalSupply -
          stateB.tokensSold
        );
      }
    );
  }
);