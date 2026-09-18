import hre from "hardhat";

const ARC_MAINNET_CHAIN_ID = 5042n;

const UNISWAP_V2_FACTORY =
  "0x89e5DB8B5aA49aA85AC63f691524311AEB649eba";

async function main() {
  const { ethers } =
    await hre.network.connect();

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
    ARC_MAINNET_CHAIN_ID
  ) {
    throw new Error(
      `Wrong network. Expected ARC Mainnet ${ARC_MAINNET_CHAIN_ID}, got ${network.chainId}.`
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
    "ARC TERMINAL — MAINNET DEPLOYMENT"
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
   * Preflight: production V2 Factory
   * --------------------------------------
   */

  const uniswapFactoryCode =
    await ethers.provider.getCode(
      UNISWAP_V2_FACTORY
    );

  if (uniswapFactoryCode === "0x") {
    throw new Error(
      "Uniswap V2 Factory has no contract code."
    );
  }

  console.log(
    "Uniswap V2 Factory:",
    UNISWAP_V2_FACTORY
  );

  console.log(
    "Uniswap V2 Factory code: VERIFIED"
  );

  /*
   * --------------------------------------
   * 1. UniswapV2AMMFactory
   * --------------------------------------
   */

  console.log(
    "\n[1/3] Deploying UniswapV2AMMFactory..."
  );

  const UniswapV2AMMFactory =
    await ethers.getContractFactory(
      "UniswapV2AMMFactory"
    );

  const ammFactory =
    await UniswapV2AMMFactory.deploy(
      UNISWAP_V2_FACTORY
    );

  await ammFactory.waitForDeployment();

  const ammFactoryAddress =
    await ammFactory.getAddress();

  console.log(
    "UniswapV2AMMFactory:",
    ammFactoryAddress
  );

  /*
   * Verify underlying V2 Factory.
   */

  const configuredV2Factory =
    await ammFactory.uniswapFactory();

  if (
    configuredV2Factory.toLowerCase() !==
    UNISWAP_V2_FACTORY.toLowerCase()
  ) {
    throw new Error(
      "UniswapV2AMMFactory V2 factory verification failed."
    );
  }

  console.log(
    "AMM -> Uniswap V2 Factory: VERIFIED"
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
      ammFactoryAddress
    );

  await migrationAdapter.waitForDeployment();

  const migrationAdapterAddress =
    await migrationAdapter.getAddress();

  console.log(
    "MigrationAdapter:",
    migrationAdapterAddress
  );

  const configuredAMMFactory =
    await migrationAdapter.ammFactory();

  if (
    configuredAMMFactory.toLowerCase() !==
    ammFactoryAddress.toLowerCase()
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

  await launchFactory.waitForDeployment();

  const launchFactoryAddress =
    await launchFactory.getAddress();

  console.log(
    "LaunchFactory:",
    launchFactoryAddress
  );

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
    "MAINNET DEPLOYMENT COMPLETE"
  );

  console.log(
    "========================================"
  );

  console.log(
    "\nUniswap V2 Factory:"
  );
  console.log(
    UNISWAP_V2_FACTORY
  );

  console.log(
    "\nUniswapV2AMMFactory:"
  );
  console.log(
    ammFactoryAddress
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