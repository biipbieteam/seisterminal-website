import {
    Contract,
    JsonRpcProvider,
    formatUnits,
  } from "ethers";

  import {
    ARC_MAINNET,
    ARC_MAINNET_CONTRACTS,
    getLaunchStatusLabel,
  } from "./arcMainnet.js";

  import {
    LAUNCH_FACTORY_ABI,
    MEME_TOKEN_ABI,
  } from "./abis.js";


  /*
   * ============================================================
   * ARC TERMINAL
   * Public ARC Mainnet Fair Launch Reader
   * ============================================================
   *
   * READ ONLY.
   *
   * This module:
   * - does NOT access window.ethereum
   * - does NOT request wallet accounts
   * - does NOT request signatures
   * - does NOT send transactions
   * - does NOT request permissions
   *
   * Public blockchain data is read directly
   * from the ARC Mainnet RPC.
   */


  /*
   * ------------------------------------------------------------
   * READ-ONLY PROVIDER
   * ------------------------------------------------------------
   */

  const provider =
    new JsonRpcProvider(
      ARC_MAINNET.rpcUrl,
      ARC_MAINNET.chainId,
      {
        staticNetwork: true,
      }
    );


  /*
   * ------------------------------------------------------------
   * READ-ONLY LAUNCH FACTORY
   * ------------------------------------------------------------
   */

  const launchFactory =
    new Contract(
      ARC_MAINNET_CONTRACTS.launchFactory,
      LAUNCH_FACTORY_ABI,
      provider
    );


  /*
   * ------------------------------------------------------------
   * RPC RETRY
   * ------------------------------------------------------------
   */

  function sleep(ms) {
    return new Promise(
      (resolve) =>
        setTimeout(resolve, ms)
    );
  }

  /*
 * ------------------------------------------------------------
 * GLOBAL ARC RPC RATE-LIMIT GATE
 * ------------------------------------------------------------
 *
 * All public ARC RPC reads pass through one shared gate.
 *
 * This prevents independent UI readers from creating
 * request bursts against the public Mainnet endpoint.
 */

  const RPC_MIN_INTERVAL_MS = 500;

let rpcNextAllowedAt = 0;

let rpcGatePromise =
  Promise.resolve();


function waitForRpcGate() {
  const task =
    rpcGatePromise.then(
      async () => {
        const now =
          Date.now();

        const waitMs =
          Math.max(
            0,
            rpcNextAllowedAt - now
          );

        if (waitMs > 0) {
          await sleep(
            waitMs
          );
        }

        rpcNextAllowedAt =
          Date.now() +
          RPC_MIN_INTERVAL_MS;
      }
    );

  /*
   * Keep the queue alive even if an
   * unexpected gate error occurs.
   */
  rpcGatePromise =
    task.catch(
      () => {}
    );

  return task;
}


function applyRpcCooldown(
  cooldownMs
) {
  rpcNextAllowedAt =
    Math.max(
      rpcNextAllowedAt,
      Date.now() +
        cooldownMs
    );
}


async function withRpcRetry(
  operation,
  {
    attempts = 3,
    delayMs = 350,
  } = {}
) {
  let lastError;

  for (
    let attempt = 1;
    attempt <= attempts;
    attempt++
  ) {
    /*
     * Every attempt must pass through
     * the shared ARC RPC gate.
     */
    await waitForRpcGate();

    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (attempt === attempts) {
        break;
      }

      const errorText =
        String(
          error?.message ||
          error?.shortMessage ||
          error?.info?.error?.message ||
          error ||
          ""
        ).toLowerCase();

      const status =
        error?.status ??
        error?.response?.status ??
        error?.info?.status ??
        null;

      const isRateLimited =
        status === 429 ||
        errorText.includes("429") ||
        errorText.includes(
          "rate limit"
        ) ||
        errorText.includes(
          "rate-limit"
        ) ||
        errorText.includes(
          "too many requests"
        );

      if (isRateLimited) {
        const backoffMs =
        Math.min(
          5000 *
            2 ** (attempt - 1),
          30000
        );

        const jitterMs =
          Math.floor(
            Math.random() * 500
          );

        const cooldownMs =
          backoffMs +
          jitterMs;

        /*
         * IMPORTANT:
         *
         * A 429 cools down the GLOBAL gate,
         * not only this individual request.
         */
        applyRpcCooldown(
          cooldownMs
        );

        continue;
      }

      await sleep(
        delayMs * attempt
      );
    }
  }

  throw lastError;
}

