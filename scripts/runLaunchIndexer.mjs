import {
    Contract,
    JsonRpcProvider,
  } from "ethers";
  
  import {
    createClient,
  } from "@supabase/supabase-js";
  
  import {
    ARC_TESTNET,
    ARC_TESTNET_CONTRACTS,
  } from "../src/contracts/arcTestnet.js";
  
  import {
    LAUNCH_FACTORY_ABI,
    MEME_TOKEN_ABI,
  } from "../src/contracts/abis.js";
  
  /*
   * ============================================================
   * SEIS TERMINAL
   * Incremental Launch Indexer
   * ============================================================
   *
   * READ ONLY on ARC.
   *
   * - no wallet
   * - no private key
   * - no signatures
   * - no transactions
   *
   * Only writes verified public chain state to Supabase.
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
      ARC_TESTNET.rpcUrl,
      ARC_TESTNET.chainId,
      {
        staticNetwork: true,
      }
    );
  
  const launchFactory =
    new Contract(
      ARC_TESTNET_CONTRACTS.launchFactory,
      LAUNCH_FACTORY_ABI,
      provider
    );
  
  const POLL_INTERVAL_MS =
    5000;
  
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
  
        await sleep(
          delayMs * attempt
        );
      }
    }
  
    throw lastError;
  }
  
  async function readLaunchState(
    launchId
  ) {
    const id =
      BigInt(launchId);
  
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
        `Launch ${launchId} returned invalid token address`
      );
    }
  
    const token =
      new Contract(
        launch.token,
        MEME_TOKEN_ABI,
        provider
      );
  
    /*
     * These values are immutable,
     * but for a new/unindexed launch
     * we read them once.
     */
  
    const name =
      await retry(
        () => token.name()
      );
  
    const symbol =
      await retry(
        () => token.symbol()
      );
  
    const decimals =
      await retry(
        () => token.decimals()
      );
  
    const tokenTotalSupply =
      await retry(
        () =>
          token.totalSupply()
      );
  
    return {
      chain_id:
        ARC_TESTNET.chainId,
  
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
  }
  
  async function indexLaunch(
    launchId
  ) {
    console.log(
      `Indexing launch ${launchId}...`
    );
  
    const row =
      await readLaunchState(
        launchId
      );
  
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
  
    console.log(
      `✓ ${launchId} | ${row.token_symbol} | ${row.token_address}`
    );
  }
  
  /*
   * Find rows that already exist from
   * save-launch-metadata but have not
   * yet received indexed chain state.
   *
   * Example right now:
   * launch 158.
   */
  async function getIncompleteLaunchIds() {
    const {
      data,
      error,
    } =
      await supabase
        .from("launch_tokens")
        .select("launch_id")
        .eq(
          "chain_id",
          ARC_TESTNET.chainId
        )
        .is(
          "indexed_at",
          null
        )
        .order(
          "launch_id",
          {
            ascending: true,
          }
        );
  
    if (error) {
      throw error;
    }
  
    return (
      data || []
    ).map(
      (row) =>
        Number(row.launch_id)
    );
  }
  
  /*
   * Highest fully indexed launch.
   */
  async function getLatestIndexedLaunchId() {
    const {
      data,
      error,
    } =
      await supabase
        .from("launch_tokens")
        .select("launch_id")
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
        )
        .limit(1)
        .maybeSingle();
  
    if (error) {
      throw error;
    }
  
    if (!data) {
      return -1;
    }
  
    return Number(
      data.launch_id
    );
  }
  
  async function syncOnce() {
    /*
     * ----------------------------------------------------------
     * 1. Repair incomplete rows first.
     * ----------------------------------------------------------
     */
  
    const incompleteIds =
      await getIncompleteLaunchIds();
  
    for (
      const launchId
      of incompleteIds
    ) {
      await indexLaunch(
        launchId
      );
  
      await sleep(150);
    }
  
    /*
     * ----------------------------------------------------------
     * 2. Discover launch IDs not yet indexed.
     * ----------------------------------------------------------
     */
  
    const total =
      await retry(
        () =>
          launchFactory
            .totalFairLaunches()
      );
  
    const latestOnChain =
      Number(total) - 1;
  
    const latestIndexed =
      await getLatestIndexedLaunchId();
  
    if (
      latestIndexed >= latestOnChain
    ) {
      console.log(
        `Synced. Latest launch: ${latestOnChain}`
      );
  
      return;
    }
  
    console.log(
      `New launches detected: ${latestIndexed + 1} → ${latestOnChain}`
    );
  
    for (
      let launchId =
        latestIndexed + 1;
  
      launchId <=
        latestOnChain;
  
      launchId++
    ) {
      await indexLaunch(
        launchId
      );
  
      await sleep(150);
    }
  }
  
  async function main() {
    console.log(
      "\nSEIS Launch Indexer started."
    );
  
    console.log(
      `Polling every ${POLL_INTERVAL_MS / 1000}s.\n`
    );
  
    while (true) {
      try {
        await syncOnce();
      } catch (error) {
        console.error(
          "Indexer cycle failed:",
          error?.message ||
            error
        );
      }
  
      await sleep(
        POLL_INTERVAL_MS
      );
    }
  }
  
  main().catch(
    (error) => {
      console.error(
        "Fatal indexer error:",
        error
      );
  
      process.exit(1);
    }
  );