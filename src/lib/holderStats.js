import { supabase } from "./supabase";

const ARC_CHAIN_ID = 5042002;

export async function getTokenHolders({
  launchId,
  tokenAddress,
}) {
  if (
    launchId === null ||
    launchId === undefined ||
    !tokenAddress
  ) {
    return [];
  }

  const {
    data,
    error,
  } =
    await supabase
      .from(
        "token_holders"
      )
      .select(`
        holder_address,
        balance,
        supply_percent,
        updated_at
      `)
      .eq(
        "chain_id",
        ARC_CHAIN_ID
      )
      .eq(
        "launch_id",
        launchId.toString()
      )
      .eq(
        "token_address",
        tokenAddress.toLowerCase()
      )
      .gt(
        "balance",
        0
      )
      .order(
        "balance",
        {
          ascending: false,
        }
      );

  if (error) {
    throw error;
  }

  return data || [];
}

export async function getTokenHolderCount({
    launchId,
    tokenAddress,
  }) {
    if (
      launchId === null ||
      launchId === undefined ||
      !tokenAddress
    ) {
      return 0;
    }
  
    const {
      count,
      error,
    } =
      await supabase
        .from(
          "token_holders"
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
        )
        .eq(
          "launch_id",
          launchId.toString()
        )
        .eq(
          "token_address",
          tokenAddress.toLowerCase()
        )
        .gt(
          "balance",
          0
        );
  
    if (error) {
      throw error;
    }
  
    return count ?? 0;
  }