/*
 * ------------------------------------------------------------
 * SHARED ARC RPC READ
 * ------------------------------------------------------------
 *
 * Allows other ARC Mainnet readers to use the same
 * rate-limit gate as the Fair Launch market reader.
 *
 * IMPORTANT:
 * Do not create independent public RPC queues elsewhere.
 */

export async function runArcRpcRead(
  operation,
  options
) {
  return withRpcRetry(
    operation,
    options
  );
}

  /*
   * ------------------------------------------------------------
   * BASIC HELPERS
   * ------------------------------------------------------------
   */

  function formatTokenAmount(
    value,
    decimals = 18
  ) {
    return formatUnits(
      value,
      decimals
    );
  }


  function formatQuoteAmount(
    value
  ) {
    return formatUnits(
      value,
      ARC_MAINNET.nativeCurrency.decimals
    );
  }


  /*
   * ------------------------------------------------------------
   * GET TOTAL LAUNCH COUNT
   * ------------------------------------------------------------
   */

  export async function getTotalFairLaunches() {
    return withRpcRetry(
      () =>
        launchFactory
          .totalFairLaunches()
    );
  }


  /*
 * ------------------------------------------------------------
 * GET BUY / SELL COUNTS
 * ------------------------------------------------------------
 */

  /*
 * ------------------------------------------------------------
 * GET PLATFORM TRADE STATS
 * ------------------------------------------------------------
 *
 * Reads every FairTokenBought / FairTokenSold event emitted by
 * the ARC Mainnet LaunchFactory.
 *
 * LaunchFactory deployment block:
 * 21,313,737
 *
 * Returns:
 * - total transaction count
 * - cumulative quote volume
 * - cumulative quote volume by token
 *
 * BUY volume  = FairTokenBought.quoteAmount
 * SELL volume = FairTokenSold.quoteOut
 */

const LAUNCH_FACTORY_DEPLOYMENT_BLOCK =
21313737;

const PLATFORM_LOG_CHUNK_SIZE =
1000;

const PLATFORM_STATS_CACHE_KEY =
  "arc_terminal_mainnet_platform_stats_v1";

  let platformTradeStatsPromise =
  null;

  /*
 * ------------------------------------------------------------
 * FAIR LAUNCH MARKET SINGLE-FLIGHT
 * ------------------------------------------------------------
 *
 * Prevent multiple UI consumers from starting
 * the same full-market RPC scan at the same time.
 */

let allFairLaunchesPromise =
null;

