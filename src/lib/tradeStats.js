import {
    supabase,
  } from "./supabase.js";
  
  export async function getTradeStats(
    launchId
  ) {
    const {
      data,
      error,
    } =
      await supabase
        .from(
          "trade_events"
        )
        .select(
          "side"
        )
        .eq(
          "chain_id",
          5042002
        )
        .eq(
          "launch_id",
          String(
            launchId
          )
        );
  
    if (error) {
      throw new Error(
        `Unable to read trade stats: ${error.message}`
      );
    }
  
    let buyCount = 0;
    let sellCount = 0;
  
    for (
      const item of
        data || []
    ) {
      if (
        item.side === "BUY"
      ) {
        buyCount += 1;
      }
  
      if (
        item.side === "SELL"
      ) {
        sellCount += 1;
      }
    }
  
    return {
      buyCount,
      sellCount,
  
      total:
        buyCount +
        sellCount,
    };
  }