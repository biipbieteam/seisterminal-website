import { supabase } from "./supabase";

const ARC_CHAIN_ID = 5042002;

export async function getTradeHistory(
  launchId
) {
  if (
    launchId === null ||
    launchId === undefined
  ) {
    return [];
  }

  const { data, error } =
    await supabase
      .from("trade_events")
      .select(`
        id,
        chain_id,
        launch_id,
        token_address,
        trader_address,
        side,
        transaction_hash,
        block_number,
        quote_amount,
        token_amount,
        tokens_sold,
        quote_reserve,
        price_usdc,
        market_cap_usdc,
        block_timestamp
      `)
      .eq(
        "chain_id",
        ARC_CHAIN_ID
      )
      .eq(
        "launch_id",
        launchId.toString()
      )
      .not(
        "block_timestamp",
        "is",
        null
      )
      .not(
        "market_cap_usdc",
        "is",
        null
      )
      .order(
        "block_timestamp",
        {
          ascending: true,
        }
      );

  if (error) {
    throw error;
  }

  return (data || []).map(
    (row) => ({
      ...row,

      price:
        Number(
          row.price_usdc
        ),

      marketCap:
        Number(
          row.market_cap_usdc
        ),

      timestamp:
        new Date(
          row.block_timestamp
        ).getTime(),
    })
  );
}