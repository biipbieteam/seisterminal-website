import { expect } from "chai";
import hre from "hardhat";

describe("BondingCurve V2", function () {
  async function deployFixture() {
    const { ethers } =
      await hre.network.getOrCreate();

    const curve =
      await ethers.deployContract(
        "BondingCurveHarness"
      );

    await curve.waitForDeployment();

    return { curve };
  }

  const WAD = 10n ** 18n;

  const TOTAL_SUPPLY =
    1_000_000_000n * WAD;

  const BONDING_SUPPLY =
    TOTAL_SUPPLY *
    8_000n /
    10_000n;

  const INITIAL_MC =
    10_000n * WAD;

  const GRADUATION_MC =
    60_000n * WAD;

  it("sets initial market cap to exactly 10,000 USDC", async function () {
    const { curve } =
      await deployFixture();

    const price =
      await curve.initialPrice(
        TOTAL_SUPPLY
      );

    const marketCap =
      price *
      TOTAL_SUPPLY /
      WAD;

    expect(marketCap).to.equal(
      INITIAL_MC
    );
  });

  it("sets graduation market cap to exactly 60,000 USDC", async function () {
    const { curve } =
      await deployFixture();

    const price =
      await curve.graduationPrice(
        TOTAL_SUPPLY
      );

    const marketCap =
      price *
      TOTAL_SUPPLY /
      WAD;

    expect(marketCap).to.equal(
      GRADUATION_MC
    );
  });

  it("graduation price is exactly 6x initial price for 1B supply", async function () {
    const { curve } =
      await deployFixture();

    const initial =
      await curve.initialPrice(
        TOTAL_SUPPLY
      );

    const graduation =
      await curve.graduationPrice(
        TOTAL_SUPPLY
      );

    expect(graduation).to.equal(
      initial * 6n
    );
  });

  it("priceAt zero equals initial price", async function () {
    const { curve } =
      await deployFixture();

    const initial =
      await curve.initialPrice(
        TOTAL_SUPPLY
      );

    const price =
      await curve.priceAt(
        0,
        TOTAL_SUPPLY,
        BONDING_SUPPLY
      );

    expect(price).to.equal(initial);
  });

  it("priceAt full bonding supply equals graduation price", async function () {
    const { curve } =
      await deployFixture();

    const graduation =
      await curve.graduationPrice(
        TOTAL_SUPPLY
      );

    const price =
      await curve.priceAt(
        BONDING_SUPPLY,
        TOTAL_SUPPLY,
        BONDING_SUPPLY
      );

    expect(price).to.equal(
      graduation
    );
  });

  it("price increases monotonically along the curve", async function () {
    const { curve } =
      await deployFixture();

    const start =
      await curve.priceAt(
        0,
        TOTAL_SUPPLY,
        BONDING_SUPPLY
      );

    const quarter =
      await curve.priceAt(
        BONDING_SUPPLY / 4n,
        TOTAL_SUPPLY,
        BONDING_SUPPLY
      );

    const half =
      await curve.priceAt(
        BONDING_SUPPLY / 2n,
        TOTAL_SUPPLY,
        BONDING_SUPPLY
      );

    const end =
      await curve.priceAt(
        BONDING_SUPPLY,
        TOTAL_SUPPLY,
        BONDING_SUPPLY
      );

    expect(quarter).to.be.gt(start);
    expect(half).to.be.gt(quarter);
    expect(end).to.be.gt(half);
  });

  it("full bonding sale raises exactly 28,000 USDC for 1B supply", async function () {
    const { curve } =
      await deployFixture();

    const quote =
      await curve.quoteForTokens(
        0,
        BONDING_SUPPLY,
        TOTAL_SUPPLY,
        BONDING_SUPPLY
      );

    expect(quote).to.equal(
      28_000n * WAD
    );
  });

  it("buying the same token amount later costs more", async function () {
    const { curve } =
      await deployFixture();

    const amount =
      1_000_000n * WAD;

    const earlyQuote =
      await curve.quoteForTokens(
        0,
        amount,
        TOTAL_SUPPLY,
        BONDING_SUPPLY
      );

    const laterQuote =
      await curve.quoteForTokens(
        BONDING_SUPPLY / 2n,
        amount,
        TOTAL_SUPPLY,
        BONDING_SUPPLY
      );

    expect(laterQuote).to.be.gt(
      earlyQuote
    );
  });

  it("converts USDC quote into tokens", async function () {
    const { curve } =
      await deployFixture();

    const quoteAmount =
      100n * WAD;

    const tokens =
      await curve.tokensForQuote(
        0,
        quoteAmount,
        TOTAL_SUPPLY,
        BONDING_SUPPLY
      );

    expect(tokens).to.be.gt(0n);

    const cost =
      await curve.quoteForTokens(
        0,
        tokens,
        TOTAL_SUPPLY,
        BONDING_SUPPLY
      );

    expect(cost).to.be.lte(
      quoteAmount
    );
  });

  it("inverse returns the maximum affordable token amount", async function () {
    const { curve } =
      await deployFixture();

    const quoteAmount =
      100n * WAD;

    const tokens =
      await curve.tokensForQuote(
        0,
        quoteAmount,
        TOTAL_SUPPLY,
        BONDING_SUPPLY
      );

    const cost =
      await curve.quoteForTokens(
        0,
        tokens,
        TOTAL_SUPPLY,
        BONDING_SUPPLY
      );

    expect(cost).to.be.lte(
      quoteAmount
    );

    if (tokens < BONDING_SUPPLY) {
      const nextCost =
        await curve.quoteForTokens(
          0,
          tokens + 1n,
          TOTAL_SUPPLY,
          BONDING_SUPPLY
        );

      expect(nextCost).to.be.gt(
        quoteAmount
      );
    }
  });

  it("same USDC buys fewer tokens later", async function () {
    const { curve } =
      await deployFixture();

    const quoteAmount =
      100n * WAD;

    const earlyTokens =
      await curve.tokensForQuote(
        0,
        quoteAmount,
        TOTAL_SUPPLY,
        BONDING_SUPPLY
      );

    const laterTokens =
      await curve.tokensForQuote(
        BONDING_SUPPLY / 2n,
        quoteAmount,
        TOTAL_SUPPLY,
        BONDING_SUPPLY
      );

    expect(laterTokens).to.be.lt(
      earlyTokens
    );
  });

  it("caps inverse output at remaining bonding inventory", async function () {
    const { curve } =
      await deployFixture();

    const tokensSold =
      BONDING_SUPPLY -
      1_000n * WAD;

    const remaining =
      BONDING_SUPPLY -
      tokensSold;

    const hugeQuote =
      1_000_000n * WAD;

    const tokens =
      await curve.tokensForQuote(
        tokensSold,
        hugeQuote,
        TOTAL_SUPPLY,
        BONDING_SUPPLY
      );

    expect(tokens).to.equal(
      remaining
    );
  });

  it("28,000 USDC can buy the full bonding inventory from zero", async function () {
    const { curve } =
      await deployFixture();

    const tokens =
      await curve.tokensForQuote(
        0,
        28_000n * WAD,
        TOTAL_SUPPLY,
        BONDING_SUPPLY
      );

    expect(tokens).to.equal(
      BONDING_SUPPLY
    );
  });

  it("inverse round-trip remains valid across multiple quote sizes", async function () {
    const { curve } =
      await deployFixture();

    const quoteAmounts = [
      1n * WAD,
      10n * WAD,
      100n * WAD,
      1_000n * WAD,
      5_000n * WAD,
      20_000n * WAD,
    ];

    for (const quoteAmount of quoteAmounts) {
      const tokens =
        await curve.tokensForQuote(
          0,
          quoteAmount,
          TOTAL_SUPPLY,
          BONDING_SUPPLY
        );

      const cost =
        await curve.quoteForTokens(
          0,
          tokens,
          TOTAL_SUPPLY,
          BONDING_SUPPLY
        );

      expect(cost).to.be.lte(
        quoteAmount
      );

      if (tokens < BONDING_SUPPLY) {
        const nextCost =
          await curve.quoteForTokens(
            0,
            tokens + 1n,
            TOTAL_SUPPLY,
            BONDING_SUPPLY
          );

        expect(nextCost).to.be.gt(
          quoteAmount
        );
      }
    }
  });

  it("handles non-round total supply with bounded market-cap rounding", async function () {
    const { curve } =
      await deployFixture();

    const totalSupply =
      333_333_333n * WAD;

    const initial =
      await curve.initialPrice(
        totalSupply
      );

    const graduation =
      await curve.graduationPrice(
        totalSupply
      );

    const initialMC =
      initial *
      totalSupply /
      WAD;

    const graduationMC =
      graduation *
      totalSupply /
      WAD;

    expect(initialMC).to.be.lte(
      INITIAL_MC
    );

    expect(graduationMC).to.be.lte(
      GRADUATION_MC
    );

    expect(
      INITIAL_MC - initialMC
    ).to.be.lt(WAD);

    expect(
      GRADUATION_MC -
      graduationMC
    ).to.be.lt(WAD);
  });

  it("rejects zero total supply", async function () {
    const { curve } =
      await deployFixture();

    await expect(
      curve.initialPrice(0)
    ).to.be.revertedWithCustomError(
      curve,
      "InvalidTotalSupply"
    );

    await expect(
      curve.graduationPrice(0)
    ).to.be.revertedWithCustomError(
      curve,
      "InvalidTotalSupply"
    );
  });

  it("rejects zero bonding supply", async function () {
    const { curve } =
      await deployFixture();

    await expect(
      curve.priceAt(
        0,
        TOTAL_SUPPLY,
        0
      )
    ).to.be.revertedWithCustomError(
      curve,
      "InvalidBondingSupply"
    );
  });

  it("rejects zero token amount", async function () {
    const { curve } =
      await deployFixture();

    await expect(
      curve.quoteForTokens(
        0,
        0,
        TOTAL_SUPPLY,
        BONDING_SUPPLY
      )
    ).to.be.revertedWithCustomError(
      curve,
      "InvalidTokenAmount"
    );
  });

  it("rejects zero quote amount", async function () {
    const { curve } =
      await deployFixture();

    await expect(
      curve.tokensForQuote(
        0,
        0,
        TOTAL_SUPPLY,
        BONDING_SUPPLY
      )
    ).to.be.revertedWithCustomError(
      curve,
      "InvalidQuoteAmount"
    );
  });

  it("rejects purchases beyond bonding supply", async function () {
    const { curve } =
      await deployFixture();

    await expect(
      curve.quoteForTokens(
        BONDING_SUPPLY,
        1,
        TOTAL_SUPPLY,
        BONDING_SUPPLY
      )
    ).to.be.revertedWithCustomError(
      curve,
      "SupplyExceeded"
    );
  });

  it("rejects inverse quote after bonding inventory is sold out", async function () {
    const { curve } =
      await deployFixture();

    await expect(
      curve.tokensForQuote(
        BONDING_SUPPLY,
        1n * WAD,
        TOTAL_SUPPLY,
        BONDING_SUPPLY
      )
    ).to.be.revertedWithCustomError(
      curve,
      "SupplyExceeded"
    );
  });
});