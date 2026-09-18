import {
  getTotalFairLaunches,
  getPlatformTradeStats,
} from "../contracts/launchReader.js";


/*
 * ============================================================
 * ARC TERMINAL
 * ARC Mainnet Platform Statistics
 * ============================================================
 *
 * Protocol statistics are derived directly
 * from ARC Mainnet contract state and logs.
 *
 * Supabase is NOT a source of truth here.
 */


/*
 * ------------------------------------------------------------
 * PLATFORM STATS
 * ------------------------------------------------------------
 */

export async function getPlatformStats() {
  const [
    totalLaunches,
    tradeStats,
  ] =
    await Promise.all([
      getTotalFairLaunches(),
      getPlatformTradeStats(),
    ]);


  return {
    totalTokens:
      Number(totalLaunches),

    totalTxns:
      tradeStats.totalTxns,

    totalVolume:
      tradeStats.totalVolume,
  };
}


/*
 * ------------------------------------------------------------
 * TOP TOKENS BY TRADE VOLUME
 * ------------------------------------------------------------
 */

export async function getTopVolumeTokens() {
  const tradeStats =
    await getPlatformTradeStats();


  return Array.from(
    tradeStats.volumeByToken
      .entries()
  )
    .sort(
      (a, b) =>
        a[1] === b[1]
          ? 0
          : a[1] > b[1]
            ? -1
            : 1
    )
    .map(
      ([
        tokenAddress,
        volumeRaw,
      ]) => ({
        tokenAddress,
        volumeRaw,
      })
    );
}