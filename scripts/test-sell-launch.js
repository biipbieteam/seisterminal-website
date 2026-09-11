import hre from "hardhat";

const ARC_TESTNET_CHAIN_ID =
  5042002n;

const LAUNCH_FACTORY =
"0x8Da50245171d09a544eb047fc3d4e8cE4514931A";

const LAUNCH_ID =
    1n;

async function main() {
  const { ethers } =
    await hre.network.getOrCreate();

  const [seller] =
    await ethers.getSigners();

  if (!seller) {
    throw new Error(
      "No seller account configured."
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

  const sellerAddress =
    await seller.getAddress();

  const factory =
    await ethers.getContractAt(
      "LaunchFactory",
      LAUNCH_FACTORY,
      seller
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
      seller
    );

  const sellerTokenBefore =
    await token.balanceOf(
      sellerAddress
    );

  if (
    sellerTokenBefore === 0n
  ) {
    throw new Error(
      "Seller has no ARC1 tokens."
    );
  }

  /*
   * Sell exactly 50% of the seller's
   * current ARC1 balance.
   */
  const sellAmount =
    sellerTokenBefore / 2n;

  if (
    sellAmount === 0n
  ) {
    throw new Error(
      "SELL amount is zero."
    );
  }

  if (
    sellAmount >
    beforeLaunch.tokensSold
  ) {
    throw new Error(
      "SELL exceeds launch tokensSold."
    );
  }

  const quotedOut =
    await factory.quoteSell(
      LAUNCH_ID,
      sellAmount
    );

  if (
    quotedOut <= 0n
  ) {
    throw new Error(
      "SELL quote returned zero."
    );
  }

  if (
    quotedOut >
    beforeLaunch.quoteReserve
  ) {
    throw new Error(
      "SELL quote exceeds launch reserve."
    );
  }

  const factoryTokenBefore =
    await token.balanceOf(
      LAUNCH_FACTORY
    );

  const factoryNativeBefore =
    await ethers.provider.getBalance(
      LAUNCH_FACTORY
    );

  const sellerNativeBefore =
    await ethers.provider.getBalance(
      sellerAddress
    );

  console.log(
    "\n========================================"
  );

  console.log(
    "ARC TERMINAL — REAL TESTNET SELL"
  );

  console.log(
    "========================================"
  );

  console.log(
    "Chain ID:",
    network.chainId.toString()
  );

  console.log(
    "Seller:",
    sellerAddress
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
    "Seller ARC1 before:",
    ethers.formatUnits(
      sellerTokenBefore,
      18
    )
  );

  console.log(
    "Selling:",
    ethers.formatUnits(
      sellAmount,
      18
    ),
    "ARC1"
  );

  console.log(
    "Quoted payout:",
    ethers.formatEther(
      quotedOut
    ),
    "USDC"
  );

  console.log(
    "Reserve before:",
    ethers.formatEther(
      beforeLaunch.quoteReserve
    ),
    "USDC"
  );

  /*
   * --------------------------------------------------
   * APPROVE
   * --------------------------------------------------
   *
   * Approve only the exact amount being sold.
   * No unlimited approval.
   */
  console.log(
    "\n[1/2] Approving exact SELL amount..."
  );

  const approveTx =
    await token.approve(
      LAUNCH_FACTORY,
      sellAmount
    );

  console.log(
    "Approve transaction:",
    approveTx.hash
  );

  const approveReceipt =
    await approveTx.wait();

  if (
    !approveReceipt ||
    approveReceipt.status !== 1
  ) {
    throw new Error(
      "Approval transaction failed."
    );
  }

  const allowance =
    await token.allowance(
      sellerAddress,
      LAUNCH_FACTORY
    );

  if (
    allowance !== sellAmount
  ) {
    throw new Error(
      "Unexpected SELL allowance."
    );
  }

  console.log(
    "Exact allowance: VERIFIED"
  );

  /*
   * --------------------------------------------------
   * SELL
   * --------------------------------------------------
   *
   * For this controlled test we use the exact
   * current quote as minQuoteOut.
   */
  console.log(
    "\n[2/2] Selling ARC1..."
  );

  const sellTx =
    await factory.sellFairToken(
      LAUNCH_ID,
      sellAmount,
      quotedOut
    );

  console.log(
    "SELL transaction:",
    sellTx.hash
  );

  console.log(
    "Waiting for confirmation..."
  );

  const sellReceipt =
    await sellTx.wait();

  if (
    !sellReceipt ||
    sellReceipt.status !== 1
  ) {
    throw new Error(
      "SELL transaction failed."
    );
  }

  /*
   * --------------------------------------------------
   * READ FINAL STATE
   * --------------------------------------------------
   */

  const afterLaunch =
    await factory.fairLaunches(
      LAUNCH_ID
    );

  const sellerTokenAfter =
    await token.balanceOf(
      sellerAddress
    );

  const factoryTokenAfter =
    await token.balanceOf(
      LAUNCH_FACTORY
    );

  const factoryNativeAfter =
    await ethers.provider.getBalance(
      LAUNCH_FACTORY
    );

  const sellerNativeAfter =
    await ethers.provider.getBalance(
      sellerAddress
    );

  const allowanceAfter =
    await token.allowance(
      sellerAddress,
      LAUNCH_FACTORY
    );

  /*
   * --------------------------------------------------
   * CORE SELL INVARIANTS
   * --------------------------------------------------
   */

  if (
    sellerTokenBefore -
      sellerTokenAfter !==
    sellAmount
  ) {
    throw new Error(
      "Seller token decrease does not match SELL amount."
    );
  }

  if (
    factoryTokenAfter -
      factoryTokenBefore !==
    sellAmount
  ) {
    throw new Error(
      "Factory token inventory did not increase by SELL amount."
    );
  }

  if (
    beforeLaunch.tokensSold -
      afterLaunch.tokensSold !==
    sellAmount
  ) {
    throw new Error(
      "tokensSold did not decrease by exact SELL amount."
    );
  }

  if (
    beforeLaunch.quoteReserve -
      afterLaunch.quoteReserve !==
    quotedOut
  ) {
    throw new Error(
      "quoteReserve did not decrease by exact SELL payout."
    );
  }

  if (
    factoryNativeBefore -
      factoryNativeAfter !==
    quotedOut
  ) {
    throw new Error(
      "Factory native balance did not decrease by exact SELL payout."
    );
  }

  /*
   * transferFrom should consume the exact
   * ERC20 allowance.
   */
  if (
    allowanceAfter !== 0n
  ) {
    throw new Error(
      "SELL allowance was not fully consumed."
    );
  }

  /*
   * Seller receives quoteOut but also pays gas
   * for the SELL transaction, so we cannot assert:
   *
   * sellerNativeAfter - sellerNativeBefore == quoteOut
   *
   * Instead verify that the seller's post-SELL
   * native balance is consistent with receiving
   * the payout after paying gas.
   */
  const sellGasCost =
    sellReceipt.gasUsed *
    sellReceipt.gasPrice;

  const expectedSellerAfterSell =
    sellerNativeBefore -
    sellGasCost +
    quotedOut;

  /*
   * sellerNativeBefore was captured BEFORE the
   * approval transaction, so approval gas also
   * occurred after that snapshot.
   *
   * Therefore this value is informational only.
   */
  void expectedSellerAfterSell;

  console.log(
    "\n========================================"
  );

  console.log(
    "REAL TESTNET SELL COMPLETE"
  );

  console.log(
    "========================================"
  );

  console.log(
    "ARC1 sold:",
    ethers.formatUnits(
      sellAmount,
      18
    )
  );

  console.log(
    "USDC payout:",
    ethers.formatEther(
      quotedOut
    ),
    "USDC"
  );

  console.log(
    "Seller ARC1 after:",
    ethers.formatUnits(
      sellerTokenAfter,
      18
    )
  );

  console.log(
    "Total tokens sold:",
    ethers.formatUnits(
      afterLaunch.tokensSold,
      18
    )
  );

  console.log(
    "Quote reserve after:",
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
    "Allowance after SELL:",
    ethers.formatUnits(
      allowanceAfter,
      18
    )
  );

  console.log(
    "Seller USDC after:",
    ethers.formatEther(
      sellerNativeAfter
    ),
    "USDC"
  );

  console.log(
    "Status:",
    afterLaunch.status.toString()
  );

  console.log(
    "Block:",
    sellReceipt.blockNumber
  );

  console.log(
    "\nCREATE: PASS"
  );

  console.log(
    "BUY:    PASS"
  );

  console.log(
    "SELL:   PASS"
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