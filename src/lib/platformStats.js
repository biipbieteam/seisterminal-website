import { supabase } from "./supabase";

const ARC_CHAIN_ID = 5042002;

export async function getPlatformStats() {
  const [
    tokenResult,
    tradeResult,
  ] =
    await Promise.all([
      supabase
        .from(
          "launch_tokens"
        )
        .select(
          "id",
          {
            count: "exact",
            head: true,
          }
        )
        .eq(
          "chain_id",
          ARC_CHAIN_ID
        ),

      supabase
        .from(
          "trade_events"
        )
        .select(`
          quote_amount
        `)
        .eq(
          "chain_id",
          ARC_CHAIN_ID
        ),
    ]);


  if (
    tokenResult.error
  ) {
    throw tokenResult.error;
  }


  if (
    tradeResult.error
  ) {
    throw tradeResult.error;
  }


  const totalTokens =
    tokenResult.count ?? 0;


  const trades =
    tradeResult.data ?? [];


  const totalTxns =
    trades.length;


  const totalVolumeRaw =
    trades.reduce(
      (total, trade) => {
        try {
          return (
            total +
            BigInt(
              trade.quote_amount ??
              "0"
            )
          );
        } catch {
          return total;
        }
      },
      0n
    );


  const base =
    10n ** 18n;


  const whole =
    totalVolumeRaw /
    base;


  const fraction =
    totalVolumeRaw %
    base;


  const totalVolume =
    Number(whole) +
    Number(fraction) /
      1e18;


  return {
    totalTokens,
    totalTxns,
    totalVolume,
  };
}

export async function getTopVolumeTokens() {
    const {
      data,
      error,
    } =
      await supabase
        .from("trade_events")
        .select(`
          token_address,
          quote_amount
        `)
        .eq(
          "chain_id",
          ARC_CHAIN_ID
        );
  
    if (error) {
      throw error;
    }
  
    const volumeMap =
      new Map();
  
    for (const trade of data ?? []) {
      const address =
        trade.token_address
          ?.toLowerCase();
  
      if (!address) {
        continue;
      }
  
      let amount = 0n;
  
      try {
        amount =
          BigInt(
            trade.quote_amount ??
            "0"
          );
      } catch {
        continue;
      }
  
      volumeMap.set(
        address,
        (
          volumeMap.get(address) ??
          0n
        ) + amount
      );
    }
  
    return Array.from(
      volumeMap.entries()
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