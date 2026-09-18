import { expect } from "chai";
import hre from "hardhat";

describe("ARC V3 BUY/SELL graduation paths", function () {
  it("compares reserve after BUY -> SELL -> BUY paths", async function () {
    const { ethers } = await hre.network.connect();

    const Harness =
      await ethers.getContractFactory(
        "BondingCurveV3Harness"
      );

    const h = await Harness.deploy();
    await h.waitForDeployment();

    const WAD = 10n ** 18n;
    const SCALE = 10n ** 12n;

    const totalSupply =
      1_000_000_000n * WAD;

    const graduation =
      await h.graduationTokensSold(
        totalSupply
      );

    const baseline =
      await h.quoteForTokens(
        totalSupply,
        0,
        graduation
      );

    async function runPath(
      buyPercent,
      sellPercent
    ) {
      let sold = 0n;
      let reserve = 0n;

      /*
       * BUY first position.
       */
      const firstBuy =
        graduation *
        BigInt(buyPercent) /
        100n;

      const buyCost =
        await h.quoteForTokens(
          totalSupply,
          sold,
          firstBuy
        );

      sold += firstBuy;
      reserve += buyCost;

      /*
       * SELL part of current position.
       */
      const sellAmount =
        firstBuy *
        BigInt(sellPercent) /
        100n;

      const sellQuote =
        await h.quoteForSell(
          totalSupply,
          sold,
          sellAmount
        );

      sold -= sellAmount;
      reserve -= sellQuote;

      /*
       * Final exact BUY to graduation.
       */
      const finalBuy =
        graduation - sold;

      const finalCost =
        await h.quoteForTokens(
          totalSupply,
          sold,
          finalBuy
        );

      sold += finalBuy;
      reserve += finalCost;

      expect(sold).to.equal(graduation);

      return {
        reserve,
        buyCost,
        sellQuote,
        finalCost,
      };
    }

    const paths = [
      [10, 10],
      [25, 25],
      [50, 10],
      [50, 50],
      [75, 25],
      [90, 50],
      [90, 90],
    ];

    console.log("\n========================================");
    console.log("ARC V3 BUY / SELL / BUY PATH TEST");
    console.log("========================================");

    console.log(
      "\nBaseline:",
      baseline.toString()
    );

    for (
      const [buyPercent, sellPercent]
      of paths
    ) {
      const result =
        await runPath(
          buyPercent,
          sellPercent
        );

      const erc20 =
        result.reserve / SCALE;

      const dust =
        result.reserve % SCALE;

      const delta =
        result.reserve - baseline;

      console.log(
        `\nBUY ${buyPercent}% -> SELL ${sellPercent}% -> GRADUATE`
      );

      console.log(
        "Reserve raw:",
        result.reserve.toString()
      );

      console.log(
        "Reserve:",
        ethers.formatUnits(
          result.reserve,
          18
        ),
        "USDC"
      );

      console.log(
        "ERC20 liquidity:",
        ethers.formatUnits(
          erc20,
          6
        ),
        "USDC"
      );

      console.log(
        "Dust:",
        dust.toString()
      );

      console.log(
        "Delta vs baseline:",
        delta.toString()
      );
    }

    console.log("\n========================================");
  });
});