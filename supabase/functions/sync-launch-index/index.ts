import {
    createClient,
  } from "https://esm.sh/@supabase/supabase-js@2";
  
  import {
    Interface,
    JsonRpcProvider,
  } from "https://esm.sh/ethers@6.15.0";
  
  
  const ARC_CHAIN_ID =
    5042002n;
  
  const LAUNCH_FACTORY_ADDRESS =
    "0x8Da50245171d09a544eb047fc3d4e8cE4514931A";
  
  
  const LAUNCH_FACTORY_ABI = [
    "function totalFairLaunches() view returns (uint256)",
  
    "function fairLaunches(uint256) view returns (address token, address creator, uint256 totalSupply, uint256 bondingSupply, uint256 liquiditySupply, uint256 tokensSold, uint256 quoteReserve, uint256 transactionCount, uint8 status)",
  ];
  
  
  const ERC20_ABI = [
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)",
    "function totalSupply() view returns (uint256)",
  ];
  
  
  const launchInterface =
    new Interface(
      LAUNCH_FACTORY_ABI
    );
  
  const erc20Interface =
    new Interface(
      ERC20_ABI
    );
  
  
  Deno.serve(
    async () => {
      try {
        const supabaseUrl =
          Deno.env.get(
            "SUPABASE_URL"
          );
  
        const serviceRoleKey =
          Deno.env.get(
            "SUPABASE_SERVICE_ROLE_KEY"
          );
  
        const rpcUrl =
          Deno.env.get(
            "ARC_TESTNET_RPC_URL"
          );
  
  
        if (
          !supabaseUrl ||
          !serviceRoleKey ||
          !rpcUrl
        ) {
          throw new Error(
            "Server configuration unavailable."
          );
        }
  
  
        const supabase =
          createClient(
            supabaseUrl,
            serviceRoleKey,
            {
              auth: {
                persistSession:
                  false,
  
                autoRefreshToken:
                  false,
              },
            }
          );
  
  
        const provider =
          new JsonRpcProvider(
            rpcUrl,
            ARC_CHAIN_ID,
            {
              staticNetwork:
                true,
            }
          );
  
  
        /*
         * --------------------------------------------------
         * GET TOTAL ON-CHAIN LAUNCHES
         * --------------------------------------------------
         */
  
        const totalCall =
          launchInterface
            .encodeFunctionData(
              "totalFairLaunches"
            );
  
        const totalResult =
          await provider.call({
            to:
              LAUNCH_FACTORY_ADDRESS,
  
            data:
              totalCall,
          });
  
        const [
          totalFairLaunches,
        ] =
          launchInterface
            .decodeFunctionResult(
              "totalFairLaunches",
              totalResult
            );
  
  
        const latestOnChainId =
          Number(
            totalFairLaunches
          ) - 1;
  
  
        /*
         * --------------------------------------------------
         * FIND INCOMPLETE ROWS
         * --------------------------------------------------
         */
  
        const {
          data:
            incompleteRows,
          error:
            incompleteError,
        } =
          await supabase
            .from(
              "launch_tokens"
            )
            .select(
              "launch_id"
            )
            .eq(
              "chain_id",
              Number(
                ARC_CHAIN_ID
              )
            )
            .is(
              "indexed_at",
              null
            )
            .order(
              "launch_id",
              {
                ascending:
                  true,
              }
            );
  
  
        if (
          incompleteError
        ) {
          throw new Error(
            incompleteError.message
          );
        }
  
  
        /*
         * --------------------------------------------------
         * FIND LATEST INDEXED ID
         * --------------------------------------------------
         */
  
        const {
          data:
            latestIndexedRow,
          error:
            latestError,
        } =
          await supabase
            .from(
              "launch_tokens"
            )
            .select(
              "launch_id"
            )
            .eq(
              "chain_id",
              Number(
                ARC_CHAIN_ID
              )
            )
            .not(
              "indexed_at",
              "is",
              null
            )
            .order(
              "launch_id",
              {
                ascending:
                  false,
              }
            )
            .limit(1)
            .maybeSingle();
  
  
        if (
          latestError
        ) {
          throw new Error(
            latestError.message
          );
        }
  
  
        const latestIndexedId =
          latestIndexedRow
            ? Number(
                latestIndexedRow
                  .launch_id
              )
            : -1;
  
  
        /*
         * Build unique set:
         *
         * - incomplete rows
         * - newly-created IDs
         */
  
        const idsToIndex =
          new Set<number>();
  
  
        for (
          const row of
            incompleteRows || []
        ) {
          idsToIndex.add(
            Number(
              row.launch_id
            )
          );
        }
  
  
        for (
          let id =
            latestIndexedId + 1;
  
          id <=
            latestOnChainId;
  
          id++
        ) {
          idsToIndex.add(id);
        }
  
  
        const orderedIds =
          [...idsToIndex]
            .sort(
              (a, b) =>
                a - b
            );
  
  
        let indexed = 0;
  
  
        /*
         * --------------------------------------------------
         * INDEX ONLY REQUIRED IDS
         * --------------------------------------------------
         */
  
        for (
          const launchId of
            orderedIds
        ) {
          const launchCall =
            launchInterface
              .encodeFunctionData(
                "fairLaunches",
                [
                  BigInt(
                    launchId
                  ),
                ]
              );
  
  
          const launchResult =
            await provider.call({
              to:
                LAUNCH_FACTORY_ADDRESS,
  
              data:
                launchCall,
            });
  
  
          const launch =
            launchInterface
              .decodeFunctionResult(
                "fairLaunches",
                launchResult
              );
  
  
          const tokenAddress =
            launch.token;
  
  
          const nameResult =
            await provider.call({
              to:
                tokenAddress,
  
              data:
                erc20Interface
                  .encodeFunctionData(
                    "name"
                  ),
            });
  
  
          const symbolResult =
            await provider.call({
              to:
                tokenAddress,
  
              data:
                erc20Interface
                  .encodeFunctionData(
                    "symbol"
                  ),
            });
  
  
          const decimalsResult =
            await provider.call({
              to:
                tokenAddress,
  
              data:
                erc20Interface
                  .encodeFunctionData(
                    "decimals"
                  ),
            });
  
  
          const totalSupplyResult =
            await provider.call({
              to:
                tokenAddress,
  
              data:
                erc20Interface
                  .encodeFunctionData(
                    "totalSupply"
                  ),
            });
  
  
          const [
            tokenName,
          ] =
            erc20Interface
              .decodeFunctionResult(
                "name",
                nameResult
              );
  
  
          const [
            tokenSymbol,
          ] =
            erc20Interface
              .decodeFunctionResult(
                "symbol",
                symbolResult
              );
  
  
          const [
            decimals,
          ] =
            erc20Interface
              .decodeFunctionResult(
                "decimals",
                decimalsResult
              );
  
  
          const [
            tokenTotalSupply,
          ] =
            erc20Interface
              .decodeFunctionResult(
                "totalSupply",
                totalSupplyResult
              );
  
  
          const {
            error:
              upsertError,
          } =
            await supabase
              .from(
                "launch_tokens"
              )
              .upsert(
                {
                  chain_id:
                    Number(
                      ARC_CHAIN_ID
                    ),
  
                  launch_id:
                    launchId,
  
                  token_address:
                    tokenAddress,
  
                  creator_address:
                    launch.creator,
  
                  token_name:
                    tokenName,
  
                  token_symbol:
                    tokenSymbol,
  
                  decimals:
                    Number(
                      decimals
                    ),
  
                  status:
                    Number(
                      launch.status
                    ),
  
                  total_supply:
                    launch.totalSupply
                      .toString(),
  
                  token_total_supply:
                    tokenTotalSupply
                      .toString(),
  
                  bonding_supply:
                    launch.bondingSupply
                      .toString(),
  
                  liquidity_supply:
                    launch.liquiditySupply
                      .toString(),
  
                  tokens_sold:
                    launch.tokensSold
                      .toString(),
  
                  quote_reserve:
                    launch.quoteReserve
                      .toString(),
  
                  transaction_count:
                    launch.transactionCount
                      .toString(),
  
                  indexed_at:
                    new Date()
                      .toISOString(),
                },
                {
                  onConflict:
                    "chain_id,launch_id",
                }
              );
  
  
          if (
            upsertError
          ) {
            throw new Error(
              `Launch ${launchId}: ${upsertError.message}`
            );
          }
  
  
          indexed += 1;
        }
  
  
        return new Response(
          JSON.stringify({
            success:
              true,
  
            latestOnChainId,
  
            latestIndexedId,
  
            indexed,
  
            ids:
              orderedIds,
          }),
          {
            headers: {
              "Content-Type":
                "application/json",
            },
          }
        );
  
      } catch (error) {
        console.error(
          "sync-launch-index:",
          error
        );
  
  
        return new Response(
          JSON.stringify({
            success:
              false,
  
            error:
              error instanceof Error
                ? error.message
                : "Indexer failed.",
          }),
          {
            status:
              500,
  
            headers: {
              "Content-Type":
                "application/json",
            },
          }
        );
      }
    }
  );