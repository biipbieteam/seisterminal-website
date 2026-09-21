import {
    formatUnits,
  } from "ethers";
  
  import {
    supabase,
  } from "./supabase.js";
  
  import {
    ARC_MAINNET,
    getLaunchStatusLabel,
} from "../contracts/arcMainnet.js";
  
  export async function getLaunchMetadata() {
    const {
      data,
      error,
    } = await supabase
      .from("launch_tokens")
      .select(
        `
          chain_id,
          launch_id,
          token_address,
          creator_address,
          token_name,
          token_symbol,
          decimals,
          total_supply,
          token_total_supply,
          bonding_supply,
          liquidity_supply,
          tokens_sold,
          quote_reserve,
          transaction_count,
          status,
          logo_path,
          transaction_hash,
          indexed_at,
          state_updated_at,
          created_at
        `
      )
      .order(
        "created_at",
        {
          ascending: false,
        }
      );
  
    if (error) {
      throw new Error(
        `Unable to read launch metadata: ${error.message}`
      );
    }
  
    return (data || []).map(
      (item) => {
        let logoUrl = null;
  
        if (item.logo_path) {
          const {
            data: publicUrlData,
          } = supabase
            .storage
            .from("token-logos")
            .getPublicUrl(
              item.logo_path
            );
  
          logoUrl =
            publicUrlData?.publicUrl ||
            null;
        }
  
        const decimals =
          Number(
            item.decimals
          );

        const totalSupply =
          BigInt(
            item.total_supply
          );

        const tokenTotalSupply =
          BigInt(
            item.token_total_supply
          );

        const bondingSupply =
          BigInt(
            item.bonding_supply
          );

        const liquiditySupply =
          BigInt(
            item.liquidity_supply
          );

        const tokensSold =
          BigInt(
            item.tokens_sold
          );

        const quoteReserve =
          BigInt(
            item.quote_reserve
          );

        const transactionCount =
          BigInt(
            item.transaction_count
          );


        const progressBps =
          bondingSupply > 0n
            ? (
                tokensSold *
                10_000n
              ) /
              bondingSupply
            : 0n;

        const progressPercent =
          Number(
            progressBps
          ) / 100;


        return {
          launchId:
            BigInt(
              item.launch_id
            ),

          tokenAddress:
            item.token_address,

          creator:
            item.creator_address,

          name:
            item.token_name,

          symbol:
            item.token_symbol,

          decimals,

          transactionCount,

          status:
            Number(
              item.status
            ),

          statusLabel:
            getLaunchStatusLabel(
              item.status
            ),

          raw: {
            totalSupply,
            tokenTotalSupply,
            bondingSupply,
            liquiditySupply,
            tokensSold,
            quoteReserve,
            transactionCount,
          },

          formatted: {
            totalSupply:
              formatUnits(
                totalSupply,
                decimals
              ),

            bondingSupply:
              formatUnits(
                bondingSupply,
                decimals
              ),

            liquiditySupply:
              formatUnits(
                liquiditySupply,
                decimals
              ),

            tokensSold:
              formatUnits(
                tokensSold,
                decimals
              ),

            quoteReserve:
              formatUnits(
                quoteReserve,
                ARC_MAINNET.nativeCurrency.decimals
              ),

            progressPercent,
          },

          logoUrl,

          launchTransactionHash:
            item.transaction_hash,

          indexedAt:
            item.indexed_at,

          stateUpdatedAt:
            item.state_updated_at,

          createdAt:
            item.created_at,
        };
      }
    );
  }
