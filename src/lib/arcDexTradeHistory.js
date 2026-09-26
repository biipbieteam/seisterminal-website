import {
    Contract,
    Interface,
    JsonRpcProvider,
    formatUnits,
  } from "ethers";
  
  import {
    getArcDexPoolForToken,
  } from "./arcDexDiscovery.js";
  
  const ARC_RPC_URL =
    "https://rpc.mainnet.arc.io";
  
  const ARC_CHAIN_ID = 5042;
  
  const ARC_USDC_ADDRESS =
    "0x3600000000000000000000000000000000000000";
  
  const ARC_USDC_DECIMALS = 6;
  
  const UNISWAP_V4_POOL_MANAGER =
    "0x8366a39CC670B4001A1121B8F6A443A643e40951";
  
  const HISTORY_BLOCK_CHUNK_SIZE =
    8000;
  
  const DEFAULT_HISTORY_BLOCKS =
    50_000;
  
  const SWAP_ABI = [
    "event Swap(bytes32 indexed id,address indexed sender,int128 amount0,int128 amount1,uint160 sqrtPriceX96,uint128 liquidity,int24 tick,uint24 fee)",
  ];
  
  const ERC20_ABI = [
    "function decimals() view returns (uint8)",
    "function totalSupply() view returns (uint256)",
  ];
  
  const swapInterface =
    new Interface(SWAP_ABI);
  
  const provider =
    new JsonRpcProvider(
      ARC_RPC_URL,
      ARC_CHAIN_ID
    );
  
  function normalizeAddress(
    address
  ) {
    return String(
      address || ""
    ).toLowerCase();
  }
  
  function absBigInt(
    value
  ) {
    const amount =
      BigInt(value);
  
    return amount < 0n
      ? -amount
      : amount;
  }

  async function getTokenMetadata(
    tokenAddress
  ) {
    const token =
      new Contract(
        tokenAddress,
        ERC20_ABI,
        provider
      );
  
    const [
      decimals,
      totalSupply,
    ] =
      await Promise.all([
        token.decimals(),
        token.totalSupply(),
      ]);
  
    return {
      decimals:
        Number(decimals),
  
      totalSupply:
        BigInt(
          totalSupply
        ),
    };
  }


  async function getPoolSwapLogs(
    poolId,
    fromBlock,
    toBlock
  ) {
    const swapEvent =
      swapInterface.getEvent(
        "Swap"
      );
  
    const topic0 =
      swapEvent.topicHash;
  
    const logs = [];
  
    for (
      let start =
        fromBlock;
      start <= toBlock;
      start +=
        HISTORY_BLOCK_CHUNK_SIZE
    ) {
      const end =
        Math.min(
          start +
            HISTORY_BLOCK_CHUNK_SIZE -
            1,
          toBlock
        );
  
      const chunk =
        await provider.getLogs({
          address:
            UNISWAP_V4_POOL_MANAGER,
  
          fromBlock:
            start,
  
          toBlock:
            end,
  
          topics: [
            topic0,
            poolId,
          ],
        });
  
      logs.push(
        ...chunk
      );
    }
  
    return logs;
  }

  function decodeSwapLog(
    log
  ) {
    const parsed =
      swapInterface.parseLog(
        log
      );
  
    if (!parsed) {
      return null;
    }
  
    return {
      sender:
        normalizeAddress(
          parsed.args.sender
        ),
  
      amount0:
        BigInt(
          parsed.args.amount0
        ),
  
      amount1:
        BigInt(
          parsed.args.amount1
        ),
  
      sqrtPriceX96:
        BigInt(
          parsed.args.sqrtPriceX96
        ),
  
      liquidity:
        BigInt(
          parsed.args.liquidity
        ),
  
      tick:
        Number(
          parsed.args.tick
        ),
  
      fee:
        Number(
          parsed.args.fee
        ),
  
      transactionHash:
        log.transactionHash,
  
      blockNumber:
        Number(
          log.blockNumber
        ),
  
      logIndex:
        Number(
          log.index ?? 0
        ),
    };
  }


  function normalizeSwapAmounts({
    swap,
    pool,
    tokenAddress,
    tokenDecimals,
  }) {
    const token =
      normalizeAddress(
        tokenAddress
      );
  
    const currency0 =
      normalizeAddress(
        pool.currency0
      );
  
    const currency1 =
      normalizeAddress(
        pool.currency1
      );
  
    const tokenIsCurrency0 =
      currency0 === token;
  
    const tokenRaw =
      tokenIsCurrency0
        ? swap.amount0
        : swap.amount1;
  
    const usdcRaw =
      tokenIsCurrency0
        ? swap.amount1
        : swap.amount0;
  
    const tokenAmount =
      Number(
        formatUnits(
          absBigInt(
            tokenRaw
          ),
          tokenDecimals
        )
      );
  
    const quoteAmountUsd =
      Number(
        formatUnits(
          absBigInt(
            usdcRaw
          ),
          ARC_USDC_DECIMALS
        )
      );
  
    /*
     * PoolManager deltas:
     *
     * token delta < 0:
     * token leaves the pool
     * => trader bought TOKEN
     *
     * token delta > 0:
     * token enters the pool
     * => trader sold TOKEN
     */
    const side =
      tokenRaw < 0n
        ? "BUY"
        : "SELL";
  
    const price =
      tokenAmount > 0
        ? quoteAmountUsd /
          tokenAmount
        : 0;
  
    return {
      side,
      tokenAmount,
      quoteAmountUsd,
      price,
    };
  }


  export async function getArcDexTradeHistory(
    tokenAddress
  ) {
    const normalizedToken =
      normalizeAddress(
        tokenAddress
      );
  
    if (!normalizedToken) {
      return [];
    }
  
    const {
      pool,
      matchingPools,
    } =
      await getArcDexPoolForToken(
        normalizedToken
      );
  
    /*
     * Never guess between
     * multiple TOKEN/USDC pools.
     */
    if (
      !pool ||
      matchingPools.length !== 1
    ) {
      return [];
    }
  
    const [
      latestBlock,
      tokenMetadata,
    ] =
      await Promise.all([
        provider.getBlockNumber(),
  
        getTokenMetadata(
          normalizedToken
        ),
      ]);
  
    const fromBlock =
      Math.max(
        0,
        latestBlock -
          DEFAULT_HISTORY_BLOCKS
      );
  
    const logs =
      await getPoolSwapLogs(
        pool.poolId,
        fromBlock,
        latestBlock
      );
  
    if (
      logs.length === 0
    ) {
      return [];
    }
  
    const blockNumbers =
      Array.from(
        new Set(
          logs.map(
            (log) =>
              Number(
                log.blockNumber
              )
          )
        )
      );
  
    const blockEntries =
      await Promise.all(
        blockNumbers.map(
          async (
            blockNumber
          ) => {
            const block =
              await provider.getBlock(
                blockNumber
              );
  
            return [
              blockNumber,
              block
                ? Number(
                    block.timestamp
                  ) * 1000
                : null,
            ];
          }
        )
      );
  
    const timestamps =
      new Map(
        blockEntries
      );
  
    const totalSupply =
      Number(
        formatUnits(
          tokenMetadata.totalSupply,
          tokenMetadata.decimals
        )
      );
  
    return logs
      .map((log) => {
        const swap =
          decodeSwapLog(
            log
          );
  
        if (!swap) {
          return null;
        }
  
        const normalized =
          normalizeSwapAmounts({
            swap,
            pool,
            tokenAddress:
              normalizedToken,
            tokenDecimals:
              tokenMetadata.decimals,
          });
  
        const timestamp =
          timestamps.get(
            swap.blockNumber
          );
  
        if (
          !timestamp ||
          !Number.isFinite(
            normalized.price
          ) ||
          normalized.price <= 0
        ) {
          return null;
        }
  
        const marketCap =
          normalized.price *
          totalSupply;
  
        return {
          source:
            "DEX",
  
          chain_id:
            ARC_CHAIN_ID,
  
          token_address:
            normalizedToken,
  
          trader_address:
            swap.sender,
  
          side:
            normalized.side,
  
          transaction_hash:
            swap.transactionHash,
  
          block_number:
            swap.blockNumber,
  
          log_index:
            swap.logIndex,
  
          tokenAmount:
            normalized.tokenAmount,
  
          quoteAmountUsd:
            normalized.quoteAmountUsd,
  
          price:
            normalized.price,
  
          marketCap,
  
          timestamp,
        };
      })
      .filter(Boolean)
      .sort(
        (a, b) =>
          a.timestamp -
            b.timestamp ||
          a.log_index -
            b.log_index
      );
  }