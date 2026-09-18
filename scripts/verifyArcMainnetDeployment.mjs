import { ethers } from "ethers";

const RPC_URL =
  "https://rpc.mainnet.arc.io";

const V2_FACTORY =
  "0x89e5DB8B5aA49aA85AC63f691524311AEB649eba";

const AMM_FACTORY =
  "0xF5230fE3E676F184490b87316FF99601B7351fe6";

const MIGRATION_ADAPTER =
  "0x6Ab39fB0038Be7a4d15914023f813cEB6193A097";

const LAUNCH_FACTORY =
  "0x56FC882244f8FB1d05C2171d180872B38800706F";

const LP_BURN =
  "0x000000000000000000000000000000000000dEaD";

const AMM_ABI = [
  "function uniswapFactory() view returns (address)",
];

const ADAPTER_ABI = [
  "function ammFactory() view returns (address)",
  "function LP_BURN_ADDRESS() view returns (address)",
];

const LAUNCH_ABI = [
  "function migrationAdapter() view returns (address)",
];

function same(a, b) {
  return a.toLowerCase() ===
    b.toLowerCase();
}

async function main() {
  const provider =
    new ethers.JsonRpcProvider(RPC_URL);

  const network =
    await provider.getNetwork();

  console.log(
    "\n========================================"
  );
  console.log(
    "ARC TERMINAL — MAINNET DEPLOYMENT VERIFY"
  );
  console.log(
    "========================================"
  );

  console.log(
    "Chain ID:",
    network.chainId.toString()
  );

  if (network.chainId !== 5042n) {
    throw new Error("Wrong network");
  }

  const addresses = [
    ["V2 Factory", V2_FACTORY],
    ["AMM Factory", AMM_FACTORY],
    ["MigrationAdapter", MIGRATION_ADAPTER],
    ["LaunchFactory", LAUNCH_FACTORY],
  ];

  for (const [name, address] of addresses) {
    const code =
      await provider.getCode(address);

    console.log(
      `${name} code:`,
      code === "0x"
        ? "MISSING"
        : "PRESENT"
    );

    if (code === "0x") {
      throw new Error(
        `${name} has no code`
      );
    }
  }

  const amm =
    new ethers.Contract(
      AMM_FACTORY,
      AMM_ABI,
      provider
    );

  const adapter =
    new ethers.Contract(
      MIGRATION_ADAPTER,
      ADAPTER_ABI,
      provider
    );

  const launch =
    new ethers.Contract(
      LAUNCH_FACTORY,
      LAUNCH_ABI,
      provider
    );

  const [
    configuredV2,
    configuredAMM,
    configuredBurn,
    configuredAdapter,
  ] = await Promise.all([
    amm.uniswapFactory(),
    adapter.ammFactory(),
    adapter.LP_BURN_ADDRESS(),
    launch.migrationAdapter(),
  ]);

  console.log(
    "\nAMM -> V2 Factory:",
    configuredV2
  );

  console.log(
    "Adapter -> AMM:",
    configuredAMM
  );

  console.log(
    "Adapter -> LP Burn:",
    configuredBurn
  );

  console.log(
    "LaunchFactory -> Adapter:",
    configuredAdapter
  );

  if (!same(configuredV2, V2_FACTORY)) {
    throw new Error(
      "AMM -> V2 Factory mismatch"
    );
  }

  if (!same(configuredAMM, AMM_FACTORY)) {
    throw new Error(
      "Adapter -> AMM mismatch"
    );
  }

  if (!same(configuredBurn, LP_BURN)) {
    throw new Error(
      "LP burn mismatch"
    );
  }

  if (
    !same(
      configuredAdapter,
      MIGRATION_ADAPTER
    )
  ) {
    throw new Error(
      "LaunchFactory -> Adapter mismatch"
    );
  }

  console.log(
    "\n========================================"
  );
  console.log(
    "MAINNET DEPLOYMENT VERIFY — PASS"
  );
  console.log(
    "========================================\n"
  );
}

main().catch((error) => {
  console.error(
    "\nVERIFY FAILED:"
  );
  console.error(error);
  process.exitCode = 1;
});