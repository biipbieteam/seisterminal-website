import hre from "hardhat";

const ARC_TESTNET_CHAIN_ID =
  5042002n;

const LAUNCH_FACTORY =
"0x8Da50245171d09a544eb047fc3d4e8cE4514931A";

const LAUNCH_ID =
    1n;

const BUY_AMOUNT =
  1n * 10n ** 18n; // 1 native USDC

async function main() {
  const { ethers } =
    await hre.network.getOrCreate();

  const [buyer] =
    await ethers.getSigners();

  if (!buyer) {
    throw new Error(
      "No buyer account configured."
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

  const buyerAddress =
    await buyer.getAddress();

  const factory =
    await ethers.getContractAt(
      "LaunchFactory",
      LAUNCH_FACTORY,
      buyer
    );

  const beforeLaunch =
    await factory.fairLaunches(
      LAUNCH_ID
    );

  if (
    beforeLaunch.token ===
    ethers.ZeroAddress
  ) {
    throw new Error(
      "Launch does not exist."
    );
  }

  if (
    beforeLaunch.status !==
    0n
  ) {
    throw new Error(
      `Launch is not ACTIVE. Status: ${beforeLaunch.status}`
    );
  }

  const token =
    await ethers.getContractAt(
      "MemeToken",
      beforeLaunch.token,
      buyer
    );

  const buyerTokenBefore =
    await token.balanceOf(
      buyerAddress
    );

  const factoryNativeBefore =
    await ethers.provider.getBalance(
      LAUNCH_FACTORY
    );

  /*
   * quoteBuy returns:
   *
   * [tokenAmount, quoteUsed]
   *
   * quoteUsed matters near graduation because
   * the curve may consume less than msg.value
   * and refund the unused native quote.
   */
  const [
    quotedTokens,
    quotedUsed
  ] =
    await factory.quoteBuy(
      LAUNCH_ID,
      BUY_AMOUNT
    );

  if (
    quotedTokens <= 0n
  ) {
    throw new Error(
      "BUY quote returned zero tokens."
    );
  }

  if (
    quotedUsed <= 0n ||
    quotedUsed > BUY_AMOUNT
  ) {
    throw new Error(
      "Invalid quoteUsed returned by Factory."
    );
  }

  console.log(
    "\n========================================"
  );
  console.log(
    "ARC TERMINAL — REAL TESTNET BUY"
  );
  console.log(
    "========================================"
  );

  console.log(
    "Chain ID:",
    network.chainId.toString()
  );

  console.log(
    "Buyer:",
    buyerAddress
  );

  console.log(
    "Launch ID:",
    LAUNCH_ID.toString()
  );

  console.log(
    "Token:",
    beforeLaunch.token
  );

  console.log(
    "BUY submitted:",
    ethers.formatEther(
      BUY_AMOUNT
    ),
    "USDC"
  );

  console.log(
    "Quote used:",
    ethers.formatEther(
      quotedUsed
    ),
    "USDC"
  );

  console.log(
    "Quoted ARC1:",
    ethers.formatUnits(
      quotedTokens,
      18
    )
  );

  /*
   * Controlled testnet BUY.
   *
   * Exact quote is used as minTokensOut because
   * no competing transaction is expected in this
   * controlled test.
   */
  const tx =
    await factory.buyFairToken(
      LAUNCH_ID,
      quotedTokens,
      {
        value:
          BUY_AMOUNT,
      }
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
      "BUY transaction failed."
    );
  }

  const afterLaunch =
    await factory.fairLaunches(
      LAUNCH_ID
    );

  const buyerTokenAfter =
    await token.balanceOf(
      buyerAddress
    );

  const factoryNativeAfter =
    await ethers.provider.getBalance(
      LAUNCH_FACTORY
    );

  const tokensReceived =
    buyerTokenAfter -
    buyerTokenBefore;

  const soldIncrease =
    afterLaunch.tokensSold -
    beforeLaunch.tokensSold;

  const reserveIncrease =
    afterLaunch.quoteReserve -
    beforeLaunch.quoteReserve;

  const factoryBalanceIncrease =
    factoryNativeAfter -
    factoryNativeBefore;

  /*
   * Core on-chain BUY invariants.
   */
  if (
    tokensReceived !==
    quotedTokens
  ) {
    throw new Error(
      "Buyer token balance does not match quoted output."
    );
  }

  if (
    soldIncrease !==
    quotedTokens
  ) {
    throw new Error(
      "tokensSold increase does not match BUY output."
    );
  }

  if (
    reserveIncrease !==
    quotedUsed
  ) {
    throw new Error(
      "quoteReserve increase does not match quoteUsed."
    );
  }

  if (
    factoryBalanceIncrease !==
    quotedUsed
  ) {
    throw new Error(
      "Factory native balance increase does not match quoteUsed."
    );
  }

  console.log(
    "\n========================================"
  );
  console.log(
    "REAL TESTNET BUY COMPLETE"
  );
  console.log(
    "========================================"
  );

  console.log(
    "Tokens received:",
    ethers.formatUnits(
      tokensReceived,
      18
    ),
    "ARC1"
  );

  console.log(
    "Total tokens sold:",
    ethers.formatUnits(
      afterLaunch.tokensSold,
      18
    ),
    "ARC1"
  );

  console.log(
    "Launch quote reserve:",
    ethers.formatEther(
      afterLaunch.quoteReserve
    ),
    "USDC"
  );

  console.log(
    "Factory native balance:",
    ethers.formatEther(
      factoryNativeAfter
    ),
    "USDC"
  );

  console.log(
    "Buyer ARC1 balance:",
    ethers.formatUnits(
      buyerTokenAfter,
      18
    )
  );

  console.log(
    "Status:",
    afterLaunch.status.toString()
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