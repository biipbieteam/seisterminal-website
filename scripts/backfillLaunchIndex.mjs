import {
    Contract,
    JsonRpcProvider,
  } from "ethers";
  
  import { createClient } from "@supabase/supabase-js";
  
  import {
    ARC_MAINNET,
    ARC_MAINNET_CONTRACTS,
  } from "../src/contracts/arcMainnet.js";
  
  import {
    LAUNCH_FACTORY_ABI,
    MEME_TOKEN_ABI,
  } from "../src/contracts/abis.js";
  
  const LAUNCH_FACTORY_DEPLOYMENT_BLOCK =
  21313737;

  const FAIR_LAUNCH_CREATED_EVENT =
  "event FairLaunchCreated(uint256 indexed launchId, address indexed token, address indexed creator, uint256 totalSupply, uint256 bondingSupply, uint256 liquiditySupply)";
  /*
   * ============================================================
   * SEIS TERMINAL
   * One-time Launch Index Backfill
   * ============================================================
  /*
  * READ ONLY on ARC Mainnet.
   *
   * No wallet.
   * No private key.
   * No signatures.
   * No transactions.
   *
   * Writes verified public launch state into Supabase.
   */
  
  const SUPABASE_URL =
    process.env.VITE_SUPABASE_URL;
  
  const SUPABASE_SERVICE_ROLE_KEY =
    process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!SUPABASE_URL) {
    throw new Error(
      "Missing VITE_SUPABASE_URL"
    );
  }
  
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY"
    );
  }
  
  const supabase =
    createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );
  
  const provider =
    new JsonRpcProvider(
      ARC_MAINNET.rpcUrl,
      ARC_MAINNET.chainId,
      {
        staticNetwork: true,
      }
    );
  
  const launchFactory =
    new Contract(
      ARC_MAINNET_CONTRACTS.launchFactory,
      LAUNCH_FACTORY_ABI,
      provider
    );
  
    const launchEventContract =
    new Contract(
      ARC_MAINNET_CONTRACTS.launchFactory,
      [
        FAIR_LAUNCH_CREATED_EVENT,
      ],
      provider
    );
  
    async function getLaunchTransactionHash(
      launchId
    ) {
      const filter =
        launchEventContract.filters
          .FairLaunchCreated(
            launchId
          );
    
      const latestBlock =
        await retry(
          () => provider.getBlockNumber()
        );
    
      const CHUNK_SIZE =
        1000;
    
      for (
        let fromBlock =
          LAUNCH_FACTORY_DEPLOYMENT_BLOCK;
    
        fromBlock <= latestBlock;
    
        fromBlock += CHUNK_SIZE
      ) {
        const toBlock =
          Math.min(
            fromBlock +
              CHUNK_SIZE -
              1,
            latestBlock
          );
    
        const events =
          await retry(
            () =>
              launchEventContract.queryFilter(
                filter,
                fromBlock,
                toBlock
              )
          );
    
        if (events.length > 0) {
          if (events.length !== 1) {
            throw new Error(
              `Expected 1 FairLaunchCreated event for launch ${launchId}, found ${events.length}`
            );
          }
    
          return events[0]
            .transactionHash;
        }
    
        await sleep(80);
      }
    
      throw new Error(
        `FairLaunchCreated event not found for launch ${launchId}`
      );
    }

  function sleep(ms) {
    return new Promise(
      (resolve) =>
        setTimeout(resolve, ms)
    );
  }
  
  async function retry(
    operation,
    {
      attempts = 4,
      delayMs = 500,
    } = {}
  ) {
    let lastError;
  
    for (
      let attempt = 1;
      attempt <= attempts;
      attempt++
    ) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
  
        if (attempt === attempts) {
          break;
        }
  
        console.warn(
          `RPC retry ${attempt}/${attempts - 1}...`
        );
  
        await sleep(
          delayMs * attempt
        );
      }
    }
  
    throw lastError;
  }
  
  async function main() {
    const total =
      await retry(
        () =>
          launchFactory
            .totalFairLaunches()
      );
  
    console.log(
      `\nOn-chain launches: ${total}\n`
    );
  
    let indexed = 0;
    let failed = 0;
  
    for (
      let id = 0n;
      id < total;
      id++
    ) {
      try {
        console.log(
          `[${id}/${total - 1n}] Reading launch...`
        );
  
        /*
         * Current mutable launch state.
         */
        const launch =
          await retry(
            () =>
              launchFactory
                .fairLaunches(id)
          );
  
        if (
          !launch?.token ||
          launch.token ===
            "0x0000000000000000000000000000000000000000"
        ) {
          throw new Error(
            "Invalid token address"
          );
        }
  
        /*
         * Immutable ERC20 metadata.
         *
         * Sequential intentionally.
         * ARC public RPC stability > speed.
         */
        const token =
          new Contract(
            launch.token,
            MEME_TOKEN_ABI,
            provider
          );
  
        const name =
          await retry(
            () => token.name()
          );
  
        await sleep(80);
  
        const symbol =
          await retry(
            () => token.symbol()
          );
  
        await sleep(80);
  
        const decimals =
          await retry(
            () => token.decimals()
          );
  
        await sleep(80);
  
        const tokenTotalSupply =
          await retry(
            () =>
              token.totalSupply()
          );

        const transactionHash =
          await getLaunchTransactionHash(
            id
          );    
        /*
         * Store uint256 values as decimal strings.
         * PostgreSQL numeric preserves exact values.
         */
        const row = {
          chain_id:
            ARC_MAINNET.chainId,
  
          launch_id:
            Number(id),
  
          token_address:
            launch.token,
  
          creator_address:
            launch.creator,
  
          token_name:
            name,
  
          token_symbol:
            symbol,
          
          transaction_hash:
            transactionHash,

          decimals:
            Number(decimals),
  
          status:
            Number(launch.status),
  
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
        };
  
        const {
          error,
        } =
          await supabase
            .from("launch_tokens")
            .upsert(
              row,
              {
                onConflict:
                  "chain_id,launch_id",
              }
            );
  
        if (error) {
          throw error;
        }
  
        indexed += 1;
  
        console.log(
          `✓ ${id} | ${symbol} | ${launch.token}`
        );
  
        /*
         * Avoid bursts against ARC public RPC.
         */
        await sleep(200);
  
      } catch (error) {
        failed += 1;
  
        console.error(
          `✗ Launch ${id} failed:`,
          error?.message || error
        );
  
        /*
         * Continue instead of aborting the
         * entire backfill.
         */
        await sleep(800);
      }
    }
  
    console.log(
      "\n------------------------------"
    );
  
    console.log(
      `Indexed: ${indexed}`
    );
  
    console.log(
      `Failed:  ${failed}`
    );
  
    console.log(
      "Backfill finished."
    );
  
    console.log(
      "------------------------------\n"
    );
  
    if (failed > 0) {
      process.exitCode = 1;
    }
  }
  
  main().catch(
    (error) => {
      console.error(
        "Fatal backfill error:",
        error
      );
  
      process.exit(1);
    }
  );