import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import {
  Contract,
  JsonRpcProvider,
  Wallet,
} from "npm:ethers@6.15.0";

const RPC_URL =
  Deno.env.get("ARC_MAINNET_RPC_URL") ??
  "https://rpc.mainnet.arc.io";

  const LAUNCH_FACTORY =
  Deno.env.get("LAUNCH_FACTORY_ADDRESS") ??
  "0x56FC882244f8FB1d05C2171d180872B38800706F";

const PRIVATE_KEY =
  Deno.env.get("GRADUATION_KEEPER_PRIVATE_KEY");

  const TRIGGER_SECRET =
  Deno.env.get("GRADUATION_KEEPER_TRIGGER_SECRET");

if (!TRIGGER_SECRET) {
  throw new Error(
    "Missing GRADUATION_KEEPER_TRIGGER_SECRET"
  );
}

if (!PRIVATE_KEY) {
  throw new Error(
    "Missing GRADUATION_KEEPER_PRIVATE_KEY"
  );
}

const FACTORY_ABI = [
  "function totalFairLaunches() view returns (uint256)",
  "function fairLaunches(uint256) view returns (address token,address creator,uint256 totalSupply,uint256 bondingSupply,uint256 liquiditySupply,uint256 tokensSold,uint256 quoteReserve,uint256 transactionCount,uint8 status)",
  "function migrateFairLaunch(uint256 launchId_) returns (address pool,uint256 lpMinted)",
];

const provider =
  new JsonRpcProvider(RPC_URL);

const wallet =
  new Wallet(PRIVATE_KEY, provider);

const factory =
  new Contract(
    LAUNCH_FACTORY,
    FACTORY_ABI,
    wallet
  );

  Deno.serve(async (req) => {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Method not allowed",
        }),
        {
          status: 405,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    const suppliedSecret =
      req.headers.get("x-keeper-secret");

    if (
      !suppliedSecret ||
      suppliedSecret !== TRIGGER_SECRET
    ) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Unauthorized",
        }),
        {
          status: 401,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    try {
    const network =
      await provider.getNetwork();

      if (network.chainId !== 5042n) {
      throw new Error(
        `Unexpected chainId: ${network.chainId}`
      );
    }

    const keeperBalance =
      await provider.getBalance(
        wallet.address
      );

    const total =
      Number(
        await factory.totalFairLaunches()
      );

    console.log(
      "Keeper:",
      wallet.address
    );

    console.log(
      "Keeper balance:",
      keeperBalance.toString()
    );

    console.log(
      "Total launches:",
      total
    );

    const results = [];

    for (let launchId = 0; launchId < total; launchId++) {
      const launch =
        await factory.fairLaunches(
          launchId
        );

      const status =
        Number(launch.status);

      if (status !== 1) {
        continue;
      }

      console.log(
        `Found GRADUATING launch ${launchId}`
      );

      try {
        const gasEstimate =
          await factory
            .migrateFairLaunch
            .estimateGas(launchId);

        console.log(
          `Gas estimate ${launchId}:`,
          gasEstimate.toString()
        );

        const tx =
          await factory.migrateFairLaunch(
            launchId,
            {
              gasLimit:
                (gasEstimate * 120n) /
                100n,
            }
          );

        console.log(
          `Migration tx ${launchId}:`,
          tx.hash
        );

        const receipt =
          await tx.wait();

        if (!receipt) {
          throw new Error(
            "Missing transaction receipt"
          );
        }

        if (receipt.status !== 1) {
          throw new Error(
            "Migration transaction reverted"
          );
        }

        const updated =
          await factory.fairLaunches(
            launchId
          );

        const updatedStatus =
          Number(updated.status);

        if (updatedStatus !== 2) {
          throw new Error(
            `Unexpected post-migration status: ${updatedStatus}`
          );
        }

        results.push({
          launchId,
          status: "graduated",
          transactionHash: tx.hash,
        });
      } catch (error) {
        console.error(
          `Migration failed for ${launchId}:`,
          error
        );

        results.push({
          launchId,
          status: "failed",
          error:
            error instanceof Error
              ? error.message
              : String(error),
        });
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        keeper: wallet.address,
        scanned: total,
        migrations: results,
      }),
      {
        headers: {
          "Content-Type":
            "application/json",
        },
      }
    );
  } catch (error) {
    console.error(
      "Graduation keeper fatal error:",
      error
    );

    return new Response(
      JSON.stringify({
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : String(error),
      }),
      {
        status: 500,
        headers: {
          "Content-Type":
            "application/json",
        },
      }
    );
  }
});
