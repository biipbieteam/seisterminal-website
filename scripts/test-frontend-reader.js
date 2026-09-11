import {
    getAllFairLaunches,
    getFairLaunch,
    getFairLaunchTransactionCount,
    getTotalFairLaunches,
  } from "../src/contracts/launchReader.js";
  
  async function main() {
    console.log(
      "\n========================================"
    );
  
    console.log(
      "ARC TERMINAL — FRONTEND READER TEST"
    );
  
    console.log(
      "========================================"
    );
  
    const total =
      await getTotalFairLaunches();
  
    console.log(
      "Total launches:",
      total.toString()
    );
  
    if (
      total < 1n
    ) {
      throw new Error(
        "Expected at least one Fair Launch."
      );
    }
  
    const launch =
      await getFairLaunch(0n);
    

      const transactionCount =
      await getFairLaunchTransactionCount(
        0n
      );
    
    console.log(
      "TXNS:",
      transactionCount
    );
    
    if (
      transactionCount !== 2
    ) {
      throw new Error(
        `Unexpected transaction count: ${transactionCount}`
      );
    }

    console.log(
      "\nLaunch #0"
    );
  
    console.log(
      "Name:",
      launch.name
    );
  
    console.log(
      "Symbol:",
      launch.symbol
    );
  
    console.log(
      "Token:",
      launch.tokenAddress
    );
  
    console.log(
      "Creator:",
      launch.creator
    );
  
    console.log(
      "Status:",
      launch.statusLabel
    );
  
    console.log(
      "Total supply:",
      launch.formatted.totalSupply
    );
  
    console.log(
      "Bonding supply:",
      launch.formatted.bondingSupply
    );
  
    console.log(
      "Liquidity supply:",
      launch.formatted.liquiditySupply
    );
  
    console.log(
      "Tokens sold:",
      launch.formatted.tokensSold
    );
  
    console.log(
      "Quote reserve:",
      launch.formatted.quoteReserve,
      "USDC"
    );
  
    console.log(
      "Bonding progress:",
      `${launch.formatted.progressPercent}%`
    );
  
    /*
     * Basic integrity checks.
     */
    if (
      launch.name !==
      "ARC Test One"
    ) {
      throw new Error(
        "Unexpected launch name."
      );
    }
  
    if (
      launch.symbol !==
      "ARC1"
    ) {
      throw new Error(
        "Unexpected launch symbol."
      );
    }
  
    if (
      launch.tokenAddress.toLowerCase() !==
      "0xd012725ce05c2c9aa77614d0a28ad77ea99e9db4"
    ) {
      throw new Error(
        "Unexpected token address."
      );
    }
  
    if (
      launch.raw.totalSupply !==
      1_000_000_000n *
        10n ** 18n
    ) {
      throw new Error(
        "Unexpected fixed supply."
      );
    }
  
    if (
      launch.raw.tokensSold <=
      0n
    ) {
      throw new Error(
        "Expected non-zero tokensSold."
      );
    }
  
    if (
      launch.raw.quoteReserve <=
      0n
    ) {
      throw new Error(
        "Expected non-zero quoteReserve."
      );
    }
  
    const allLaunches =
      await getAllFairLaunches();
  
    if (
      allLaunches.length !==
      Number(total)
    ) {
      throw new Error(
        "getAllFairLaunches length mismatch."
      );
    }
  
    console.log(
      "\nReader integrity: VERIFIED"
    );
  
    console.log(
      "TEST RESULT: PASS"
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