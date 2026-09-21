import { useEffect, useState } from "react";
import SwapTokenSelector from "../components/SwapTokenSelector";
import { getRelayChains } from "../lib/relayMetadata";
import "./SwapPage.css";
import {
    getRelayQuote,
    getRelayQuoteSummary,
    getRelayExecutionItem,
    waitForRelayExecution,
  } from "../lib/relayQuote";
import { getRelayTokenBalance } from "../lib/relayBalance";

const ARC_CHAIN_ID = 5042;
const BASE_CHAIN_ID = 8453;

function findToken(chains, chainId, symbol) {
  const chain = chains.find(
    (item) => item.id === chainId
  );

  if (!chain) {
    return null;
  }

  const tokens = [
    chain.nativeCurrency,
    ...(chain.featuredTokens || []),
  ].filter(Boolean);

  return (
    tokens.find(
      (token) =>
        token.symbol?.toUpperCase() ===
        symbol.toUpperCase()
    ) || tokens[0] || null
  );
}

function TokenLogo({ token }) {
  if (token?.logoURI) {
    return (
      <img
        src={token.logoURI}
        alt=""
      />
    );
  }

  return (
    <span>
      {token?.symbol?.slice(0, 1) || "?"}
    </span>
  );
}

function compareDecimalStrings(a, b) {
    const normalize = (value) => {
      const [whole = "0", fraction = ""] =
        String(value || "0").split(".");
  
      return {
        whole:
          whole.replace(/^0+(?=\d)/, "") || "0",
        fraction,
      };
    };
  
    const left = normalize(a);
    const right = normalize(b);
  
    if (left.whole.length !== right.whole.length) {
      return left.whole.length > right.whole.length
        ? 1
        : -1;
    }
  
    if (left.whole !== right.whole) {
      return left.whole > right.whole ? 1 : -1;
    }
  
    const fractionLength = Math.max(
      left.fraction.length,
      right.fraction.length
    );
  
    const leftFraction =
      left.fraction.padEnd(fractionLength, "0");
  
    const rightFraction =
      right.fraction.padEnd(fractionLength, "0");
  
    if (leftFraction === rightFraction) {
      return 0;
    }
  
    return leftFraction > rightFraction ? 1 : -1;
  }
  
  function multiplyDecimalString(
    value,
    numerator,
    denominator
  ) {
    const text = String(value || "0");
  
    const [whole = "0", fraction = ""] =
      text.split(".");
  
    const decimals = fraction.length;
  
    const units = BigInt(
      `${whole || "0"}${fraction}` || "0"
    );
  
    const result =
      (units * BigInt(numerator)) /
      BigInt(denominator);
  
    if (decimals === 0) {
      return result.toString();
    }
  
    const padded = result
      .toString()
      .padStart(decimals + 1, "0");
  
    const resultWhole =
      padded.slice(0, -decimals) || "0";
  
    const resultFraction = padded
      .slice(-decimals)
      .replace(/0+$/, "");
  
    return resultFraction
      ? `${resultWhole}.${resultFraction}`
      : resultWhole;
}

function parseTokenAmount(value, decimals) {
    const normalized = String(value || "").trim();
  
    if (!normalized || !/^\d*\.?\d*$/.test(normalized)) {
      return null;
    }
  
    const [whole = "0", fraction = ""] =
      normalized.split(".");
  
    if (fraction.length > decimals) {
      return null;
    }
  
    const paddedFraction =
      fraction.padEnd(decimals, "0");
  
    const combined =
      `${whole || "0"}${paddedFraction}`
        .replace(/^0+(?=\d)/, "");
  
    return BigInt(combined || "0").toString();
}

