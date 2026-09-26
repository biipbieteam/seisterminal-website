import {
    getArcDexTokenAddresses,
    getCachedArcDexDiscovery,
  } from "./arcDexDiscovery.js";
  
  import {
    getArcTokens,
  } from "./dexScreener.js";

  import { getRecentArcArgusMetadata } from "./arcArgusMetadata.js";
  
  const MARKET_CACHE_KEY =
    "arc_terminal_dex_market_v1";
  
  
  /*
   * DEX Screener market data changes frequently,
   * but there is no reason to refetch every time
   * React remounts the Market UI.
   */
  const MARKET_CACHE_TTL_MS =
    60 * 1000;
 
    const INITIAL_MARKET_BATCH_SIZE = 30;
  
  let marketPromise = null;
 
  
  async function enrichTokensWithArgus(tokens) {
    if (!Array.isArray(tokens) || tokens.length === 0) {
      return tokens;
    }
  
    let argusMetadata;
  
    try {
      argusMetadata =
        await getRecentArcArgusMetadata();
    } catch (error) {
      /*
       * Argus metadata is optional enrichment.
       *
       * Never allow a logo/metadata failure to prevent
       * the DEX market from loading.
       */
      console.warn(
        "Failed to load recent Argus metadata:",
        error
      );
  
      return tokens;
    }
  
    if (
      !argusMetadata ||
      argusMetadata.size === 0
    ) {
      return tokens;
    }
  
    return tokens.map((token) => {
      const address =
        token?.tokenAddress?.toLowerCase();
  
      if (!address) {
        return token;
      }
  
      const metadata =
        argusMetadata.get(address);
  
      if (!metadata) {
        return token;
      }
  
      const existingCandidates =
        Array.isArray(token.logoCandidates)
          ? token.logoCandidates
          : [];
  
      const logoCandidates =
        Array.from(
          new Set([
            ...existingCandidates,
            metadata.imageUrl,
          ].filter(Boolean))
        );
  
      return {
        ...token,
  
        /*
         * Preserve DEX Screener as first priority.
         * Argus is the fallback.
         */
        logoUrl:
          token.logoUrl ||
          metadata.imageUrl ||
          "",
  
        logoCandidates,
  
        argusMetadata: metadata,
      };
    });
  }
  /*
   * ------------------------------------------------------------
   * CACHE
   * ------------------------------------------------------------
   */
  
  function readMarketCache() {
    try {
      const raw =
        localStorage.getItem(
          MARKET_CACHE_KEY
        );
  
      if (!raw) {
        return null;
      }
  
  
      const parsed =
        JSON.parse(raw);
  
  
      if (
        !Number.isFinite(
          parsed?.cachedAt
        ) ||
        !Array.isArray(
          parsed?.tokens
        )
      ) {
        return null;
      }
  
  
      return {
        cachedAt:
          parsed.cachedAt,
      
        complete:
          parsed.complete === true,
      
        lastScannedBlock:
          Number.isInteger(
            parsed.lastScannedBlock
          )
            ? parsed.lastScannedBlock
            : null,
      
        discoveredCount:
          Number.isInteger(
            parsed.discoveredCount
          )
            ? parsed.discoveredCount
            : 0,
      
        tokens:
          parsed.tokens,
      };
    } catch (error) {
      console.warn(
        "Failed to read ARC DEX market cache:",
        error
      );
  
      return null;
    }
  }
  
  
  function writeMarketCache(
    market
  ) {
    try {
      localStorage.setItem(
        MARKET_CACHE_KEY,
        JSON.stringify({
          cachedAt:
            market.cachedAt,

          complete:
            market.complete === true,

          lastScannedBlock:
            market.lastScannedBlock,
  
          discoveredCount:
            market.discoveredCount,
  
          tokens:
            market.tokens,
        })
      );
    } catch (error) {
      console.warn(
        "Failed to save ARC DEX market cache:",
        error
      );
    }
  }
  
  
  function isFreshCache(
    cache
  ) {
    if (!cache) {
      return false;
    }
  
  
    return (
    cache.complete === true &&
    Date.now() -
        cache.cachedAt <
        MARKET_CACHE_TTL_MS
    );
  }
  

  function attachPoolsToTokens(
    tokens,
    pools
  ) {
    const usdcAddress =
      "0x3600000000000000000000000000000000000000";
  
    const safePools =
      Array.isArray(pools)
        ? pools
        : [];
  
    return tokens.map((token) => {
      const tokenAddress =
        String(
          token?.tokenAddress || ""
        ).toLowerCase();
  
      const matchingPools =
        safePools.filter((pool) => {
          const currency0 =
            String(
              pool?.currency0 || ""
            ).toLowerCase();
  
          const currency1 =
            String(
              pool?.currency1 || ""
            ).toLowerCase();
  
          return (
            (
              currency0 === tokenAddress &&
              currency1 === usdcAddress
            ) ||
            (
              currency1 === tokenAddress &&
              currency0 === usdcAddress
            )
          );
        });
  
      return {
        ...token,
  
        pool:
          matchingPools.length === 1
            ? matchingPools[0]
            : null,
  
        matchingPools,
      };
    });
  }

  function mergeTokensByAddress(
    currentTokens,
    incomingTokens
  ) {
    const tokenMap =
      new Map();
  
    for (
      const token of [
        ...(Array.isArray(currentTokens)
          ? currentTokens
          : []),
  
        ...(Array.isArray(incomingTokens)
          ? incomingTokens
          : []),
      ]
    ) {
      const address =
        String(
          token?.tokenAddress || ""
        ).toLowerCase();
  
      if (!address) {
        continue;
      }
  
      const existing =
        tokenMap.get(address);
  
      tokenMap.set(
        address,
        existing
          ? {
              ...existing,
              ...token,
            }
          : token
      );
    }
  
    return Array.from(
      tokenMap.values()
    );
  }


  /*
   * ------------------------------------------------------------
   * LOAD MARKET
   * ------------------------------------------------------------
   */
  
