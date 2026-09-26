import {
    AbiCoder,
    BrowserProvider,
    Contract,
    formatUnits,
    parseUnits,
  } from "ethers";
  
  import {
    getArcDexPoolForToken,
  } from "../lib/arcDexDiscovery.js";
  
  
  const ARC_MAINNET_CHAIN_ID = 5042n;
  
  const ARC_USDC_ADDRESS =
    "0x3600000000000000000000000000000000000000";
  
  const ARC_USDC_DECIMALS = 6;
  
  const V4_QUOTER_ADDRESS =
    "0x8dc178efb8111bb0973dd9d722ebeff267c98f94";

    const PERMIT2_ADDRESS =
    "0x000000000022D473030F116dDEE9F6B43aC78BA3";
  
  const UNIVERSAL_ROUTER_ADDRESS =
    "0x8702463e73f74d0b6765aBceb314Ef07aCb92650";

    const DEFAULT_SLIPPAGE_BPS = 100n; // 1%
    const BPS_DENOMINATOR = 10_000n;

    const MAX_UINT160 =
    (1n << 160n) - 1n;

    const V4_SWAP_COMMAND = "0x10";
    
    const V4_ACTION_SWAP_EXACT_IN_SINGLE = "06";
    const V4_ACTION_SETTLE_ALL = "0c";
    const V4_ACTION_TAKE_ALL = "0f";


  const V4_QUOTER_ABI = [
    `function quoteExactInputSingle(
      (
        (
          address currency0,
          address currency1,
          uint24 fee,
          int24 tickSpacing,
          address hooks
        ) poolKey,
        bool zeroForOne,
        uint128 exactAmount,
        bytes hookData
      ) params
    )
    returns (
      uint256 amountOut,
      uint256 gasEstimate
    )`,
  ];
  
  
const ERC20_ABI = [
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
];

const PERMIT2_ABI = [
    "function allowance(address user, address token, address spender) view returns (uint160 amount, uint48 expiration, uint48 nonce)",
    "function approve(address token, address spender, uint160 amount, uint48 expiration)",
  ];

const UNIVERSAL_ROUTER_ABI = [
    "function execute(bytes commands, bytes[] inputs, uint256 deadline) payable",
  ];

  const abiCoder =
  AbiCoder.defaultAbiCoder();

function calculateAmountOutMinimum(
  amountOut,
  slippageBps =
    DEFAULT_SLIPPAGE_BPS
) {
  const output =
    BigInt(amountOut);

  const slippage =
    BigInt(slippageBps);

  if (
    slippage < 0n ||
    slippage >=
      BPS_DENOMINATOR
  ) {
    throw new Error(
      "Invalid slippage."
    );
  }

  return (
    output *
    (
      BPS_DENOMINATOR -
      slippage
    )
  ) /
    BPS_DENOMINATOR;
}

function encodeV4ExactInput({
  poolKey,
  zeroForOne,
  amountIn,
  amountOutMinimum,
}) {
  /*
   * V4 actions:
   *
   * 06 = SWAP_EXACT_IN_SINGLE
   * 0c = SETTLE_ALL
   * 0f = TAKE_ALL
   */
  const actions =
    `0x${V4_ACTION_SWAP_EXACT_IN_SINGLE}${V4_ACTION_SETTLE_ALL}${V4_ACTION_TAKE_ALL}`;

  const currencyIn =
    zeroForOne
      ? poolKey.currency0
      : poolKey.currency1;

  const currencyOut =
    zeroForOne
      ? poolKey.currency1
      : poolKey.currency0;

  /*
   * Current IV4Router:
   *
   * ExactInputSingleParams {
   *   PoolKey poolKey;
   *   bool zeroForOne;
   *   uint128 amountIn;
   *   uint128 amountOutMinimum;
   *   uint256 minHopPriceX36;
   *   bytes hookData;
   * }
   */
  const swapParams =
    abiCoder.encode(
      [
        `tuple(
          tuple(
            address currency0,
            address currency1,
            uint24 fee,
            int24 tickSpacing,
            address hooks
          ) poolKey,
          bool zeroForOne,
          uint128 amountIn,
          uint128 amountOutMinimum,
          uint256 minHopPriceX36,
          bytes hookData
        )`,
      ],
      [
        {
          poolKey: {
            currency0:
              poolKey.currency0,

            currency1:
              poolKey.currency1,

            fee:
              poolKey.fee,

            tickSpacing:
              poolKey.tickSpacing,

            hooks:
              poolKey.hooks,
          },

          zeroForOne,

          amountIn:
            BigInt(amountIn),

          amountOutMinimum:
            BigInt(
              amountOutMinimum
            ),

          /*
           * We already protect the
           * complete swap with
           * amountOutMinimum.
           *
           * 0 disables the additional
           * per-hop price constraint.
           */
          minHopPriceX36: 0n,

          hookData: "0x",
        },
      ]
    );

  /*
   * SETTLE_ALL:
   * abi.decode(params,
   *   (Currency, uint256))
   *
   * maxAmount = exact input.
   */
  const settleParams =
    abiCoder.encode(
      [
        "address",
        "uint256",
      ],
      [
        currencyIn,
        BigInt(amountIn),
      ]
    );

  /*
   * TAKE_ALL:
   * abi.decode(params,
   *   (Currency, uint256))
   *
   * Require at least our
   * slippage-protected output.
   */
  const takeParams =
    abiCoder.encode(
      [
        "address",
        "uint256",
      ],
      [
        currencyOut,
        BigInt(
          amountOutMinimum
        ),
      ]
    );

  /*
   * Universal Router V4_SWAP input:
   *
   * abi.encode(
   *   bytes actions,
   *   bytes[] params
   * )
   */
  const routerInput =
    abiCoder.encode(
      [
        "bytes",
        "bytes[]",
      ],
      [
        actions,
        [
          swapParams,
          settleParams,
          takeParams,
        ],
      ]
    );

  return {
    commands:
      V4_SWAP_COMMAND,

    inputs: [
      routerInput,
    ],

    actions,
    currencyIn,
    currencyOut,
  };
}

