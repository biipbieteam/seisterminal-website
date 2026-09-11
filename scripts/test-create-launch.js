import hre from "hardhat";

const ARC_TESTNET_CHAIN_ID =
  5042002n;

const LAUNCH_FACTORY =
"0x8Da50245171d09a544eb047fc3d4e8cE4514931A";

const FIXED_SUPPLY =
  1_000_000_000n *
  10n ** 18n;

async function main() {
  const { ethers } =
    await hre.network.getOrCreate();

  const [deployer] =
    await ethers.getSigners();

  if (!deployer) {
    throw new Error(
      "No deployer account configured."
    );
  }

  const network =
    await ethers.provider.getNetwork();

  if (
    network.chainId !==
    ARC_TESTNET_CHAIN_ID
  ) {
    throw new Error(
      `Wrong network: ${network.chainId}`
    );
  }

  const deployerAddress =
    await deployer.getAddress();

  const factory =
    await ethers.getContractAt(
      "LaunchFactory",
      LAUNCH_FACTORY,
      deployer
    );

  /*
   * Confirm the deployed address actually
   * contains contract bytecode.
   */
  const code =
    await ethers.provider.getCode(
      LAUNCH_FACTORY
    );

  if (code === "0x") {
    throw new Error(
      "LaunchFactory has no bytecode."
    );
  }

  const beforeCount =
    await factory.totalFairLaunches();

  console.log(
    "\n========================================"
  );
  console.log(
    "ARC TERMINAL — REAL TESTNET CREATE"
  );
  console.log(
    "========================================"
  );

  console.log(
    "Chain ID:",
    network.chainId.toString()
  );

  console.log(
    "Creator:",
    deployerAddress
  );

  console.log(
    "LaunchFactory:",
    LAUNCH_FACTORY
  );

  console.log(
    "Launches before:",
    beforeCount.toString()
  );

  /*
   * First real test launch:
   *
   * - fixed 1B supply
   * - no creator/dev buy
   * - no native value
   */
  const tx =
    await factory.launchFairToken(
      "ARC Test Two",
      "ARC2"
    );

  console.log(
    "\nTransaction:",
    tx.hash
  );

  console.log(
    "Waiting for confirmation..."
  );

  const receipt =
    await tx.wait();

  if (
    !receipt ||
    receipt.status !== 1
  ) {
    throw new Error(
      "Launch transaction failed."
    );
  }

  const afterCount =
    await factory.totalFairLaunches();

  if (
    afterCount !==
    beforeCount + 1n
  ) {
    throw new Error(
      "Launch counter did not increase exactly once."
    );
  }

  const launchId =
    beforeCount;

  const launch =
    await factory.fairLaunches(
      launchId
    );

  const tokenAddress =
    launch.token;

  if (
    tokenAddress ===
    ethers.ZeroAddress
  ) {
    throw new Error(
      "Launch returned zero token address."
    );
  }

  const token =
    await ethers.getContractAt(
      "MemeToken",
      tokenAddress
    );

  const totalSupply =
    await token.totalSupply();

  const factoryTokenBalance =
    await token.balanceOf(
      LAUNCH_FACTORY
    );

  const creatorTokenBalance =
    await token.balanceOf(
      deployerAddress
    );

  if (
    totalSupply !==
    FIXED_SUPPLY
  ) {
    throw new Error(
      `Wrong token supply: ${totalSupply}`
    );
  }

  if (
    launch.totalSupply !==
    FIXED_SUPPLY
  ) {
    throw new Error(
      "Launch state does not contain fixed 1B supply."
    );
  }

  if (
    factoryTokenBalance !==
    FIXED_SUPPLY
  ) {
    throw new Error(
      "Factory does not hold the complete initial supply."
    );
  }

  if (
    creatorTokenBalance !==
    0n
  ) {
    throw new Error(
      "Creator unexpectedly received free tokens."
    );
  }

  if (
    launch.tokensSold !==
    0n
  ) {
    throw new Error(
      "Fresh launch has non-zero tokensSold."
    );
  }

  if (
    launch.quoteReserve !==
    0n
  ) {
    throw new Error(
      "Fresh launch has non-zero quoteReserve."
    );
  }

  console.log(
    "\n========================================"
  );
  console.log(
    "REAL TESTNET LAUNCH CREATED"
  );
  console.log(
    "========================================"
  );

  console.log(
    "Launch ID:",
    launchId.toString()
  );

  console.log(
    "Token:",
    tokenAddress
  );

  console.log(
    "Token name:",
    await token.name()
  );

  console.log(
    "Token symbol:",
    await token.symbol()
  );

  console.log(
    "Total supply:",
    ethers.formatUnits(
      totalSupply,
      18
    )
  );

  console.log(
    "Bonding supply:",
    ethers.formatUnits(
      launch.bondingSupply,
      18
    )
  );

  console.log(
    "Liquidity supply:",
    ethers.formatUnits(
      launch.liquiditySupply,
      18
    )
  );

  console.log(
    "Tokens sold:",
    ethers.formatUnits(
      launch.tokensSold,
      18
    )
  );

  console.log(
    "Quote reserve:",
    ethers.formatEther(
      launch.quoteReserve
    ),
    "USDC"
  );

  console.log(
    "Factory token balance:",
    ethers.formatUnits(
      factoryTokenBalance,
      18
    )
  );

  console.log(
    "Creator free balance:",
    ethers.formatUnits(
      creatorTokenBalance,
      18
    )
  );

  console.log(
    "Status:",
    launch.status.toString()
  );

  console.log(
    "Block:",
    receipt.blockNumber
  );

  console.log(
    "\nTEST RESULT: PASS"
  );
  console.log(
    "========================================\n"
  );
}

main().catch((error) => {
  console.error(
    "\nTEST RESULT: FAIL"
  );
  console.error(error);

  process.exitCode = 1;
});