async function loadPlatformTradeStats() {
    /*
     * ----------------------------------------------------------
     * READ LOCAL CHECKPOINT
     * ----------------------------------------------------------
     */

    let cachedState = null;

    try {
      const raw =
        localStorage.getItem(
          PLATFORM_STATS_CACHE_KEY
        );

      if (raw) {
        const parsed =
          JSON.parse(raw);

        if (
          Number.isInteger(
            parsed?.lastScannedBlock
          ) &&
          parsed.lastScannedBlock >=
            LAUNCH_FACTORY_DEPLOYMENT_BLOCK
        ) {
          cachedState =
            parsed;
        }
      }
    } catch (error) {
      console.warn(
        "Failed to read platform stats cache:",
        error
      );
    }


    let totalTxns =
      cachedState?.totalTxns ?? 0;

    let totalVolumeRaw =
      BigInt(
        cachedState?.totalVolumeRaw ??
        "0"
      );


    const volumeByToken =
      new Map(
        Object.entries(
          cachedState?.volumeByToken ??
          {}
        ).map(
          ([
            tokenAddress,
            volumeRaw,
          ]) => [
            tokenAddress,
            BigInt(volumeRaw),
          ]
        )
      );


    /*
     * ----------------------------------------------------------
     * FIND INCREMENTAL RANGE
     * ----------------------------------------------------------
     */

    const latestBlock =
      await withRpcRetry(
        () =>
          provider.getBlockNumber()
      );


    const fromBlock =
      cachedState
        ? cachedState.lastScannedBlock +
          1
        : LAUNCH_FACTORY_DEPLOYMENT_BLOCK;


    /*
     * Cache is already current.
     */
    if (
      fromBlock >
      latestBlock
    ) {
      return {
        totalTxns,

        totalVolumeRaw,

        totalVolume:
          Number(
            formatQuoteAmount(
              totalVolumeRaw
            )
          ),

        volumeByToken,

        lastScannedBlock:
          cachedState
            ?.lastScannedBlock ??
          latestBlock,
      };
    }


    const buyTopic =
      launchFactory.interface
        .getEvent(
          "FairTokenBought"
        )
        .topicHash;


    const sellTopic =
      launchFactory.interface
        .getEvent(
          "FairTokenSold"
        )
        .topicHash;


    /*
     * ----------------------------------------------------------
     * SCAN ONLY UNSCANNED BLOCKS
     * ----------------------------------------------------------
     */

    let lastScannedBlock =
      cachedState
        ?.lastScannedBlock ??
      (
        LAUNCH_FACTORY_DEPLOYMENT_BLOCK -
        1
      );


    for (
      let chunkStart =
        fromBlock;

      chunkStart <= latestBlock;

      chunkStart +=
        PLATFORM_LOG_CHUNK_SIZE
    ) {
      const chunkEnd =
        Math.min(
          chunkStart +
            PLATFORM_LOG_CHUNK_SIZE -
            1,

          latestBlock
        );


      const logs =
        await withRpcRetry(
          () =>
            provider.getLogs({
              address:
                ARC_MAINNET_CONTRACTS
                  .launchFactory,

              fromBlock:
                chunkStart,

              toBlock:
                chunkEnd,

              topics: [
                [
                  buyTopic,
                  sellTopic,
                ],
              ],
            }),
          {
            attempts: 3,
            delayMs: 500,
          }
        );


      for (const log of logs) {
        let parsedLog;

        try {
          parsedLog =
            launchFactory.interface
              .parseLog(log);
        } catch {
          continue;
        }


        if (!parsedLog) {
          continue;
        }


        let quoteAmount =
          0n;


        if (
          parsedLog.name ===
          "FairTokenBought"
        ) {
          quoteAmount =
            BigInt(
              parsedLog.args
                .quoteAmount
            );
        } else if (
          parsedLog.name ===
          "FairTokenSold"
        ) {
          quoteAmount =
            BigInt(
              parsedLog.args
                .quoteOut
            );
        } else {
          continue;
        }


        const tokenAddress =
          String(
            parsedLog.args.token
          ).toLowerCase();


        totalTxns += 1;

        totalVolumeRaw +=
          quoteAmount;


        volumeByToken.set(
          tokenAddress,
          (
            volumeByToken.get(
              tokenAddress
            ) ?? 0n
          ) + quoteAmount
        );
      }


      /*
       * IMPORTANT:
       *
       * Persist every successful chunk.
       *
       * If ARC RPC rate-limits a later chunk,
       * the next reload continues here instead
       * of restarting from deployment.
       */

      lastScannedBlock =
        chunkEnd;


      try {
        localStorage.setItem(
          PLATFORM_STATS_CACHE_KEY,
          JSON.stringify({
            lastScannedBlock,

            totalTxns,

            totalVolumeRaw:
              totalVolumeRaw.toString(),

            volumeByToken:
              Object.fromEntries(
                Array.from(
                  volumeByToken.entries()
                ).map(
                  ([
                    tokenAddress,
                    volumeRaw,
                  ]) => [
                    tokenAddress,
                    volumeRaw.toString(),
                  ]
                )
              ),
          })
        );
      } catch (error) {
        console.warn(
          "Failed to save platform stats cache:",
          error
        );
      }


      if (
        chunkEnd <
        latestBlock
      ) {
        await sleep(150);
      }
    }


    return {
      totalTxns,

      totalVolumeRaw,

      totalVolume:
        Number(
          formatQuoteAmount(
            totalVolumeRaw
          )
        ),

      volumeByToken,

      lastScannedBlock,
    };
  }

  export async function getPlatformTradeStats() {
    /*
     * SINGLE FLIGHT
     *
     * Multiple UI consumers may request platform
     * statistics at the same time.
     *
     * They must share one RPC scan instead of
     * starting duplicate eth_getLogs scans.
     */

    if (
      platformTradeStatsPromise
    ) {
      return platformTradeStatsPromise;
    }


    platformTradeStatsPromise =
      loadPlatformTradeStats();


    try {
      return await platformTradeStatsPromise;
    } finally {
      platformTradeStatsPromise =
        null;
    }
  }

  export async function getLaunchTradeCounts(
    launchId,
    launchTransactionHash = null
  ) {
    const id =
      BigInt(launchId);

    /*
     * ----------------------------------------------------------
     * FIND START BLOCK
     * ----------------------------------------------------------
     *
     * Best case:
     * use the actual launch transaction block.
     *
     * Fallback:
     * only inspect a recent window.
     */

    let fromBlock;

    if (launchTransactionHash) {
      const receipt =
        await withRpcRetry(
          () =>
            provider.getTransactionReceipt(
              launchTransactionHash
            )
        );

      if (!receipt) {
        throw new Error(
          "Launch transaction receipt unavailable."
        );
      }

      fromBlock =
        receipt.blockNumber;
    } else {
      const latestBlock =
        await withRpcRetry(
          () =>
            provider.getBlockNumber()
        );

      fromBlock =
        Math.max(
          0,
          latestBlock - 5000
        );
    }


    const latestBlock =
      await withRpcRetry(
        () =>
          provider.getBlockNumber()
      );


    /*
     * ----------------------------------------------------------
     * EVENT TOPICS
     * ----------------------------------------------------------
     */

    const buyTopic =
      launchFactory.interface
        .getEvent(
          "FairTokenBought"
        )
        .topicHash;

    const sellTopic =
      launchFactory.interface
        .getEvent(
          "FairTokenSold"
        )
        .topicHash;


    /*
     * launchId is indexed => topics[1].
     *
     * Manual 32-byte uint256 encoding avoids
     * additional ABI work.
     */

    const launchIdTopic =
      `0x${id
        .toString(16)
        .padStart(64, "0")}`;


    /*
     * ----------------------------------------------------------
     * PAGED LOG READ
     * ----------------------------------------------------------
     *
     * ARC RPC rejects large eth_getLogs
     * block ranges.
     *
     * One request still captures BOTH
     * FairTokenBought and FairTokenSold.
     */

    const LOG_CHUNK_SIZE =
      1000;

    let buyCount = 0;
    let sellCount = 0;


    for (
      let chunkStart = fromBlock;
      chunkStart <= latestBlock;
      chunkStart += LOG_CHUNK_SIZE
    ) {
      const chunkEnd =
        Math.min(
          chunkStart +
            LOG_CHUNK_SIZE -
            1,
          latestBlock
        );


      const logs =
        await withRpcRetry(
          () =>
            provider.getLogs({
              address:
                ARC_MAINNET_CONTRACTS
                .launchFactory,

              fromBlock:
                chunkStart,

              toBlock:
                chunkEnd,

              topics: [
                [
                  buyTopic,
                  sellTopic,
                ],

                launchIdTopic,
              ],
            }),
          {
            attempts: 3,
            delayMs: 500,
          }
        );


      for (const log of logs) {
        const topic0 =
          log.topics?.[0]
            ?.toLowerCase();

        if (
          topic0 ===
          buyTopic.toLowerCase()
        ) {
          buyCount += 1;
        }

        if (
          topic0 ===
          sellTopic.toLowerCase()
        ) {
          sellCount += 1;
        }
      }


      /*
       * Small pause between chunks.
       *
       * Prevents ARC public RPC
       * rate-limit bursts.
       */
      if (
        chunkEnd <
        latestBlock
      ) {
        await sleep(150);
      }
    }


    return {
      buyCount,
      sellCount,

      total:
        buyCount +
        sellCount,
    };
  }


  /*
   * ------------------------------------------------------------
   * INTERNAL — READ ONE KNOWN LAUNCH
   * ------------------------------------------------------------
   *
   * This intentionally does NOT call
   * totalFairLaunches().
   *
   * getAllFairLaunches() already knows
   * the valid range, so checking total
   * again for every launch would create
   * unnecessary RPC traffic.
   */

  async function readFairLaunch(
    id,
    cachedLaunch = null
  ) {
    const launch =
      await withRpcRetry(
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
        `Fair Launch ${id} returned an invalid token address.`
      );
    }


    /*
    * ------------------------------------------------------------
    * IMMUTABLE TOKEN METADATA CACHE
    * ------------------------------------------------------------
    *
    * name / symbol / decimals / totalSupply
    * are immutable for Fair Launch tokens.
    *
    * If the cached token address matches,
    * reuse metadata and avoid 4 RPC calls.
    */

    const cachedTokenMatches =
    cachedLaunch?.tokenAddress &&
    cachedLaunch.tokenAddress.toLowerCase() ===
        launch.token.toLowerCase();


    let name;
    let symbol;
    let numericDecimals;
    let tokenTotalSupply;


    if (
    cachedTokenMatches &&
    cachedLaunch?.name &&
    cachedLaunch?.symbol &&
    Number.isFinite(
        Number(
        cachedLaunch?.decimals
        )
    ) &&
    cachedLaunch?.raw
        ?.tokenTotalSupply !==
        undefined
    ) {
    /*
    * Existing token:
    * use cached immutable metadata.
    */

    name =
        cachedLaunch.name;

    symbol =
        cachedLaunch.symbol;

    numericDecimals =
        Number(
        cachedLaunch.decimals
        );

    tokenTotalSupply =
        cachedLaunch.raw
        .tokenTotalSupply;

    } else {
    /*
    * New token or incomplete cache:
    * read metadata from blockchain.
    */

    const token =
        new Contract(
        launch.token,
        MEME_TOKEN_ABI,
        provider
        );


    name =
        await withRpcRetry(
        () => token.name()
        );

    symbol =
        await withRpcRetry(
        () => token.symbol()
        );

    const decimals =
        await withRpcRetry(
        () => token.decimals()
        );

    tokenTotalSupply =
        await withRpcRetry(
        () =>
            token.totalSupply()
        );

    numericDecimals =
        Number(
        decimals
        );
    }


    /*
     * Bonding progress:
     *
     * tokensSold / bondingSupply
     *
     * Reduce bigint values before
     * converting to JavaScript Number.
     */

    const progressBps =
      launch.bondingSupply > 0n
        ? (
            launch.tokensSold *
            10_000n
          ) /
          launch.bondingSupply
        : 0n;

    const progressPercent =
      Number(progressBps) /
      100;


    return {
      launchId:
        id,

      tokenAddress:
        launch.token,

      creator:
        launch.creator,

      name,
      symbol,

      decimals:
        numericDecimals,

      transactionCount:
        launch.transactionCount,

      status:
        Number(launch.status),

      statusLabel:
        getLaunchStatusLabel(
          launch.status
        ),

      raw: {
        totalSupply:
          launch.totalSupply,

        tokenTotalSupply,

        bondingSupply:
          launch.bondingSupply,

        liquiditySupply:
          launch.liquiditySupply,

        tokensSold:
          launch.tokensSold,

        quoteReserve:
          launch.quoteReserve,

        transactionCount:
          launch.transactionCount,
      },

      formatted: {
        totalSupply:
          formatTokenAmount(
            launch.totalSupply,
            numericDecimals
          ),

        bondingSupply:
          formatTokenAmount(
            launch.bondingSupply,
            numericDecimals
          ),

        liquiditySupply:
          formatTokenAmount(
            launch.liquiditySupply,
            numericDecimals
          ),

        tokensSold:
          formatTokenAmount(
            launch.tokensSold,
            numericDecimals
          ),

        quoteReserve:
          formatQuoteAmount(
            launch.quoteReserve
          ),

        progressPercent,
      },
    };
  }


  /*
   * ------------------------------------------------------------
   * GET ONE LAUNCH
   * ------------------------------------------------------------
   */

  export async function getFairLaunch(
    launchId
  ) {
    const id =
      BigInt(launchId);

    const total =
      await getTotalFairLaunches();

    if (
      id < 0n ||
      id >= total
    ) {
      throw new Error(
        `Fair Launch ${id} does not exist.`
      );
    }

    return readFairLaunch(id);
  }

  /*
 * ------------------------------------------------------------
 * REFRESH ONE KNOWN LAUNCH
 * ------------------------------------------------------------
 *
 * Used after a confirmed trade.
 *
 * The launch is already known to exist, so this intentionally
 * skips totalFairLaunches() and refreshes only that launch.
 *
 * cachedLaunch allows immutable token metadata to be reused.
 */