async function executeDexExactInput({
    eip1193Provider,
    walletAddress,
    tokenAddress,
    side,
    amount,
    slippageBps =
      DEFAULT_SLIPPAGE_BPS,
  }) {
    await verifyArcProvider(
      eip1193Provider
    );
  
    const provider =
      new BrowserProvider(
        eip1193Provider
      );
  
    const signer =
      await provider.getSigner();
  
    const signerAddress =
      normalizeAddress(
        await signer.getAddress()
      );
  
    if (
      signerAddress !==
      normalizeAddress(
        walletAddress
      )
    ) {
      throw new Error(
        "Connected wallet account changed."
      );
    }
  
    /*
     * Resolve current pool dynamically.
     * Never trust token name/symbol.
     */
    const poolKey =
      await resolvePool(
        tokenAddress
      );
  
    let quote;
  
    if (side === "BUY") {
      quote =
        await quoteDexBuy({
          eip1193Provider,
          tokenAddress,
          amount,
        });
  
    } else if (
      side === "SELL"
    ) {
      quote =
        await quoteDexSell({
          eip1193Provider,
          tokenAddress,
          amount,
        });
  
    } else {
      throw new Error(
        "Invalid DEX trade side."
      );
    }
  
    const amountIn =
      BigInt(
        quote.amountIn
      );
  
    const quotedAmountOut =
      BigInt(
        quote.amountOut
      );
  
    if (
      amountIn <= 0n ||
      quotedAmountOut <= 0n
    ) {
      throw new Error(
        "Invalid DEX quote."
      );
    }
  
    const amountOutMinimum =
      calculateAmountOutMinimum(
        quotedAmountOut,
        slippageBps
      );
  
    /*
     * Input token:
     *
     * BUY  = USDC
     * SELL = selected token
     */
    const inputTokenAddress =
      side === "BUY"
        ? ARC_USDC_ADDRESS
        : normalizeAddress(
            tokenAddress
          );
  
    /*
     * Establish:
     *
     * ERC20 -> Permit2
     * Permit2 -> Universal Router
     */
    await ensureDexAllowance({
      eip1193Provider,
      walletAddress:
        signerAddress,
  
      tokenAddress:
        inputTokenAddress,
  
      requiredAmount:
        amountIn,
    });
  
    const route =
      encodeV4ExactInput({
        poolKey,
        zeroForOne:
          quote.zeroForOne,
        amountIn,
        amountOutMinimum,
      });
  
    const router =
      new Contract(
        UNIVERSAL_ROUTER_ADDRESS,
        UNIVERSAL_ROUTER_ABI,
        signer
      );
  
    /*
     * Five-minute transaction
     * deadline.
     */
    const deadline =
      BigInt(
        Math.floor(
          Date.now() / 1000
        ) + 5 * 60
      );
  
    /*
     * Estimate before asking the
     * wallet to submit the swap.
     *
     * A broken route should fail here
     * rather than broadcasting it.
     */
    await router[
      "execute(bytes,bytes[],uint256)"
    ].estimateGas(
      route.commands,
      route.inputs,
      deadline
    );
  
    const tx =
      await router[
        "execute(bytes,bytes[],uint256)"
      ](
        route.commands,
        route.inputs,
        deadline
      );
  
    const receipt =
      await tx.wait();
  
    return {
      side,
  
      transactionHash:
        tx.hash,
  
      receipt,
  
      amountIn,
  
      quotedAmountOut,
  
      amountOutMinimum,
  
      zeroForOne:
        quote.zeroForOne,
  
      poolKey,
  
      inputTokenAddress,
  
      outputTokenAddress:
        route.currencyOut,
    };
  }
  
  function normalizeAddress(value) {
    return String(
      value || ""
    ).toLowerCase();
  }
  
  
  async function verifyArcProvider(
    eip1193Provider
  ) {
    if (
      !eip1193Provider ||
      typeof eip1193Provider.request !== "function"
    ) {
      throw new Error(
        "Wallet provider unavailable."
      );
    }
  
    const rawChainId =
      await eip1193Provider.request({
        method: "eth_chainId",
      });
  
    if (
      BigInt(rawChainId) !==
      ARC_MAINNET_CHAIN_ID
    ) {
      throw new Error(
        "Switch wallet to ARC Mainnet."
      );
    }
  }
  
  
  async function resolvePool(
    tokenAddress
  ) {
    const resolution =
      await getArcDexPoolForToken(
        tokenAddress
      );
  
    if (!resolution?.pool) {
      const count =
        Array.isArray(
          resolution?.matchingPools
        )
          ? resolution.matchingPools.length
          : 0;
  
      if (count > 1) {
        throw new Error(
          "Multiple TOKEN/USDC pools found. Pool selection is required."
        );
      }
  
      throw new Error(
        "No TOKEN/USDC pool found for this token."
      );
    }
  
    const pool =
      resolution.pool;
  
    const currency0 =
      normalizeAddress(
        pool.currency0
      );
  
    const currency1 =
      normalizeAddress(
        pool.currency1
      );
  
    const token =
      normalizeAddress(
        tokenAddress
      );
  
    const containsToken =
      currency0 === token ||
      currency1 === token;
  
    const containsUsdc =
      currency0 ===
        ARC_USDC_ADDRESS ||
      currency1 ===
        ARC_USDC_ADDRESS;
  
    if (
      !containsToken ||
      !containsUsdc
    ) {
      throw new Error(
        "Resolved pool is not a TOKEN/USDC pool."
      );
    }
  
    return {
      poolId:
        pool.poolId,
  
      currency0,
      currency1,
  
      fee:
        Number(
          pool.fee
        ),
  
      tickSpacing:
        Number(
          pool.tickSpacing
        ),
  
      hooks:
        normalizeAddress(
          pool.hooks
        ),
    };
  }
  
  
  async function getTokenDecimals(
    provider,
    tokenAddress
  ) {
    const token =
      new Contract(
        tokenAddress,
        ERC20_ABI,
        provider
      );
  
    return Number(
      await token.decimals()
    );
  }
  
  
  async function quoteExactInput({
    provider,
    poolKey,
    zeroForOne,
    exactAmount,
  }) {
    const quoter =
      new Contract(
        V4_QUOTER_ADDRESS,
        V4_QUOTER_ABI,
        provider
      );
  
    const [
      amountOut,
      gasEstimate,
    ] =
      await quoter
        .quoteExactInputSingle
        .staticCall({
          poolKey: {
            currency0:
              poolKey.currency0,
  
            currency1:
              poolKey.currency1,
  
            fee:
              poolKey.fee,
  
            tickSpacing:
              poolKey.tickSpacing,
  
            hooks:
              poolKey.hooks,
          },
  
          zeroForOne,
  
          exactAmount,
  
          hookData: "0x",
        });
  
    return {
      amountOut,
      gasEstimate,
    };
  }
  
  
  export async function quoteDexBuy({
    eip1193Provider,
    tokenAddress,
    amount,
  }) {
    await verifyArcProvider(
      eip1193Provider
    );
  
    const cleanAmount =
      String(
        amount ?? ""
      ).trim();
  
    if (
      !cleanAmount ||
      Number(cleanAmount) <= 0
    ) {
      throw new Error(
        "Enter a valid USDC amount."
      );
    }
  
    const provider =
      new BrowserProvider(
        eip1193Provider
      );
  
    const poolKey =
      await resolvePool(
        tokenAddress
      );
  
    const tokenDecimals =
      await getTokenDecimals(
        provider,
        tokenAddress
      );
  
    /*
     * BUY:
     * USDC -> TOKEN
     */
    const zeroForOne =
      poolKey.currency0 ===
      ARC_USDC_ADDRESS;
  
    const exactAmount =
      parseUnits(
        cleanAmount,
        ARC_USDC_DECIMALS
      );
  
    const {
      amountOut,
      gasEstimate,
    } =
      await quoteExactInput({
        provider,
        poolKey,
        zeroForOne,
        exactAmount,
      });
  
    return {
      side: "BUY",
  
      amountIn:
        exactAmount,
  
      amountOut,
  
      gasEstimate,
  
      inputDecimals:
        ARC_USDC_DECIMALS,
  
      outputDecimals:
        tokenDecimals,
  
      formattedAmountIn:
        formatUnits(
          exactAmount,
          ARC_USDC_DECIMALS
        ),
  
      formattedAmountOut:
        formatUnits(
          amountOut,
          tokenDecimals
        ),
  
      zeroForOne,
      poolKey,
    };
  }
  
  
  export async function quoteDexSell({
    eip1193Provider,
    tokenAddress,
    amount,
  }) {
    await verifyArcProvider(
      eip1193Provider
    );
  
    const cleanAmount =
      String(
        amount ?? ""
      ).trim();
  
    if (
      !cleanAmount ||
      Number(cleanAmount) <= 0
    ) {
      throw new Error(
        "Enter a valid token amount."
      );
    }
  
    const provider =
      new BrowserProvider(
        eip1193Provider
      );
  
    const poolKey =
      await resolvePool(
        tokenAddress
      );
  
    const tokenDecimals =
      await getTokenDecimals(
        provider,
        tokenAddress
      );
  
    /*
     * SELL:
     * TOKEN -> USDC
     */
    const zeroForOne =
      poolKey.currency0 ===
      normalizeAddress(
        tokenAddress
      );
  
    const exactAmount =
      parseUnits(
        cleanAmount,
        tokenDecimals
      );
  
    const {
      amountOut,
      gasEstimate,
    } =
      await quoteExactInput({
        provider,
        poolKey,
        zeroForOne,
        exactAmount,
      });
  
    return {
      side: "SELL",
  
      amountIn:
        exactAmount,
  
      amountOut,
  
      gasEstimate,
  
      inputDecimals:
        tokenDecimals,
  
      outputDecimals:
        ARC_USDC_DECIMALS,
  
      formattedAmountIn:
        formatUnits(
          exactAmount,
          tokenDecimals
        ),
  
      formattedAmountOut:
        formatUnits(
          amountOut,
          ARC_USDC_DECIMALS
        ),
  
      zeroForOne,
      poolKey,
    };
  }
  
  
  export async function getDexTokenBalance({
    eip1193Provider,
    walletAddress,
    tokenAddress,
  }) {
    await verifyArcProvider(
      eip1193Provider
    );
  
    const provider =
      new BrowserProvider(
        eip1193Provider
      );
  
    const token =
      new Contract(
        tokenAddress,
        ERC20_ABI,
        provider
      );
  
    const [
      decimals,
      balance,
    ] =
      await Promise.all([
        token.decimals(),
  
        token.balanceOf(
          walletAddress
        ),
      ]);
  
    const tokenDecimals =
      Number(decimals);
  
    return {
      raw:
        balance,
  
      decimals:
        tokenDecimals,
  
      formatted:
        formatUnits(
          balance,
          tokenDecimals
        ),
    };
  }
  
  
  export async function getDexUsdcBalance({
    eip1193Provider,
    walletAddress,
  }) {
    await verifyArcProvider(
      eip1193Provider
    );
  
    const provider =
      new BrowserProvider(
        eip1193Provider
      );
  
    const usdc =
      new Contract(
        ARC_USDC_ADDRESS,
        ERC20_ABI,
        provider
      );
  
    const balance =
      await usdc.balanceOf(
        walletAddress
      );
  
    return {
      raw:
        balance,
  
      decimals:
        ARC_USDC_DECIMALS,
  
      formatted:
        formatUnits(
          balance,
          ARC_USDC_DECIMALS
        ),
    };
  }

  export async function ensureDexAllowance({
    eip1193Provider,
    walletAddress,
    tokenAddress,
    requiredAmount,
  }) {
    await verifyArcProvider(
      eip1193Provider
    );
  
    if (
      !walletAddress ||
      !tokenAddress
    ) {
      throw new Error(
        "Wallet or token address unavailable."
      );
    }
  
    const amount =
      BigInt(requiredAmount);
  
    if (amount <= 0n) {
      throw new Error(
        "Approval amount must be greater than zero."
      );
    }
  
    if (amount > MAX_UINT160) {
      throw new Error(
        "Approval amount exceeds Permit2 uint160 limit."
      );
    }
  
    const provider =
      new BrowserProvider(
        eip1193Provider
      );
  
    const signer =
      await provider.getSigner();
  
    const signerAddress =
      normalizeAddress(
        await signer.getAddress()
      );
  
    if (
      signerAddress !==
      normalizeAddress(
        walletAddress
      )
    ) {
      throw new Error(
        "Connected wallet account changed."
      );
    }
  
    const cleanTokenAddress =
      normalizeAddress(
        tokenAddress
      );
  
    const token =
      new Contract(
        cleanTokenAddress,
        ERC20_ABI,
        signer
      );
  
    /*
     * Layer 1
     *
     * ERC20 -> Permit2
     *
     * Keep this approval bounded to the
     * amount required by the current trade.
     */
    const erc20Allowance =
      BigInt(
        await token.allowance(
          signerAddress,
          PERMIT2_ADDRESS
        )
      );
  
    if (
      erc20Allowance < amount
    ) {
      const approvalTx =
        await token.approve(
          PERMIT2_ADDRESS,
          amount
        );
  
      await approvalTx.wait();
    }
  
    /*
     * Layer 2
     *
     * Permit2 -> Universal Router
     */
    const permit2 =
      new Contract(
        PERMIT2_ADDRESS,
        PERMIT2_ABI,
        signer
      );
  
    const allowanceResult =
      await permit2.allowance(
        signerAddress,
        cleanTokenAddress,
        UNIVERSAL_ROUTER_ADDRESS
      );
  
    const permit2Amount =
      BigInt(
        allowanceResult.amount
      );
  
    const permit2Expiration =
      Number(
        allowanceResult.expiration
      );
  
    const now =
      Math.floor(
        Date.now() / 1000
      );
  
    const hasUsablePermit2Allowance =
      permit2Amount >= amount &&
      permit2Expiration > now + 60;
  
    if (
      !hasUsablePermit2Allowance
    ) {
      /*
       * Short-lived approval.
       *
       * We deliberately avoid unlimited
       * Permit2 allowance.
       */
      const expiration =
        now + 20 * 60;
  
      const permit2Tx =
        await permit2.approve(
          cleanTokenAddress,
          UNIVERSAL_ROUTER_ADDRESS,
          amount,
          expiration
        );
  
      await permit2Tx.wait();
    }
  
    /*
     * Read back Permit2 state after any
     * approval transaction.
     *
     * Do not assume the approval succeeded
     * merely because a receipt exists.
     */
    const finalAllowance =
      await permit2.allowance(
        signerAddress,
        cleanTokenAddress,
        UNIVERSAL_ROUTER_ADDRESS
      );
  
    const finalAmount =
      BigInt(
        finalAllowance.amount
      );
  
    const finalExpiration =
      Number(
        finalAllowance.expiration
      );
  
    const finalNow =
      Math.floor(
        Date.now() / 1000
      );
  
    if (
      finalAmount < amount ||
      finalExpiration <= finalNow
    ) {
      throw new Error(
        "Permit2 allowance was not established."
      );
    }
  
    return {
      tokenAddress:
        cleanTokenAddress,
  
      amount,
  
      permit2:
        PERMIT2_ADDRESS,
  
      router:
        UNIVERSAL_ROUTER_ADDRESS,
  
      expiration:
        finalExpiration,
    };
  }

  export async function buyDexToken({
    eip1193Provider,
    walletAddress,
    tokenAddress,
    amount,
    slippageBps = 100n,
  }) {
    return executeDexExactInput({
      eip1193Provider,
      walletAddress,
      tokenAddress,
      side: "BUY",
      amount,
      slippageBps,
    });
  }
  
  export async function sellDexToken({
    eip1193Provider,
    walletAddress,
    tokenAddress,
    amount,
    slippageBps = 100n,
  }) {
    return executeDexExactInput({
      eip1193Provider,
      walletAddress,
      tokenAddress,
      side: "SELL",
      amount,
      slippageBps,
    });
  }