import { expect } from "chai";
import hre from "hardhat";

describe("ARC V3 graduation path precision", function () {
  it("compares graduation reserve across BUY paths", async function () {
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

    async function costPath(parts) {
      let sold = 0n;
      let reserve = 0n;

      for (let i = 0; i < parts; i++) {
        const remaining =
          graduation - sold;

        const amount =
          i === parts - 1
            ? remaining
            : remaining /
              BigInt(parts - i);

        const cost =
          await h.quoteForTokens(
            totalSupply,
            sold,
            amount
          );

        sold += amount;
        reserve += cost;
      }

      expect(sold).to.equal(graduation);

      return reserve;
    }

    const paths = [
      1,
      2,
      3,
      10,
      50,
      100,
      500,
    ];

    console.log(
      "\n========================================"
    );
    console.log(
      "ARC V3 GRADUATION PATH TEST"
    );
    console.log(
      "========================================"
    );

    let baseline = null;

    for (const parts of paths) {
      const reserve =
        await costPath(parts);

      const erc20 =
        reserve / SCALE;

      const dust =
        reserve % SCALE;

      if (baseline === null) {
        baseline = reserve;
      }

      console.log(`\n${parts} BUY(s)`);

      console.log(
        "Reserve raw:",
        reserve.toString()
      );

      console.log(
        "Reserve:",
        ethers.formatUnits(
          reserve,
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
        "Delta vs 1 BUY:",
        (reserve - baseline).toString()
      );
    }

    console.log(
      "\n========================================"
    );
  });
});