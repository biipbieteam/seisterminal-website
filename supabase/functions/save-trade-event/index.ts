import {
  createClient,
} from "https://esm.sh/@supabase/supabase-js@2";

import {
  Interface,
  JsonRpcProvider,
} from "https://esm.sh/ethers@6.15.0";




const ARC_CHAIN_ID =
  5042002n;

const TOKEN_DECIMALS =
  10n ** 18n;

const TOTAL_SUPPLY =
  1_000_000_000n *
  TOKEN_DECIMALS;

const INITIAL_VIRTUAL_TOKEN_RESERVE =
  1_200_000_000n *
  TOKEN_DECIMALS;

const INITIAL_VIRTUAL_QUOTE_RESERVE =
  12_000n *
  TOKEN_DECIMALS;

const PRICE_SCALE =
  10n ** 18n;

const LAUNCH_FACTORY_ADDRESS =
  "0x8Da50245171d09a544eb047fc3d4e8cE4514931A";


const LAUNCH_FACTORY_ABI = [
  "event FairTokenBought(uint256 indexed launchId, address indexed buyer, address indexed token, uint256 quoteAmount, uint256 tokenAmount, uint256 tokensSold, uint256 quoteReserve)",

  "event FairTokenSold(uint256 indexed launchId, address indexed seller, address indexed token, uint256 tokenAmount, uint256 quoteAmount, uint256 tokensSold, uint256 quoteReserve)",

  "function fairLaunches(uint256) view returns (address token, address creator, uint256 totalSupply, uint256 bondingSupply, uint256 liquiditySupply, uint256 tokensSold, uint256 quoteReserve, uint256 transactionCount, uint8 status)",
];

