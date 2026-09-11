import {
    Contract,
    JsonRpcProvider,
    formatUnits,
  } from "ethers";
  
  import {
    ARC_TESTNET,
    ARC_TESTNET_CONTRACTS,
    getLaunchStatusLabel,
  } from "./arcTestnet.js";
  
  import {
    LAUNCH_FACTORY_ABI,
    MEME_TOKEN_ABI,
  } from "./abis.js";
  
  
  /*
   * ============================================================
   * ARC TERMINAL
   * Public ARC Testnet Fair Launch Reader
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
   * from the ARC Testnet RPC.
   */
  
  
  /*
   * ------------------------------------------------------------
   * READ-ONLY PROVIDER
   * ------------------------------------------------------------
   */
  
  const provider =
    new JsonRpcProvider(
      ARC_TESTNET.rpcUrl,
      ARC_TESTNET.chainId,
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
      ARC_TESTNET_CONTRACTS.launchFactory,
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
      try {
        return await operation();
      } catch (error) {
        lastError = error;
  
        if (attempt === attempts) {
          break;
        }
  
        /*
         * ARC Testnet RPC occasionally
         * returns transient eth_call errors.
         *
         * Read calls are safe to retry.
         */
        await sleep(
          delayMs * attempt
        );
      }
    }
  
    throw lastError;
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
      ARC_TESTNET.nativeCurrency.decimals
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
                ARC_TESTNET_CONTRACTS
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
   * GET ALL LAUNCHES
   * ------------------------------------------------------------
   */
  
  export async function getAllFairLaunches(
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
        "ARC Testnet RPC could not read any Fair Launch after retries."
      );
    }
  
  
    return launches;
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
      `${ARC_TESTNET.blockExplorerUrl}` +
      `/address/${tokenAddress}`
    );
  }
  
  
  export function getAddressExplorerUrl(
    address
  ) {
    return (
      `${ARC_TESTNET.blockExplorerUrl}` +
      `/address/${address}`
    );
  }