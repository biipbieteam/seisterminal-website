import hre from "hardhat";

const ARC_TESTNET_CHAIN_ID = 5042002n;

async function main() {
  const { ethers } = await hre.network.connect();

  const [deployer] =
    await ethers.getSigners();

  if (!deployer) {
    throw new Error(
      "No deployer account configured. Check DEPLOYER_PRIVATE_KEY."
    );
  }

  const network =
    await ethers.provider.getNetwork();

  if (
    network.chainId !==
    ARC_TESTNET_CHAIN_ID
  ) {
    throw new Error(
      `Wrong network. Expected ARC Testnet ${ARC_TESTNET_CHAIN_ID}, got ${network.chainId}.`
    );
  }

  const deployerAddress =
    await deployer.getAddress();

  const balanceBefore =
    await ethers.provider.getBalance(
      deployerAddress
    );

  console.log(
    "\n========================================"
  );
  console.log(
    "ARC TERMINAL — TESTNET DEPLOYMENT"
  );
  console.log(
    "========================================"
  );
  console.log(
    "Chain ID:",
    network.chainId.toString()
  );
  console.log(
    "Deployer:",
    deployerAddress
  );
  console.log(
    "Balance before:",
    ethers.formatEther(balanceBefore),
    "USDC"
  );

  /*
   * --------------------------------------
   * 1. MockAMMFactory
   * --------------------------------------
   */

  console.log(
    "\n[1/3] Deploying MockAMMFactory..."
  );

  const MockAMMFactory =
    await ethers.getContractFactory(
      "MockAMMFactory"
    );

  const mockAMMFactory =
    await MockAMMFactory.deploy();

  await mockAMMFactory
    .waitForDeployment();

  const mockAMMFactoryAddress =
    await mockAMMFactory.getAddress();

  console.log(
    "MockAMMFactory:",
    mockAMMFactoryAddress
  );

  /*
   * --------------------------------------
   * 2. MigrationAdapter
   * --------------------------------------
   */

  console.log(
    "\n[2/3] Deploying MigrationAdapter..."
  );

  const MigrationAdapter =
    await ethers.getContractFactory(
      "MigrationAdapter"
    );

  const migrationAdapter =
    await MigrationAdapter.deploy(
      mockAMMFactoryAddress
    );

  await migrationAdapter
    .waitForDeployment();

  const migrationAdapterAddress =
    await migrationAdapter.getAddress();

  console.log(
    "MigrationAdapter:",
    migrationAdapterAddress
  );

  /*
   * Verify immutable AMM dependency.
   */

  const configuredAMMFactory =
    await migrationAdapter.ammFactory();

  if (
    configuredAMMFactory.toLowerCase() !==
    mockAMMFactoryAddress.toLowerCase()
  ) {
    throw new Error(
      "MigrationAdapter AMM factory verification failed."
    );
  }

  console.log(
    "Adapter -> AMM Factory: VERIFIED"
  );

  /*
   * --------------------------------------
   * 3. LaunchFactory
   * --------------------------------------
   */

  console.log(
    "\n[3/3] Deploying LaunchFactory..."
  );

  const LaunchFactory =
    await ethers.getContractFactory(
      "LaunchFactory"
    );

  const launchFactory =
    await LaunchFactory.deploy(
      migrationAdapterAddress
    );

  await launchFactory
    .waitForDeployment();

  const launchFactoryAddress =
    await launchFactory.getAddress();

  console.log(
    "LaunchFactory:",
    launchFactoryAddress
  );

  /*
   * Verify immutable migration dependency.
   */

  const configuredAdapter =
    await launchFactory
      .migrationAdapter();

  if (
    configuredAdapter.toLowerCase() !==
    migrationAdapterAddress.toLowerCase()
  ) {
    throw new Error(
      "LaunchFactory MigrationAdapter verification failed."
    );
  }

  console.log(
    "Factory -> MigrationAdapter: VERIFIED"
  );

  /*
   * Verify LP burn policy.
   */

  const lpBurnAddress =
    await migrationAdapter
      .LP_BURN_ADDRESS();

  const expectedBurnAddress =
    "0x000000000000000000000000000000000000dEaD";

  if (
    lpBurnAddress.toLowerCase() !==
    expectedBurnAddress.toLowerCase()
  ) {
    throw new Error(
      "Unexpected LP burn address."
    );
  }

  console.log(
    "LP burn address: VERIFIED"
  );

  /*
   * --------------------------------------
   * Final balances
   * --------------------------------------
   */

  const balanceAfter =
    await ethers.provider.getBalance(
      deployerAddress
    );

  console.log(
    "\n========================================"
  );
  console.log(
    "DEPLOYMENT COMPLETE"
  );
  console.log(
    "========================================"
  );

  console.log(
    "\nMockAMMFactory:"
  );
  console.log(
    mockAMMFactoryAddress
  );

  console.log(
    "\nMigrationAdapter:"
  );
  console.log(
    migrationAdapterAddress
  );

  console.log(
    "\nLaunchFactory:"
  );
  console.log(
    launchFactoryAddress
  );

  console.log(
    "\nLP Burn:"
  );
  console.log(
    lpBurnAddress
  );

  console.log(
    "\nBalance after:",
    ethers.formatEther(balanceAfter),
    "USDC"
  );

  console.log(
    "Deployment cost:",
    ethers.formatEther(
      balanceBefore - balanceAfter
    ),
    "USDC"
  );

  console.log(
    "\n========================================\n"
  );
}

main().catch((error) => {
  console.error(
    "\nDEPLOYMENT FAILED:"
  );
  console.error(error);

  process.exitCode = 1;
});