const ERC20_ABI = [
  "function balanceOf(address account) view returns (uint256)",
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

const corsHeaders = {
  "Access-Control-Allow-Origin":
    "*",

  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",

  "Access-Control-Allow-Methods":
    "POST, OPTIONS",
};


Deno.serve(
  async (req) => {
    if (
      req.method === "OPTIONS"
    ) {
      return new Response(
        "ok",
        {
          headers:
            corsHeaders,
        }
      );
    }


    if (
      req.method !== "POST"
    ) {
      return jsonResponse(
        {
          error:
            "Method not allowed.",
        },
        405
      );
    }


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


      const body =
        await req.json();


      const transactionHash =
        String(
          body?.transactionHash ??
          ""
        ).trim();


      const expectedLaunchId =
        body?.launchId !==
          undefined &&
        body?.launchId !==
          null
          ? BigInt(
              body.launchId
            )
          : null;


      const expectedTokenAddress =
        String(
          body?.tokenAddress ??
          ""
        ).trim();


      const expectedTraderAddress =
        String(
          body?.traderAddress ??
          ""
        ).trim();


      /*
       * --------------------------------------------------
       * INPUT VALIDATION
       * --------------------------------------------------
       */

      if (
        !/^0x[a-fA-F0-9]{64}$/.test(
          transactionHash
        )
      ) {
        return jsonResponse(
          {
            error:
              "Invalid transaction hash.",
          },
          400
        );
      }


      if (
        expectedLaunchId ===
        null
      ) {
        return jsonResponse(
          {
            error:
              "Invalid launch ID.",
          },
          400
        );
      }


      if (
        !isAddress(
          expectedTokenAddress
        ) ||
        !isAddress(
          expectedTraderAddress
        )
      ) {
        return jsonResponse(
          {
            error:
              "Invalid address.",
          },
          400
        );
      }


      /*
       * --------------------------------------------------
       * LOAD TRANSACTION + RECEIPT
       * --------------------------------------------------
       */

      const tx =
        await provider
          .getTransaction(
            transactionHash
          );


      if (!tx) {
        return jsonResponse(
          {
            error:
              "Transaction not found.",
          },
          400
        );
      }


      if (
        !tx.to ||
        tx.to.toLowerCase() !==
          LAUNCH_FACTORY_ADDRESS
            .toLowerCase()
      ) {
        return jsonResponse(
          {
            error:
              "Transaction did not call the official LaunchFactory.",
          },
          400
        );
      }


      if (
        !tx.from ||
        tx.from.toLowerCase() !==
          expectedTraderAddress
            .toLowerCase()
      ) {
        return jsonResponse(
          {
            error:
              "Trader does not match transaction sender.",
          },
          400
        );
      }


      const receipt =
        await provider
          .getTransactionReceipt(
            transactionHash
          );


      if (
        !receipt ||
        receipt.status !== 1
      ) {
        return jsonResponse(
          {
            error:
              "Transaction is not confirmed successfully.",
          },
          400
        );
      }


      /*
      * --------------------------------------------------
      * LOAD BLOCK TIMESTAMP
      * --------------------------------------------------
      */

      const block =
      await provider.getBlock(
        receipt.blockNumber
      );

      if (!block) {
      throw new Error(
        "Unable to read trade block."
      );
      }

      const blockTimestamp =
      new Date(
        Number(
          block.timestamp
        ) *
          1000
      ).toISOString();



      /*
       * --------------------------------------------------
       * FIND TRADE EVENT
       * --------------------------------------------------
       */

      let side:
        "BUY" |
        "SELL" |
        null =
        null;

      let launchId:
        bigint |
        null =
        null;

      let tokenAddress:
        string |
        null =
        null;

      let traderAddress:
        string |
        null =
        null;

      let quoteAmount:
        bigint |
        null =
        null;

      let tokenAmount:
        bigint |
        null =
        null;

      let tokensSold:
        bigint |
        null =
        null;
      
      let quoteReserve:
        bigint |
        null =
        null;

      for (
        const log of
          receipt.logs
      ) {
        if (
          log.address
            .toLowerCase() !==
          LAUNCH_FACTORY_ADDRESS
            .toLowerCase()
        ) {
          continue;
        }


        try {
          const parsed =
            launchInterface
              .parseLog(
                log
              );


          if (
            parsed?.name ===
            "FairTokenBought"
          ) {
            side =
              "BUY";

            launchId =
              parsed.args
                .launchId;

            traderAddress =
              parsed.args
                .buyer;

            tokenAddress =
              parsed.args
                .token;

            quoteAmount =
              parsed.args
                .quoteAmount;

            tokenAmount =
              parsed.args
                .tokenAmount;
            
            tokensSold =
              parsed.args
                .tokensSold;

            quoteReserve =
              parsed.args
                .quoteReserve;

            break;
          }


          if (
            parsed?.name ===
            "FairTokenSold"
          ) {
            side =
              "SELL";

            launchId =
              parsed.args
                .launchId;

            traderAddress =
              parsed.args
                .seller;

            tokenAddress =
              parsed.args
                .token;

            tokenAmount =
              parsed.args
                .tokenAmount;

            quoteAmount =
              parsed.args
                .quoteAmount;

              tokensSold =
                parsed.args
                  .tokensSold;
            
              quoteReserve =
                parsed.args
                  .quoteReserve;
            break;
          }

        } catch {
          /*
           * Ignore unrelated
           * LaunchFactory logs.
           */
        }
      }


      if (
        !side ||
        launchId === null ||
        !tokenAddress ||
        !traderAddress ||
        quoteAmount === null ||
        tokenAmount === null ||
        tokensSold === null ||
        quoteReserve === null
      ) {
        return jsonResponse(
          {
            error:
              "Trade event not found in transaction receipt.",
          },
          400
        );
      }


      /*
       * --------------------------------------------------
       * VERIFY EVENT AGAINST REQUEST
       * --------------------------------------------------
       */

      if (
        launchId !==
        expectedLaunchId
      ) {
        return jsonResponse(
          {
            error:
              "Launch ID does not match transaction.",
          },
          400
        );
      }


      if (
        tokenAddress
          .toLowerCase() !==
        expectedTokenAddress
          .toLowerCase()
      ) {
        return jsonResponse(
          {
            error:
              "Token address does not match transaction.",
          },
          400
        );
      }


      if (
        traderAddress
          .toLowerCase() !==
        expectedTraderAddress
          .toLowerCase()
      ) {
        return jsonResponse(
          {
            error:
              "Trader address does not match trade event.",
          },
          400
        );
      }


      /*
      * --------------------------------------------------
      * READ AUTHORITATIVE LAUNCH STATE
      * --------------------------------------------------
      *
      * Read only the launch affected by this trade.
      *
      * This also protects against two trade Edge Functions
      * finishing out of order: we always write the latest
      * current LaunchFactory state instead of blindly
      * replaying an older event snapshot.
      */

      const launchStateCallData =
      launchInterface
        .encodeFunctionData(
          "fairLaunches",
          [
            launchId,
          ]
        );

      const launchStateResult =
      await provider.call({
        to:
          LAUNCH_FACTORY_ADDRESS,

        data:
          launchStateCallData,
      });

      const launchState =
      launchInterface
        .decodeFunctionResult(
          "fairLaunches",
          launchStateResult
        );

      const onChainTokenAddress =
      launchState.token;

      const onChainTokensSold =
      launchState.tokensSold;

      const onChainQuoteReserve =
      launchState.quoteReserve;

      const onChainTransactionCount =
      launchState.transactionCount;

      const onChainStatus =
      launchState.status;


      /*
      * Extra consistency check.
      */
      if (
      onChainTokenAddress
        .toLowerCase() !==
      tokenAddress
        .toLowerCase()
      ) {
      throw new Error(
        "LaunchFactory token state does not match trade event."
      );
      }


      /*
      * --------------------------------------------------
      * PRICE SNAPSHOT
      * --------------------------------------------------
      */

      const virtualTokenReserve =
      INITIAL_VIRTUAL_TOKEN_RESERVE -
      tokensSold;

      const virtualQuoteReserve =
      INITIAL_VIRTUAL_QUOTE_RESERVE +
      quoteReserve;


      if (
      virtualTokenReserve <= 0n
      ) {
      throw new Error(
        "Invalid virtual token reserve."
      );
      }


      /*
      * priceE18:
      *
      * USDC price per whole token,
      * scaled by 1e18.
      */
      const priceE18 =
      (
        virtualQuoteReserve *
        PRICE_SCALE
      ) /
      virtualTokenReserve;


      /*
      * Market cap:
      *
      * price × 1,000,000,000 supply.
      *
      * Still scaled by 1e18.
      */
      const marketCapE18 =
      (
        priceE18 *
        TOTAL_SUPPLY
      ) /
      TOKEN_DECIMALS;

      

    /*
    * --------------------------------------------------
    * READ HOLDER STATE
    * --------------------------------------------------
    */

/*
 * --------------------------------------------------
 * READ HOLDER STATE
 * --------------------------------------------------
 */

const balanceCallData =
  erc20Interface
    .encodeFunctionData(
      "balanceOf",
      [
        traderAddress,
      ]
    );

const totalSupplyCallData =
  erc20Interface
    .encodeFunctionData(
      "totalSupply"
    );


const [
  balanceResult,
  totalSupplyResult,
] =
  await Promise.all([
    provider.call({
      to:
        tokenAddress,

      data:
        balanceCallData,
    }),

    provider.call({
      to:
        tokenAddress,

      data:
        totalSupplyCallData,
    }),
  ]);


const [
  holderBalance,
] =
  erc20Interface
    .decodeFunctionResult(
      "balanceOf",
      balanceResult
    );


const [
  totalSupply,
] =
  erc20Interface
    .decodeFunctionResult(
      "totalSupply",
      totalSupplyResult
    );


let supplyPercentScaled =
  0n;

if (
  totalSupply > 0n
) {
  supplyPercentScaled =
    (
      holderBalance *
      100n *
      100_000_000n
    ) /
    totalSupply;
}


const supplyPercent =
  Number(
    supplyPercentScaled
  ) /
  100_000_000;

      /*
       * --------------------------------------------------
       * INSERT TRADE EVENT
       * --------------------------------------------------
       */

      const {
        data,
        error:
          insertError,
      } =
        await supabase
          .from(
            "trade_events"
          )
          .insert({
            chain_id:
              Number(
                ARC_CHAIN_ID
              ),

            launch_id:
              launchId
                .toString(),

            token_address:
              tokenAddress
                .toLowerCase(),

            trader_address:
              traderAddress
                .toLowerCase(),

            side,

            transaction_hash:
              transactionHash
                .toLowerCase(),

            block_number:
              receipt.blockNumber,

              quote_amount:
              quoteAmount
                .toString(),
            
            token_amount:
              tokenAmount
                .toString(),
            
            tokens_sold:
              tokensSold
                .toString(),
            
            quote_reserve:
              quoteReserve
                .toString(),
            
            price_usdc:
              formatFixed18(
                priceE18
              ),
            
            market_cap_usdc:
              formatFixed18(
                marketCapE18
              ),
            
            block_timestamp:
              blockTimestamp,
          })
          .select()
          .single();

          if (
            insertError
          ) {
            /*
             * Duplicate transaction:
             * trade event already exists.
             */
            if (
              insertError.code ===
              "23505"
            ) {
              const {
                error:
                  holderUpsertError,
              } =
                await supabase
                  .from(
                    "token_holders"
                  )
                  .upsert(
                    {
                      chain_id:
                        Number(
                          ARC_CHAIN_ID
                        ),
          
                      launch_id:
                        launchId
                          .toString(),
          
                      token_address:
                        tokenAddress
                          .toLowerCase(),
          
                      holder_address:
                        traderAddress
                          .toLowerCase(),
          
                      balance:
                        holderBalance
                          .toString(),
          
                      supply_percent:
                        supplyPercent,
          
                      updated_at:
                        new Date()
                          .toISOString(),
                    },
                    {
                      onConflict:
                        "chain_id,token_address,holder_address",
                    }
                  );
          
          
              if (
                holderUpsertError
              ) {
                throw new Error(
                  `Holder upsert failed: ${holderUpsertError.message}`
                );
              }

              const {
                error:
                  duplicateLaunchStateUpdateError,
              } =
                await supabase
                  .from(
                    "launch_tokens"
                  )
                  .update({
                    tokens_sold:
                    onChainTokensSold
                      .toString(),
                  
                    quote_reserve:
                      onChainQuoteReserve
                        .toString(),
                    
                    transaction_count:
                      onChainTransactionCount
                        .toString(),
                    
                    status:
                      Number(
                        onChainStatus
                      ),
                    
                      state_updated_at:
                      new Date()
                        .toISOString(),
                  })
                  .eq(
                    "chain_id",
                    Number(
                      ARC_CHAIN_ID
                    )
                  )
                  .eq(
                    "launch_id",
                    launchId.toString()
                  )
                  .lte(
                    "transaction_count",
                    onChainTransactionCount.toString()
                  );
              
              if (
                duplicateLaunchStateUpdateError
              ) {
                throw new Error(
                  `Launch state update failed: ${duplicateLaunchStateUpdateError.message}`
                );
              }
          
          
              const {
                data:
                  existingTrade,
                error:
                  existingError,
              } =
                await supabase
                  .from(
                    "trade_events"
                  )
                  .select(
                    "*"
                  )
                  .eq(
                    "transaction_hash",
                    transactionHash
                      .toLowerCase()
                  )
                  .maybeSingle();
          
          
              if (
                existingError
              ) {
                throw new Error(
                  `Unable to read existing trade event: ${existingError.message}`
                );
              }
          
          
              return jsonResponse(
                {
                  success:
                    true,
          
                  duplicate:
                    true,
          
                  trade:
                    existingTrade,
                },
                200
              );
            }
          
          
            throw new Error(
              `Trade event insert failed: ${insertError.message}`
            );
          }
          
          
          /*
           * --------------------------------------------------
           * UPSERT HOLDER
           * --------------------------------------------------
           */
          
          const {
            error:
              holderUpsertError,
          } =
            await supabase
              .from(
                "token_holders"
              )
              .upsert(
                {
                  chain_id:
                    Number(
                      ARC_CHAIN_ID
                    ),
          
                  launch_id:
                    launchId
                      .toString(),
          
                  token_address:
                    tokenAddress
                      .toLowerCase(),
          
                  holder_address:
                    traderAddress
                      .toLowerCase(),
          
                  balance:
                    holderBalance
                      .toString(),
          
                  supply_percent:
                    supplyPercent,
          
                  updated_at:
                    new Date()
                      .toISOString(),
                },
                {
                  onConflict:
                    "chain_id,token_address,holder_address",
                }
              );
          
          
          if (
            holderUpsertError
          ) {
            throw new Error(
              `Holder upsert failed: ${holderUpsertError.message}`
            );
          }

          /*
          * --------------------------------------------------
          * UPDATE LAUNCH MARKET STATE
          * --------------------------------------------------
          *
          * FairTokenBought / FairTokenSold already contains
          * the post-trade tokensSold and quoteReserve.
          *
          * Update only the launch that changed.
          */

          const {
            error:
              launchStateUpdateError,
          } =
            await supabase
              .from(
                "launch_tokens"
              )
              .update({
                tokens_sold:
                onChainTokensSold
                  .toString(),
              
                quote_reserve:
                  onChainQuoteReserve
                    .toString(),
                
                transaction_count:
                  onChainTransactionCount
                    .toString(),
                
                status:
                  Number(
                    onChainStatus
                  ),
                
                  state_updated_at:
                  new Date()
                    .toISOString(),
              })
              .eq(
                "chain_id",
                Number(
                  ARC_CHAIN_ID
                )
              )
              .eq(
                "launch_id",
                launchId.toString()
              )
              .lte(
                "transaction_count",
                onChainTransactionCount.toString()
              );

          if (
            launchStateUpdateError
          ) {
            throw new Error(
              `Launch state update failed: ${launchStateUpdateError.message}`
            );
          }
          
          
          /*
           * --------------------------------------------------
           * SUCCESS RESPONSE
           * --------------------------------------------------
           */
          
          return jsonResponse(
            {
              success:
                true,
          
              duplicate:
                false,
          
              trade:
                data,
            },
            200
          );

    } catch (error) {
      console.error(
        "save-trade-event:",
        error
      );


      return jsonResponse(
        {
          error:
            error instanceof Error
              ? error.message
              : "Unable to save trade event.",
        },
        500
      );
    }
  }
);




function isAddress(
  value: string
) {
  return /^0x[a-fA-F0-9]{40}$/.test(
    value
  );
}


function jsonResponse(
  body: unknown,
  status = 200
) {
  return new Response(
    JSON.stringify(
      body
    ),
    {
      status,

      headers: {
        ...corsHeaders,

        "Content-Type":
          "application/json",
      },
    }
  );
}

function formatFixed18(
  value: bigint
) {
  const whole =
    value /
    PRICE_SCALE;

  const fraction =
    (
      value %
      PRICE_SCALE
    )
      .toString()
      .padStart(
        18,
        "0"
      )
      .replace(
        /0+$/,
        ""
      );

  return fraction
    ? `${whole}.${fraction}`
    : whole.toString();
}