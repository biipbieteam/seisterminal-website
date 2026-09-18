import { expect } from "chai";
import hre from "hardhat";

describe("ARC V3 graduation precision", function () {
  it("prints exact Candidate A graduation state", async function () {
    const { ethers } = await hre.network.connect();

    const Harness =
      await ethers.getContractFactory(
        "BondingCurveV3Harness"
      );

    const harness =
      await Harness.deploy();

    await harness.waitForDeployment();

    const WAD = 10n ** 18n;
    const SCALE = 10n ** 12n;

    const totalSupply =
      1_000_000_000n * WAD;

    const bondingSupply =
      await harness.graduationTokensSold(
        totalSupply
      );

    const liquiditySupply =
      totalSupply - bondingSupply;

    /*
     * Exact cost from zero sold all the way to
     * graduation.
     */
    const graduationQuote =
      await harness.quoteForTokens(
        totalSupply,
        0,
        bondingSupply
      );

    /*
     * realQuoteReserve() is useful as an independent
     * comparison against the exact BUY quote.
     */
    const realQuote =
      await harness.realQuoteReserve(
        totalSupply,
        bondingSupply
      );

    const marketCap =
      await harness.marketCapAt(
        totalSupply,
        bondingSupply
      );

    const erc20Quote =
      graduationQuote / SCALE;

    const representedNative =
      erc20Quote * SCALE;

    const dust =
      graduationQuote -
      representedNative;

    console.log("\n========================================");
    console.log("ARC V3 GRADUATION PRECISION");
    console.log("========================================");

    console.log(
      "Total supply:",
      totalSupply.toString()
    );

    console.log(
      "Bonding supply:",
      bondingSupply.toString()
    );

    console.log(
      "Bonding supply human:",
      ethers.formatUnits(
        bondingSupply,
        18
      )
    );

    console.log(
      "\nLiquidity supply:",
      liquiditySupply.toString()
    );

    console.log(
      "Liquidity supply human:",
      ethers.formatUnits(
        liquiditySupply,
        18
      )
    );

    console.log(
      "\nGraduation quote:",
      graduationQuote.toString()
    );

    console.log(
      "Graduation quote human:",
      ethers.formatUnits(
        graduationQuote,
        18
      ),
      "USDC"
    );

    console.log(
      "\nrealQuoteReserve:",
      realQuote.toString()
    );

    console.log(
      "realQuoteReserve human:",
      ethers.formatUnits(
        realQuote,
        18
      ),
      "USDC"
    );

    console.log(
      "\nGraduation market cap:",
      ethers.formatUnits(
        marketCap,
        18
      ),
      "USDC"
    );

    console.log(
      "\nERC20 quote raw (6d):",
      erc20Quote.toString()
    );

    console.log(
      "ERC20 quote human:",
      ethers.formatUnits(
        erc20Quote,
        6
      ),
      "USDC"
    );

    console.log(
      "\nDust raw:",
      dust.toString()
    );

    console.log(
      "Dust human:",
      ethers.formatUnits(
        dust,
        18
      ),
      "USDC"
    );

    console.log(
      "\nDivisible by 1e12:",
      dust === 0n
        ? "YES"
        : "NO"
    );

    console.log(
      "\nquoteForTokens == realQuoteReserve:",
      graduationQuote === realQuote
        ? "YES"
        : "NO"
    );

    console.log("========================================\n");

    expect(bondingSupply).to.be.gt(0n);
    expect(liquiditySupply).to.be.gt(0n);
    expect(graduationQuote).to.be.gt(0n);
  });
});