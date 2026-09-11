import { expect } from "chai";
import hre from "hardhat";

describe("BondingCurveV3 Solidity", function () {
  const WAD = 10n ** 18n;

  const TOTAL_SUPPLY =
    1_000_000_000n * WAD;

  const INITIAL_MC =
    10_000n * WAD;

  const GRADUATION_MC =
    60_000n * WAD;

  let curve;
  let ethers;

  beforeEach(async function () {
    ({ ethers } =
      await hre.network.getOrCreate());

    curve = await ethers.deployContract(
      "BondingCurveV3Harness"
    );

    await curve.waitForDeployment();
  });

  it("uses 120% initial virtual token reserve", async function () {
    expect(
      await curve.initialVirtualTokenReserve(
        TOTAL_SUPPLY
      )
    ).to.equal(
      1_200_000_000n * WAD
    );
  });

  it("starts at exactly 10K market cap", async function () {
    expect(
      await curve.marketCapAt(
        TOTAL_SUPPLY,
        0n
      )
    ).to.equal(INITIAL_MC);
  });

  it("starts with zero real quote reserve", async function () {
    expect(
      await curve.realQuoteReserve(
        TOTAL_SUPPLY,
        0n
      )
    ).to.equal(0n);
  });

  it("finds the 60K graduation point", async function () {
    const sold =
      await curve.graduationTokensSold(
        TOTAL_SUPPLY
      );

    const mc =
      await curve.marketCapAt(
        TOTAL_SUPPLY,
        sold
      );

    expect(mc).to.be.gte(
      GRADUATION_MC
    );

    expect(
      mc - GRADUATION_MC
    ).to.be.lt(
      1n * 10n ** 12n
    );
  });

  it("graduates after approximately 71.01% net sold", async function () {
    const sold =
      await curve.graduationTokensSold(
        TOTAL_SUPPLY
      );

    expect(
      sold * 10_000n / TOTAL_SUPPLY
    ).to.equal(7101n);
  });

  it("leaves approximately 28.99% physical supply", async function () {
    const sold =
      await curve.graduationTokensSold(
        TOTAL_SUPPLY
      );

    const remaining =
      TOTAL_SUPPLY - sold;

    expect(
      remaining *
      10_000n /
      TOTAL_SUPPLY
    ).to.equal(2898n);
  });

  it("accumulates approximately 17,393.8769 quote", async function () {
    const sold =
      await curve.graduationTokensSold(
        TOTAL_SUPPLY
      );

    const reserve =
      await curve.realQuoteReserve(
        TOTAL_SUPPLY,
        sold
      );

    const expected =
      17_393_876913n *
      10n ** 12n;

    const difference =
      reserve > expected
        ? reserve - expected
        : expected - reserve;

    expect(difference).to.be.lt(
      1n * 10n ** 12n
    );
  });

  it("converts 5 quote into a positive token buy", async function () {
    const graduation =
      await curve.graduationTokensSold(
        TOTAL_SUPPLY
      );

    const tokens =
      await curve.tokensForQuote(
        TOTAL_SUPPLY,
        0n,
        5n * WAD,
        graduation
      );

    expect(tokens).to.be.gt(0n);

    const cost =
      await curve.quoteForTokens(
        TOTAL_SUPPLY,
        0n,
        tokens
      );

    expect(cost).to.be.lte(
      5n * WAD
    );
  });

  it("100 quote buys fewer tokens later on the curve", async function () {
    const graduation =
      await curve.graduationTokensSold(
        TOTAL_SUPPLY
      );

    const early =
      await curve.tokensForQuote(
        TOTAL_SUPPLY,
        0n,
        100n * WAD,
        graduation
      );

    const laterSold =
      TOTAL_SUPPLY * 50n / 100n;

    const late =
      await curve.tokensForQuote(
        TOTAL_SUPPLY,
        laterSold,
        100n * WAD,
        graduation - laterSold
      );

    expect(late).to.be.lt(early);
  });

  it("inverse quote returns maximum affordable tokens", async function () {
    const graduation =
      await curve.graduationTokensSold(
        TOTAL_SUPPLY
      );

    const budget =
      500n * WAD;

    const tokens =
      await curve.tokensForQuote(
        TOTAL_SUPPLY,
        0n,
        budget,
        graduation
      );

    const cost =
      await curve.quoteForTokens(
        TOTAL_SUPPLY,
        0n,
        tokens
      );

    expect(cost).to.be.lte(budget);

    const nextCost =
      await curve.quoteForTokens(
        TOTAL_SUPPLY,
        0n,
        tokens + 1n
      );

    expect(nextCost).to.be.gt(
      budget
    );
  });

  it("supports a complete buy then sell round trip", async function () {
    const graduation =
      await curve.graduationTokensSold(
        TOTAL_SUPPLY
      );

    const bought =
      await curve.tokensForQuote(
        TOTAL_SUPPLY,
        0n,
        500n * WAD,
        graduation
      );

    const buyCost =
      await curve.quoteForTokens(
        TOTAL_SUPPLY,
        0n,
        bought
      );

    const sellQuote =
      await curve.quoteForSell(
        TOTAL_SUPPLY,
        bought,
        bought
      );

    expect(sellQuote).to.be.lte(
      buyCost
    );

    const residual =
      buyCost - sellQuote;

    console.log(
      "    Solidity round-trip residual:",
      residual.toString(),
      "wei"
    );
  });

  it("preserves bonding-to-DEX price continuity", async function () {
    const sold =
      await curve.graduationTokensSold(
        TOTAL_SUPPLY
      );

    const remaining =
      TOTAL_SUPPLY - sold;

    const quoteReserve =
      await curve.realQuoteReserve(
        TOTAL_SUPPLY,
        sold
      );

    const bondingPrice =
      await curve.priceAt(
        TOTAL_SUPPLY,
        sold
      );

    const dexPrice =
      quoteReserve *
      WAD /
      remaining;

    const difference =
      bondingPrice > dexPrice
        ? bondingPrice - dexPrice
        : dexPrice - bondingPrice;

    expect(difference).to.be.lte(2n);
  });

  it("DEX opens at approximately 60K market cap", async function () {
    const sold =
      await curve.graduationTokensSold(
        TOTAL_SUPPLY
      );

    const remaining =
      TOTAL_SUPPLY - sold;

    const quoteReserve =
      await curve.realQuoteReserve(
        TOTAL_SUPPLY,
        sold
      );

    const dexPrice =
      quoteReserve *
      WAD /
      remaining;

    const dexMC =
      dexPrice *
      TOTAL_SUPPLY /
      WAD;

    const difference =
      dexMC > GRADUATION_MC
        ? dexMC - GRADUATION_MC
        : GRADUATION_MC - dexMC;

    expect(difference).to.be.lt(
      1n * 10n ** 14n
    );
  });

  it("rejects zero token buys", async function () {
    await expect(
      curve.quoteForTokens(
        TOTAL_SUPPLY,
        0n,
        0n
      )
    ).to.revert(ethers);
  });

  it("rejects selling more than net tokens sold", async function () {
    await expect(
      curve.quoteForSell(
        TOTAL_SUPPLY,
        100n * WAD,
        101n * WAD
      )
    ).to.revert(ethers);
  });
});