export default function SwapPage({
    connected,
    address,
    chainId,
    eip1193Provider,
    switchToArcMainnet,
  }) {
  const [fromAmount, setFromAmount] =
    useState("");

  const [toAmount, setToAmount] =
    useState("");
  
  const [quote, setQuote] =
    useState(null);
  
  const [quoteSummary, setQuoteSummary] =
    useState(null);
  
  const [quoteLoading, setQuoteLoading] =
    useState(false);
  
  const [quoteError, setQuoteError] =
    useState("");

  const [swapStatus, setSwapStatus] =
    useState(null);
 
  const [settingsOpen, setSettingsOpen] =
    useState(false);

  const [slippageMode, setSlippageMode] =
    useState("auto");
  
  const [customSlippage, setCustomSlippage] =
    useState("");
    
  const [relayChains, setRelayChains] =
    useState([]);

  const [relayLoading, setRelayLoading] =
    useState(true);

  const [relayError, setRelayError] =
    useState("");

  const [fromToken, setFromToken] =
    useState(null);

  const [toToken, setToToken] =
    useState(null);

  const [fromBalance, setFromBalance] =
    useState(null);
  
  const [toBalance, setToBalance] =
    useState(null);
  
  const [balancesLoading, setBalancesLoading] =
    useState(false);

  const [selectorSide, setSelectorSide] =
    useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadRelayMetadata() {
      try {
        setRelayLoading(true);
        setRelayError("");

        const chains =
          await getRelayChains();

        if (cancelled) {
          return;
        }

        setRelayChains(chains);

        setFromToken((current) => {
          if (current) {
            return current;
          }

          return findToken(
            chains,
            ARC_CHAIN_ID,
            "USDC"
          );
        });

        setToToken((current) => {
          if (current) {
            return current;
          }

          return findToken(
            chains,
            BASE_CHAIN_ID,
            "ETH"
          );
        });
      } catch (error) {
        console.error(
          "Failed to load Relay metadata:",
          error
        );

        if (!cancelled) {
          setRelayError(
            "Unable to load Relay assets."
          );
        }
      } finally {
        if (!cancelled) {
          setRelayLoading(false);
        }
      }
    }

    loadRelayMetadata();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
  
    async function loadBalances() {
      if (
        !connected ||
        !address ||
        !fromToken ||
        !toToken ||
        relayChains.length === 0
      ) {
        setFromBalance(null);
        setToBalance(null);
        setBalancesLoading(false);
        return;
      }
  
      const fromChain = relayChains.find(
        (chain) =>
          Number(chain.id) ===
          Number(fromToken.chainId)
      );
  
      const toChain = relayChains.find(
        (chain) =>
          Number(chain.id) ===
          Number(toToken.chainId)
      );
  
      if (
        !fromChain?.httpRpcUrl ||
        !toChain?.httpRpcUrl
      ) {
        setFromBalance(null);
        setToBalance(null);
        setBalancesLoading(false);
        return;
      }
  
      setBalancesLoading(true);
  
      try {
        const [nextFromBalance, nextToBalance] =
          await Promise.all([
            getRelayTokenBalance({
              rpcUrl: fromChain.httpRpcUrl,
              walletAddress: address,
              token: fromToken,
            }),
  
            getRelayTokenBalance({
              rpcUrl: toChain.httpRpcUrl,
              walletAddress: address,
              token: toToken,
            }),
          ]);
  
        if (cancelled) {
          return;
        }
  
        setFromBalance(nextFromBalance);
        setToBalance(nextToBalance);
      } catch (error) {
        if (cancelled) {
          return;
        }
  
        console.error(
          "Failed to load swap balances:",
          error
        );
  
        setFromBalance(null);
        setToBalance(null);
      } finally {
        if (!cancelled) {
          setBalancesLoading(false);
        }
      }
    }
  
    loadBalances();
  
    return () => {
      cancelled = true;
    };
  }, [
    connected,
    address,
    fromToken,
    toToken,
    relayChains,
  ]);

  useEffect(() => {
    setQuote(null);
    setQuoteSummary(null);
    setToAmount("");
    setQuoteError("");
  
    if (
      !fromAmount ||
      !fromToken ||
      !toToken
    ) {
      setQuoteLoading(false);
      return;
    }
  
    const amount = parseTokenAmount(
      fromAmount,
      fromToken.decimals
    );
  
    if (!amount || BigInt(amount) <= 0n) {
      setQuoteLoading(false);
      return;
    }

    let slippageTolerance;

    if (slippageMode === "custom") {
      const slippagePercent =
        Number(customSlippage);
    
      if (
        !Number.isFinite(slippagePercent) ||
        slippagePercent <= 0
      ) {
        setQuoteLoading(false);
        return;
      }
    
      slippageTolerance = Math.round(
        slippagePercent * 100
      );
    }

    let cancelled = false;
  
    const timer = window.setTimeout(
      async () => {
        try {
          setQuoteLoading(true);
          setQuoteError("");
  
          if (
            !connected ||
            !address ||
            !eip1193Provider
          ) {
            throw new Error(
              "Connect wallet to request a quote."
            );
          }
          
          const user = address;
  
          const nextQuote =
            await getRelayQuote({
              user,
              originChainId:
                fromToken.chainId,
              destinationChainId:
                toToken.chainId,
              originCurrency:
                fromToken.address,
              destinationCurrency:
                toToken.address,
              amount,
              recipient: user,
              slippageTolerance,
            });
  
          if (cancelled) {
            return;
          }
  
          const summary =
            getRelayQuoteSummary(
              nextQuote
            );
  
          setQuote(nextQuote);
          setQuoteSummary(summary);
  
          setToAmount(
            summary?.amountOutFormatted ||
              ""
          );
        } catch (error) {
          if (cancelled) {
            return;
          }
  
          console.error(
            "Relay quote failed:",
            error
          );
  
          setQuote(null);
          setQuoteSummary(null);
          setToAmount("");
  
          setQuoteError(
            error?.message ||
              "Unable to find a swap route."
          );
        } finally {
          if (!cancelled) {
            setQuoteLoading(false);
          }
        }
      },
      600
    );
  
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
}, [
    fromAmount,
    fromToken,
    toToken,
    connected,
    address,
    eip1193Provider,
    slippageMode,
    customSlippage,
  ]);
  const activeSelectorToken =
    selectorSide === "from"
      ? fromToken
      : selectorSide === "to"
        ? toToken
        : null;

  const handleSelectToken = (token) => {
    if (selectorSide === "from") {
      setFromToken(token);
    }

    if (selectorSide === "to") {
      setToToken(token);
    }

    setSelectorSide(null);
  };

  const handleReverse = () => {
    if (!fromToken || !toToken) {
      return;
    }

    setFromToken(toToken);
    setToToken(fromToken);
    setFromAmount("");
  };

  const handleSwapSubmit = async () => {
    if (quoteLoading) {
      return;
    }
  
    if (
      !connected ||
      !address ||
      !eip1193Provider
    ) {
      setQuoteError(
        "Connect wallet before swapping."
      );
      return;
    }
  
    if (!fromToken || !toToken) {
      setQuoteError(
        "Select both tokens before swapping."
      );
      return;
    }
  
    if (
      !fromAmount ||
      Number(fromAmount) <= 0
    ) {
      setQuoteError(
        "Enter an amount greater than zero."
      );
      return;
    }
  
    if (!quote || !quoteSummary) {
      setQuoteError(
        "No valid Relay route is available."
      );
      return;
    }
  
    const executionItem =
      getRelayExecutionItem(quote);
  
    if (
      !executionItem ||
      !executionItem.transaction
    ) {
      setQuoteError(
        "Relay did not return an executable transaction."
      );
      return;
    }
  
    const transaction =
      executionItem.transaction;
  
    const executionChainId =
      Number(transaction.chainId);
  
    const expectedChainId =
      Number(fromToken.chainId);
  
    /*
     * Relay transaction must belong to
     * the currently selected origin chain.
     */
    if (
      !Number.isFinite(executionChainId) ||
      executionChainId !== expectedChainId
    ) {
      setQuoteError(
        "Relay execution chain does not match the selected origin chain."
      );
      return;
    }
  
    if (
      !transaction.to ||
      !executionItem.requestId
    ) {
      setQuoteError(
        "Relay returned incomplete execution data."
      );
      return;
    }

    /*
    * From this point the route is valid
    * and swap execution is beginning.
    */
    setSwapStatus({
        type: "pending",
        stage: "wallet",
        message: "SWAP PENDING_",
      });
  
    /*
     * ORIGIN CHAIN GUARD
     *
     * For the current Arc-origin route,
     * reuse SEIS Terminal's existing
     * Arc Mainnet switch function.
     *
     * No swap transaction is sent here.
     */
    const providerChainId =
    await eip1193Provider.request({
      method: "eth_chainId",
    });
  
    const currentChainId =
        Number(providerChainId);
  
    if (currentChainId !== executionChainId) {
      if (
        executionChainId !== 5042 ||
        typeof switchToArcMainnet !== "function"
      ) {
        setQuoteError(
          "Switch to the origin network before swapping."
        );
        return;
      }
  
        const switchResult =
        await switchToArcMainnet();
    
        if (!switchResult?.success) {
        setQuoteError(
            switchResult?.needsAdd
            ? "The origin network is not configured in your wallet."
            : "Network switch was not completed."
        );
        return;
        }
    }

    const verifiedChainIdHex =
    await eip1193Provider.request({
        method: "eth_chainId",
    });

    const verifiedChainId =
        Number(verifiedChainIdHex);

    if (verifiedChainId !== executionChainId) {
        setQuoteError(
            "Wallet is not on the required origin network."
        );
        return;
    }

    const toHexQuantity = (value) => {
        if (value === undefined || value === null || value === "") {
          return undefined;
        }
      
        return `0x${BigInt(value).toString(16)}`;
      };
      
      const walletTransaction = {
        from: address,
        to: transaction.to,
        data: transaction.data,
        value: toHexQuantity(transaction.value),
        gas: toHexQuantity(transaction.gas),
        maxFeePerGas: toHexQuantity(
          transaction.maxFeePerGas
        ),
        maxPriorityFeePerGas: toHexQuantity(
          transaction.maxPriorityFeePerGas
        ),
      };
      
      Object.keys(walletTransaction).forEach((key) => {
        if (walletTransaction[key] === undefined) {
          delete walletTransaction[key];
        }
      });

      console.log(
        "[SWAP] Relay status check:",
        executionItem.check
      );
      
      let transactionHash;

      try {
        transactionHash =
          await eip1193Provider.request({
            method: "eth_sendTransaction",
            params: [walletTransaction],
          });
      } catch (error) {
        if (error?.code === 4001) {
          console.log("[SWAP] Transaction rejected by user.");
      
          setSwapStatus({
            type: "failed",
            stage: "wallet",
            message: "SWAP FAILED_",
          });

          return;
        }
      
        console.error(
          "[SWAP] Transaction submission failed:",
          error
        );

        setSwapStatus({
            type: "failed",
            stage: "wallet",
            message: "SWAP FAILED_",
          });
      
        return;
      }
      
      console.log("[SWAP] Transaction submitted.", {
        transactionHash,
        requestId: executionItem.requestId,
        check: executionItem.check,
      });
      
      /*
 * Wallet accepted the transaction.
 * Source transaction has been submitted.
 * Relay now takes over the cross-chain execution.
 */
setSwapStatus({
    type: "pending",
    stage: "relay",
    message: "SWAP PENDING_",
  });
  
  try {
    const relayResult =
      await waitForRelayExecution({
        check: executionItem.check,
  
        intervalMs: 1000,
  
        timeoutMs: 120000,
  
        onStatus: (status, result) => {
          console.log(
            "[SWAP] Relay status:",
            status,
            result
          );
        },
      });
  
    console.log(
      "[SWAP] Relay execution completed.",
      relayResult
    );
  
    setSwapStatus({
      type: "success",
      stage: "complete",
      message: "SWAP SUCCESS_",

        destinationChainId:
            relayResult?.destinationChainId ?? null,
  
        destinationTxHash:
            relayResult?.txHashes?.[0] ?? null,
    });
  } catch (error) {
    console.error(
      "[SWAP] Relay execution failed:",
      error
    );
  
    setSwapStatus({
      type: "failed",
      stage: "relay",
      message: "SWAP FAILED_",
    });
  
    return;
  }
  
    setQuoteError("");
  
    console.log(
      "[SWAP] Origin chain validated.",
      {
        user: address,
        walletChainId: verifiedChainIdHex,
        executionChainId,
        requestId: executionItem.requestId,
        to: transaction.to,
        value: transaction.value,
        hasData: Boolean(transaction.data),
        relayTransaction: transaction,
        check: executionItem.check,
      }
    );
  };

  const destinationExplorerUrl = (() => {
    if (
      swapStatus?.type !== "success" ||
      !swapStatus?.destinationChainId ||
      !swapStatus?.destinationTxHash
    ) {
      return "";
    }
  
    const destinationChain = relayChains.find(
      (chain) =>
        Number(chain.id) ===
        Number(swapStatus.destinationChainId)
    );
  
    if (!destinationChain?.explorerUrl) {
      return "";
    }
  
    const explorerBaseUrl =
      destinationChain.explorerUrl.replace(/\/$/, "");
  
    return `${explorerBaseUrl}/tx/${swapStatus.destinationTxHash}`;
  })();

  return (
    <section className="swap-page">
  
        {swapStatus && (
        <div className="swap-status-overlay">
            <div className="swap-status-modal">

            <div className="swap-status-header">
            <h3>TRANSACTION DETAILS</h3>

            <button
                type="button"
                className="swap-status-close"
                onClick={() => {
                if (swapStatus?.type !== "pending") {
                    setSwapStatus(null);
                }
                }}
                disabled={swapStatus?.type === "pending"}
                aria-label="Close transaction details"
            >
                ×
            </button>
            </div>

            <div className="swap-status-assets">
                <div className="swap-status-asset-card">
                <div className="swap-status-asset-top">
                    <TokenLogo token={fromToken} />

                    <div>
                    <strong>{fromToken?.symbol}</strong>
                    <span>
                        {fromToken?.chainName || "ARC"}
                    </span>
                    </div>
                </div>

                <div className="swap-status-amount">
                    {fromAmount} {fromToken?.symbol}
                </div>
                </div>

                <div className="swap-status-arrow">
                →
                </div>

                <div className="swap-status-asset-card">
                <div className="swap-status-asset-top">
                    <TokenLogo token={toToken} />

                    <div>
                    <strong>{toToken?.symbol}</strong>
                    <span>
                        {toToken?.chainName || "BASE"}
                    </span>
                    </div>
                </div>

                <div className="swap-status-amount">
                    {toAmount || "--"} {toToken?.symbol}
                </div>
                </div>
            </div>

            <div className="swap-status-steps">

                <div className="swap-status-step">
                    <div
                        className={`swap-status-step-icon ${
                        swapStatus.type === "failed" &&
                        swapStatus.stage === "wallet"
                            ? "is-failed"
                            : swapStatus.stage === "wallet"
                            ? "is-active"
                            : "is-complete"
                        }`}
                    >
                        {swapStatus.type === "failed" &&
                        swapStatus.stage === "wallet"
                        ? "×"
                        : swapStatus.stage === "wallet"
                            ? "→"
                            : "✓"}
                    </div>

                    <div className="swap-status-step-content">
                        <strong>
                        Send {fromToken?.symbol} on{" "}
                        {fromToken?.chainName || "Arc"}
                        </strong>

                        {swapStatus.type === "failed" &&
                        swapStatus.stage === "wallet" ? (
                        <span className="swap-status-error">
                            Transaction rejected
                        </span>
                        ) : swapStatus.stage === "wallet" ? (
                        <span className="swap-status-active-text">
                            Confirm in wallet
                            <i className="swap-status-mini-spinner" />
                        </span>
                        ) : (
                        <span className="swap-status-complete-text">
                            Transaction submitted
                        </span>
                        )}
                    </div>
                </div>

                <div className="swap-status-step-line" />

                <div
                className={`swap-status-step ${
                    swapStatus.stage === "wallet"
                    ? "is-waiting"
                    : ""
                }`}
                >
                <div
                    className={`swap-status-step-icon ${
                    swapStatus.type === "failed" &&
                    swapStatus.stage === "relay"
                        ? "is-failed"
                        : swapStatus.stage === "relay"
                        ? "is-active"
                        : swapStatus.stage === "complete"
                            ? "is-complete"
                            : ""
                    }`}
                >
                    {swapStatus.type === "failed" &&
                    swapStatus.stage === "relay"
                    ? "×"
                    : swapStatus.stage === "complete"
                        ? "✓"
                        : "↔"}
                </div>

                <div className="swap-status-step-content">
                    <strong>
                    Relay processes your transaction
                    </strong>

                    {swapStatus.stage === "relay" &&
                    swapStatus.type === "pending" && (
                        <span className="swap-status-active-text">
                        Processing cross-chain swap
                        <i className="swap-status-mini-spinner" />
                        </span>
                    )}

                    {swapStatus.stage === "relay" &&
                    swapStatus.type === "failed" && (
                        <span className="swap-status-error">
                        Relay execution failed
                        </span>
                    )}

                    {swapStatus.stage === "complete" && (
                    <span className="swap-status-complete-text">
                        Relay completed
                    </span>
                    )}
                </div>
                </div>

                <div className="swap-status-step-line" />

                <div
                className={`swap-status-step ${
                    swapStatus.stage !== "complete"
                    ? "is-waiting"
                    : ""
                }`}
                >
                <div
                    className={`swap-status-step-icon ${
                    swapStatus.stage === "complete"
                        ? "is-complete"
                        : ""
                    }`}
                >
                    {swapStatus.stage === "complete"
                    ? "✓"
                    : "←"}
                </div>

                <div className="swap-status-step-content">
                    <strong>
                    Receive {toToken?.symbol} on{" "}
                    {toToken?.chainName || "Base"}
                    </strong>

                    {swapStatus.stage === "complete" && (
                    <span className="swap-status-complete-text">
                        Swap received
                    </span>
                    )}
                </div>
                </div>

            </div>

            {destinationExplorerUrl && (
            <a
                className="swap-status-explorer"
                href={destinationExplorerUrl}
                target="_blank"
                rel="noreferrer"
            >
                VIEW TRANSACTION
                <span>↗</span>
            </a>
            )}
            
            </div>
        </div>
        )}
  
      <div className="swap-page-shell">
      <div className="swap-desktop-layout">
        <div className="swap-page-header">
            <div className="swap-page-kicker">
                CROSS-CHAIN_
            </div>

            <h1 className="swap-hero-title">
                <span>Swap at speed.</span>
                <span>Across chains.</span>
                <span className="swap-hero-accent">
                Instantly.
                </span>
            </h1>

            <p className="swap-hero-description">
                Move assets across supported chains in seconds.
                Fast, simple, and built for cross-chain swaps.
            </p>
        </div>

        <div className="swap-interface">
          <div className="swap-card">
            <div className="swap-card-top">
              <div className="swap-mode-tabs">
                <button
                  type="button"
                  className="swap-mode-tab swap-mode-tab-active"
                >
                  SWAP
                </button>
              </div>

              <div className="swap-settings-wrap">
                    <button
                        type="button"
                        className={`swap-settings-button ${
                        settingsOpen ? "is-active" : ""
                        }`}
                        aria-label="Swap settings"
                        aria-expanded={settingsOpen}
                        onClick={() =>
                        setSettingsOpen((current) => !current)
                        }
                    >
                        <img
                        src="/icon/setting.png"
                        alt=""
                        className="swap-settings-icon"
                        />
                    </button>

                    {settingsOpen && (
                        <div className="swap-settings-popover">
                        <div className="swap-settings-title">
                            MAX SLIPPAGE
                            <span
                            className="swap-settings-info"
                            title="Maximum price movement allowed while executing the swap."
                            >
                            i
                            </span>
                        </div>

                        <div className="swap-settings-options">
                            <button
                                type="button"
                                className={`swap-settings-option ${
                                    slippageMode === "auto" ? "is-active" : ""
                                }`}
                                onClick={() => setSlippageMode("auto")}
                                >
                                AUTO
                            </button>

                            <button
                                type="button"
                                className={`swap-settings-option ${
                                    slippageMode === "custom" ? "is-active" : ""
                                }`}
                                onClick={() => setSlippageMode("custom")}
                                >
                                CUSTOM
                            </button>
                        </div>

                        {slippageMode === "auto" ? (
                            <p className="swap-settings-description">
                                Slippage is set automatically to help the
                                transaction complete successfully.
                            </p>
                            ) : (
                            <div className="swap-custom-slippage">
                                <div className="swap-custom-slippage-input-wrap">
                                <input
                                    type="number"
                                    min="0"
                                    step="0.1"
                                    inputMode="decimal"
                                    value={customSlippage}
                                    onChange={(event) =>
                                    setCustomSlippage(event.target.value)
                                    }
                                    placeholder="0.5"
                                    className="swap-custom-slippage-input"
                                />

                                <span>%</span>
                                </div>

                                <p className="swap-settings-description">
                                Set the maximum slippage allowed for this swap.
                                </p>
                            </div>
                        )}
                        </div>
                    )}
                </div>
            </div>

            <div className="swap-asset-panel">
                <div className="swap-asset-header">
                <span>FROM</span>

                <span className="swap-wallet-balance">
                    BALANCE:{" "}
                    {balancesLoading
                    ? "..."
                    : fromBalance != null
                        ? `${fromBalance} ${fromToken?.symbol || ""}`
                        : "--"}
                </span>
                </div>

              <div className="swap-asset-main">
                <div className="swap-amount-area">
                  <input
                    className="swap-amount-input"
                    type="text"
                    inputMode="decimal"
                    placeholder="0"
                    value={fromAmount}
                    onChange={(event) => {
                        const value = event.target.value;
                      
                        if (
                          value !== "" &&
                          !/^\d*\.?\d*$/.test(value)
                        ) {
                          return;
                        }
                      
                        if (value === "") {
                          setFromAmount("");
                          return;
                        }
                      
                        if (
                          fromBalance != null &&
                          compareDecimalStrings(
                            value,
                            fromBalance
                          ) > 0
                        ) {
                          setFromAmount(fromBalance);
                          return;
                        }
                      
                        setFromAmount(value);
                    }}
                  />

                    <div className="swap-usd-value">
                    {quoteSummary?.amountInUsd
                        ? `$${Number(
                            quoteSummary.amountInUsd
                        ).toFixed(2)}`
                        : "$0.00"}
                    </div>
                </div>

                <button
                  type="button"
                  className="swap-token-button"
                  disabled={relayLoading}
                  onClick={() => {
                    setSelectorSide("from");
                  }}
                >
                  <span className="swap-token-logo">
                    <TokenLogo
                      token={fromToken}
                    />
                  </span>

                  <span className="swap-token-info">
                    <strong>
                      {relayLoading
                        ? "..."
                        : fromToken?.symbol ||
                          "SELECT"}
                    </strong>

                    <small>
                      {fromToken?.chainName
                        ?.toUpperCase() ||
                        "--"}
                    </small>
                  </span>

                  <span className="swap-token-arrow">
                    &gt;
                  </span>
                </button>
              </div>

              <div className="swap-quick-actions">
                <button
                    type="button"
                    disabled={fromBalance == null}
                    onClick={() => {
                    if (fromBalance == null) {
                        return;
                    }

                    setFromAmount(
                        multiplyDecimalString(
                        fromBalance,
                        25,
                        100
                        )
                    );
                    }}
                >
                    25%
                </button>

                <button
                    type="button"
                    disabled={fromBalance == null}
                    onClick={() => {
                    if (fromBalance == null) {
                        return;
                    }

                    setFromAmount(
                        multiplyDecimalString(
                        fromBalance,
                        50,
                        100
                        )
                    );
                    }}
                >
                    50%
                </button>

                <button
                    type="button"
                    disabled={fromBalance == null}
                    onClick={() => {
                    if (fromBalance == null) {
                        return;
                    }

                    setFromAmount(fromBalance);
                    }}
                >
                    MAX
                </button>
              </div>
            </div>

            <div className="swap-direction-wrap">
              <button
                type="button"
                className="swap-direction-button"
                aria-label="Reverse swap direction"
                onClick={handleReverse}
              >
                v
              </button>
            </div>

            <div className="swap-asset-panel swap-asset-panel-to">
              <div className="swap-asset-header">
                <span>TO</span>

                <span className="swap-wallet-balance">
                BALANCE:{" "}
                {balancesLoading
                    ? "..."
                    : toBalance != null
                    ? `${toBalance} ${toToken?.symbol || ""}`
                    : "--"}
                </span>
              </div>

              <div className="swap-asset-main">
                <div className="swap-amount-area">
                  <input
                    className="swap-amount-input"
                    type="text"
                    placeholder="0"
                    value={toAmount}
                    readOnly
                  />

                    <div className="swap-usd-value">
                    {quoteSummary?.amountOutUsd
                        ? `$${Number(
                            quoteSummary.amountOutUsd
                        ).toFixed(2)}`
                        : "$0.00"}
                    </div>
                </div>

                <button
                  type="button"
                  className="swap-token-button"
                  disabled={relayLoading}
                  onClick={() => {
                    setSelectorSide("to");
                  }}
                >
                  <span className="swap-token-logo">
                    <TokenLogo
                      token={toToken}
                    />
                  </span>

                  <span className="swap-token-info">
                    <strong>
                      {relayLoading
                        ? "..."
                        : toToken?.symbol ||
                          "SELECT"}
                    </strong>

                    <small>
                      {toToken?.chainName
                        ?.toUpperCase() ||
                        "--"}
                    </small>
                  </span>

                  <span className="swap-token-arrow">
                    &gt;
                  </span>
                </button>
              </div>
            </div>

            <div className="swap-route-panel">
                <div className="swap-route-row">
                    <span>MAX SLIPPAGE</span>

                    <div className="swap-route-value">
                        {slippageMode === "auto" && (
                            <span className="swap-auto-badge">
                            AUTO
                            </span>
                        )}

                        <strong>
                            {quoteLoading
                            ? "..."
                            : slippageMode === "custom"
                                ? customSlippage
                                ? `${customSlippage}%`
                                : "--"
                                : quoteSummary?.slippagePercent != null
                                ? `${quoteSummary.slippagePercent}%`
                                : "--"}
                        </strong>
                    </div>
                </div>

                <div className="swap-route-row">
                    <span>RATE</span>

                    <strong>
                    {quoteLoading
                        ? "..."
                        : quoteSummary?.rate
                        ? `1 ${fromToken?.symbol} = ${quoteSummary.rate} ${toToken?.symbol}`
                        : "--"}
                    </strong>
                </div>

                <div className="swap-route-footer">
                    <span>
                    EST. TIME:{" "}
                    {quoteLoading
                        ? "..."
                        : quoteSummary?.timeEstimate != null
                        ? `${quoteSummary.timeEstimate} SEC`
                        : "--"}
                    </span>

                    <span>
                    NETWORK FEE:{" "}
                    {quoteLoading
                        ? "..."
                        : quoteSummary?.gasFeeUsd
                        ? `$${Number(
                            quoteSummary.gasFeeUsd
                            ).toFixed(4)}`
                        : "--"}
                    </span>
                </div>

                {quoteError && (
                    <div className="swap-quote-error">
                    {quoteError}
                    </div>
                )}
            </div>

            <button
            type="button"
            className="swap-submit-button"
            onClick={handleSwapSubmit}
            disabled={
                quoteLoading ||
                !quoteSummary ||
                !quote ||
                !connected ||
                !address ||
                !eip1193Provider
            }
            >
            {quoteLoading
                ? "FETCHING ROUTE_"
                : quoteSummary
                ? "SWAP_"
                : "ENTER AMOUNT_"}
            </button>
          </div>
        </div>
        </div>
      </div>

      <SwapTokenSelector
        open={Boolean(selectorSide)}
        chains={relayChains}
        selectedToken={
          activeSelectorToken
        }
        onSelect={handleSelectToken}
        onClose={() => {
          setSelectorSide(null);
        }}
      />
    </section>
  );
}