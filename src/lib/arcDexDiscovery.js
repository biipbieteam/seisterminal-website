import {
    Interface,
    JsonRpcProvider,
  } from "ethers";
  
  import {
    runArcRpcRead,
  } from "../contracts/launchReader.js";
  
  
  const ARC_RPC_URL =
    "https://rpc.mainnet.arc.io";
  
  const UNISWAP_V4_POOL_MANAGER =
    "0x8366a39CC670B4001A1121B8F6A443A643e40951";
  
  const ARC_USDC_ADDRESS =
    "0x3600000000000000000000000000000000000000";
  
  const NATIVE_CURRENCY_ADDRESS =
    "0x0000000000000000000000000000000000000000";
  
  
  /*
   * We intentionally use a range below the
   * maximum observed working range.
   *
   * ARC public RPC accepted 10,000 blocks
   * during testing. 8,000 gives us headroom.
   */
  const DISCOVERY_CHUNK_SIZE =
    8000;
  
  
  /*
   * Initial live discovery window.
   *
   * Historical pools will eventually come from
   * the bootstrap dataset. The browser should
   * never scan PoolManager from deployment.
   */
  const INITIAL_DISCOVERY_BLOCKS =
    10000;
  
  
  const CACHE_KEY =
    "arc_terminal_dex_discovery_v1";
  
  
  const provider =
    new JsonRpcProvider(
      ARC_RPC_URL
    );
  
  
  const poolManagerInterface =
    new Interface([
      "event Initialize(bytes32 indexed id,address indexed currency0,address indexed currency1,uint24 fee,int24 tickSpacing,address hooks,uint160 sqrtPriceX96,int24 tick)",
    ]);
  
  
  const initializeEvent =
    poolManagerInterface.getEvent(
      "Initialize"
    );
  
  
  const INITIALIZE_TOPIC =
    initializeEvent.topicHash;
  
  
  let discoveryPromise = null;
  
  
  function normalizeAddress(
    address
  ) {
    return String(
      address || ""
    ).toLowerCase();
  }
  
  
  function isDiscoverableToken(
    address
  ) {
    const normalized =
      normalizeAddress(address);
  
    if (!normalized) {
      return false;
    }
  
    if (
      normalized ===
      NATIVE_CURRENCY_ADDRESS
    ) {
      return false;
    }
  
    if (
      normalized ===
      ARC_USDC_ADDRESS
    ) {
      return false;
    }
  
    return true;
  }
  
  
  function readCache() {
    try {
      const raw =
        localStorage.getItem(
          CACHE_KEY
        );
  
      if (!raw) {
        return null;
      }
  
      const parsed =
        JSON.parse(raw);
  
      if (
        !Number.isInteger(
          parsed?.lastScannedBlock
        )
      ) {
        return null;
      }
  
      return {
        lastScannedBlock:
          parsed.lastScannedBlock,
  
        tokenAddresses:
          Array.isArray(
            parsed.tokenAddresses
          )
            ? parsed.tokenAddresses
                .map(normalizeAddress)
                .filter(Boolean)
            : [],
  
        pools:
          Array.isArray(
            parsed.pools
          )
            ? parsed.pools
            : [],
      };
  
    } catch (error) {
      console.warn(
        "Failed to read DEX discovery cache:",
        error
      );
  
      return null;
    }
  }
  
  
  function writeCache(
    lastScannedBlock,
    tokenAddresses,
    pools
  ) {
    try {
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({
          lastScannedBlock,
  
          tokenAddresses:
            Array.from(
              tokenAddresses
            ),
  
          pools:
            Array.from(
              pools.values()
            ),
        })
      );
  
    } catch (error) {
      console.warn(
        "Failed to save DEX discovery cache:",
        error
      );
    }
  }
  
  
  function addCurrency(
    tokenAddresses,
    currency
  ) {
    const normalized =
      normalizeAddress(currency);
  
    if (
      isDiscoverableToken(
        normalized
      )
    ) {
      tokenAddresses.add(
        normalized
      );
    }
  }
  
  
  async function loadArcDexTokenAddresses() {
    const cachedState =
      readCache();
  
  
    const latestBlock =
      await runArcRpcRead(
        () =>
          provider.getBlockNumber()
      );
  
  
    /*
     * Existing users continue exactly where
     * their previous successful scan stopped.
     *
     * First-time users scan only the recent
     * live window. Historical discovery will
     * be supplied separately by bootstrap data.
     */
    const fromBlock =
      cachedState
        ? cachedState.lastScannedBlock +
          1
        : Math.max(
            0,
            latestBlock -
              INITIAL_DISCOVERY_BLOCKS +
              1
          );
  
  
    const tokenAddresses =
      new Set(
        (
          cachedState
            ?.tokenAddresses || []
        ).map(normalizeAddress)
      );
  
      const pools =
      new Map(
        (
          cachedState?.pools || []
        )
          .filter(
            (pool) =>
              pool?.poolId
          )
          .map((pool) => [
            String(
              pool.poolId
            ).toLowerCase(),
    
            {
              ...pool,
    
              poolId:
                String(
                  pool.poolId
                ).toLowerCase(),
    
              currency0:
                normalizeAddress(
                  pool.currency0
                ),
    
              currency1:
                normalizeAddress(
                  pool.currency1
                ),
    
              hooks:
                normalizeAddress(
                  pool.hooks
                ),
            },
          ])
      );
    /*
     * Cache is already current.
     */
    if (
        fromBlock >
        latestBlock
      ) {
        return {
          tokenAddresses:
            Array.from(
              tokenAddresses
            ),
      
          pools:
            Array.from(
              pools.values()
            ),
      
          lastScannedBlock:
            cachedState
              ?.lastScannedBlock ??
            latestBlock,
        };
    }
  
  
    let lastScannedBlock =
      cachedState
        ?.lastScannedBlock ??
      (fromBlock - 1);
  
  
    for (
      let chunkStart =
        fromBlock;
  
      chunkStart <= latestBlock;
  
      chunkStart +=
        DISCOVERY_CHUNK_SIZE
    ) {
      const chunkEnd =
        Math.min(
          chunkStart +
            DISCOVERY_CHUNK_SIZE -
            1,
  
          latestBlock
        );
  
  
      const logs =
        await runArcRpcRead(
          () =>
            provider.getLogs({
              address:
                UNISWAP_V4_POOL_MANAGER,
  
              fromBlock:
                chunkStart,
  
              toBlock:
                chunkEnd,
  
              topics: [
                INITIALIZE_TOPIC,
              ],
            }),
          {
            attempts: 3,
            delayMs: 500,
          }
        );
  
  
      for (const log of logs) {
        let parsed;
  
        try {
          parsed =
            poolManagerInterface
              .parseLog(log);
        } catch {
          continue;
        }
  
  
        if (
          !parsed ||
          parsed.name !==
            "Initialize"
        ) {
          continue;
        }
  
        const poolId =
        String(
          parsed.args.id
        ).toLowerCase();
      
      const currency0 =
        normalizeAddress(
          parsed.args.currency0
        );
      
      const currency1 =
        normalizeAddress(
          parsed.args.currency1
        );
      
      pools.set(
        poolId,
        {
          poolId,
      
          currency0,
          currency1,
      
          fee:
            Number(
              parsed.args.fee
            ),
      
          tickSpacing:
            Number(
              parsed.args.tickSpacing
            ),
      
          hooks:
            normalizeAddress(
              parsed.args.hooks
            ),
        }
      );

        addCurrency(
          tokenAddresses,
          parsed.args.currency0
        );
  
        addCurrency(
          tokenAddresses,
          parsed.args.currency1
        );
      }
  
  
      /*
       * Persist every successful chunk.
       *
       * A reload continues from this block
       * instead of repeating successful work.
       */
      lastScannedBlock =
        chunkEnd;
  
  
        writeCache(
            lastScannedBlock,
            tokenAddresses,
            pools
        );
    }
  


    return {
    tokenAddresses:
        Array.from(
        tokenAddresses
        ),

    pools:
        Array.from(
        pools.values()
        ),

    lastScannedBlock,
    };
  }
  
  
  /*
   * ------------------------------------------------------------
   * PUBLIC DISCOVERY API
   * ------------------------------------------------------------
   *
   * Single-flight prevents multiple React consumers
   * from starting the same scan simultaneously.
   */
  export function getCachedArcDexDiscovery() {
    const cachedState =
      readCache();
  
    if (!cachedState) {
      return null;
    }
  
    return {
      source:
        "CACHE",
  
      tokenAddresses:
        cachedState.tokenAddresses,
  
      pools:
        cachedState.pools,
  
      lastScannedBlock:
        cachedState.lastScannedBlock,
    };
  }
  
  
  export function getArcDexTokenAddresses() {
    if (discoveryPromise) {
      return discoveryPromise;
    }
  
  
    discoveryPromise =
      loadArcDexTokenAddresses()
        .finally(() => {
          discoveryPromise =
            null;
        });
  
  
    return discoveryPromise;
  }


  export async function getArcDexPoolForToken(
    tokenAddress
  ) {
    const target =
      normalizeAddress(tokenAddress);
  
    if (
      !target ||
      !isDiscoverableToken(target)
    ) {
      return {
        tokenAddress: target,
        pool: null,
        matchingPools: [],
      };
    }
  
    /*
     * This also advances discovery from the
     * cached block to the latest Arc block
     * before resolving the selected token.
     */
    const discovery =
      await getArcDexTokenAddresses();
  
    const pools =
      Array.isArray(discovery?.pools)
        ? discovery.pools
        : [];
  
    const matchingPools =
      pools.filter((pool) => {
        const currency0 =
          normalizeAddress(
            pool?.currency0
          );
  
        const currency1 =
          normalizeAddress(
            pool?.currency1
          );
  
        return (
          (
            currency0 === target &&
            currency1 ===
              ARC_USDC_ADDRESS
          ) ||
          (
            currency1 === target &&
            currency0 ===
              ARC_USDC_ADDRESS
          )
        );
      });
  
    return {
      tokenAddress: target,
  
      pool:
        matchingPools.length === 1
          ? matchingPools[0]
          : null,
  
      matchingPools,
    };
  }