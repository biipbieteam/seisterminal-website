import {
    formatUnits,
  } from "ethers";
  
  import {
    supabase,
  } from "./supabase.js";
  
  import {
    ARC_TESTNET,
    getLaunchStatusLabel,
  } from "../contracts/arcTestnet.js";
  
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
          logo_path,
          transaction_hash,
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
  
        return {
          ...item,
          logoUrl,
        };
      }
    );
  }

  export async function getIndexedLaunches() {
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
          logo_path,
          transaction_hash,
          created_at,
          status,
          total_supply,
          token_total_supply,
          bonding_supply,
          liquidity_supply,
          tokens_sold,
          quote_reserve,
          transaction_count,
          decimals,
          indexed_at
        `
      )
      .eq(
        "chain_id",
        ARC_TESTNET.chainId
      )
      .not(
        "indexed_at",
        "is",
        null
      )
      .order(
        "launch_id",
        {
          ascending: false,
        }
      );
  
    if (error) {
      throw new Error(
        `Unable to read indexed launches: ${error.message}`
      );
    }
  
    return (data || []).map(
      (item) => {
        const decimals =
          Number(
            item.decimals ?? 18
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
            item.transaction_count ?? 0
          );
  
        const status =
          Number(
            item.status
          );
  
  
        /*
         * Same progress calculation used
         * by the blockchain reader.
         */
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
          ) /
          100;
  
  
        let logoUrl =
          null;
  
        if (
          item.logo_path
        ) {
          const {
            data:
              publicUrlData,
          } =
            supabase
              .storage
              .from(
                "token-logos"
              )
              .getPublicUrl(
                item.logo_path
              );
  
          logoUrl =
            publicUrlData
              ?.publicUrl ||
            null;
        }
  
  
        /*
         * IMPORTANT:
         *
         * Return the SAME object shape
         * as readFairLaunch().
         *
         * App.jsx does not need to know
         * whether data came from RPC
         * or the indexed database.
         */
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
  
          status,
  
          statusLabel:
            getLaunchStatusLabel(
              status
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
                ARC_TESTNET
                  .nativeCurrency
                  .decimals
              ),
  
            progressPercent,
          },
  
          logoUrl,
  
          launchTransactionHash:
            item.transaction_hash ||
            null,
        };
      }
    );
  }