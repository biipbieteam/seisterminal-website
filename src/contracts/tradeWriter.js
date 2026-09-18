import {
    BrowserProvider,
    Contract,
    parseEther,
    formatEther,
    formatUnits,
  } from "ethers";
  
  
  const ARC_MAINNET_CHAIN_ID =
    5042n;

  const LAUNCH_FACTORY_ADDRESS =
    "0x56FC882244f8FB1d05C2171d180872B38800706F";
  
  
  const LAUNCH_FACTORY_ABI = [
    "function quoteBuy(uint256 launchId_, uint256 quoteAmount_) view returns (uint256 tokensOut, uint256 actualCost)",
  
    "function buyFairToken(uint256 launchId_, uint256 minTokensOut_) payable returns (uint256 tokensOut)",
  
    "function quoteSell(uint256 launchId_, uint256 tokenAmount_) view returns (uint256 quoteOut)",
  
    "function sellFairToken(uint256 launchId_, uint256 tokenAmount_, uint256 minQuoteOut_) returns (uint256 quoteOut)",
  ];
  
  
  const ERC20_ABI = [
    "function allowance(address owner, address spender) view returns (uint256)",
  
    "function approve(address spender, uint256 amount) returns (bool)",
  
    "function balanceOf(address account) view returns (uint256)",
  
    "function decimals() view returns (uint8)",
  ];
  
  
  /*
   * -------------------------------------------------------
   * BASIC HELPERS
   * -------------------------------------------------------
   */
  
  function sleep(ms) {
    return new Promise(
      (resolve) =>
        setTimeout(
          resolve,
          ms
        )
    );
  }
  
  async function withTransientRpcRetry(
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
  
        const message =
          String(
            error?.shortMessage ||
            error?.message ||
            ""
          ).toLowerCase();
  
        const isTransient =
          message.includes(
            "missing revert data"
          ) ||
          message.includes("408") ||
          message.includes("429") ||
          message.includes(
            "timeout"
          ) ||
          message.includes(
            "temporarily unavailable"
          );
  
        /*
         * If contract returned a real,
         * meaningful revert, surface it
         * immediately.
         */
        if (!isTransient) {
          throw error;
        }
  
        if (
          attempt === attempts
        ) {
          break;
        }
  
        await sleep(
          delayMs * attempt
        );
      }
    }
  
    throw lastError;
  }
  /*
  * ARC Mainnet RPC may return
  * HTTP 408 / temporary receipt read errors.
   *
   * IMPORTANT:
   *
   * This helper NEVER resubmits a transaction.
   *
   * It only keeps asking for the receipt of
   * the SAME transaction hash.
   */
  async function waitForReceiptWithRetry({
    provider,
    transactionHash,
    attempts = 30,
    delayMs = 2000,
  }) {
    let lastError = null;
  
    for (
      let attempt = 1;
      attempt <= attempts;
      attempt++
    ) {
      try {
        const receipt =
          await provider
            .getTransactionReceipt(
              transactionHash
            );
  
        if (receipt) {
          return receipt;
        }
  
      } catch (error) {
        lastError =
          error;
  
        console.warn(
          `ARC receipt read failed (${attempt}/${attempts}). Retrying...`,
          error
        );
      }
  
      if (
        attempt <
        attempts
      ) {
        await sleep(
          delayMs
        );
      }
    }
  
  
    const error =
      new Error(
        "Transaction was submitted, but ARC RPC could not confirm the receipt yet. Check the transaction in your wallet or explorer before trying again."
      );
  
    error.code =
      "ARC_RECEIPT_TIMEOUT";
  
    error.transactionHash =
      transactionHash;
  
    error.cause =
      lastError;
  
    throw error;
  }
  
  
  /*
   * -------------------------------------------------------
   * WALLET PREFLIGHT
   * -------------------------------------------------------
   */
  
  async function verifyWallet({
    eip1193Provider,
    expectedAddress,
  }) {
    if (
      !eip1193Provider ||
      typeof eip1193Provider.request !==
        "function"
    ) {
      throw new Error(
        "Wallet provider unavailable."
      );
    }
  
  
    /*
     * Read existing permission only.
     * Never request accounts here.
     */
    const accounts =
      await eip1193Provider.request({
        method: "eth_accounts",
      });
  
  
    const walletAddress =
      accounts?.[0];
  
  
    if (!walletAddress) {
      throw new Error(
        "Wallet is not connected."
      );
    }
  
  
    if (
      expectedAddress &&
      walletAddress.toLowerCase() !==
        expectedAddress.toLowerCase()
    ) {
      throw new Error(
        "Connected wallet account changed."
      );
    }
  
  
    /*
     * Read current chain directly
     * from the selected wallet.
     */
    const rawChainId =
      await eip1193Provider.request({
        method: "eth_chainId",
      });
  
  
    const chainId =
      BigInt(
        rawChainId
      );
  
  
    if (
      chainId !==
      ARC_MAINNET_CHAIN_ID
    ) {
      throw new Error(
        "Switch wallet to ARC Mainnet before trading."
      );
    }
  
  
    return walletAddress;
  }
  
  
  /*
   * -------------------------------------------------------
   * INPUT
   * -------------------------------------------------------
   */
  
  function parseTradeAmount(
    rawAmount,
    label
  ) {
    const clean =
      String(
        rawAmount ?? ""
      ).trim();
  
  
    if (
      !clean ||
      !/^\d+(\.\d{1,18})?$/.test(
        clean
      )
    ) {
      throw new Error(
        `Invalid ${label} amount.`
      );
    }
  
  
    const value =
      parseEther(
        clean
      );
  
  
    if (
      value <= 0n
    ) {
      throw new Error(
        `${label} amount must be greater than zero.`
      );
    }
  
  
    return value;
  }
  
  
  /*
   * -------------------------------------------------------
   * BUY QUOTE
   * -------------------------------------------------------
   */
  
  export async function quoteFairBuy({
    eip1193Provider,
    launchId,
    amount,
  }) {
    const quoteAmount =
      parseTradeAmount(
        amount,
        "buy"
      );
  
  
    const provider =
      new BrowserProvider(
        eip1193Provider
      );
  
  
    const factory =
      new Contract(
        LAUNCH_FACTORY_ADDRESS,
        LAUNCH_FACTORY_ABI,
        provider
      );
  
  
    const [
      tokensOut,
      actualCost,
    ] =
      await factory.quoteBuy(
        BigInt(
          launchId
        ),
        quoteAmount
      );
  
  
    return {
      quoteAmount,
  
      tokensOut,
  
      actualCost,
  
      formattedTokens:
        formatUnits(
          tokensOut,
          18
        ),
  
      formattedCost:
        formatEther(
          actualCost
        ),
    };
  }
  
  
  /*
   * -------------------------------------------------------
   * BUY
   * -------------------------------------------------------
   */
  
  export async function buyFairToken({
    eip1193Provider,
    expectedAddress,
    launchId,
    amount,
    slippageBps = 100n,
  }) {
    const quoteAmount =
      parseTradeAmount(
        amount,
        "buy"
      );
  
  
    const walletAddress =
      await verifyWallet({
        eip1193Provider,
        expectedAddress,
      });
  
  
    const provider =
      new BrowserProvider(
        eip1193Provider
      );
  
  
    const signer =
      await provider.getSigner(
        walletAddress
      );
  
  
    const factory =
      new Contract(
        LAUNCH_FACTORY_ADDRESS,
        LAUNCH_FACTORY_ABI,
        signer
      );
  
  
    /*
     * Quote immediately before
     * submitting the transaction.
     */
    const [
        quotedTokensOut,
      ] =
        await withTransientRpcRetry(
          () =>
            factory.quoteBuy(
              BigInt(
                launchId
              ),
              quoteAmount
            )
        );
  
  
    const minTokensOut =
      (
        quotedTokensOut *
        (
          10_000n -
          slippageBps
        )
      ) /
      10_000n;
  

    /*
    * ARC Mainnet may briefly expose
    * stale state immediately after
    * the previous confirmed trade.
    *
    * Retry gas estimation only.
    * Never resend a transaction.
    */
    const estimatedGas =
    await withTransientRpcRetry(
    () =>
        factory.buyFairToken
        .estimateGas(
            BigInt(
            launchId
            ),
            minTokensOut,
            {
            value:
                quoteAmount,
            }
        )
    );


    /*
    * Small safety buffer.
    *
    * Providing gasLimit also prevents
    * ethers from doing another hidden
    * eth_estimateGas during send.
    */
    const gasLimit =
    (
    estimatedGas *
    120n
    ) /
    100n;

    /*
     * ONE wallet transaction request.
     */
    const tx =
    await factory.buyFairToken(
      BigInt(
        launchId
      ),
      minTokensOut,
      {
        value:
          quoteAmount,
  
        gasLimit,
      }
    );
  
  
    /*
     * Do NOT use tx.wait() here.
     *
     * ARC RPC occasionally returns
     * transient HTTP 408 errors when
     * reading transaction receipts.
     *
     * Never resend the BUY.
     */
    const receipt =
      await waitForReceiptWithRetry({
        provider,
  
        transactionHash:
          tx.hash,
      });
  
  
    if (
      receipt.status !== 1
    ) {
      throw new Error(
        "Buy transaction reverted."
      );
    }
  
  
    return {
      transactionHash:
        tx.hash,
  
      receipt,
  
      quotedTokensOut,
  
      minTokensOut,
  
      formattedQuotedTokens:
        formatUnits(
          quotedTokensOut,
          18
        ),
    };
  }
  
  
  /*
   * -------------------------------------------------------
   * SELL QUOTE
   * -------------------------------------------------------
   */
  
  export async function quoteFairSell({
    eip1193Provider,
    launchId,
    amount,
  }) {
    const tokenAmount =
      parseTradeAmount(
        amount,
        "sell"
      );
  
  
    const provider =
      new BrowserProvider(
        eip1193Provider
      );
  
  
    const factory =
      new Contract(
        LAUNCH_FACTORY_ADDRESS,
        LAUNCH_FACTORY_ABI,
        provider
      );
  
  
    const quoteOut =
      await factory.quoteSell(
        BigInt(
          launchId
        ),
        tokenAmount
      );
  
  
    return {
      tokenAmount,
  
      quoteOut,
  
      formattedQuote:
        formatEther(
          quoteOut
        ),
    };
  }
  
  
  /*
   * -------------------------------------------------------
   * SELL
   * -------------------------------------------------------
   */
  
  export async function sellFairToken({
    eip1193Provider,
    expectedAddress,
    launchId,
    tokenAddress,
    amount,
    slippageBps = 100n,
  }) {
    const tokenAmount =
      parseTradeAmount(
        amount,
        "sell"
      );
  
  
    const walletAddress =
      await verifyWallet({
        eip1193Provider,
        expectedAddress,
      });
  
  
    const provider =
      new BrowserProvider(
        eip1193Provider
      );
  
  
    const signer =
      await provider.getSigner(
        walletAddress
      );
  
  
    const token =
      new Contract(
        tokenAddress,
        ERC20_ABI,
        signer
      );
  
  
    const factory =
      new Contract(
        LAUNCH_FACTORY_ADDRESS,
        LAUNCH_FACTORY_ABI,
        signer
      );
  
  
    /*
     * -------------------------------------------------------
     * BALANCE CHECK
     * -------------------------------------------------------
     */
  
    const balance =
      await token.balanceOf(
        walletAddress
      );
  
  
    if (
      balance <
      tokenAmount
    ) {
      throw new Error(
        "Insufficient token balance."
      );
    }
  
  
    /*
     * -------------------------------------------------------
     * SELL QUOTE
     * -------------------------------------------------------
     */
  
    const quoteOut =
      await factory.quoteSell(
        BigInt(
          launchId
        ),
        tokenAmount
      );
  
  
    const minQuoteOut =
      (
        quoteOut *
        (
          10_000n -
          slippageBps
        )
      ) /
      10_000n;
  
  
    /*
     * -------------------------------------------------------
     * EXACT APPROVAL
     * -------------------------------------------------------
     *
     * Never approve MaxUint256.
     */
  
    const allowance =
      await token.allowance(
        walletAddress,
        LAUNCH_FACTORY_ADDRESS
      );
  
  
    let approvalReceipt =
      null;
  
  
    if (
      allowance <
      tokenAmount
    ) {
      const approvalTx =
        await token.approve(
          LAUNCH_FACTORY_ADDRESS,
          tokenAmount
        );
  
  
      /*
       * Same ARC RPC receipt protection.
       *
       * Never resubmit approval automatically.
       */
      approvalReceipt =
        await waitForReceiptWithRetry({
          provider,
  
          transactionHash:
            approvalTx.hash,
        });
  
  
      if (
        approvalReceipt.status !== 1
      ) {
        throw new Error(
          "Token approval reverted."
        );
      }
    }
  
  
    /*
     * -------------------------------------------------------
     * EXECUTE SELL
     * -------------------------------------------------------
     */
  
    const sellTx =
      await factory.sellFairToken(
        BigInt(
          launchId
        ),
        tokenAmount,
        minQuoteOut
      );
  
  
    /*
     * Never resend SELL automatically.
     */
    const receipt =
      await waitForReceiptWithRetry({
        provider,
  
        transactionHash:
          sellTx.hash,
      });
  
  
    if (
      receipt.status !== 1
    ) {
      throw new Error(
        "Sell transaction reverted."
      );
    }
  
  
    return {
      transactionHash:
        sellTx.hash,
  
      receipt,
  
      approvalReceipt,
  
      quoteOut,
  
      minQuoteOut,
  
      formattedQuote:
        formatEther(
          quoteOut
        ),
    };
  }
  
  
  /*
   * -------------------------------------------------------
   * TOKEN BALANCE
   * -------------------------------------------------------
   */
  
  export async function getTradeTokenBalance({
    eip1193Provider,
    tokenAddress,
    walletAddress,
  }) {
    if (
      !eip1193Provider ||
      !tokenAddress ||
      !walletAddress
    ) {
      return {
        raw: 0n,
        formatted: "0",
      };
    }
  
  
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
  
  
    const balance =
      await token.balanceOf(
        walletAddress
      );
  
  
    return {
      raw:
        balance,
  
      formatted:
        formatUnits(
          balance,
          18
        ),
    };
  }

  /*
 * -------------------------------------------------------
 * QUOTE / NATIVE USDC BALANCE
 * -------------------------------------------------------
 */

export async function getTradeQuoteBalance({
    eip1193Provider,
    walletAddress,
  }) {
    if (
      !eip1193Provider ||
      !walletAddress
    ) {
      return {
        raw: 0n,
        formatted: "0",
      };
    }
  
  
    const provider =
      new BrowserProvider(
        eip1193Provider
      );
  
  
    const balance =
      await provider.getBalance(
        walletAddress
      );
  
  
    return {
      raw:
        balance,
  
      formatted:
        formatEther(
          balance
        ),
    };
  }