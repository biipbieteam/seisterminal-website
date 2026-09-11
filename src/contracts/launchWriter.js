import {
    BrowserProvider,
    Contract,
    Interface,
    parseEther,
    formatEther,
    formatUnits,
  } from "ethers";
  
  const ARC_TESTNET_CHAIN_ID =
    5042002n;
  
  const LAUNCH_FACTORY_ADDRESS =
    "0x8Da50245171d09a544eb047fc3d4e8cE4514931A";
  
  const LAUNCH_FACTORY_ABI = [
    "function launchFairToken(string name_, string symbol_) payable returns (uint256 launchId, address tokenAddress)",
    "function quoteDevBuy(uint256 quoteAmount_) pure returns (uint256 tokenAmount)",
    "event FairLaunchCreated(uint256 indexed launchId, address indexed token, address indexed creator, uint256 totalSupply, uint256 bondingSupply, uint256 liquiditySupply)",
  ];
  
  const launchInterface =
    new Interface(LAUNCH_FACTORY_ABI);
  
  /*
   * -------------------------------------------------------
   * INPUT VALIDATION
   * -------------------------------------------------------
   */
  
  function validateLaunchInput({
    name,
    symbol,
    devBuyAmount,
  }) {
    const cleanName =
      String(name || "").trim();
  
    const cleanSymbol =
      String(symbol || "")
        .trim()
        .toUpperCase();
  
    if (!cleanName) {
      throw new Error(
        "Token name is required."
      );
    }
  
    /*
     * Contract validates byte length,
     * not JavaScript character count.
     */
    const nameBytes =
      new TextEncoder().encode(
        cleanName
      ).length;
  
    if (nameBytes > 32) {
      throw new Error(
        "Token name exceeds 32 bytes."
      );
    }
  
    if (!cleanSymbol) {
      throw new Error(
        "Token symbol is required."
      );
    }
  
    const symbolBytes =
      new TextEncoder().encode(
        cleanSymbol
      ).length;
  
    if (symbolBytes > 10) {
      throw new Error(
        "Token symbol exceeds 10 bytes."
      );
    }
  
    const rawDevBuy =
      String(
        devBuyAmount ?? ""
      ).trim();
  
    let devBuyValue = 0n;
  
    if (rawDevBuy) {
      if (
        !/^\d+(\.\d{1,18})?$/.test(
          rawDevBuy
        )
      ) {
        throw new Error(
          "Invalid dev buy amount."
        );
      }
  
      devBuyValue =
        parseEther(rawDevBuy);
    }
  
    if (devBuyValue < 0n) {
      throw new Error(
        "Dev buy cannot be negative."
      );
    }
  
    return {
      name: cleanName,
      symbol: cleanSymbol,
      devBuyValue,
    };
  }
  
  /*
   * -------------------------------------------------------
   * PROVIDER PREFLIGHT
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
  
    const currentChainId =
      BigInt(rawChainId);
  
    if (
      currentChainId !==
      ARC_TESTNET_CHAIN_ID
    ) {
      throw new Error(
        "Switch wallet to ARC Testnet before launching."
      );
    }
  
    return walletAddress;
  }
  
  /*
   * -------------------------------------------------------
   * DEV BUY QUOTE
   * -------------------------------------------------------
   */
  
  export async function quoteLaunchDevBuy({
    eip1193Provider,
    devBuyAmount,
  }) {
    if (
      !devBuyAmount ||
      Number(devBuyAmount) === 0
    ) {
      return {
        quoteValue: 0n,
        tokenAmount: 0n,
        formattedTokens: "0",
      };
    }
  
    const quoteValue =
      parseEther(
        String(devBuyAmount)
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
  
    /*
     * This call also validates the
     * contract's 5% maximum.
     */
    const tokenAmount =
      await factory.quoteDevBuy(
        quoteValue
      );
  
    return {
      quoteValue,
      tokenAmount,
      formattedTokens:
        formatUnits(
          tokenAmount,
          18
        ),
    };
  }
  
  /*
   * -------------------------------------------------------
   * LAUNCH
   * -------------------------------------------------------
   */
  
  export async function launchFairToken({
    eip1193Provider,
    expectedAddress,
    name,
    symbol,
    devBuyAmount = "",
  }) {
    const input =
      validateLaunchInput({
        name,
        symbol,
        devBuyAmount,
      });
  
    const walletAddress =
      await verifyWallet({
        eip1193Provider,
        expectedAddress,
      });
  
    const provider =
      new BrowserProvider(
        eip1193Provider
      );
  
    /*
     * getSigner() uses the account
     * already exposed by the connected
     * EIP-1193 provider.
     *
     * No eth_requestAccounts here.
     */
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
     * Before opening the transaction
     * confirmation, validate the dev buy
     * with the exact on-chain quote logic.
     *
     * quoteDevBuy(0) is valid, but there
     * is no reason to make the RPC call.
     */
    let estimatedDevTokens = 0n;
  
    if (input.devBuyValue > 0n) {
      estimatedDevTokens =
        await factory.quoteDevBuy(
          input.devBuyValue
        );
    }
  
    /*
     * Build the exact transaction.
     * Recipient can only be the official
     * LaunchFactory contract instantiated
     * above.
     */
    const txRequest =
      await factory
        .launchFairToken
        .populateTransaction(
          input.name,
          input.symbol,
          {
            value:
              input.devBuyValue,
          }
        );
  
    /*
     * Defensive recipient check.
     */
    if (
      !txRequest.to ||
      txRequest.to.toLowerCase() !==
        LAUNCH_FACTORY_ADDRESS.toLowerCase()
    ) {
      throw new Error(
        "Invalid launch transaction recipient."
      );
    }
  
    /*
     * Defensive calldata selector check.
     */
    const expectedSelector =
      launchInterface
        .getFunction(
          "launchFairToken"
        )
        .selector;
  
    if (
      !txRequest.data ||
      !txRequest.data
        .toLowerCase()
        .startsWith(
          expectedSelector.toLowerCase()
        )
    ) {
      throw new Error(
        "Invalid launch transaction data."
      );
    }
  
    /*
     * Preflight gas estimation.
     *
     * If the contract would revert,
     * stop before asking the wallet
     * to submit the transaction.
     */
    const gasEstimate =
      await provider.estimateGas({
        ...txRequest,
        from: walletAddress,
      });
  
    if (gasEstimate <= 0n) {
      throw new Error(
        "Launch transaction preflight failed."
      );
    }
  
    /*
     * ONE explicit write request.
     *
     * This is the point at which the
     * wallet transaction confirmation
     * is requested.
     */
    const tx =
      await signer.sendTransaction(
        txRequest
      );
  
    const receipt =
      await tx.wait();
  
    if (
      !receipt ||
      receipt.status !== 1
    ) {
      throw new Error(
        "Launch transaction failed."
      );
    }
  
    /*
     * Recover the token + launchId from
     * FairLaunchCreated.
     */
    let launchId = null;
    let tokenAddress = null;
  
    for (
      const log of receipt.logs
    ) {
      if (
        log.address.toLowerCase() !==
        LAUNCH_FACTORY_ADDRESS.toLowerCase()
      ) {
        continue;
      }
  
      try {
        const parsed =
          launchInterface.parseLog(
            log
          );
  
        if (
          parsed?.name ===
          "FairLaunchCreated"
        ) {
          launchId =
            parsed.args.launchId;
  
          tokenAddress =
            parsed.args.token;
  
          break;
        }
      } catch {
        // Ignore unrelated Factory logs.
      }
    }
  
    return {
      transactionHash:
        tx.hash,
  
      receipt,
  
      launchId,
      tokenAddress,
  
      creator:
        walletAddress,
  
      name:
        input.name,
  
      symbol:
        input.symbol,
  
      devBuyValue:
        input.devBuyValue,
  
      formattedDevBuy:
        formatEther(
          input.devBuyValue
        ),
  
      estimatedDevTokens,
  
      formattedEstimatedDevTokens:
        formatUnits(
          estimatedDevTokens,
          18
        ),
    };
  }
  
  export {
    LAUNCH_FACTORY_ADDRESS,
    ARC_TESTNET_CHAIN_ID,
  };