export async function refreshFairLaunch(
  launchId,
  cachedLaunch = null
) {
  const id =
    BigInt(launchId);

  return readFairLaunch(
    id,
    cachedLaunch
  );
}


  /*
   * ------------------------------------------------------------
   * GET ALL LAUNCHES
   * ------------------------------------------------------------
   */

  async function loadAllFairLaunches(
    cachedLaunches = []
  ) {
    const total =
      await getTotalFairLaunches();

    if (total === 0n) {
      return [];
    }


    const launches =
      [];

      const cachedById =
      new Map(
        cachedLaunches.map(
          (launch) => [
            String(
              launch.launchId
            ),
            launch,
          ]
        )
    );
    /*
     * Sequential reading is intentional.
     *
     * One problematic launch must NOT
     * destroy the entire market list.
     */

    for (
      let id = 0n;
      id < total;
      id++
    ) {
      try {
        const cachedLaunch =
        cachedById.get(
          String(id)
        ) || null;

      const launch =
        await readFairLaunch(
          id,
          cachedLaunch
        );

        launches.push(
          launch
        );
      } catch (error) {
        console.warn(
          `Unable to read Fair Launch ${id}. Skipping this launch after retries.`,
          error
        );
      }
    }


    /*
     * If Factory reports launches but
     * absolutely none could be read,
     * surface a real RPC failure instead
     * of pretending the market is empty.
     */

    if (
      total > 0n &&
      launches.length === 0
    ) {
      throw new Error(
        "ARC Mainnet RPC could not read any Fair Launch after retries."
      );
    }


    return launches;
  }

  /*
 * ------------------------------------------------------------
 * GET ALL LAUNCHES — SINGLE-FLIGHT WRAPPER
 * ------------------------------------------------------------
 *
 * A full market refresh may require many ARC RPC reads.
 *
 * If multiple UI paths request the market while one refresh
 * is already running, reuse the same Promise instead of
 * starting another full RPC scan.
 */

export async function getAllFairLaunches(
  cachedLaunches = []
) {
  if (allFairLaunchesPromise) {
    return allFairLaunchesPromise;
  }

  allFairLaunchesPromise =
    loadAllFairLaunches(
      cachedLaunches
    );

  try {
    return await allFairLaunchesPromise;
  } finally {
    allFairLaunchesPromise =
      null;
  }
}


  /*
   * ------------------------------------------------------------
   * EXPLORER HELPERS
   * ------------------------------------------------------------
   */

  export function getTokenExplorerUrl(
    tokenAddress
  ) {
    return (
      `${ARC_MAINNET.blockExplorerUrl}` +
      `/address/${tokenAddress}`
    );
  }


  export function getAddressExplorerUrl(
    address
  ) {
    return (
      `${ARC_MAINNET.blockExplorerUrl}` +
      `/address/${address}`
    );
  }