async function loadArcDexMarket({
  onInitialBatch,
  onBatch,
} = {}) {
  const cachedMarket =
    readMarketCache();

  /*
   * Fresh cache:
   * return immediately.
   */
  if (
    isFreshCache(
      cachedMarket
    )
  ) {
    const market = {
      source: "CACHE",

      complete:
      cachedMarket.complete,

      cachedAt:
        cachedMarket.cachedAt,

      lastScannedBlock:
        cachedMarket.lastScannedBlock,

      discoveredCount:
        cachedMarket.discoveredCount,

      tokens:
        cachedMarket.tokens,
    };

    if (
      typeof onInitialBatch ===
      "function"
    ) {
      onInitialBatch(
        market
      );
    }

    return market;
  }

    /*
    * --------------------------------------------------
    * FAST DISCOVERY PATH
    * --------------------------------------------------
    *
    * Existing discovery data must never wait for
    * an ARC RPC refresh before the Market can paint.
    */
    const cachedDiscovery =
    getCachedArcDexDiscovery();

    let discovery =
    cachedDiscovery;

    let tokenAddresses =
    Array.isArray(
        cachedDiscovery?.tokenAddresses
    )
        ? cachedDiscovery.tokenAddresses
        : [];

    let pools =
    Array.isArray(
        cachedDiscovery?.pools
    )
        ? cachedDiscovery.pools
        : [];


    /*
    * If we have no discovery cache at all, this is
    * genuinely a first-time visitor and RPC discovery
    * is required before any DEX token can be known.
    */
    if (tokenAddresses.length === 0) {
    discovery =
        await getArcDexTokenAddresses();

    tokenAddresses =
        Array.isArray(
        discovery?.tokenAddresses
        )
        ? discovery.tokenAddresses
        : [];

    pools =
        Array.isArray(
        discovery?.pools
        )
        ? discovery.pools
        : [];
    }

  /*
   * --------------------------------------------------
   * INITIAL BATCH
   * --------------------------------------------------
   *
   * Only enrich the first 30 contracts.
   *
   * Do NOT wait for Argus here.
   */
  const initialAddresses =
    tokenAddresses.slice(
      0,
      INITIAL_MARKET_BATCH_SIZE
    );

  const initialDexTokens =
    initialAddresses.length > 0
      ? await getArcTokens(
          initialAddresses
        )
      : [];

  let loadedTokens =
    attachPoolsToTokens(
      initialDexTokens,
      pools
    );

  /*
   * Immediately expose the first batch
   * to the UI.
   */
  const initialMarket = {
    source: "NETWORK_INITIAL",

    complete: false,

    cachedAt:
      Date.now(),

    lastScannedBlock:
      discovery?.lastScannedBlock ??
      null,
    
    discoveredCount:
      tokenAddresses.length,

    tokens:
      loadedTokens,
  };

  if (
    typeof onInitialBatch ===
    "function"
  ) {
    onInitialBatch(
      initialMarket
    );
  }

    /*
    * --------------------------------------------------
    * BACKGROUND DISCOVERY REFRESH
    * --------------------------------------------------
    *
    * At this point the initial market has already
    * been delivered to the UI.
    *
    * ARC RPC may now refresh safely without blocking
    * the first visible DEX tokens.
    */
    let refreshedDiscovery =
    discovery;

    if (cachedDiscovery) {
    try {
    refreshedDiscovery =
        await getArcDexTokenAddresses();

    const refreshedAddresses =
        Array.isArray(
        refreshedDiscovery?.tokenAddresses
        )
        ? refreshedDiscovery.tokenAddresses
        : [];

    const refreshedPools =
        Array.isArray(
        refreshedDiscovery?.pools
        )
        ? refreshedDiscovery.pools
        : [];

    /*
    * Preserve the existing discovery list and
    * append newly discovered contracts.
    *
    * Contract address is the only identity.
    */
    tokenAddresses =
        Array.from(
        new Set([
            ...tokenAddresses.map(
            (address) =>
                String(
                address
                ).toLowerCase()
            ),

            ...refreshedAddresses.map(
            (address) =>
                String(
                address
                ).toLowerCase()
            ),
        ])
        ).filter(Boolean);

    /*
    * The refreshed discovery cache now owns
    * the most complete PoolKey snapshot.
    */
    pools =
        refreshedPools;

    } catch (error) {
    /*
    * Background RPC failure must never remove
    * the market that is already visible.
    */
    console.warn(
        "Failed to refresh ARC DEX discovery:",
        error
    );
    }
    }

  /*
   * Save immediately.
   *
   * If the page reloads while background
   * loading is still running, we already
   * have something useful to show.
   */
  writeMarketCache(
    initialMarket
  );

  /*
   * --------------------------------------------------
   * REMAINING TOKENS
   * --------------------------------------------------
   *
   * Load progressively in groups of 30.
   */
  for (
    let index =
      INITIAL_MARKET_BATCH_SIZE;

    index <
      tokenAddresses.length;

    index +=
      INITIAL_MARKET_BATCH_SIZE
  ) {
    const batchAddresses =
      tokenAddresses.slice(
        index,
        index +
          INITIAL_MARKET_BATCH_SIZE
      );

    try {
      const batchDexTokens =
        await getArcTokens(
          batchAddresses
        );

      const batchTokens =
        attachPoolsToTokens(
          batchDexTokens,
          pools
        );

      loadedTokens =
        mergeTokensByAddress(
          loadedTokens,
          batchTokens
        );

      const progressiveMarket = {
        source:
          "NETWORK_PROGRESSIVE",

        complete: false,

        cachedAt:
          Date.now(),

        lastScannedBlock:
          refreshedDiscovery
            ?.lastScannedBlock ??
          discovery
            ?.lastScannedBlock ??
          null,

        discoveredCount:
          tokenAddresses.length,

        tokens:
          loadedTokens,
      };

      /*
       * UI may progressively add this
       * batch without showing the loader.
       */
      if (
        typeof onBatch ===
        "function"
      ) {
        onBatch(
          progressiveMarket
        );
      }

      /*
       * Persist progress as we go.
       */
      writeMarketCache(
        progressiveMarket
      );

    } catch (error) {
      /*
       * One failed enrichment batch must
       * not destroy already-loaded market
       * data or stop subsequent batches.
       */
      console.warn(
        "Failed to load ARC DEX market batch:",
        error
      );
    }
  }

  /*
   * --------------------------------------------------
   * ARGUS BACKGROUND ENRICHMENT
   * --------------------------------------------------
   *
   * Logos/metadata are not part of the
   * critical first-paint path.
   */
  let finalTokens =
    loadedTokens;

  try {
    finalTokens =
      await enrichTokensWithArgus(
        loadedTokens
      );
  } catch (error) {
    console.warn(
      "Failed to enrich ARC DEX market with Argus:",
      error
    );
  }

  const finalMarket = {
    source: "NETWORK",

    complete: true,

    cachedAt:
      Date.now(),

    lastScannedBlock:
      refreshedDiscovery
        ?.lastScannedBlock ??
      discovery
        ?.lastScannedBlock ??
      null,

    discoveredCount:
      tokenAddresses.length,

    tokens:
      finalTokens,
  };

  /*
   * Send the final enriched snapshot
   * through the same progressive channel.
   */
  if (
    typeof onBatch ===
    "function"
  ) {
    onBatch(
      finalMarket
    );
  }

  writeMarketCache(
    finalMarket
  );

  return finalMarket;
}
  
  
  /*
   * ------------------------------------------------------------
   * PUBLIC API
   * ------------------------------------------------------------
   *
   * Single-flight is important in development
   * because React StrictMode may invoke effects
   * more than once.
   *
   * It also protects production callers if
   * multiple UI consumers request the market
   * simultaneously.
   */
  
  export function getArcDexMarket(
    options = {}
  ) {
    const cachedMarket =
      readMarketCache();
  
    if (
      isFreshCache(
        cachedMarket
      )
    ) {
      const market = {
        source: "CACHE",

        complete:
        cachedMarket.complete,

        cachedAt:
          cachedMarket.cachedAt,
  
        lastScannedBlock:
          cachedMarket.lastScannedBlock,
  
        discoveredCount:
          cachedMarket.discoveredCount,
  
        tokens:
          cachedMarket.tokens,
      };
  
      if (
        typeof options.onInitialBatch ===
        "function"
      ) {
        options.onInitialBatch(
          market
        );
      }
  
      return Promise.resolve(
        market
      );
    }
  
    if (marketPromise) {
      return marketPromise;
    }
  
    marketPromise =
      loadArcDexMarket(
        options
      ).finally(() => {
        marketPromise =
          null;
      });
  
    return marketPromise;
  }
  
  
  /*
   * ------------------------------------------------------------
   * STALE CACHE FALLBACK
   * ------------------------------------------------------------
   *
   * Used by the UI if a network refresh fails.
   *
   * A stale market is preferable to making the
   * entire DEX section disappear because an
   * external API or public RPC is temporarily
   * unavailable.
   */
  
  export function getCachedArcDexMarket() {
    const cachedMarket =
      readMarketCache();
  
  
    if (!cachedMarket) {
      return null;
    }
  
  
    return {
      source: "STALE_CACHE",

      complete:
      cachedMarket.complete,

      cachedAt:
        cachedMarket.cachedAt,
  
      lastScannedBlock:
        cachedMarket.lastScannedBlock,
  
      discoveredCount:
        cachedMarket.discoveredCount,
  
      tokens:
        cachedMarket.tokens,
    };
  }