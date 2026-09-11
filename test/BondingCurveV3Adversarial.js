import { expect } from "chai";
import hre from "hardhat";

describe("BondingCurveV3 — Adversarial", function () {
  const WAD = 10n ** 18n;
  const SUPPLY =
    1_000_000_000n * WAD;

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

  it("rejects zero supply", async function () {
    await expect(
      curve.initialVirtualTokenReserve(0n)
    ).to.revert(ethers);
  });

  it("handles one wei of physical supply without arithmetic overflow", async function () {
    expect(
      await curve.initialVirtualTokenReserve(1n)
    ).to.equal(1n);
  });

  it("handles a very large supply in virtual-token calculation", async function () {
    const huge =
      (1n << 255n);

    const virtual =
      await curve.initialVirtualTokenReserve(
        huge
      );

    expect(virtual).to.be.gt(huge);
  });

  it("rejects tokensSold at the virtual reserve boundary", async function () {
    const virtual =
      await curve.initialVirtualTokenReserve(
        SUPPLY
      );

    await expect(
      curve.virtualTokenReserve(
        SUPPLY,
        virtual
      )
    ).to.revert(ethers);
  });

  it("rejects tokensSold above the virtual reserve boundary", async function () {
    const virtual =
      await curve.initialVirtualTokenReserve(
        SUPPLY
      );

    await expect(
      curve.virtualTokenReserve(
        SUPPLY,
        virtual + 1n
      )
    ).to.revert(ethers);
  });

  it("rejects zero maxTokens", async function () {
    await expect(
      curve.tokensForQuote(
        SUPPLY,
        0n,
        1n * WAD,
        0n
      )
    ).to.revert(ethers);
  });

  it("rejects maxTokens reaching the entire virtual reserve", async function () {
    const virtual =
      await curve.initialVirtualTokenReserve(
        SUPPLY
      );

    await expect(
      curve.tokensForQuote(
        SUPPLY,
        0n,
        1n * WAD,
        virtual
      )
    ).to.revert(ethers);
  });

  it("rejects zero quote", async function () {
    const graduation =
      await curve.graduationTokensSold(
        SUPPLY
      );

    await expect(
      curve.tokensForQuote(
        SUPPLY,
        0n,
        0n,
        graduation
      )
    ).to.revert(ethers);
  });

  it("rejects zero-token sell", async function () {
    await expect(
      curve.quoteForSell(
        SUPPLY,
        1n * WAD,
        0n
      )
    ).to.revert(ethers);
  });

  it("rejects overselling by exactly one wei", async function () {
    const sold =
      100n * WAD;

    await expect(
      curve.quoteForSell(
        SUPPLY,
        sold,
        sold + 1n
      )
    ).to.revert(ethers);
  });

  it("allows selling exactly all net-sold tokens", async function () {
    const graduation =
      await curve.graduationTokensSold(
        SUPPLY
      );

    const bought =
      await curve.tokensForQuote(
        SUPPLY,
        0n,
        500n * WAD,
        graduation
      );

    expect(
      await curve.quoteForSell(
        SUPPLY,
        bought,
        bought
      )
    ).to.be.gte(0n);
  });

  it("does not allow a buyer to exceed the graduation inventory cap when maxTokens is enforced", async function () {
    const graduation =
      await curve.graduationTokensSold(
        SUPPLY
      );

    const tokens =
      await curve.tokensForQuote(
        SUPPLY,
        0n,
        1_000_000n * WAD,
        graduation
      );

    expect(tokens).to.equal(
      graduation
    );
  });

  it("preserves monotonic pricing at one-wei token increments", async function () {
    const sold =
      100_000_000n * WAD;

    const p1 =
      await curve.priceAt(
        SUPPLY,
        sold
      );

    const p2 =
      await curve.priceAt(
        SUPPLY,
        sold + 1n
      );

    expect(p2).to.be.gte(p1);
  });

  it("cannot extract quote through repeated buy-sell cycles", async function () {
    const graduation =
      await curve.graduationTokensSold(
        SUPPLY
      );

    const budgets = [
      1n * WAD,
      7n * WAD + 1n,
      33n * WAD + 17n,
      101n * WAD + 12345n,
      999n * WAD + 999999n,
    ];

    for (const budget of budgets) {
      const bought =
        await curve.tokensForQuote(
          SUPPLY,
          0n,
          budget,
          graduation
        );

      const cost =
        await curve.quoteForTokens(
          SUPPLY,
          0n,
          bought
        );

      const returned =
        await curve.quoteForSell(
          SUPPLY,
          bought,
          bought
        );

      expect(returned).to.be.lte(cost);
    }
  });

  it("preserves the graduation boundary exactly", async function () {
    const graduation =
      await curve.graduationTokensSold(
        SUPPLY
      );

    const atGraduation =
      await curve.marketCapAt(
        SUPPLY,
        graduation
      );

    expect(
      atGraduation
    ).to.be.gte(
      60_000n * WAD
    );

    if (graduation > 0n) {
      const immediatelyBefore =
        await curve.marketCapAt(
          SUPPLY,
          graduation - 1n
        );

      expect(
        immediatelyBefore
      ).to.be.lt(
        60_000n * WAD
      );
    }
  });
});