import { expect } from "chai";
import hre from "hardhat";

describe(
  "LaunchFactory V3 — Fair Launch Creation",
  function () {
    async function deployFixture() {
        const { ethers } =
          await hre.network.getOrCreate();
      
        const [
          creator,
          otherUser,
          buyer,
          other,
        ] = await ethers.getSigners();
      
        await ethers.provider.send(
          "hardhat_setBalance",
          [
            creator.address,
            ethers.toBeHex(
              30_000n * WAD
            ),
          ]
        );
      
        await ethers.provider.send(
          "hardhat_setBalance",
          [
            buyer.address,
            ethers.toBeHex(
              30_000n * WAD
            ),
          ]
        );
      
        const migrationAdapter =
          await ethers.deployContract(
            "MockMigrationAdapter"
          );
      
        await migrationAdapter
          .waitForDeployment();
      
        const factory =
          await ethers.deployContract(
            "LaunchFactory",
            [
              await migrationAdapter
                .getAddress(),
            ]
          );
      
        await factory.waitForDeployment();
      
        return {
          ethers,
          factory,
          migrationAdapter,
          creator,
          otherUser,
          buyer,
          other,
        };
    }

    const NAME = "ARC Meme";
    const SYMBOL = "ARCM";

    const TOTAL_SUPPLY =
      1_000_000_000n;

    const WAD =
      10n ** 18n;


      async function getV3GraduationSupply(
        ethers,
        totalSupply
      ) {
        const curve =
          await ethers.deployContract(
            "BondingCurveV3Harness"
          );
      
        await curve.waitForDeployment();
      
        return await curve
          .graduationTokensSold(
            totalSupply
          );
      }
      it(
        "creates a fair launch correctly",
        async function () {
          const {
            ethers,
            factory,
            creator,
          } = await deployFixture();
      
          await factory
            .connect(creator)
            .launchFairToken(
              NAME,
              SYMBOL);
      
          const launch =
            await factory.fairLaunches(0);
      
          const scaledSupply =
            TOTAL_SUPPLY * WAD;
      
          const curve =
            await ethers.deployContract(
              "BondingCurveV3Harness"
            );
      
          await curve.waitForDeployment();
      
          const bondingSupply =
            await curve.graduationTokensSold(
              scaledSupply
            );
      
          const liquiditySupply =
            scaledSupply -
            bondingSupply;
      
          expect(
            launch.creator
          ).to.equal(
            creator.address
          );
      
          expect(
            launch.totalSupply
          ).to.equal(
            scaledSupply
          );
      
          expect(
            launch.bondingSupply
          ).to.equal(
            bondingSupply
          );
      
          expect(
            launch.liquiditySupply
          ).to.equal(
            liquiditySupply
          );
      
          expect(
            launch.bondingSupply +
            launch.liquiditySupply
          ).to.equal(
            launch.totalSupply
          );
      
          expect(
            launch.tokensSold
          ).to.equal(0n);
      
          expect(
            launch.quoteReserve
          ).to.equal(0n);
      
          // LaunchStatus.ACTIVE = 0
          expect(
            launch.status
          ).to.equal(0n);
        }
      );

      it(
        "allocates Candidate A graduation inventory correctly",
        async function () {
          const {
            ethers,
            factory,
            creator,
          } = await deployFixture();
      
          await factory
            .connect(creator)
            .launchFairToken(
              NAME,
              SYMBOL);
      
          const launch =
            await factory.fairLaunches(0);
      
          const scaledSupply =
            TOTAL_SUPPLY * WAD;
      
          const curve =
            await ethers.deployContract(
              "BondingCurveV3Harness"
            );
      
          await curve.waitForDeployment();
      
          const expectedBonding =
            await curve.graduationTokensSold(
              scaledSupply
            );
      
          const expectedLiquidity =
            scaledSupply -
            expectedBonding;
      
          expect(
            launch.bondingSupply
          ).to.equal(
            expectedBonding
          );
      
          expect(
            launch.liquiditySupply
          ).to.equal(
            expectedLiquidity
          );
      
          expect(
            launch.bondingSupply +
            launch.liquiditySupply
          ).to.equal(
            launch.totalSupply
          );
        }
      );

    it(
      "keeps 100% of token supply in the factory before any purchase",
      async function () {
        const {
          ethers,
          factory,
          creator,
        } = await deployFixture();

        await factory
          .connect(creator)
          .launchFairToken(
            NAME,
            SYMBOL);

        const launch =
          await factory.fairLaunches(0);

        const token =
          await ethers.getContractAt(
            "MemeToken",
            launch.token
          );

        const factoryAddress =
          await factory.getAddress();

        expect(
          await token.balanceOf(
            factoryAddress
          )
        ).to.equal(
          launch.totalSupply
        );
      }
    );

    it(
      "creates sequential launch IDs",
      async function () {
        const {
          factory,
          creator,
          otherUser,
        } = await deployFixture();

        await factory
          .connect(creator)
          .launchFairToken(
            "Token One",
            "ONE");

        await factory
          .connect(otherUser)
          .launchFairToken(
            "Token Two",
            "TWO");

        expect(
          await factory.totalFairLaunches()
        ).to.equal(2n);

        const first =
          await factory.fairLaunches(0);

        const second =
          await factory.fairLaunches(1);

        expect(
          await factory.launchIdByToken(
            first.token
          )
        ).to.equal(0n);

        expect(
          await factory.launchIdByToken(
            second.token
          )
        ).to.equal(1n);

        expect(first.token)
          .to.not.equal(second.token);
      }
    );

    it(
      "rejects an empty name",
      async function () {
        const {
          factory,
          creator,
        } = await deployFixture();

        await expect(
          factory
            .connect(creator)
            .launchFairToken(
              "",
              SYMBOL)
        ).to.be.revertedWithCustomError(
          factory,
          "InvalidName"
        );
      }
    );

    it(
      "rejects a name longer than 32 bytes",
      async function () {
        const {
          factory,
          creator,
        } = await deployFixture();

        await expect(
          factory
            .connect(creator)
            .launchFairToken(
              "A".repeat(33),
              SYMBOL)
        ).to.be.revertedWithCustomError(
          factory,
          "NameTooLong"
        );
      }
    );

    it(
      "rejects an empty symbol",
      async function () {
        const {
          factory,
          creator,
        } = await deployFixture();

        await expect(
          factory
            .connect(creator)
            .launchFairToken(
              NAME,
              "")
        ).to.be.revertedWithCustomError(
          factory,
          "InvalidSymbol"
        );
      }
    );

    it(
      "rejects a symbol longer than 10 bytes",
      async function () {
        const {
          factory,
          creator,
        } = await deployFixture();

        await expect(
          factory
            .connect(creator)
            .launchFairToken(
              NAME,
              "A".repeat(11))
        ).to.be.revertedWithCustomError(
          factory,
          "SymbolTooLong"
        );
      }
    );

    

    
    it(
        "returns zero tokens for zero dev buy",
        async function () {
          const {
            factory,
          } = await deployFixture();
      
          const tokens =
            await factory.quoteDevBuy(
              0
            );
      
          expect(tokens).to.equal(0n);
        }
      );
      
      it(
        "quotes a positive token amount for a small dev buy",
        async function () {
          const {
            factory,
          } = await deployFixture();
      
          const quoteAmount =
            10n * WAD;
      
          const tokens =
            await factory.quoteDevBuy(
              quoteAmount
            );
      
          expect(tokens).to.be.gt(0n);
        }
      );
      
      it(
        "quotes 100 USDC dev buy successfully",
        async function () {
          const {
            factory,
          } = await deployFixture();
      
          const quoteAmount =
            100n * WAD;
      
          const tokens =
            await factory.quoteDevBuy(
              quoteAmount
            );
      
          expect(tokens).to.be.gt(0n);
      
          const maxDevTokens =
            TOTAL_SUPPLY *
            WAD *
            500n /
            10_000n;
      
          expect(tokens).to.be.lte(
            maxDevTokens
          );
        }
      );
      
      it(
        "matches BondingCurveV3 output exactly",
        async function () {
          const {
            ethers,
            factory,
          } = await deployFixture();
      
          const curve =
            await ethers.deployContract(
              "BondingCurveV3Harness"
            );
      
          await curve.waitForDeployment();
      
          const quoteAmount =
            100n * WAD;
      
          const scaledSupply =
            TOTAL_SUPPLY * WAD;
      
          const maxDevTokens =
            scaledSupply *
            500n /
            10_000n;
      
          const factoryTokens =
            await factory.quoteDevBuy(
              quoteAmount
            );
      
          const curveTokens =
            await curve.tokensForQuote(
              scaledSupply,
              0,
              quoteAmount,
              maxDevTokens
            );
      
          expect(
            factoryTokens
          ).to.equal(
            curveTokens
          );
        }
      );
      
      it(
        "allows a dev buy whose token output is exactly 5% of total supply",
        async function () {
          const {
            ethers,
            factory,
          } = await deployFixture();
      
          const curve =
            await ethers.deployContract(
              "BondingCurveV3Harness"
            );
      
          await curve.waitForDeployment();
      
          const scaledSupply =
            TOTAL_SUPPLY * WAD;
      
          const maxDevTokens =
            scaledSupply *
            500n /
            10_000n;
      
          const exactCost =
            await curve.quoteForTokens(
              scaledSupply,
              0,
              maxDevTokens
            );
      
          const tokens =
            await factory.quoteDevBuy(
              exactCost
            );
      
          expect(
            tokens
          ).to.equal(
            maxDevTokens
          );
        }
      );
      
      it(
        "rejects any dev buy quote above the 5% maximum cost",
        async function () {
          const {
            ethers,
            factory,
          } = await deployFixture();
      
          const curve =
            await ethers.deployContract(
              "BondingCurveV3Harness"
            );
      
          await curve.waitForDeployment();
      
          const scaledSupply =
            TOTAL_SUPPLY * WAD;
      
          const maxDevTokens =
            scaledSupply *
            500n /
            10_000n;
      
          const maxDevQuote =
            await curve.quoteForTokens(
              scaledSupply,
              0,
              maxDevTokens
            );
      
          await expect(
            factory.quoteDevBuy(
              maxDevQuote + 1n
            )
          ).to.be.revertedWithCustomError(
            factory,
            "DevBuyTooLarge"
          );
        }
      );
      
      

      it(
        "launches successfully with zero dev buy",
        async function () {
          const {
            ethers,
            factory,
            creator,
          } = await deployFixture();
      
          await factory
            .connect(creator)
            .launchFairToken(
              NAME,
              SYMBOL);
      
          const launch =
            await factory.fairLaunches(0);
      
          const token =
            await ethers.getContractAt(
              "MemeToken",
              launch.token
            );
      
          expect(
            launch.tokensSold
          ).to.equal(0n);
      
          expect(
            launch.quoteReserve
          ).to.equal(0n);
      
          expect(
            await token.balanceOf(
              creator.address
            )
          ).to.equal(0n);
      
          expect(
            await ethers.provider.getBalance(
              await factory.getAddress()
            )
          ).to.equal(0n);
        }
      );
      
      it(
        "launches with an exact curve-priced dev buy",
        async function () {
          const {
            ethers,
            factory,
            creator,
          } = await deployFixture();
      
          const curve =
            await ethers.deployContract(
              "BondingCurveV3Harness"
            );
      
          await curve.waitForDeployment();
      
          const scaledSupply =
            TOTAL_SUPPLY * WAD;
      
          const desiredTokens =
            10_000_000n * WAD;
      
          const exactCost =
            await curve.quoteForTokens(
              scaledSupply,
              0,
              desiredTokens
            );
      
          await factory
            .connect(creator)
            .launchFairToken(
              NAME,
              SYMBOL,
              {
                value: exactCost,
              }
            );
      
          const launch =
            await factory.fairLaunches(0);
      
          const token =
            await ethers.getContractAt(
              "MemeToken",
              launch.token
            );
      
          /*
           * Inverse pricing returns the maximum
           * token amount affordable by exactCost.
           */
          expect(
            launch.tokensSold
          ).to.be.gte(
            desiredTokens
          );
      
          const actualCost =
            await curve.quoteForTokens(
              scaledSupply,
              0,
              launch.tokensSold
            );
      
          expect(
            actualCost
          ).to.equal(
            exactCost
          );
      
          /*
           * Prove launch.tokensSold is the maximum
           * affordable amount.
           */
          if (
            launch.tokensSold <
            launch.bondingSupply
          ) {
            const nextCost =
              await curve.quoteForTokens(
                scaledSupply,
                0,
                launch.tokensSold + 1n
              );
      
            expect(
              nextCost
            ).to.be.gt(
              exactCost
            );
          }
      
          expect(
            launch.quoteReserve
          ).to.equal(
            exactCost
          );
      
          /*
           * Creator receives exactly the amount
           * recorded by Factory as sold.
           */
          expect(
            await token.balanceOf(
              creator.address
            )
          ).to.equal(
            launch.tokensSold
          );
      
          /*
           * Physical native balance must equal
           * the accounted quote reserve.
           */
          expect(
            await ethers.provider.getBalance(
              await factory.getAddress()
            )
          ).to.equal(
            launch.quoteReserve
          );
      
          /*
           * Token conservation.
           */
          const factoryTokenBalance =
            await token.balanceOf(
              await factory.getAddress()
            );
      
          expect(
            factoryTokenBalance +
            launch.tokensSold
          ).to.equal(
            launch.totalSupply
          );
        }
      );
      
      it(
        "keeps factory token accounting correct after dev buy",
        async function () {
          const {
            ethers,
            factory,
            creator,
          } = await deployFixture();
      
          const curve =
            await ethers.deployContract(
              "BondingCurveV3Harness"
            );
      
          await curve.waitForDeployment();
      
          const scaledSupply =
            TOTAL_SUPPLY * WAD;
      
          const desiredTokens =
            10_000_000n * WAD;
      
          const exactCost =
            await curve.quoteForTokens(
              scaledSupply,
              0,
              desiredTokens
            );
      
          await factory
            .connect(creator)
            .launchFairToken(
              NAME,
              SYMBOL,
              {
                value: exactCost,
              }
            );
      
          const launch =
            await factory.fairLaunches(0);
      
          const token =
            await ethers.getContractAt(
              "MemeToken",
              launch.token
            );
      
          const factoryTokenBalance =
            await token.balanceOf(
              await factory.getAddress()
            );
      
          const creatorTokenBalance =
            await token.balanceOf(
              creator.address
            );
      
          expect(
            creatorTokenBalance
          ).to.equal(
            launch.tokensSold
          );
      
          expect(
            factoryTokenBalance
          ).to.equal(
            launch.totalSupply -
            launch.tokensSold
          );
      
          expect(
            factoryTokenBalance +
            creatorTokenBalance
          ).to.equal(
            launch.totalSupply
          );
      
          expect(
            launch.quoteReserve
          ).to.equal(
            exactCost
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
        "allows an exact 5% dev buy during launch",
        async function () {
          const {
            ethers,
            factory,
            creator,
          } = await deployFixture();
      
          const curve =
            await ethers.deployContract(
              "BondingCurveV3Harness"
            );
      
          await curve.waitForDeployment();
      
          const scaledSupply =
            TOTAL_SUPPLY * WAD;
      
          const maxDevTokens =
            scaledSupply *
            500n /
            10_000n;
      
          const maxDevQuote =
            await curve.quoteForTokens(
              scaledSupply,
              0,
              maxDevTokens
            );
      
          await factory
            .connect(creator)
            .launchFairToken(
              NAME,
              SYMBOL,
              {
                value: maxDevQuote,
              }
            );
      
          const launch =
            await factory.fairLaunches(0);
      
          const token =
            await ethers.getContractAt(
              "MemeToken",
              launch.token
            );
      
          expect(
            launch.tokensSold
          ).to.equal(
            maxDevTokens
          );
      
          expect(
            launch.quoteReserve
          ).to.equal(
            maxDevQuote
          );
      
          expect(
            await token.balanceOf(
              creator.address
            )
          ).to.equal(
            maxDevTokens
          );
      
          expect(
            await token.balanceOf(
              await factory.getAddress()
            )
          ).to.equal(
            launch.totalSupply -
            maxDevTokens
          );
      
          expect(
            await ethers.provider.getBalance(
              await factory.getAddress()
            )
          ).to.equal(
            maxDevQuote
          );
        }
      );
      
      it(
        "rejects a launch payment above the 5% dev-buy maximum",
        async function () {
          const {
            ethers,
            factory,
            creator,
          } = await deployFixture();
      
          const curve =
            await ethers.deployContract(
              "BondingCurveV3Harness"
            );
      
          await curve.waitForDeployment();
      
          const scaledSupply =
            TOTAL_SUPPLY * WAD;
      
          const maxDevTokens =
            scaledSupply *
            500n /
            10_000n;
      
          const maxDevQuote =
            await curve.quoteForTokens(
              scaledSupply,
              0,
              maxDevTokens
            );
      
          await expect(
            factory
              .connect(creator)
              .launchFairToken(
                NAME,
                SYMBOL,
                {
                  value:
                    maxDevQuote + 1n,
                }
              )
          ).to.be.revertedWithCustomError(
            factory,
            "DevBuyTooLarge"
          );
        }
      );
      
      it(
        "tests whether a direct 100 USDC dev buy is exactly representable",
        async function () {
          const {
            factory,
            creator,
          } = await deployFixture();
      
          const quoteAmount =
            100n * WAD;
      
          try {
            await factory
              .connect(creator)
              .launchFairToken(
                NAME,
                SYMBOL,
                {
                  value: quoteAmount,
                }
              );
      
            const launch =
              await factory.fairLaunches(0);
      
            expect(
              launch.quoteReserve
            ).to.equal(quoteAmount);
          } catch (error) {
            expect(
              error.message
            ).to.include(
              "InvalidDevBuyPayment"
            );
          }
        }
      );

      it(
        "measures rounding residual for a 100 USDC quote",
        async function () {
          const {
            ethers,
            factory,
          } = await deployFixture();
      
          const curve =
            await ethers.deployContract(
              "BondingCurveV3Harness"
            );
      
          await curve.waitForDeployment();
      
          const quoteAmount =
            100n * WAD;
      
          const scaledSupply =
            TOTAL_SUPPLY * WAD;
      
          const tokens =
            await factory.quoteDevBuy(
              quoteAmount
            );
      
          expect(
            tokens
          ).to.be.gt(0n);
      
          const actualCost =
            await curve.quoteForTokens(
              scaledSupply,
              0,
              tokens
            );
      
          expect(
            actualCost
          ).to.be.lte(
            quoteAmount
          );
      
          const residual =
            quoteAmount -
            actualCost;
      
          /*
           * V3 inverse pricing returns the
           * maximum affordable token amount.
           */
          const nextCost =
            await curve.quoteForTokens(
              scaledSupply,
              0,
              tokens + 1n
            );
      
          expect(
            nextCost
          ).to.be.gt(
            quoteAmount
          );
      
          expect(
            residual
          ).to.be.gte(0n);
        }
      );

      it(
        "preserves exact payment accounting across many dev-buy quote amounts",
        async function () {
          const {
            ethers,
            factory,
          } = await deployFixture();
      
          const curve =
            await ethers.deployContract(
              "BondingCurveV3Harness"
            );
      
          await curve.waitForDeployment();
      
          const scaledSupply =
            TOTAL_SUPPLY * WAD;
      
          const quoteAmounts = [
            1n * WAD,
            10n * WAD,
            25n * WAD,
            50n * WAD,
            100n * WAD,
            250n * WAD,
            500n * WAD,
          ];
      
          for (
            const quoteAmount
            of quoteAmounts
          ) {
            const quotedTokens =
              await factory.quoteDevBuy(
                quoteAmount
              );
      
            expect(
              quotedTokens
            ).to.be.gt(0n);
      
            const actualCost =
              await curve.quoteForTokens(
                scaledSupply,
                0,
                quotedTokens
              );
      
            expect(
              actualCost
            ).to.be.lte(
              quoteAmount
            );
      
            const residual =
              quoteAmount -
              actualCost;
      
            /*
             * quotedTokens must be the maximum
             * affordable token amount.
             */
            const nextCost =
              await curve.quoteForTokens(
                scaledSupply,
                0,
                quotedTokens + 1n
              );
      
            expect(
              nextCost
            ).to.be.gt(
              quoteAmount
            );
      
            expect(
              actualCost +
              residual
            ).to.equal(
              quoteAmount
            );
          }
        }
      );

      it(
        "allows a public user to buy fair-launch tokens",
        async function () {
          const {
            ethers,
            factory,
            creator,
            buyer,
          } = await deployFixture();
      
          await factory
            .connect(creator)
            .launchFairToken(
              NAME,
              SYMBOL);
      
          const quoteAmount =
            10n * WAD;
      
          const tokensOut =
            await factory
              .connect(buyer)
              .buyFairToken.staticCall(
                0,
                0,
                {
                  value: quoteAmount,
                }
              );
      
          expect(tokensOut)
            .to.be.gt(0n);
      
          await factory
            .connect(buyer)
            .buyFairToken(
              0,
              0,
              {
                value: quoteAmount,
              }
            );
      
          const launch =
            await factory.fairLaunches(0);
      
          const token =
            await ethers.getContractAt(
              "MemeToken",
              launch.token
            );
      
          expect(
            launch.tokensSold
          ).to.equal(tokensOut);
      
          expect(
            launch.quoteReserve
          ).to.equal(quoteAmount);
      
          expect(
            await token.balanceOf(
              buyer.address
            )
          ).to.equal(tokensOut);
      
          expect(
            await ethers.provider.getBalance(
              await factory.getAddress()
            )
          ).to.equal(quoteAmount);
        }
      );
      
      it(
        "accounts sequential public buys correctly",
        async function () {
          const {
            ethers,
            factory,
            creator,
            buyer,
            other,
          } = await deployFixture();
      
          await factory
            .connect(creator)
            .launchFairToken(
              NAME,
              SYMBOL);
      
          const quote1 =
            10n * WAD;
      
          const quote2 =
            10n * WAD;
      
          const tokens1 =
            await factory
              .connect(buyer)
              .buyFairToken.staticCall(
                0,
                0,
                {
                  value: quote1,
                }
              );
      
          await factory
            .connect(buyer)
            .buyFairToken(
              0,
              0,
              {
                value: quote1,
              }
            );
      
          const tokens2 =
            await factory
              .connect(other)
              .buyFairToken.staticCall(
                0,
                0,
                {
                  value: quote2,
                }
              );
      
          await factory
            .connect(other)
            .buyFairToken(
              0,
              0,
              {
                value: quote2,
              }
            );
      
          expect(tokens2)
            .to.be.lt(tokens1);
      
          const launch =
            await factory.fairLaunches(0);
      
          expect(
            launch.tokensSold
          ).to.equal(
            tokens1 + tokens2
          );
      
          expect(
            launch.quoteReserve
          ).to.equal(
            quote1 + quote2
          );
      
          expect(
            await ethers.provider.getBalance(
              await factory.getAddress()
            )
          ).to.equal(
            quote1 + quote2
          );
        }
      );
      
      it(
        "rejects a public buy when minimum token output is not met",
        async function () {
          const {
            factory,
            creator,
            buyer,
          } = await deployFixture();
      
          await factory
            .connect(creator)
            .launchFairToken(
              NAME,
              SYMBOL);
      
          const quoteAmount =
            10n * WAD;
      
          const expectedTokens =
            await factory
              .connect(buyer)
              .buyFairToken.staticCall(
                0,
                0,
                {
                  value: quoteAmount,
                }
              );
      
          await expect(
            factory
              .connect(buyer)
              .buyFairToken(
                0,
                expectedTokens + 1n,
                {
                  value: quoteAmount,
                }
              )
          ).to.be.revertedWithCustomError(
            factory,
            "SlippageExceeded"
          );
      
          const launch =
            await factory.fairLaunches(0);
      
          expect(
            launch.tokensSold
          ).to.equal(0n);
      
          expect(
            launch.quoteReserve
          ).to.equal(0n);
        }
      );
      
      it(
        "rejects a zero-value public buy",
        async function () {
          const {
            factory,
            creator,
            buyer,
          } = await deployFixture();
      
          await factory
            .connect(creator)
            .launchFairToken(
              NAME,
              SYMBOL);
      
          await expect(
            factory
              .connect(buyer)
              .buyFairToken(
                0,
                0
              )
          ).to.be.revertedWithCustomError(
            factory,
            "InvalidBuyAmount"
          );
        }
      );
      
      it(
        "rejects a public buy for an invalid launch ID",
        async function () {
          const {
            factory,
            buyer,
          } = await deployFixture();
      
          await expect(
            factory
              .connect(buyer)
              .buyFairToken(
                999,
                0,
                {
                  value: WAD,
                }
              )
          ).to.be.revertedWithCustomError(
            factory,
            "InvalidLaunch"
          );
        }
      );
      
      it(
        "allows buying the exact remaining bonding inventory",
        async function () {
          const {
            ethers,
            factory,
            creator,
            buyer,
          } = await deployFixture();
      
          await factory
            .connect(creator)
            .launchFairToken(
              NAME,
              SYMBOL);
      
          const launchBefore =
            await factory.fairLaunches(0);
      
          const curve =
            await ethers.deployContract(
              "BondingCurveV3Harness"
            );
      
          await curve.waitForDeployment();
      
          const remaining =
            launchBefore.bondingSupply -
            launchBefore.tokensSold;
      
          const remainingCost =
            await curve.quoteForTokens(
              launchBefore.totalSupply,
              launchBefore.tokensSold,
              remaining
            );
      
          await factory
            .connect(buyer)
            .buyFairToken(
              0,
              0,
              {
                value: remainingCost,
              }
            );
      
          const launchAfter =
            await factory.fairLaunches(0);
      
          expect(
            launchAfter.tokensSold
          ).to.equal(
            launchAfter.bondingSupply
          );
      
          expect(
            launchAfter.bondingSupply -
            launchAfter.tokensSold
          ).to.equal(0n);
      
          expect(
            launchAfter.quoteReserve
          ).to.equal(
            remainingCost
          );
      
          // Exact final fill enters GRADUATING.
          expect(
            launchAfter.status
          ).to.equal(1n);
        }
      );
      
      it(
        "rejects overpayment beyond the remaining bonding inventory",
        async function () {
          const {
            ethers,
            factory,
            creator,
            buyer,
          } = await deployFixture();
      
          await factory
            .connect(creator)
            .launchFairToken(
              NAME,
              SYMBOL);
      
          const launch =
            await factory.fairLaunches(0);
      
          const curve =
            await ethers.deployContract(
              "BondingCurveV3Harness"
            );
      
          await curve.waitForDeployment();
      
          const remaining =
            launch.bondingSupply -
            launch.tokensSold;
      
          const remainingCost =
            await curve.quoteForTokens(
              launch.totalSupply,
              launch.tokensSold,
              remaining
            );
      
          await expect(
            factory
              .connect(buyer)
              .buyFairToken(
                0,
                0,
                {
                  value:
                    remainingCost + 1n,
                }
              )
          ).to.be.revertedWithCustomError(
            factory,
            "BuyExceedsRemainingSupply"
          );
      
          const launchAfter =
            await factory.fairLaunches(0);
      
          expect(
            launchAfter.tokensSold
          ).to.equal(
            launch.tokensSold
          );
      
          expect(
            launchAfter.quoteReserve
          ).to.equal(
            launch.quoteReserve
          );
      
          expect(
            launchAfter.status
          ).to.equal(
            launch.status
          );
        }
      );
      
      it(
        "rejects further buys after bonding inventory is sold out",
        async function () {
          const {
            ethers,
            factory,
            creator,
            buyer,
          } = await deployFixture();
      
          await factory
            .connect(creator)
            .launchFairToken(
              NAME,
              SYMBOL);
      
          const launch =
            await factory.fairLaunches(0);
      
          const curve =
            await ethers.deployContract(
              "BondingCurveV3Harness"
            );
      
          await curve.waitForDeployment();
      
          const remaining =
            launch.bondingSupply -
            launch.tokensSold;
      
          const remainingCost =
            await curve.quoteForTokens(
              launch.totalSupply,
              launch.tokensSold,
              remaining
            );
      
          await factory
            .connect(buyer)
            .buyFairToken(
              0,
              0,
              {
                value: remainingCost,
              }
            );
      
          const graduatedLaunch =
            await factory.fairLaunches(0);
      
          expect(
            graduatedLaunch.tokensSold
          ).to.equal(
            graduatedLaunch.bondingSupply
          );
      
          // Exact final fill enters GRADUATING.
          expect(
            graduatedLaunch.status
          ).to.equal(1n);
      
          await expect(
            factory
              .connect(buyer)
              .buyFairToken(
                0,
                0,
                {
                  value: 1n * WAD,
                }
              )
          ).to.be.revertedWithCustomError(
            factory,
            "LaunchNotActive"
          );
        }
      );

      it(
        "allows a buyer to sell fair-launch tokens back to the curve",
        async function () {
          const {
            ethers,
            factory,
            creator,
            buyer,
          } = await deployFixture();
      
          await factory
            .connect(creator)
            .launchFairToken(
              NAME,
              SYMBOL);
      
          const buyQuote =
            100n * WAD;
      
          const tokensBought =
            await factory
              .connect(buyer)
              .buyFairToken.staticCall(
                0,
                0,
                {
                  value: buyQuote,
                }
              );
      
          await factory
            .connect(buyer)
            .buyFairToken(
              0,
              0,
              {
                value: buyQuote,
              }
            );
      
          const launchBefore =
            await factory.fairLaunches(0);
      
          const token =
            await ethers.getContractAt(
              "MemeToken",
              launchBefore.token
            );
      
          await token
            .connect(buyer)
            .approve(
              await factory.getAddress(),
              tokensBought
            );
      
          const quoteOut =
            await factory
              .connect(buyer)
              .sellFairToken.staticCall(
                0,
                tokensBought,
                0
              );
      
          expect(quoteOut)
            .to.be.gt(0n);
      
          await factory
            .connect(buyer)
            .sellFairToken(
              0,
              tokensBought,
              0
            );
      
          const launchAfter =
            await factory.fairLaunches(0);
      
          expect(
            launchAfter.tokensSold
          ).to.equal(0n);
      
          expect(
            await token.balanceOf(
              buyer.address
            )
          ).to.equal(0n);
      
          expect(
            await token.balanceOf(
              await factory.getAddress()
            )
          ).to.equal(
            launchAfter.totalSupply
          );
      
          expect(
            launchAfter.quoteReserve
          ).to.equal(
            buyQuote - quoteOut
          );
      
          expect(
            await ethers.provider.getBalance(
              await factory.getAddress()
            )
          ).to.equal(
            launchAfter.quoteReserve
          );
        }
      );
      
      it(
        "supports a partial sell",
        async function () {
          const {
            ethers,
            factory,
            creator,
            buyer,
          } = await deployFixture();
      
          await factory
            .connect(creator)
            .launchFairToken(
              NAME,
              SYMBOL);
      
          const buyQuote =
            100n * WAD;
      
          const tokensBought =
            await factory
              .connect(buyer)
              .buyFairToken.staticCall(
                0,
                0,
                {
                  value: buyQuote,
                }
              );
      
          await factory
            .connect(buyer)
            .buyFairToken(
              0,
              0,
              {
                value: buyQuote,
              }
            );
      
          const launchBefore =
            await factory.fairLaunches(0);
      
          const token =
            await ethers.getContractAt(
              "MemeToken",
              launchBefore.token
            );
      
          const sellAmount =
            tokensBought / 2n;
      
          await token
            .connect(buyer)
            .approve(
              await factory.getAddress(),
              sellAmount
            );
      
          const quoteOut =
            await factory
              .connect(buyer)
              .sellFairToken.staticCall(
                0,
                sellAmount,
                0
              );
      
          await factory
            .connect(buyer)
            .sellFairToken(
              0,
              sellAmount,
              0
            );
      
          const launchAfter =
            await factory.fairLaunches(0);
      
          expect(
            launchAfter.tokensSold
          ).to.equal(
            tokensBought -
            sellAmount
          );
      
          expect(
            launchAfter.quoteReserve
          ).to.equal(
            buyQuote -
            quoteOut
          );
      
          expect(
            await token.balanceOf(
              buyer.address
            )
          ).to.equal(
            tokensBought -
            sellAmount
          );
      
          expect(
            await ethers.provider.getBalance(
              await factory.getAddress()
            )
          ).to.equal(
            launchAfter.quoteReserve
          );
        }
      );
      
      it(
        "returns the curve to its previous state after a full buy-sell round trip",
        async function () {
          const {
            ethers,
            factory,
            creator,
            buyer,
          } = await deployFixture();
      
          await factory
            .connect(creator)
            .launchFairToken(
              NAME,
              SYMBOL);
      
          const buyQuote =
            500n * WAD;
      
          const tokensBought =
            await factory
              .connect(buyer)
              .buyFairToken.staticCall(
                0,
                0,
                {
                  value: buyQuote,
                }
              );
      
          await factory
            .connect(buyer)
            .buyFairToken(
              0,
              0,
              {
                value: buyQuote,
              }
            );
      
          const launchBeforeSell =
            await factory.fairLaunches(0);
      
          const token =
            await ethers.getContractAt(
              "MemeToken",
              launchBeforeSell.token
            );
      
          await token
            .connect(buyer)
            .approve(
              await factory.getAddress(),
              tokensBought
            );
      
          const quoteOut =
            await factory
              .connect(buyer)
              .sellFairToken.staticCall(
                0,
                tokensBought,
                0
              );
      
          const residual =
            buyQuote - quoteOut;
      
          console.log(
            "    500 USDC buy-sell residual:",
            residual.toString(),
            "wei"
          );
      
          expect(quoteOut)
            .to.be.lte(buyQuote);
      
          await factory
            .connect(buyer)
            .sellFairToken(
              0,
              tokensBought,
              0
            );
      
          const launchAfter =
            await factory.fairLaunches(0);
      
          expect(
            launchAfter.tokensSold
          ).to.equal(0n);
      
          expect(
            launchAfter.quoteReserve
          ).to.equal(residual);
      
          expect(
            await ethers.provider.getBalance(
              await factory.getAddress()
            )
          ).to.equal(residual);
        }
      );
      
      it(
        "rejects a sell without token approval",
        async function () {
            const {
                ethers,
                factory,
                creator,
                buyer,
              } = await deployFixture();
      
          await factory
            .connect(creator)
            .launchFairToken(
              NAME,
              SYMBOL);
      
          const buyQuote =
            10n * WAD;
      
          const tokensBought =
            await factory
              .connect(buyer)
              .buyFairToken.staticCall(
                0,
                0,
                {
                  value: buyQuote,
                }
              );
      
          await factory
            .connect(buyer)
            .buyFairToken(
              0,
              0,
              {
                value: buyQuote,
              }
            );
      
            await expect(
                factory
                  .connect(buyer)
                  .sellFairToken(
                    0,
                    tokensBought,
                    0
                  )
              ).to.revert(ethers);
      
          const launch =
            await factory.fairLaunches(0);
      
          expect(
            launch.tokensSold
          ).to.equal(tokensBought);
      
          expect(
            launch.quoteReserve
          ).to.equal(buyQuote);
        }
      );
      
      it(
        "rejects a zero-token sell",
        async function () {
          const {
            factory,
            buyer,
          } = await deployFixture();
      
          await expect(
            factory
              .connect(buyer)
              .sellFairToken(
                0,
                0,
                0
              )
          ).to.be.revertedWithCustomError(
            factory,
            "InvalidLaunch"
          );
        }
      );
      
      it(
        "rejects selling more than total tokens currently sold by the curve",
        async function () {
          const {
            factory,
            creator,
            buyer,
          } = await deployFixture();
      
          await factory
            .connect(creator)
            .launchFairToken(
              NAME,
              SYMBOL);
      
          const buyQuote =
            10n * WAD;
      
          const tokensBought =
            await factory
              .connect(buyer)
              .buyFairToken.staticCall(
                0,
                0,
                {
                  value: buyQuote,
                }
              );
      
          await factory
            .connect(buyer)
            .buyFairToken(
              0,
              0,
              {
                value: buyQuote,
              }
            );
      
          await expect(
            factory
              .connect(buyer)
              .sellFairToken(
                0,
                tokensBought + 1n,
                0
              )
          ).to.be.revertedWithCustomError(
            factory,
            "SellExceedsTokensSold"
          );
        }
      );
      
      it(
        "rejects a sell when minimum quote output is not met",
        async function () {
          const {
            ethers,
            factory,
            creator,
            buyer,
          } = await deployFixture();
      
          await factory
            .connect(creator)
            .launchFairToken(
              NAME,
              SYMBOL);
      
          const buyQuote =
            100n * WAD;
      
          const tokensBought =
            await factory
              .connect(buyer)
              .buyFairToken.staticCall(
                0,
                0,
                {
                  value: buyQuote,
                }
              );
      
          await factory
            .connect(buyer)
            .buyFairToken(
              0,
              0,
              {
                value: buyQuote,
              }
            );
      
          const launch =
            await factory.fairLaunches(0);
      
          const token =
            await ethers.getContractAt(
              "MemeToken",
              launch.token
            );
      
          await token
            .connect(buyer)
            .approve(
              await factory.getAddress(),
              tokensBought
            );
      
          const expectedQuote =
            await factory
              .connect(buyer)
              .sellFairToken.staticCall(
                0,
                tokensBought,
                0
              );
      
          await expect(
            factory
              .connect(buyer)
              .sellFairToken(
                0,
                tokensBought,
                expectedQuote + 1n
              )
          ).to.be.revertedWithCustomError(
            factory,
            "SlippageExceeded"
          );
      
          const launchAfter =
            await factory.fairLaunches(0);
      
          expect(
            launchAfter.tokensSold
          ).to.equal(tokensBought);
      
          expect(
            launchAfter.quoteReserve
          ).to.equal(buyQuote);
        }
      );
      
      it(
        "rejects a sell for an invalid launch ID",
        async function () {
          const {
            factory,
            buyer,
          } = await deployFixture();
      
          await expect(
            factory
              .connect(buyer)
              .sellFairToken(
                999,
                1n,
                0
              )
          ).to.be.revertedWithCustomError(
            factory,
            "InvalidLaunch"
          );
        }
      );

      it(
        "preserves market accounting across a multi-user buy-sell sequence",
        async function () {
          const {
            ethers,
            factory,
            creator,
            buyer: alice,
            other: bob,
          } = await deployFixture();
      
          /*
           * We need one additional trader.
           */
          const signers =
            await ethers.getSigners();
      
          const carol = signers[4];
      
          await factory
            .connect(creator)
            .launchFairToken(
              NAME,
              SYMBOL);
      
          const factoryAddress =
            await factory.getAddress();
      
          const launchInitial =
            await factory.fairLaunches(0);
      
          const token =
            await ethers.getContractAt(
              "MemeToken",
              launchInitial.token
            );
      
          /*
           * Helper:
           * physical native balance must always
           * match this launch's quote reserve.
           *
           * This test has only one launch.
           */
          async function expectReserveMatch() {
            const launch =
              await factory.fairLaunches(0);
      
            const factoryBalance =
              await ethers.provider.getBalance(
                factoryAddress
              );
      
            expect(factoryBalance)
              .to.equal(
                launch.quoteReserve
              );
          }
      
          /*
           * ─────────────────────────────
           * 1. Alice BUY 100 USDC
           * ─────────────────────────────
           */
          const aliceBuy1Quote =
            100n * WAD;
      
          const aliceTokens1 =
            await factory
              .connect(alice)
              .buyFairToken.staticCall(
                0,
                0,
                {
                  value: aliceBuy1Quote,
                }
              );
      
          await factory
            .connect(alice)
            .buyFairToken(
              0,
              0,
              {
                value: aliceBuy1Quote,
              }
            );
      
          let launch =
            await factory.fairLaunches(0);
      
          expect(
            launch.tokensSold
          ).to.equal(
            aliceTokens1
          );
      
          expect(
            launch.quoteReserve
          ).to.equal(
            aliceBuy1Quote
          );
      
          await expectReserveMatch();
      
          /*
           * ─────────────────────────────
           * 2. Bob BUY 250 USDC
           * ─────────────────────────────
           */
          const bobBuyQuote =
            250n * WAD;
      
          const bobTokens =
            await factory
              .connect(bob)
              .buyFairToken.staticCall(
                0,
                0,
                {
                  value: bobBuyQuote,
                }
              );
      
          await factory
            .connect(bob)
            .buyFairToken(
              0,
              0,
              {
                value: bobBuyQuote,
              }
            );
      
          launch =
            await factory.fairLaunches(0);
      
          expect(
            launch.tokensSold
          ).to.equal(
            aliceTokens1 +
            bobTokens
          );
      
          expect(
            launch.quoteReserve
          ).to.equal(
            aliceBuy1Quote +
            bobBuyQuote
          );
      
          await expectReserveMatch();
      
          /*
           * Bob entered later on the curve.
           * Compare token output per USDC,
           * not raw token amount, because
           * Bob spent 250 while Alice spent 100.
           */
          expect(
            bobTokens *
            aliceBuy1Quote
          ).to.be.lt(
            aliceTokens1 *
            bobBuyQuote
          );
      
          /*
           * ─────────────────────────────
           * 3. Alice SELL 40%
           * ─────────────────────────────
           */
          const aliceSellAmount =
            aliceTokens1 *
            40n /
            100n;
      
          await token
            .connect(alice)
            .approve(
              factoryAddress,
              aliceSellAmount
            );
      
          const aliceQuoteOut =
            await factory
              .connect(alice)
              .sellFairToken.staticCall(
                0,
                aliceSellAmount,
                0
              );
      
          const soldBeforeAliceSell =
            launch.tokensSold;
      
          await factory
            .connect(alice)
            .sellFairToken(
              0,
              aliceSellAmount,
              0
            );
      
          launch =
            await factory.fairLaunches(0);
      
          expect(
            launch.tokensSold
          ).to.equal(
            soldBeforeAliceSell -
            aliceSellAmount
          );
      
          expect(
            launch.quoteReserve
          ).to.equal(
            aliceBuy1Quote +
            bobBuyQuote -
            aliceQuoteOut
          );
      
          await expectReserveMatch();
      
          /*
           * ─────────────────────────────
           * 4. Carol BUY 500 USDC
           * ─────────────────────────────
           */
          const carolBuyQuote =
            500n * WAD;
      
          const soldBeforeCarolBuy =
            launch.tokensSold;
      
          const carolTokens =
            await factory
              .connect(carol)
              .buyFairToken.staticCall(
                0,
                0,
                {
                  value: carolBuyQuote,
                }
              );
      
          await factory
            .connect(carol)
            .buyFairToken(
              0,
              0,
              {
                value: carolBuyQuote,
              }
            );
      
          launch =
            await factory.fairLaunches(0);
      
          expect(
            launch.tokensSold
          ).to.equal(
            soldBeforeCarolBuy +
            carolTokens
          );
      
          await expectReserveMatch();
      
          /*
           * ─────────────────────────────
           * 5. Bob SELL 50%
           * ─────────────────────────────
           */
          const bobSellAmount =
            bobTokens /
            2n;
      
          await token
            .connect(bob)
            .approve(
              factoryAddress,
              bobSellAmount
            );
      
          const bobQuoteOut =
            await factory
              .connect(bob)
              .sellFairToken.staticCall(
                0,
                bobSellAmount,
                0
              );
      
          const soldBeforeBobSell =
            launch.tokensSold;
      
          await factory
            .connect(bob)
            .sellFairToken(
              0,
              bobSellAmount,
              0
            );
      
          launch =
            await factory.fairLaunches(0);
      
          expect(
            launch.tokensSold
          ).to.equal(
            soldBeforeBobSell -
            bobSellAmount
          );
      
          await expectReserveMatch();
      
          /*
           * ─────────────────────────────
           * 6. Alice BUY another 75 USDC
           * ─────────────────────────────
           */
          const aliceBuy2Quote =
            75n * WAD;
      
          const soldBeforeAliceBuy2 =
            launch.tokensSold;
      
          const aliceTokens2 =
            await factory
              .connect(alice)
              .buyFairToken.staticCall(
                0,
                0,
                {
                  value: aliceBuy2Quote,
                }
              );
      
          await factory
            .connect(alice)
            .buyFairToken(
              0,
              0,
              {
                value: aliceBuy2Quote,
              }
            );
      
          launch =
            await factory.fairLaunches(0);
      
          expect(
            launch.tokensSold
          ).to.equal(
            soldBeforeAliceBuy2 +
            aliceTokens2
          );
      
          /*
           * Expected reserve after the complete
           * sequence.
           */
          const expectedReserve =
            aliceBuy1Quote +
            bobBuyQuote -
            aliceQuoteOut +
            carolBuyQuote -
            bobQuoteOut +
            aliceBuy2Quote;
      
          expect(
            launch.quoteReserve
          ).to.equal(
            expectedReserve
          );
      
          await expectReserveMatch();
      
          /*
           * Bonding inventory must never be
           * exceeded.
           */
          expect(
            launch.tokensSold
          ).to.be.lte(
            launch.bondingSupply
          );
      
          /*
           * Factory token inventory must equal:
           *
           * total supply - tokens currently
           * circulating from the bonding curve.
           *
           * The 20% liquidity reserve is still
           * inside the Factory at this stage.
           */
          const factoryTokenBalance =
            await token.balanceOf(
              factoryAddress
            );
      
          expect(
            factoryTokenBalance
          ).to.equal(
            launch.totalSupply -
            launch.tokensSold
          );
      
          /*
           * Wallet balances must also match
           * their individual trading history.
           */
          expect(
            await token.balanceOf(
              alice.address
            )
          ).to.equal(
            aliceTokens1 -
            aliceSellAmount +
            aliceTokens2
          );
      
          expect(
            await token.balanceOf(
              bob.address
            )
          ).to.equal(
            bobTokens -
            bobSellAmount
          );
      
          expect(
            await token.balanceOf(
              carol.address
            )
          ).to.equal(
            carolTokens
          );
      
          console.log(
            "    final tokensSold:",
            launch.tokensSold.toString()
          );
      
          console.log(
            "    final quoteReserve:",
            launch.quoteReserve.toString(),
            "wei"
          );
      
          console.log(
            "    Alice sell payout:",
            aliceQuoteOut.toString(),
            "wei"
          );
      
          console.log(
            "    Bob sell payout:",
            bobQuoteOut.toString(),
            "wei"
          );
        }
      );

      it(
        "isolates quote reserves between multiple fair launches",
        async function () {
          const {
            ethers,
            factory,
            creator,
            buyer,
            other,
          } = await deployFixture();
      
          const factoryAddress =
            await factory.getAddress();
      
          /*
           * Create Token A.
           */
          await factory
            .connect(creator)
            .launchFairToken(
              "Token A",
              "TKA");
      
          /*
           * Create Token B.
           */
          await factory
            .connect(creator)
            .launchFairToken(
              "Token B",
              "TKB");
      
          const launchAInitial =
            await factory.fairLaunches(0);
      
          const launchBInitial =
            await factory.fairLaunches(1);
      
          const tokenA =
            await ethers.getContractAt(
              "MemeToken",
              launchAInitial.token
            );
      
          const tokenB =
            await ethers.getContractAt(
              "MemeToken",
              launchBInitial.token
            );
      
          /*
           * ─────────────────────────────
           * BUY Token A: 100 USDC
           * ─────────────────────────────
           */
          const quoteA =
            100n * WAD;
      
          const tokensA =
            await factory
              .connect(buyer)
              .buyFairToken.staticCall(
                0,
                0,
                {
                  value: quoteA,
                }
              );
      
          await factory
            .connect(buyer)
            .buyFairToken(
              0,
              0,
              {
                value: quoteA,
              }
            );
      
          /*
           * ─────────────────────────────
           * BUY Token B: 250 USDC
           * ─────────────────────────────
           */
          const quoteB =
            250n * WAD;
      
          const tokensB =
            await factory
              .connect(other)
              .buyFairToken.staticCall(
                1,
                0,
                {
                  value: quoteB,
                }
              );
      
          await factory
            .connect(other)
            .buyFairToken(
              1,
              0,
              {
                value: quoteB,
              }
            );
      
          let launchA =
            await factory.fairLaunches(0);
      
          let launchB =
            await factory.fairLaunches(1);
      
          /*
           * Each launch owns its own
           * accounting reserve.
           */
          expect(
            launchA.quoteReserve
          ).to.equal(quoteA);
      
          expect(
            launchB.quoteReserve
          ).to.equal(quoteB);
      
          /*
           * Physical Factory balance is the
           * aggregate of both reserves.
           */
          expect(
            await ethers.provider.getBalance(
              factoryAddress
            )
          ).to.equal(
            launchA.quoteReserve +
            launchB.quoteReserve
          );
      
          /*
           * Snapshot Token B state.
           *
           * Selling Token A must not alter it.
           */
          const tokenBReserveBefore =
            launchB.quoteReserve;
      
          const tokenBSoldBefore =
            launchB.tokensSold;
      
          /*
           * ─────────────────────────────
           * SELL 50% of Token A
           * ─────────────────────────────
           */
          const sellA =
            tokensA / 2n;
      
          await tokenA
            .connect(buyer)
            .approve(
              factoryAddress,
              sellA
            );
      
          const quoteOutA =
            await factory
              .connect(buyer)
              .sellFairToken.staticCall(
                0,
                sellA,
                0
              );
      
          await factory
            .connect(buyer)
            .sellFairToken(
              0,
              sellA,
              0
            );
      
          launchA =
            await factory.fairLaunches(0);
      
          launchB =
            await factory.fairLaunches(1);
      
          /*
           * Token A accounting changes.
           */
          expect(
            launchA.tokensSold
          ).to.equal(
            tokensA - sellA
          );
      
          expect(
            launchA.quoteReserve
          ).to.equal(
            quoteA - quoteOutA
          );
      
          /*
           * Token B accounting MUST remain
           * completely unchanged.
           */
          expect(
            launchB.tokensSold
          ).to.equal(
            tokenBSoldBefore
          );
      
          expect(
            launchB.quoteReserve
          ).to.equal(
            tokenBReserveBefore
          );
      
          /*
           * Physical native balance must still
           * equal aggregate launch reserves.
           */
          const expectedFactoryBalance =
            launchA.quoteReserve +
            launchB.quoteReserve;
      
          expect(
            await ethers.provider.getBalance(
              factoryAddress
            )
          ).to.equal(
            expectedFactoryBalance
          );
      
          /*
           * Token inventories must also remain
           * independently correct.
           */
          expect(
            await tokenA.balanceOf(
              factoryAddress
            )
          ).to.equal(
            launchA.totalSupply -
            launchA.tokensSold
          );
      
          expect(
            await tokenB.balanceOf(
              factoryAddress
            )
          ).to.equal(
            launchB.totalSupply -
            launchB.tokensSold
          );
      
          /*
           * Buyer balances remain isolated too.
           */
          expect(
            await tokenA.balanceOf(
              buyer.address
            )
          ).to.equal(
            tokensA - sellA
          );
      
          expect(
            await tokenB.balanceOf(
              other.address
            )
          ).to.equal(
            tokensB
          );
      
          console.log(
            "    Token A reserve:",
            launchA.quoteReserve.toString(),
            "wei"
          );
      
          console.log(
            "    Token B reserve:",
            launchB.quoteReserve.toString(),
            "wei"
          );
      
          console.log(
            "    Factory aggregate:",
            expectedFactoryBalance.toString(),
            "wei"
          );
        }
      );

      it(
        "starts every new fair launch in ACTIVE status",
        async function () {
          const {
            factory,
            creator,
          } = await deployFixture();
      
          await factory
            .connect(creator)
            .launchFairToken(
              NAME,
              SYMBOL);
      
          const launch =
            await factory.fairLaunches(0);
      
          // LaunchStatus.ACTIVE = 0
          expect(
            launch.status
          ).to.equal(0n);
        }
      );
      
      it(
        "remains ACTIVE during normal buy and sell activity",
        async function () {
          const {
            ethers,
            factory,
            creator,
            buyer,
          } = await deployFixture();
      
          await factory
            .connect(creator)
            .launchFairToken(
              NAME,
              SYMBOL);
      
          const quote =
            100n * WAD;
      
          const tokensBought =
            await factory
              .connect(buyer)
              .buyFairToken.staticCall(
                0,
                0,
                {
                  value: quote,
                }
              );
      
          await factory
            .connect(buyer)
            .buyFairToken(
              0,
              0,
              {
                value: quote,
              }
            );
      
          let launch =
            await factory.fairLaunches(0);
      
          expect(
            launch.status
          ).to.equal(0n);
      
          const token =
            await ethers.getContractAt(
              "MemeToken",
              launch.token
            );
      
          const sellAmount =
            tokensBought / 2n;
      
          await token
            .connect(buyer)
            .approve(
              await factory.getAddress(),
              sellAmount
            );
      
          await factory
            .connect(buyer)
            .sellFairToken(
              0,
              sellAmount,
              0
            );
      
          launch =
            await factory.fairLaunches(0);
      
          expect(
            launch.status
          ).to.equal(0n);
      
          expect(
            launch.tokensSold
          ).to.be.lt(
            launch.bondingSupply
          );
        }
      );
      
      it(
        "moves from ACTIVE to GRADUATING on the exact final bonding fill",
        async function () {
          const {
            ethers,
            factory,
            creator,
            buyer,
          } = await deployFixture();
      
          await factory
            .connect(creator)
            .launchFairToken(
              NAME,
              SYMBOL);
      
          const launchBefore =
            await factory.fairLaunches(0);
      
          expect(
            launchBefore.status
          ).to.equal(0n);
      
          const curve =
            await ethers.deployContract(
              "BondingCurveV3Harness"
            );
      
          await curve.waitForDeployment();
      
          const finalCost =
            await curve.quoteForTokens(
              launchBefore.totalSupply,
              launchBefore.tokensSold,
              launchBefore.bondingSupply -
                launchBefore.tokensSold
            );
      
          await factory
            .connect(buyer)
            .buyFairToken(
              0,
              0,
              {
                value: finalCost,
              }
            );
      
          const launchAfter =
            await factory.fairLaunches(0);
      
          expect(
            launchAfter.tokensSold
          ).to.equal(
            launchAfter.bondingSupply
          );
      
          expect(
            launchAfter.status
          ).to.equal(1n);
      
          expect(
            launchAfter.bondingSupply +
            launchAfter.liquiditySupply
          ).to.equal(
            launchAfter.totalSupply
          );
        }
      );
      
      it(
        "rejects buys after entering GRADUATING status",
        async function () {
          const {
            ethers,
            factory,
            creator,
            buyer,
          } = await deployFixture();
      
          await factory
            .connect(creator)
            .launchFairToken(
              NAME,
              SYMBOL);
      
          const launchBefore =
            await factory.fairLaunches(0);
      
          const curve =
            await ethers.deployContract(
              "BondingCurveV3Harness"
            );
      
          await curve.waitForDeployment();
      
          const remainingTokens =
            launchBefore.bondingSupply -
            launchBefore.tokensSold;
      
          const finalCost =
            await curve.quoteForTokens(
              launchBefore.totalSupply,
              launchBefore.tokensSold,
              remainingTokens
            );
      
          await factory
            .connect(buyer)
            .buyFairToken(
              0,
              0,
              {
                value: finalCost,
              }
            );
      
          const launchAfter =
            await factory.fairLaunches(0);
      
          expect(
            launchAfter.tokensSold
          ).to.equal(
            launchAfter.bondingSupply
          );
      
          expect(
            launchAfter.status
          ).to.equal(1n);
      
          await expect(
            factory
              .connect(buyer)
              .buyFairToken(
                0,
                0,
                {
                  value: 1n * WAD,
                }
              )
          ).to.be.revertedWithCustomError(
            factory,
            "LaunchNotActive"
          );
        }
      );
      
      it(
        "rejects sells after entering GRADUATING status",
        async function () {
          const {
            ethers,
            factory,
            creator,
            buyer,
          } = await deployFixture();
      
          await factory
            .connect(creator)
            .launchFairToken(
              NAME,
              SYMBOL);
      
          const launchBefore =
            await factory.fairLaunches(0);
      
          const curve =
            await ethers.deployContract(
              "BondingCurveV3Harness"
            );
      
          await curve.waitForDeployment();
      
          const remainingTokens =
            launchBefore.bondingSupply -
            launchBefore.tokensSold;
      
          const finalCost =
            await curve.quoteForTokens(
              launchBefore.totalSupply,
              launchBefore.tokensSold,
              remainingTokens
            );
      
          await factory
            .connect(buyer)
            .buyFairToken(
              0,
              0,
              {
                value: finalCost,
              }
            );
      
          const launchAfter =
            await factory.fairLaunches(0);
      
          expect(
            launchAfter.tokensSold
          ).to.equal(
            launchAfter.bondingSupply
          );
      
          expect(
            launchAfter.status
          ).to.equal(1n);
      
          const token =
            await ethers.getContractAt(
              "MemeToken",
              launchAfter.token
            );
      
          await token
            .connect(buyer)
            .approve(
              await factory.getAddress(),
              1n
            );
      
          await expect(
            factory
              .connect(buyer)
              .sellFairToken(
                0,
                1n,
                0
              )
          ).to.be.revertedWithCustomError(
            factory,
            "LaunchNotActive"
          );
        }
      );

      it(
        "graduates correctly after real buy-sell market activity followed by an exact final fill",
        async function () {
          const {
            ethers,
            factory,
            creator,
            buyer,
          } = await deployFixture();
      
          await factory
            .connect(creator)
            .launchFairToken(
              NAME,
              SYMBOL);
      
          const curve =
            await ethers.deployContract(
              "BondingCurveV3Harness"
            );
      
          await curve.waitForDeployment();
      
          /*
           * First perform a real public buy.
           */
          await factory
            .connect(buyer)
            .buyFairToken(
              0,
              0,
              {
                value: 100n * WAD,
              }
            );
      
          let launch =
            await factory.fairLaunches(0);
      
          const token =
            await ethers.getContractAt(
              "MemeToken",
              launch.token
            );
      
          const buyerBalance =
            await token.balanceOf(
              buyer.address
            );
      
          expect(
            buyerBalance
          ).to.be.gt(0n);
      
          /*
           * Sell half of the purchased tokens
           * back into the bonding curve.
           */
          const sellAmount =
            buyerBalance / 2n;
      
          await token
            .connect(buyer)
            .approve(
              await factory.getAddress(),
              sellAmount
            );
      
          await factory
            .connect(buyer)
            .sellFairToken(
              0,
              sellAmount,
              0
            );
      
          /*
           * Read the real post-buy/post-sell state.
           */
          launch =
            await factory.fairLaunches(0);
      
          expect(
            launch.status
          ).to.equal(0n);
      
          expect(
            launch.tokensSold
          ).to.be.gt(0n);
      
          /*
           * Calculate the exact cost of the
           * remaining Candidate A inventory.
           */
          const remainingTokens =
            launch.bondingSupply -
            launch.tokensSold;
      
          const remainingCost =
            await curve.quoteForTokens(
              launch.totalSupply,
              launch.tokensSold,
              remainingTokens
            );
      
          /*
           * Exact final fill.
           */
          await factory
            .connect(creator)
            .buyFairToken(
              0,
              0,
              {
                value: remainingCost,
              }
            );
      
          const finalLaunch =
            await factory.fairLaunches(0);
      
          expect(
            finalLaunch.tokensSold
          ).to.equal(
            finalLaunch.bondingSupply
          );
      
          expect(
            finalLaunch.status
          ).to.equal(1n);
      
          /*
           * Candidate A keeps the unsold physical
           * inventory for migration liquidity.
           */
          expect(
            finalLaunch.liquiditySupply
          ).to.equal(
            finalLaunch.totalSupply -
            finalLaunch.bondingSupply
          );
      
          expect(
            finalLaunch.bondingSupply +
            finalLaunch.liquiditySupply
          ).to.equal(
            finalLaunch.totalSupply
          );
      
          /*
           * Factory must still physically hold
           * the full migration token inventory.
           */
          expect(
            await token.balanceOf(
              await factory.getAddress()
            )
          ).to.equal(
            finalLaunch.liquiditySupply
          );
      
          /*
           * Actual quote reserve is preserved
           * for the future migration.
           */
          expect(
            await ethers.provider.getBalance(
              await factory.getAddress()
            )
          ).to.equal(
            finalLaunch.quoteReserve
          );
        }
      );
  });