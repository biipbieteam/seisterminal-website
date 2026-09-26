const DEX_SCREENER_API =
  "https://api.dexscreener.com";

const ARC_CHAIN_ID = "arc";

const ARC_USDC_ADDRESS =
  "0x3600000000000000000000000000000000000000";

function toNumber(value, fallback = 0) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
}

function getLiquidityUsd(pair) {
  return toNumber(
    pair?.liquidity?.usd
  );
}

function isArcPair(pair) {
  return (
    pair?.chainId
      ?.toLowerCase() ===
    ARC_CHAIN_ID
  );
}

function isUsdcPair(pair) {
  return (
    pair?.quoteToken?.address
      ?.toLowerCase() ===
    ARC_USDC_ADDRESS.toLowerCase()
  );
}

function selectCanonicalPair(pairs) {
  const arcPairs = pairs.filter(isArcPair);

  if (arcPairs.length === 0) {
    return null;
  }

  const usdcPairs =
    arcPairs.filter(isUsdcPair);

  const candidates =
    usdcPairs.length > 0
      ? usdcPairs
      : arcPairs;

  return [...candidates].sort(
    (a, b) =>
      getLiquidityUsd(b) -
      getLiquidityUsd(a)
  )[0];
}

function normalizePair(pair) {
  if (!pair) {
    return null;
  }

  const h24Buys =
    toNumber(pair.txns?.h24?.buys);

  const h24Sells =
    toNumber(pair.txns?.h24?.sells);

  return {
    source: "DEXSCREENER",

    chainId: pair.chainId || "",
    dexId: pair.dexId || "",

    pairAddress:
      pair.pairAddress || "",

    tokenAddress:
      pair.baseToken?.address || "",

    name:
      pair.baseToken?.name || "",

    symbol:
      pair.baseToken?.symbol || "",

    quoteAddress:
      pair.quoteToken?.address || "",

    quoteSymbol:
      pair.quoteToken?.symbol || "",

    logoUrl:
      pair.info?.imageUrl ||
      pair.info?.openGraph ||
      pair.info?.header ||
      "",
    
    logoCandidates:
      Array.from(
        new Set(
          [
            pair.info?.imageUrl,
            pair.info?.openGraph,
            pair.info?.header,
          ].filter(Boolean)
        )
      ),

    priceUsd:
      toNumber(pair.priceUsd),

    marketCap:
      toNumber(
        pair.marketCap,
        toNumber(pair.fdv)
      ),

    fdv:
      toNumber(pair.fdv),

    liquidityUsd:
      getLiquidityUsd(pair),

    volume24h:
      toNumber(pair.volume?.h24),

    priceChange24h:
      toNumber(
        pair.priceChange?.h24
      ),

    buys24h: h24Buys,
    sells24h: h24Sells,

    txns24h:
      h24Buys + h24Sells,

    pairCreatedAt:
      pair.pairCreatedAt
        ? Number(pair.pairCreatedAt)
        : null,

    url:
      pair.url || "",

    raw: pair,
  };
}

export async function getArcToken(
  tokenAddress
) {
  if (!tokenAddress) {
    throw new Error(
      "Token address is required."
    );
  }

  const response = await fetch(
    `${DEX_SCREENER_API}/token-pairs/v1/${ARC_CHAIN_ID}/${tokenAddress}`
  );

  if (!response.ok) {
    throw new Error(
      `DEX Screener request failed: ${response.status}`
    );
  }

  const data = await response.json();

  const pairs =
    Array.isArray(data)
      ? data
      : [];

  const canonicalPair =
    selectCanonicalPair(pairs);

  return normalizePair(
    canonicalPair
  );
}

const TOKEN_BATCH_SIZE = 30;

function chunkArray(
  items,
  size
) {
  const chunks = [];

  for (
    let index = 0;
    index < items.length;
    index += size
  ) {
    chunks.push(
      items.slice(
        index,
        index + size
      )
    );
  }

  return chunks;
}


export async function getArcTokens(
  tokenAddresses
) {
  const uniqueAddresses =
    Array.from(
      new Set(
        (tokenAddresses || [])
          .filter(Boolean)
          .map((address) =>
            String(address)
              .toLowerCase()
          )
      )
    );


  if (
    uniqueAddresses.length === 0
  ) {
    return [];
  }


  const batches =
    chunkArray(
      uniqueAddresses,
      TOKEN_BATCH_SIZE
    );


  const tokens = [];


  /*
   * Sequential intentionally.
   *
   * Do not fire all DEX Screener batches
   * simultaneously.
   */
  for (const batch of batches) {
    const response =
      await fetch(
        `${DEX_SCREENER_API}/tokens/v1/${ARC_CHAIN_ID}/${batch.join(",")}`
      );


    if (!response.ok) {
      throw new Error(
        `DEX Screener batch request failed: ${response.status}`
      );
    }


    const data =
      await response.json();


    const pairs =
      Array.isArray(data)
        ? data
        : [];


    /*
     * One token may have multiple pools.
     *
     * Group returned pairs by base token,
     * then apply the same canonical-pair
     * selection used by getArcToken().
     */
    const pairsByToken =
      new Map();


    for (const pair of pairs) {
      if (!isArcPair(pair)) {
        continue;
      }


      const tokenAddress =
        pair?.baseToken?.address
          ?.toLowerCase();


      if (
        !tokenAddress ||
        !uniqueAddresses.includes(
          tokenAddress
        )
      ) {
        continue;
      }


      if (
        !pairsByToken.has(
          tokenAddress
        )
      ) {
        pairsByToken.set(
          tokenAddress,
          []
        );
      }


      pairsByToken
        .get(tokenAddress)
        .push(pair);
    }


    for (
      const address of batch
    ) {
      const tokenPairs =
        pairsByToken.get(
          address
        ) || [];


      const canonicalPair =
        selectCanonicalPair(
          tokenPairs
        );


      const normalized =
        normalizePair(
          canonicalPair
        );


      if (normalized) {
        tokens.push(
          normalized
        );
      }
    }
  }


  return tokens;
}