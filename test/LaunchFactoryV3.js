import { expect } from "chai";
import hre from "hardhat";

describe("LaunchFactory V3 Integration", function () {
  const WAD = 10n ** 18n;

  let ethers;
  let owner;
  let user1;
  let user2;
  let factory;

  beforeEach(async function () {
    ({ ethers } =
      await hre.network.getOrCreate());
  
    [owner, user1, user2] =
      await ethers.getSigners();
  
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
  });

  async function createLaunch({
    creator = owner,
    value = 0n,
  } = {}) {
    const tx =
      await factory
        .connect(creator)
        .launchFairToken(
          "ARC Test",
          "ARCT",
          {
            value,
          }
        );
  
    await tx.wait();
  
    const launchId = 0n;
  
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

  it("creates a V3 launch with approximately 71.01% bonding and 28.99% liquidity inventory", async function () {
    const {
      launch,
    } = await createLaunch();

    expect(
      launch.totalSupply
    ).to.equal(
      1_000_000_000n * WAD
    );

    const bondingBps =
      launch.bondingSupply *
      10_000n /
      launch.totalSupply;

    const liquidityBps =
      launch.liquiditySupply *
      10_000n /
      launch.totalSupply;

    expect(
      bondingBps
    ).to.be.closeTo(
      7101n,
      1n
    );

    expect(
      liquidityBps
    ).to.be.closeTo(
      2898n,
      1n
    );

    expect(
      launch.bondingSupply +
      launch.liquiditySupply
    ).to.equal(
      launch.totalSupply
    );
  });

  it("holds the full physical token supply in Factory immediately after launch", async function () {
    const {
      launch,
      tokenAddress,
    } = await createLaunch();

    const token =
      await ethers.getContractAt(
        "MemeToken",
        tokenAddress
      );

    const factoryBalance =
      await token.balanceOf(
        await factory.getAddress()
      );

    expect(
      factoryBalance
    ).to.equal(
      launch.totalSupply
    );
  });

  it("starts ACTIVE with zero sold tokens and zero real quote reserve", async function () {
    const {
      launch,
    } = await createLaunch();

    expect(
      launch.tokensSold
    ).to.equal(0n);

    expect(
      launch.quoteReserve
    ).to.equal(0n);

    expect(
      launch.status
    ).to.equal(0n);
  });

  it("executes creator dev buy as a real paid curve purchase", async function () {
    const devQuote =
      100n * WAD;

    const {
      launchId,
      tokenAddress,
    } =
      await createLaunch({
        value: devQuote,
      });

    const launch =
      await factory.fairLaunches(
        launchId
      );

    const token =
      await ethers.getContractAt(
        "MemeToken",
        tokenAddress
      );

    const creatorTokens =
      await token.balanceOf(
        owner.address
      );

    expect(
      creatorTokens
    ).to.be.gt(0n);

    expect(
      launch.tokensSold
    ).to.equal(
      creatorTokens
    );

    expect(
      launch.quoteReserve
    ).to.be.gt(0n);

    expect(
      launch.quoteReserve
    ).to.be.lte(
      devQuote
    );
  });

  it("enforces the 5% creator dev-buy cap", async function () {
    const quoteFor5Percent =
      await factory.quoteDevBuy(
        1n * WAD
      );
  
    expect(
      quoteFor5Percent
    ).to.be.gt(0n);
  
    await expect(
      factory.launchFairToken(
        "Too Much Dev",
        "TMD",
        {
          value:
            100_000n * WAD,
        }
      )
    ).to.revert(ethers);
  });

  it("allows a normal public buy and updates net token accounting", async function () {
    const {
      launchId,
      tokenAddress,
    } = await createLaunch();

    const quote =
      100n * WAD;

    const preview =
      await factory.quoteBuy(
        launchId,
        quote
      );

    const expectedTokens =
      preview[0];

    await factory
      .connect(user1)
      .buyFairToken(
        launchId,
        0n,
        {
          value: quote,
        }
      );

    const launch =
      await factory.fairLaunches(
        launchId
      );

    const token =
      await ethers.getContractAt(
        "MemeToken",
        tokenAddress
      );

    expect(
      await token.balanceOf(
        user1.address
      )
    ).to.equal(
      expectedTokens
    );

    expect(
      launch.tokensSold
    ).to.equal(
      expectedTokens
    );
  });

  it("preserves physical token accounting after BUY", async function () {
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
            250n * WAD,
        }
      );

    const launch =
      await factory.fairLaunches(
        launchId
      );

    const token =
      await ethers.getContractAt(
        "MemeToken",
        tokenAddress
      );

    const factoryTokens =
      await token.balanceOf(
        await factory.getAddress()
      );

    expect(
      factoryTokens +
      launch.tokensSold
    ).to.equal(
      launch.totalSupply
    );
  });

  it("allows BUY then SELL and restores net token inventory", async function () {
    const {
      launchId,
      tokenAddress,
    } = await createLaunch();

    const quote =
      500n * WAD;

    await factory
      .connect(user1)
      .buyFairToken(
        launchId,
        0n,
        {
          value: quote,
        }
      );

    const afterBuy =
      await factory.fairLaunches(
        launchId
      );

    const bought =
      afterBuy.tokensSold;

    const token =
      await ethers.getContractAt(
        "MemeToken",
        tokenAddress
      );

    await token
      .connect(user1)
      .approve(
        await factory.getAddress(),
        bought
      );

    await factory
      .connect(user1)
      .sellFairToken(
        launchId,
        bought,
        0n
      );

    const afterSell =
      await factory.fairLaunches(
        launchId
      );

    expect(
      afterSell.tokensSold
    ).to.equal(0n);

    expect(
      await token.balanceOf(
        await factory.getAddress()
      )
    ).to.equal(
      afterSell.totalSupply
    );
  });

  it("never pays more quote on SELL than its launch reserve", async function () {
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
      await ethers.getContractAt(
        "MemeToken",
        tokenAddress
      );

    const sellAmount =
      launch.tokensSold / 2n;

    const quoteOut =
      await factory.quoteSell(
        launchId,
        sellAmount
      );

    expect(
      quoteOut
    ).to.be.lte(
      launch.quoteReserve
    );

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
  });

  it("supports multiple users without breaking net supply accounting", async function () {
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
            100n * WAD,
        }
      );

    await factory
      .connect(user2)
      .buyFairToken(
        launchId,
        0n,
        {
          value:
            200n * WAD,
        }
      );

    const launch =
      await factory.fairLaunches(
        launchId
      );

    const token =
      await ethers.getContractAt(
        "MemeToken",
        tokenAddress
      );

    const user1Balance =
      await token.balanceOf(
        user1.address
      );

    const user2Balance =
      await token.balanceOf(
        user2.address
      );

    expect(
      launch.tokensSold
    ).to.equal(
      user1Balance +
      user2Balance
    );
  });

  it("keeps contract native balance aligned with launch quoteReserve for a single launch", async function () {
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
            137n * WAD +
            12345n,
        }
      );

    const launch =
      await factory.fairLaunches(
        launchId
      );

    const contractBalance =
      await ethers.provider.getBalance(
        await factory.getAddress()
      );

    expect(
      contractBalance
    ).to.equal(
      launch.quoteReserve
    );
  });

  it("rejects buying beyond the remaining graduation inventory", async function () {
    const {
      launchId,
    } = await createLaunch();

    await expect(
      factory
        .connect(user1)
        .buyFairToken(
          launchId,
          0n,
          {
            value:
              1_000_000n * WAD,
          }
        )
    ).to.revert(ethers);
  });

  it("reaches exact GRADUATING state on final fill", async function () {
    const {
      launchId,
      tokenAddress,
    } = await createLaunch();
  
    let launch =
      await factory.fairLaunches(
        launchId
      );
  
    const exactCost =
      await getExactRemainingCost(
        factory,
        launch
      );
  
    /*
     * Hardhat accounts start with a limited
     * native balance.
     *
     * ARC V3 graduation requires approximately
     * 17,393.8769 native quote, so fund user1
     * explicitly for this integration test.
     */
    await ethers.provider.send(
      "hardhat_setBalance",
      [
        user1.address,
        ethers.toBeHex(
          30_000n * WAD
        ),
      ]
    );
  
    await factory
      .connect(user1)
      .buyFairToken(
        launchId,
        0n,
        {
          value:
            exactCost,
        }
      );
  
    launch =
      await factory.fairLaunches(
        launchId
      );
  
    expect(
      launch.tokensSold
    ).to.equal(
      launch.bondingSupply
    );
  
    expect(
      launch.status
    ).to.equal(1n);
  
    const token =
      await ethers.getContractAt(
        "MemeToken",
        tokenAddress
      );
  
    expect(
      await token.balanceOf(
        await factory.getAddress()
      )
    ).to.equal(
      launch.liquiditySupply
    );
  
    /*
     * At exact graduation the Factory's
     * physical token inventory must be exactly
     * the future DEX liquidity inventory.
     */
    expect(
      launch.totalSupply -
      launch.tokensSold
    ).to.equal(
      launch.liquiditySupply
    );
  
    /*
     * Single-launch accounting:
     * all native quote held by Factory belongs
     * to this launch.
     */
    const factoryQuoteBalance =
      await ethers.provider.getBalance(
        await factory.getAddress()
      );
  
    expect(
      factoryQuoteBalance
    ).to.equal(
      launch.quoteReserve
    );
  
    console.log(
      "\n    ARC FACTORY V3 GRADUATION"
    );
  
    console.log(
      "    tokens sold:",
      launch.tokensSold.toString()
    );
  
    console.log(
      "    liquidity tokens:",
      launch.liquiditySupply.toString()
    );
  
    console.log(
      "    quote reserve:",
      launch.quoteReserve.toString()
    );
  
    console.log(
      "    factory token balance:",
      (
        await token.balanceOf(
          await factory.getAddress()
        )
      ).toString()
    );
  });


  async function getExactRemainingCost(
    factoryInstance,
    launch
  ) {
    /*
     * There is intentionally no direct
     * remaining-cost getter in Factory yet.
     *
     * Since quoteBuy rejects quote above
     * remainingCost, binary-search the largest
     * valid quote amount.
     *
     * This is test-only code.
     */

    let low = 0n;
    let high =
      30_000n * WAD;

    while (low < high) {
      const mid =
        low +
        (high - low + 1n) /
        2n;

      try {
        await factoryInstance.quoteBuy(
          0n,
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
});