import {
  useEffect,
  useState,
  useMemo,
} from "react";
import {
  useWallet,
} from "./context/wallet-context";
import {
  refreshFairLaunch,
  getTokenExplorerUrl,
} from "./contracts/launchReader.js";
import {
  launchFairToken,
} from "./contracts/launchWriter.js";
import {
  getLaunchMetadata,
} from "./lib/launchMetadata.js";
import { saveLaunchMetadata } from "./lib/saveLaunchMetadata";
import {
  buyFairToken,
  sellFairToken,
  getTradeTokenBalance,
  getTradeQuoteBalance,
} from "./contracts/tradeWriter";
import {
  saveTradeEvent,
} from "./lib/saveTradeEvent";
import {
  getTradeStats,
} from "./lib/tradeStats";
import {
  getTradeHistory,
} from "./lib/tradeHistory";
import TradeCandlestickChart
  from "./components/TradeCandlestickChart";
import {
    getTokenHolders,
    getTokenHolderCount,
} from "./lib/holderStats";
import {
  getPlatformStats,
  getTopVolumeTokens,
} from "./lib/platformStats";
import DocsPage from "./pages/DocsPage";
import LitepaperPage from "./pages/LitepaperPage";

import {
  GENESIS_CONTRACT_ADDRESS,
  getGenesisState,
  getGenesisWalletState,
} from "./contracts/genesisReader.js";

import {
  mintGenesisTeam,
  mintGenesisOG,
  mintGenesisFCFS,
  mintGenesisPublic,
} from "./contracts/genesisWriter.js";

import {
  getGenesisEligibility,
  getGenesisWhitelistCounts,
} from "./lib/genesisEligibility";

import SwapPage from "./pages/SwapPage";
import GenesisVerifyPage
  from "./pages/GenesisVerifyPage";

import {
    getArcDexMarket,
    getCachedArcDexMarket,
  } from "./lib/arcDexMarket.js";

  import {
    getArcArgusTokenMetadata,
    getRecentArcArgusMetadata,
  } from "./lib/arcArgusMetadata.js";

  import {
    buyDexToken,
    sellDexToken,
    getDexTokenBalance,
    getDexUsdcBalance,
  } from "./contracts/dexTradeWriter.js";

import "./App.css";



function App() {

  const isGenesisVerifyPage =
    window.location.pathname ===
    "/verify-genesis";

  const [
    walletModalOpen,
    setWalletModalOpen,
  ] = useState(false);

  const [
    accountModalOpen,
    setAccountModalOpen,
  ] = useState(false);

  const [
    arcNetworkNeedsAdd,
    setArcNetworkNeedsAdd,
  ] = useState(false);

  const [
    copiedTokenAddress,
    setCopiedTokenAddress,
  ] = useState("");

  const [
    selectedLaunch,
    setSelectedLaunch,
  ] = useState(null);

  const [
    tradeModalOpen,
    setTradeModalOpen,
  ] = useState(false);

  const [
    tradeSide,
    setTradeSide,
  ] = useState("BUY");

  const [
    tradeAmount,
    setTradeAmount,
  ] = useState("");

  const [
    trading,
    setTrading,
  ] = useState(false);

  const [
    tradeError,
    setTradeError,
  ] = useState("");

  const [
    tradeStats,
    setTradeStats,
  ] = useState({
    buyCount: 0,
    sellCount: 0,
    total: 0,
  });

  const [
    tradeTokenBalance,
    setTradeTokenBalance,
  ] = useState({
    raw: 0n,
    formatted: "0",
  });

  const [
    tradeQuoteBalance,
    setTradeQuoteBalance,
  ] = useState({
    raw: 0n,
    formatted: "0",
  });

  const [
    tradeHistory,
    setTradeHistory,
  ] = useState([]);

  const [
    tradeHistoryLoading,
    setTradeHistoryLoading,
  ] = useState(false);

  const [
    chartInterval,
    setChartInterval,
  ] = useState("1m");


  const [
    tradeDataTab,
    setTradeDataTab,
  ] = useState("TRADES");

  const chartIntervalSeconds = {
    "1m": 60,
    "5m": 300,
    "1h": 3600,
    "4h": 14400,
    "D": 86400,
  };

  const [
    tokenHolders,
    setTokenHolders,
  ] = useState([]);

  const [
    holdersLoading,
    setHoldersLoading,
  ] = useState(false);

  const [
    statsTimeframe,
    setStatsTimeframe,
  ] = useState("24h");

  const STATS_TIMEFRAME_MS = {
    "5m": 5 * 60 * 1000,
    "1h": 60 * 60 * 1000,
    "24h": 24 * 60 * 60 * 1000,
  };

  const [
    genesisWhitelistCounts,
    setGenesisWhitelistCounts
  ] = useState({
    og: null,
    fcfs: null,
  });

  const [
    genesisCountOpen,
    setGenesisCountOpen
  ] = useState({
    og: false,
    fcfs: false,
  });

  const [
    tokenHolderCount,
    setTokenHolderCount,
  ] = useState(0);

  const [
    platformStats,
    setPlatformStats,
  ] = useState({
    totalVolume: 0,
    totalTokens: 0,
    totalTxns: 0,
  });

  const [
    topVolumeTokens,
    setTopVolumeTokens,
  ] = useState([]);

  const [
    hotIndex,
    setHotIndex,
  ] = useState(0);

  const hotToken =
  topVolumeTokens[
    hotIndex
  ] ?? null;

  const [
    tokenSearch,
    setTokenSearch,
  ] = useState("");

  const [
    marketFilter,
    setMarketFilter
  ] = useState("");

  const [dexTokens, setDexTokens] =
    useState([]);

  const [dexMarketLoading, setDexMarketLoading] =
    useState(false);

  const [dexMarketError, setDexMarketError] =
    useState(null);

  const [
    activePage,
    setActivePage,
  ] = useState("MARKET");

  const [
    mobileSidebarOpen,
    setMobileSidebarOpen
  ] = useState(false);


  const [genesisDropOpen, setGenesisDropOpen] = useState(false);

  const [
    genesisDropView,
    setGenesisDropView
  ] = useState("details");

  const SHOW_GENESIS_DROP =
    import.meta.env.VITE_ENABLE_GENESIS_DROP === "true";

  const [genesisState, setGenesisState] =
    useState(null);

  const [
      genesisWalletState,
      setGenesisWalletState,
    ] = useState({
      ogMinted: 0,
      fcfsMinted: 0,
      publicMinted: 0,
    });


  const [genesisLoading, setGenesisLoading] =
    useState(false);

  const [genesisError, setGenesisError] =
    useState("");

    const [
      genesisInitialLoading,
      setGenesisInitialLoading
    ] = useState(false);


  const [
    genesisNow,
    setGenesisNow
  ] =
    useState(
      Math.floor(Date.now() / 1000)
    );

  const [
    genesisMinting,
    setGenesisMinting,
  ] = useState(false);

  const [
    genesisMintQuantity,
    setGenesisMintQuantity,
  ] = useState(1);

  const [
    genesisToast,
    setGenesisToast,
  ] = useState(null);

  const [
    genesisOgQuantity,
    setGenesisOgQuantity,
  ] = useState(1);

  const [
    genesisFcfsQuantity,
    setGenesisFcfsQuantity,
  ] = useState(1);

  const [
    genesisPublicQuantity,
    setGenesisPublicQuantity,
  ] = useState(1);

  const [
    genesisEligibility,
    setGenesisEligibility
  ] =
    useState({
      og: false,
      fcfs: false,
    });

  const [
    genesisProofs,
    setGenesisProofs
  ] =
    useState({
      og: [],
      fcfs: [],
    });

  const [
    genesisEligibilityLoading,
    setGenesisEligibilityLoading
  ] =
    useState(false);

  const genesisOgRemaining =
    Math.max(
      0,
      1 -
        genesisWalletState.ogMinted
    );

  const genesisFcfsRemaining =
    Math.max(
      0,
      2 -
        genesisWalletState.fcfsMinted
    );

  const genesisPublicRemaining =
    Math.max(
      0,
      2 -
        genesisWalletState.publicMinted
    );

  const genesisOgWalletMaxed =
    genesisOgRemaining === 0;

  const genesisFcfsWalletMaxed =
    genesisFcfsRemaining === 0;

  const genesisPublicWalletMaxed =
    genesisPublicRemaining === 0;


  const {
    providers,
    selectedProvider,
    connected,
    connecting,
    address,
    chainId,
    isArcMainnet,
    switchToArcMainnet,
    addArcMainnet,
    walletError,
    connectProvider,
    disconnectWallet,
    clearWalletError,
  } = useWallet();

  const [
    liveLaunches,
    setLiveLaunches,
  ] = useState([]);

  const [
    launchesLoading,
    setLaunchesLoading,
  ] = useState(true);

  const [
    launchesError,
    setLaunchesError,
  ] = useState("");

  const refreshLaunches = async () => {
    try {
      setLaunchesError("");

      const cachedLaunches =
        readLaunchCache();


      /*
       * CACHE FIRST
       *
       * Show the previous market immediately
       * while the indexed database is queried.
       */
      if (
        liveLaunches.length === 0
      ) {
        if (
          cachedLaunches.length > 0
        ) {
          setLiveLaunches(
            cachedLaunches
          );

          setLaunchesLoading(false);
        } else {
          setLaunchesLoading(true);
        }
      }


      /*
       * ========================================================
       * PRIMARY MARKET SOURCE:
       * SUPABASE LAUNCH INDEX
       * ========================================================
       *
       * launch_tokens contains the verified
       * on-chain launch state required by MARKET.
       *
       * Browser startup must not scan every
       * launch from the public Arc RPC.
       */

      const orderedLaunches =
        await getLaunchMetadata();


      setLiveLaunches(
        orderedLaunches
      );


      saveLaunchCache(
        orderedLaunches
      );


      /*
       * Keep an open trade modal attached
       * to the newest indexed state.
       */
      setSelectedLaunch(
        (
          currentLaunch
        ) => {
          if (
            !currentLaunch
          ) {
            return null;
          }


          const updatedLaunch =
            orderedLaunches.find(
              (launch) =>
                launch.tokenAddress
                  .toLowerCase() ===
                currentLaunch
                  .tokenAddress
                  .toLowerCase()
            );


          return (
            updatedLaunch ||
            currentLaunch
          );
        }
      );


      return orderedLaunches;

    } catch (error) {
      console.error(
        "Failed to load SEIS market:",
        error
      );


      setLaunchesError(
        "Unable to load SEIS market."
      );


      throw error;

    } finally {
      setLaunchesLoading(
        false
      );
    }
  };

  const refreshSingleLaunch =
  async (
    currentLaunch
  ) => {
    if (
      !currentLaunch
    ) {
      return null;
    }

    const updatedLaunch =
      await refreshFairLaunch(
        currentLaunch.launchId,
        currentLaunch
      );

    /*
     * Preserve supplementary off-chain
     * metadata already attached to the
     * cached market item.
     */
    const enrichedLaunch = {
      ...currentLaunch,
      ...updatedLaunch,

      logoUrl:
        currentLaunch.logoUrl ||
        null,

      launchTransactionHash:
        currentLaunch
          .launchTransactionHash ||
        null,
    };


    /*
     * Update only the traded token.
     *
     * Do NOT reload the entire market.
     */
    setLiveLaunches(
      (currentLaunches) => {
        const nextLaunches =
          currentLaunches.map(
            (launch) =>
              String(
                launch.launchId
              ) ===
              String(
                enrichedLaunch.launchId
              )
                ? enrichedLaunch
                : launch
          );

        saveLaunchCache(
          nextLaunches
        );

        return nextLaunches;
      }
    );


    /*
     * Keep the open trade modal attached
     * to the refreshed on-chain state.
     */
    setSelectedLaunch(
      (selected) => {
        if (
          !selected ||
          String(
            selected.launchId
          ) !==
          String(
            enrichedLaunch.launchId
          )
        ) {
          return selected;
        }

        return enrichedLaunch;
      }
    );


    return enrichedLaunch;
  };

  const showGenesisToast = (
    message,
    type = "success"
  ) => {
    setGenesisToast({
      message,
      type,
    });

    setTimeout(() => {
      setGenesisToast(null);
    }, 3500);
  };

  const refreshTokenHolders =
  async (
    launch =
      selectedLaunch
  ) => {
    if (
      !launch?.tokenAddress ||
      launch?.launchId === null ||
      launch?.launchId === undefined
    ) {
      setTokenHolders([]);
      return [];
    }

    try {
      setHoldersLoading(true);

      const holders =
        await getTokenHolders({
          launchId:
            launch.launchId,

          tokenAddress:
            launch.tokenAddress,
        });

      const holderCount =
        await getTokenHolderCount({
          launchId:
            launch.launchId,

          tokenAddress:
            launch.tokenAddress,
      });

      setTokenHolders(
        holders
      );

      setTokenHolderCount(
        holderCount
      );

      return holders;

    } catch (error) {
      console.error(
        "Failed to load token holders:",
        error
      );

      return [];

    } finally {
      setHoldersLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedLaunch) {
      setTokenHolders([]);
      return;
    }

    refreshTokenHolders(
      selectedLaunch
    );
  }, [
    selectedLaunch?.launchId,
    selectedLaunch?.tokenAddress,
  ]);


  const formatTradeAddress = (
    value
  ) => {
    if (!value) {
      return "—";
    }

    return `${value.slice(
      0,
      6
    )}...${value.slice(-4)}`;
  };


  const formatTradeUsdc = (
    rawValue
  ) => {
    if (
      rawValue === null ||
      rawValue === undefined
    ) {
      return "—";
    }

    try {
      const raw =
        BigInt(rawValue);

      const whole =
        raw /
        10n ** 18n;

      const fraction =
        raw %
        10n ** 18n;

      const numeric =
        Number(whole) +
        Number(fraction) /
          1e18;

      return numeric.toLocaleString(
        undefined,
        {
          minimumFractionDigits: 2,
          maximumFractionDigits: 6,
        }
      );
    } catch {
      return "—";
    }
  };


  const formatTradeAge = (
    timestamp
  ) => {
    if (!timestamp) {
      return "—";
    }

    const seconds =
      Math.max(
        0,
        Math.floor(
          (
            Date.now() -
            Number(timestamp)
          ) /
            1000
        )
      );

    if (seconds < 60) {
      return `${seconds}s ago`;
    }

    const minutes =
      Math.floor(
        seconds / 60
      );

    if (minutes < 60) {
      return `${minutes}m ago`;
    }

    const hours =
      Math.floor(
        minutes / 60
      );

    if (hours < 24) {
      return `${hours}h ago`;
    }

    const days =
      Math.floor(
        hours / 24
      );

    return `${days}d ago`;
  };

  const refreshTradeStats =
  async (
    launchId,
    launchTransactionHash = null
  ) => {
    try {
      const stats =
      await getTradeStats(
        launchId
      );

      setTradeStats(
        stats
      );

      return stats;

    } catch (error) {
      console.error(
        "Failed to load trade stats:",
        error
      );

      return null;
    }
  };

  const refreshTradeHistory =
  async (launchId) => {
    if (
      launchId === null ||
      launchId === undefined
    ) {
      setTradeHistory([]);
      return [];
    }

    try {
      setTradeHistoryLoading(true);

      const history =
        await getTradeHistory(
          launchId
        );


      setTradeHistory(
        history
      );

      return history;

    } catch (error) {
      console.error(
        "Failed to load trade history:",
        error
      );

      return [];

    } finally {
      setTradeHistoryLoading(false);
    }
  };

const refreshTradeTokenBalance =
  async (
    launch =
      selectedLaunch
  ) => {
    if (
      !connected ||
      !address ||
      !launch?.tokenAddress ||
      !selectedProvider?.provider
    ) {
      setTradeTokenBalance({
        raw: 0n,
        formatted: "0",
      });

      return null;
    }

    try {
      let balance;

      if (
        launch?.source === "DEX"
      ) {
        /*
         * DEX token:
         * read real ERC-20 decimals.
         */
        balance =
          await getDexTokenBalance({
            eip1193Provider:
              selectedProvider.provider,

            tokenAddress:
              launch.tokenAddress,

            walletAddress:
              address,
          });

      } else {
        /*
         * Existing SEIS flow.
         * Keep unchanged.
         */
        balance =
          await getTradeTokenBalance({
            eip1193Provider:
              selectedProvider.provider,

            tokenAddress:
              launch.tokenAddress,

            walletAddress:
              address,
          });
      }

      setTradeTokenBalance(
        balance
      );

      return balance;

    } catch (error) {
      console.error(
        "Failed to load token balance:",
        error
      );

      return null;
    }
  };

  useEffect(() => {
    if (!selectedLaunch) {
      setTradeTokenBalance({
        raw: 0n,
        formatted: "0",
      });

      return;
    }

    refreshTradeTokenBalance(
      selectedLaunch
    );
  }, [
    selectedLaunch?.tokenAddress,
    address,
    connected,
  ]);

  useEffect(() => {
    if (
      selectedLaunch?.launchId ===
        undefined ||
      selectedLaunch?.launchId ===
        null
    ) {
      return;
    }

    refreshTradeStats(
      selectedLaunch.launchId,
      selectedLaunch.launchTransactionHash
    );
  }, [
    selectedLaunch?.launchId,
    selectedLaunch?.launchTransactionHash,
  ]);

  useEffect(() => {
    if (
      selectedLaunch?.launchId ===
        undefined ||
      selectedLaunch?.launchId ===
        null
    ) {
      setTradeHistory([]);
      return;
    }

    refreshTradeHistory(
      selectedLaunch.launchId
    );
  }, [
    selectedLaunch?.launchId,
  ]);

  useEffect(() => {
    refreshLaunches();
  }, []);

    const [launchOpen, setLaunchOpen] = useState(false);

    const [tokenName, setTokenName] = useState("");
    const [tokenSymbol, setTokenSymbol] = useState("");
    const [devBuyAmount, setDevBuyAmount] = useState("");

    const [
      tokenLogoFile,
      setTokenLogoFile,
    ] = useState(null);

    const [
      tokenLogoPreview,
      setTokenLogoPreview,
    ] = useState("");

    const [
      launching,
      setLaunching,
    ] = useState(false);

    const [
      launchError,
      setLaunchError,
    ] = useState("");

    const [
      launchSuccess,
      setLaunchSuccess,
    ] = useState(null);

    const [launchType, setLaunchType] =
    useState("fair");

    const buyPercent =
    tradeStats.total > 0
      ? (
          tradeStats.buyCount /
          tradeStats.total
        ) * 100
      : 50;

  const sellPercent =
    tradeStats.total > 0
      ? (
          tradeStats.sellCount /
          tradeStats.total
        ) * 100
      : 50;


    useEffect(() => {
      if (
        topVolumeTokens.length <= 1
      ) {
        return;
      }

      const timer =
        setInterval(() => {
          setHotIndex(
            (current) =>
              (
                current + 1
              ) %
              topVolumeTokens.length
          );
        }, 2000);


      return () => {
        clearInterval(timer);
      };

    }, [
      topVolumeTokens.length,
    ]);



  const showPreviousHotToken = () => {
    if (
      topVolumeTokens.length === 0
    ) {
      return;
    }

    setHotIndex(
      (current) =>
        (
          current -
          1 +
          topVolumeTokens.length
        ) %
        topVolumeTokens.length
    );
  };


  const showNextHotToken = () => {
    if (
      topVolumeTokens.length === 0
    ) {
      return;
    }

    setHotIndex(
      (current) =>
        (
          current +
          1
        ) %
        topVolumeTokens.length
    );
  };

  useEffect(() => {
    if (
      !launchOpen &&
      !walletModalOpen &&
      !accountModalOpen
    ) {
      return;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    return () => {
      document.body.style.overflow =
        previousOverflow;
    };
  }, [
    launchOpen,
    walletModalOpen,
    accountModalOpen,
  ]);

  const handleTokenLogoChange = (event) => {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    const allowedTypes = [
      "image/png",
      "image/jpeg",
      "image/webp",
      "image/gif",
    ];

    if (
      !allowedTypes.includes(file.type)
    ) {
      setLaunchError(
        "Logo must be PNG, JPG, WEBP, or GIF."
      );
      return;
    }

    if (
      file.size >
      2 * 1024 * 1024
    ) {
      setLaunchError(
        "Logo must be 2 MB or smaller."
      );
      return;
    }

    setLaunchError("");

    if (tokenLogoPreview) {
      URL.revokeObjectURL(
        tokenLogoPreview
      );
    }

    setTokenLogoFile(file);

    setTokenLogoPreview(
      URL.createObjectURL(file)
    );
  };


  const handleLaunchToken = async () => {
    if (launching) {
      return;
    }

    setLaunchError("");
    setLaunchSuccess(null);

    if (!connected) {
      setLaunchError(
        "Connect your wallet before launching."
      );
      return;
    }

    if (!isArcMainnet) {
      setLaunchError(
        "Switch to ARC Mainnet before launching."
      );
      return;
    }

    if (!selectedProvider?.provider) {
      setLaunchError(
        "Wallet provider unavailable."
      );
      return;
    }

    try {
      setLaunching(true);

      /*
       * --------------------------------------------------
       * 1. LAUNCH ON-CHAIN
       * --------------------------------------------------
       */

      const result =
        await launchFairToken({
          eip1193Provider:
            selectedProvider.provider,

          expectedAddress:
            address,

          name:
            tokenName,

          symbol:
            tokenSymbol,

          devBuyAmount:
            devBuyAmount,
        });

      setLaunchSuccess(result);

      /*
      * --------------------------------------------------
      * 2. SAVE OFF-CHAIN METADATA
      * --------------------------------------------------
      *
      * On-chain launch has already succeeded.
      * Metadata failure must never turn into
      * "launch transaction failed".
      */

      try {
        if (
          result.launchId === null ||
          result.launchId === undefined
        ) {
          throw new Error(
            "Launch ID unavailable after confirmation."
          );
        }

        if (!result.tokenAddress) {
          throw new Error(
            "Token address unavailable after confirmation."
          );
        }

        if (!result.transactionHash) {
          throw new Error(
            "Transaction hash unavailable after confirmation."
          );
        }

        await saveLaunchMetadata({
          launchId:
            result.launchId,

          tokenAddress:
            result.tokenAddress,

          creatorAddress:
            result.creator,

          tokenName:
            result.name,

          tokenSymbol:
            result.symbol,

          transactionHash:
            result.transactionHash,

          logoFile:
            tokenLogoFile,
        });
      } catch (metadataError) {
        console.error(
          "Launch metadata save failed:",
          metadataError
        );
      }

      /*
       * --------------------------------------------------
       * 3. RESET FORM
       * --------------------------------------------------
       */

      setTokenName("");
      setTokenSymbol("");
      setDevBuyAmount("");

      if (tokenLogoPreview) {
        URL.revokeObjectURL(
          tokenLogoPreview
        );
      }

      setTokenLogoFile(null);
      setTokenLogoPreview("");

      /*
       * --------------------------------------------------
       * 4. REFRESH MARKET
       * --------------------------------------------------
       */

      setTimeout(() => {
        window.location.reload();
      }, 1000);

    } catch (error) {
      console.error(
        "Token launch failed:",
        error
      );

      if (error?.code === 4001) {
        setLaunchError(
          "Transaction was rejected."
        );
      } else {
        setLaunchError(
          error?.shortMessage ||
          error?.reason ||
          error?.message ||
          "Unable to launch token."
        );
      }
    } finally {
      setLaunching(false);
    }
  };

  const handleTrade = async () => {
    if (
      trading ||
      !selectedLaunch
    ) {
      return;
    }
  
    setTradeError("");
  
    if (!connected) {
      setTradeError(
        "Connect your wallet before trading."
      );
      return;
    }
  
    if (!isArcMainnet) {
      setTradeError(
        "Switch to ARC Mainnet before trading."
      );
      return;
    }
  
    if (!selectedProvider?.provider) {
      setTradeError(
        "Wallet provider unavailable."
      );
      return;
    }
  
    if (
      !tradeAmount ||
      Number(tradeAmount) <= 0
    ) {
      setTradeError(
        "Enter an amount."
      );
      return;
    }
  
    try {
      setTrading(true);
  
      /*
       * ==================================================
       * DEX
       * ==================================================
       */
      if (
        selectedLaunch?.source === "DEX"
      ) {
        let tradeResult;
  
        if (
          tradeSide === "BUY"
        ) {
          tradeResult =
            await buyDexToken({
              eip1193Provider:
                selectedProvider.provider,
  
              walletAddress:
                address,
  
              tokenAddress:
                selectedLaunch.tokenAddress,
  
              amount:
                tradeAmount,
            });
  
        } else {
          tradeResult =
            await sellDexToken({
              eip1193Provider:
                selectedProvider.provider,
  
              walletAddress:
                address,
  
              tokenAddress:
                selectedLaunch.tokenAddress,
  
              amount:
                tradeAmount,
            });
        }
  
        /*
         * buyDexToken / sellDexToken
         * only return after the transaction
         * receipt has been received.
         */
        if (
          !tradeResult?.transactionHash
        ) {
          throw new Error(
            "DEX transaction was not confirmed."
          );
        }
  
        /*
         * Unlock immediately after the
         * confirmed DEX transaction.
         */
        setTrading(false);
  
        /*
         * DEX has no SEIS launchId and must
         * never enter the SEIS refresh path.
         *
         * Refresh only balances that are
         * authoritative immediately after
         * the transaction.
         */
        await Promise.allSettled([
          refreshTradeTokenBalance(
            selectedLaunch
          ),
  
          refreshTradeQuoteBalance(
            selectedLaunch
          ),
        ]);
  
        return;
      }
  
      /*
       * ==================================================
       * SEIS
       * ==================================================
       *
       * Existing flow remains unchanged.
       */
      let tradeResult;
  
      if (
        tradeSide === "BUY"
      ) {
        tradeResult =
          await buyFairToken({
            eip1193Provider:
              selectedProvider.provider,
  
            expectedAddress:
              address,
  
            launchId:
              selectedLaunch.launchId,
  
            amount:
              tradeAmount,
          });
  
      } else {
        tradeResult =
          await sellFairToken({
            eip1193Provider:
              selectedProvider.provider,
  
            expectedAddress:
              address,
  
            launchId:
              selectedLaunch.launchId,
  
            tokenAddress:
              selectedLaunch.tokenAddress,
  
            amount:
              tradeAmount,
          });
      }
  
      /*
       * Existing SEIS indexing.
       *
       * Indexing failure must not turn
       * a confirmed transaction into a
       * failed trade.
       */
      try {
        await saveTradeEvent({
          transactionHash:
            tradeResult.transactionHash,
  
          launchId:
            selectedLaunch.launchId,
  
          tokenAddress:
            selectedLaunch.tokenAddress,
  
          traderAddress:
            address,
        });
  
      } catch (tradeEventError) {
        console.error(
          "Trade event save failed:",
          tradeEventError
        );
      }
  
      /*
       * Existing SEIS behavior.
       */
      setTrading(false);
  
      await Promise.allSettled([
        refreshSingleLaunch(
          selectedLaunch
        ),
  
        refreshTradeStats(
          selectedLaunch.launchId
        ),
  
        refreshTradeTokenBalance(
          selectedLaunch
        ),
  
        refreshTradeQuoteBalance(
          selectedLaunch
        ),
  
        refreshTradeHistory(
          selectedLaunch.launchId
        ),
  
        refreshTokenHolders(
          selectedLaunch
        ),
  
        refreshPlatformStats(),
  
        refreshTopVolumeTokens(),
      ]);
  
    } catch (error) {
      console.error(
        `${tradeSide} failed:`,
        error
      );
  
      if (
        error?.code === 4001 ||
        error?.code ===
          "ACTION_REJECTED"
      ) {
        setTradeError(
          "Transaction was rejected."
        );
  
      } else {
        setTradeError(
          error?.shortMessage ||
          error?.reason ||
          error?.message ||
          `Unable to ${tradeSide.toLowerCase()} token.`
        );
      }
  
    } finally {
      setTrading(false);
    }
  };

  const handleTradeSideChange = (
    nextSide
  ) => {
    if (nextSide === tradeSide) {
      return;
    }

    setTradeSide(
      nextSide
    );

    /*
     * BUY amount is USDC.
     * SELL amount is token units.
     *
     * Only clear when actually
     * changing sides.
     */
    setTradeAmount("");
    setTradeError("");
  };



  const chartWidth = 1000;
const chartHeight = 420;
const chartPadding = 32;

const chartValues =
  tradeHistory
    .map((item) => ({
      x: item.timestamp,
      y: item.marketCap,
      price: item.price,
      side: item.side,
      transactionHash:
        item.transaction_hash,
    }))
    .filter(
      (item) =>
        Number.isFinite(item.x) &&
        Number.isFinite(item.y)
    );

const chartMinX =
  chartValues.length > 0
    ? Math.min(
        ...chartValues.map(
          (item) => item.x
        )
      )
    : 0;

const chartMaxX =
  chartValues.length > 0
    ? Math.max(
        ...chartValues.map(
          (item) => item.x
        )
      )
    : 1;

const chartMinY =
  chartValues.length > 0
    ? Math.min(
        ...chartValues.map(
          (item) => item.y
        )
      )
    : 0;

const chartMaxY =
  chartValues.length > 0
    ? Math.max(
        ...chartValues.map(
          (item) => item.y
        )
      )
    : 1;

const chartXRange =
  Math.max(
    chartMaxX - chartMinX,
    1
  );

const chartYRange =
  Math.max(
    chartMaxY - chartMinY,
    1
  );

const chartPoints =
  chartValues.map(
    (item, index) => {
      /*
       * With only one trade,
       * keep the point centered.
       */
      const x =
        chartValues.length === 1
          ? chartWidth / 2
          : chartPadding +
            (
              (
                item.x -
                chartMinX
              ) /
              chartXRange
            ) *
              (
                chartWidth -
                chartPadding * 2
              );

      const y =
        chartValues.length === 1
          ? chartHeight / 2
          : chartHeight -
            chartPadding -
            (
              (
                item.y -
                chartMinY
              ) /
              chartYRange
            ) *
              (
                chartHeight -
                chartPadding * 2
              );

      return {
        ...item,
        index,
        svgX: x,
        svgY: y,
      };
    }
  );

const chartPolyline =
  chartPoints
    .map(
      (point) =>
        `${point.svgX},${point.svgY}`
    )
    .join(" ");

    const formatChartMarketCap = (
      value
    ) => {
      if (!Number.isFinite(value)) {
        return "$0";
      }

      if (value >= 1_000_000_000) {
        return `$${(
          value /
          1_000_000_000
        ).toFixed(2)}B`;
      }

      if (value >= 1_000_000) {
        return `$${(
          value /
          1_000_000
        ).toFixed(2)}M`;
      }

      if (value >= 1_000) {
        return `$${(
          value /
          1_000
        ).toFixed(2)}K`;
      }

      return `$${value.toFixed(2)}`;
    };


    const formatChartTime = (
      timestamp
    ) => {
      if (!timestamp) {
        return "—";
      }

      return new Date(
        timestamp
      ).toLocaleTimeString(
        [],
        {
          hour: "2-digit",
          minute: "2-digit",
        }
      );
    };


    const chartYTicks =
      Array.from(
        {
          length: 5,
        },
        (_, index) => {
          const ratio =
            index / 4;

          const value =
            chartMaxY -
            chartYRange *
              ratio;

          return {
            value,

            top:
              ratio * 100,
          };
        }
      );


    const chartXTicks =
      chartValues.length > 0
        ? Array.from(
            {
              length:
                chartValues.length === 1
                  ? 1
                  : 5,
            },
            (_, index) => {
              if (
                chartValues.length ===
                1
              ) {
                return {
                  timestamp:
                    chartValues[0].x,

                  left:
                    50,
                };
              }

              const ratio =
                index / 4;

              return {
                timestamp:
                  chartMinX +
                  chartXRange *
                    ratio,

                left:
                  ratio * 100,
              };
            }
          )
        : [];


        const statsWindowMs =
        STATS_TIMEFRAME_MS[
          statsTimeframe
        ];

      const statsCutoff =
        Date.now() -
        statsWindowMs;


      const statsTrades =
        tradeHistory
          .filter(
            (trade) =>
              Number.isFinite(
                Number(
                  trade.timestamp
                )
              ) &&
              Number(
                trade.timestamp
              ) >= statsCutoff
          )
          .sort(
            (a, b) =>
              Number(
                a.timestamp
              ) -
              Number(
                b.timestamp
              )
          );

          const statsVolumeRaw =
          statsTrades.reduce(
            (total, trade) => {
              try {
                return (
                  total +
                  BigInt(
                    trade.quote_amount ??
                    "0"
                  )
                );
              } catch {
                return total;
              }
            },
            0n
          );


        const formatRawUsdc =
          (raw) => {
            const base =
              10n ** 18n;

            const whole =
              raw / base;

            const fraction =
              raw % base;

            const value =
              Number(whole) +
              Number(fraction) /
                1e18;

            return value;
          };


        const statsVolume =
          formatRawUsdc(
            statsVolumeRaw
          );


          let statsPriceChange =
          null;


        if (
          statsTrades.length >= 2
        ) {
          const firstPrice =
            Number(
              statsTrades[0]
                .price
            );

          const lastPrice =
            Number(
              statsTrades[
                statsTrades.length -
                1
              ].price
            );


          if (
            Number.isFinite(
              firstPrice
            ) &&
            Number.isFinite(
              lastPrice
            ) &&
            firstPrice > 0
          ) {
            statsPriceChange =
              (
                (
                  lastPrice -
                  firstPrice
                ) /
                firstPrice
              ) *
              100;
          }
        } else if (
          statsTrades.length === 1
        ) {
          statsPriceChange =
            0;
        }

        const formattedStatsVolume =
        statsVolume.toLocaleString(
          undefined,
          {
            minimumFractionDigits:
              2,

            maximumFractionDigits:
              4,
          }
        );


      const formattedPriceChange =
        statsPriceChange === null
          ? "—"
          : `${statsPriceChange >= 0
              ? "+"
              : ""
            }${statsPriceChange.toFixed(
              2
            )}%`;

 const refreshPlatformStats =
  async () => {
    try {
      const stats =
        await getPlatformStats();

      setPlatformStats(
        stats
      );

      return stats;

    } catch (error) {
      console.error(
        "Failed to load platform stats:",
        error
      );

      return null;
    }
  };

  useEffect(() => {
    refreshPlatformStats();
  }, []);


  const refreshTopVolumeTokens =
  async () => {
    try {
      const rankings =
        await getTopVolumeTokens();

      /*
       * Volume map:
       * token address -> indexed trade volume
       */
      const volumeMap =
        new Map(
          rankings.map(
            (ranking) => [
              ranking.tokenAddress
                .toLowerCase(),

              ranking.volumeRaw,
            ]
          )
        );


      /*
       * Start from ALL real tokens listed
       * on ARCTERMINAL.
       *
       * Tokens without trades receive
       * volume = 0.
       */
      const rankedTokens =
        liveLaunches
          .map((launch) => {
            const tokenAddress =
              launch.tokenAddress
                .toLowerCase();

            const volumeRaw =
              volumeMap.get(
                tokenAddress
              ) ?? 0n;


            const {
              price,
              marketCap,
            } =
              getLaunchMarketData(
                launch
              );


            return {
              ...launch,

              volumeRaw,

              price,

              marketCap,
            };
          })

          /*
           * Highest volume first.
           */
          .sort((a, b) => {
            if (
              a.volumeRaw ===
              b.volumeRaw
            ) {
              return 0;
            }

            return (
              a.volumeRaw >
              b.volumeRaw
            )
              ? -1
              : 1;
          })

          /*
           * Exactly Top 3 maximum.
           */
          .slice(0, 3)

          /*
           * Rank after sorting.
           */
          .map(
            (
              launch,
              index
            ) => ({
              ...launch,

              rank:
                index + 1,
            })
          );


      setTopVolumeTokens(
        rankedTokens
      );


      /*
       * Protect index if list
       * becomes shorter after refresh.
       */
      setHotIndex(
        (current) =>
          rankedTokens.length === 0
            ? 0
            : current %
              rankedTokens.length
      );


      return rankedTokens;

    } catch (error) {
      console.error(
        "Failed to load top volume tokens:",
        error
      );

      return [];
    }
  };

  useEffect(() => {
    if (
      liveLaunches.length === 0
    ) {
      setTopVolumeTokens([]);
      return;
    }

    refreshTopVolumeTokens();
  }, [liveLaunches]);

  const formatRawVolume = (
    raw
  ) => {
    if (!raw) {
      return 0;
    }

    const base =
      10n ** 18n;

    const whole =
      raw / base;

    const fraction =
      raw % base;

    return (
      Number(whole) +
      Number(fraction) /
        1e18
    );
  };


  const getLaunchMarketData = (launch) => {
    const sold =
      Number(
        launch.formatted.tokensSold
      );

    const reserve =
      Number(
        launch.formatted.quoteReserve
      );

    const totalSupply =
      Number(
        launch.formatted.totalSupply
      );

    const currentVirtualTokenReserve =
      1_200_000_000 - sold;

    const currentVirtualQuoteReserve =
      12_000 + reserve;

    const price =
      currentVirtualQuoteReserve /
      currentVirtualTokenReserve;

    const marketCap =
      price * totalSupply;

    return {
      price,
      marketCap,
    };
  };


  const tickerTokens = useMemo(() => {
    const seisTokens =
      liveLaunches
        .filter(
          (launch) =>
            launch.tokenAddress &&
            launch.symbol &&
            launch.logoUrl
        )
        .map((launch) => ({
          source: "SEIS",
  
          tokenAddress:
            launch.tokenAddress,
  
          symbol:
            launch.symbol,
  
          logoUrl:
            launch.logoUrl,
  
          logoCandidates: [
            launch.logoUrl,
          ],
        }));
  
  
    const dexLogoTokens =
      dexTokens
        .filter(
          (token) =>
            token.tokenAddress &&
            token.symbol &&
            (
              token.logoUrl ||
              (
                Array.isArray(
                  token.logoCandidates
                ) &&
                token.logoCandidates.length > 0
              )
            )
        )
        .map((token) => ({
          source: "DEX",
  
          tokenAddress:
            token.tokenAddress,
  
          symbol:
            token.symbol,
  
          logoUrl:
            token.logoUrl,
  
          logoCandidates:
            token.logoCandidates,
        }));
  
  
    const combined = [
      ...dexLogoTokens,
      ...seisTokens,
    ];
  
  
    // Fisher-Yates shuffle
    for (
      let i = combined.length - 1;
      i > 0;
      i--
    ) {
      const j =
        Math.floor(
          Math.random() * (i + 1)
        );
  
      [
        combined[i],
        combined[j],
      ] = [
        combined[j],
        combined[i],
      ];
    }
  
  
    return combined;
  }, [
    liveLaunches,
    dexTokens,
  ]);


  const refreshTradeQuoteBalance =
  async (
    launch =
      selectedLaunch
  ) => {
    if (
      !connected ||
      !address ||
      !selectedProvider?.provider
    ) {
      setTradeQuoteBalance({
        raw: 0n,
        formatted: "0",
      });

      return null;
    }

    try {
      let balance;

      if (
        launch?.source === "DEX"
      ) {
        /*
         * DEX BUY balance:
         * real ERC-20 Arc USDC.
         */
        balance =
          await getDexUsdcBalance({
            eip1193Provider:
              selectedProvider.provider,

            walletAddress:
              address,
          });

      } else {
        /*
         * Existing SEIS quote/native
         * balance. Keep unchanged.
         */
        balance =
          await getTradeQuoteBalance({
            eip1193Provider:
              selectedProvider.provider,

            walletAddress:
              address,
          });
      }

      setTradeQuoteBalance(
        balance
      );

      return balance;

    } catch (error) {
      console.error(
        "Failed to load USDC balance:",
        error
      );

      return null;
    }
  };

  useEffect(() => {
    if (
      !connected ||
      !address
    ) {
      setTradeQuoteBalance({
        raw: 0n,
        formatted: "0",
      });
  
      return;
    }
  
    refreshTradeQuoteBalance(
      selectedLaunch
    );
  
  }, [
    address,
    connected,
    selectedProvider?.provider,
    selectedLaunch?.source,
  ]);

    const handleSellPercent = (
      percent
    ) => {
      const balance =
        Number(
          tradeTokenBalance.formatted
        );

      if (
        !Number.isFinite(balance) ||
        balance <= 0
      ) {
        return;
      }

      const amount =
        balance *
        (percent / 100);

      setTradeAmount(
        amount.toString()
      );

      setTradeError("");
    };


    const LAUNCH_CACHE_KEY =
  "arc_terminal_fair_launches_v1";

function saveLaunchCache(
  launches
) {
  try {
    localStorage.setItem(
      LAUNCH_CACHE_KEY,
      JSON.stringify(
        launches,
        (_, value) =>
          typeof value === "bigint"
            ? {
                __arcBigInt:
                  value.toString(),
              }
            : value
      )
    );
  } catch (error) {
    console.warn(
      "Unable to save launch cache:",
      error
    );
  }
}

function readLaunchCache() {
  try {
    const raw =
      localStorage.getItem(
        LAUNCH_CACHE_KEY
      );

    if (!raw) {
      return [];
    }

    const parsed =
      JSON.parse(
        raw,
        (_, value) => {
          if (
            value &&
            typeof value === "object" &&
            "__arcBigInt" in value
          ) {
            return BigInt(
              value.__arcBigInt
            );
          }

          return value;
        }
      );

    return Array.isArray(parsed)
      ? parsed
      : [];
  } catch (error) {
    console.warn(
      "Unable to read launch cache:",
      error
    );

    return [];
  }
}

const handleGenesisTeamMint =
  async () => {
    if (genesisMinting) {
      return;
    }

    if (!connected || !address) {
      console.warn(
        "[GENESIS MINT] Wallet not connected"
      );

      return;
    }

    if (
      !selectedProvider?.provider
    ) {
      console.warn(
        "[GENESIS MINT] Selected wallet provider unavailable"
      );

      return;
    }

    if (!genesisTeamLive) {
      console.warn(
        "[GENESIS MINT] Team mint is not live"
      );

      return;
    }

    if (!genesisTeamEligible) {
      console.warn(
        "[GENESIS MINT] Wallet is not Team owner"
      );

      return;
    }

    try {
      setGenesisMinting(true);

      setGenesisToast({
        status: "pending",
        quantity: genesisMintQuantity,
        txHash: null,
      });


      const result =
      await mintGenesisTeam({
        eip1193Provider:
          selectedProvider.provider,

        expectedAddress:
          address,

        to:
          address,

        quantity:
          genesisMintQuantity,
      });

      setGenesisState(
        (prev) => {
          if (!prev) {
            return prev;
          }

          return {
            ...prev,

            totalSupply:
              prev.totalSupply +
              genesisMintQuantity,

            remainingSupply:
              prev.remainingSupply -
              genesisMintQuantity,
          };
        }
      );

      const state =
        await getGenesisState();

      setGenesisState(state);

      setGenesisToast({
        status: "success",
        quantity: genesisMintQuantity,
        txHash: result.txHash,
      });


    } catch (error) {
      console.error(
        "[GENESIS MINT ERROR]",
        error
      );

      setGenesisToast({
        status: "error",
        quantity: genesisMintQuantity,
        txHash: null,
        message:
          error?.shortMessage ||
          error?.message ||
          "Mint failed.",
      });

    } finally {
      setGenesisMinting(false);
    }
};

const handleGenesisOgMint =
  async () => {
    if (genesisMinting) {
      return;
    }

    if (!connected || !address) {
      console.warn(
        "[GENESIS OG MINT] Wallet not connected"
      );

      return;
    }

    if (
      !selectedProvider?.provider
    ) {
      console.warn(
        "[GENESIS OG MINT] Selected wallet provider unavailable"
      );

      return;
    }

    if (!genesisOgLive) {
      console.warn(
        "[GENESIS OG MINT] OG mint is not live"
      );

      return;
    }

    if (!genesisOgEligible) {
      console.warn(
        "[GENESIS OG MINT] Wallet is not eligible"
      );

      return;
    }

    if (!genesisState) {
      console.warn(
        "[GENESIS OG MINT] Genesis state unavailable"
      );

      return;
    }

    if (
      !Array.isArray(
        genesisProofs.og
      )
    ) {
      console.warn(
        "[GENESIS OG MINT] OG proof unavailable"
      );

      return;
    }

    try {
      setGenesisMinting(true);

      setGenesisToast({
        status: "pending",
        quantity:
          genesisOgQuantity,
        txHash: null,
      });


      const result =
        await mintGenesisOG({
          eip1193Provider:
            selectedProvider.provider,

          expectedAddress:
            address,

          quantity:
            genesisOgQuantity,

          proof:
            genesisProofs.og,

          price:
            genesisState.ogPriceRaw,
        });

      /*
       * Optimistic supply update.
       */
      setGenesisState(
        (prev) => {
          if (!prev) {
            return prev;
          }

          return {
            ...prev,

            totalSupply:
              prev.totalSupply +
              genesisOgQuantity,

            remainingSupply:
              prev.remainingSupply -
              genesisOgQuantity,
          };
        }
      );

      /*
       * Re-read authoritative
       * contract state.
       */
      const state =
        await getGenesisState();

      setGenesisState(
        state
      );

      setGenesisToast({
        status: "success",
        quantity:
          genesisOgQuantity,
        txHash:
          result.txHash,
      });


    } catch (error) {
      console.error(
        "[GENESIS OG MINT ERROR]",
        error
      );

      setGenesisToast({
        status: "error",
        quantity:
          genesisOgQuantity,
        txHash: null,
        message:
          error?.shortMessage ||
          error?.message ||
          "OG mint failed.",
      });

    } finally {
      setGenesisMinting(false);
    }
};


const handleGenesisFcfsMint =
  async () => {
    if (genesisMinting) {
      return;
    }

    if (!connected || !address) {
      console.warn(
        "[GENESIS FCFS MINT] Wallet not connected"
      );

      return;
    }

    if (
      !selectedProvider?.provider
    ) {
      console.warn(
        "[GENESIS FCFS MINT] Selected wallet provider unavailable"
      );

      return;
    }

    if (!genesisFcfsLive) {
      console.warn(
        "[GENESIS FCFS MINT] FCFS mint is not live"
      );

      return;
    }

    if (!genesisFcfsEligible) {
      console.warn(
        "[GENESIS FCFS MINT] Wallet is not eligible"
      );

      return;
    }

    if (!genesisState) {
      console.warn(
        "[GENESIS FCFS MINT] Genesis state unavailable"
      );

      return;
    }

    if (
      !Array.isArray(
        genesisProofs.fcfs
      )
    ) {
      console.warn(
        "[GENESIS FCFS MINT] FCFS proof unavailable"
      );

      return;
    }

    try {
      setGenesisMinting(true);

      setGenesisToast({
        status: "pending",
        quantity:
          genesisFcfsQuantity,
        txHash: null,
      });


      const result =
        await mintGenesisFCFS({
          eip1193Provider:
            selectedProvider.provider,

          expectedAddress:
            address,

          quantity:
            genesisFcfsQuantity,

          proof:
            genesisProofs.fcfs,

          price:
            genesisState.fcfsPriceRaw,
        });

      /*
       * Optimistic supply update.
       */
      setGenesisState(
        (prev) => {
          if (!prev) {
            return prev;
          }

          return {
            ...prev,

            totalSupply:
              prev.totalSupply +
              genesisFcfsQuantity,

            remainingSupply:
              prev.remainingSupply -
              genesisFcfsQuantity,
          };
        }
      );

      /*
       * Re-read authoritative
       * on-chain state.
       */
      const state =
        await getGenesisState();

      setGenesisState(
        state
      );

      setGenesisToast({
        status: "success",
        quantity:
          genesisFcfsQuantity,
        txHash:
          result.txHash,
      });


    } catch (error) {
      console.error(
        "[GENESIS FCFS MINT ERROR]",
        error
      );

      setGenesisToast({
        status: "error",
        quantity:
          genesisFcfsQuantity,
        txHash: null,
        message:
          error?.shortMessage ||
          error?.message ||
          "FCFS mint failed.",
      });

    } finally {
      setGenesisMinting(false);
    }
};

const handleGenesisPublicMint =
  async () => {
    if (genesisMinting) {
      return;
    }

    if (!connected || !address) {
      console.warn(
        "[GENESIS PUBLIC MINT] Wallet not connected"
      );

      return;
    }

    if (
      !selectedProvider?.provider
    ) {
      console.warn(
        "[GENESIS PUBLIC MINT] Selected wallet provider unavailable"
      );

      return;
    }

    if (!genesisPublicLive) {
      console.warn(
        "[GENESIS PUBLIC MINT] Public mint is not live"
      );

      return;
    }

    if (!genesisState) {
      console.warn(
        "[GENESIS PUBLIC MINT] Genesis state unavailable"
      );

      return;
    }

    try {
      setGenesisMinting(true);

      setGenesisToast({
        status: "pending",
        quantity:
          genesisPublicQuantity,
        txHash: null,
      });


      const result =
        await mintGenesisPublic({
          eip1193Provider:
            selectedProvider.provider,

          expectedAddress:
            address,

          quantity:
            genesisPublicQuantity,

          price:
            genesisState.publicPriceRaw,
        });

      /*
       * Optimistic supply update.
       */
      setGenesisState(
        (prev) => {
          if (!prev) {
            return prev;
          }

          return {
            ...prev,

            totalSupply:
              prev.totalSupply +
              genesisPublicQuantity,

            remainingSupply:
              prev.remainingSupply -
              genesisPublicQuantity,
          };
        }
      );

      /*
       * Re-read authoritative
       * on-chain state.
       */
      const state =
        await getGenesisState();

      setGenesisState(
        state
      );

      setGenesisToast({
        status: "success",
        quantity:
          genesisPublicQuantity,
        txHash:
          result.txHash,
      });


    } catch (error) {
      console.error(
        "[GENESIS PUBLIC MINT ERROR]",
        error
      );

      setGenesisToast({
        status: "error",
        quantity:
          genesisPublicQuantity,
        txHash: null,
        message:
          error?.shortMessage ||
          error?.message ||
          "Public mint failed.",
      });

    } finally {
      setGenesisMinting(false);
    }
};


useEffect(() => {
  if (!genesisDropOpen) {
    return;
  }

  let cancelled = false;

  const cacheKey =
    `genesis-state:${GENESIS_CONTRACT_ADDRESS.toLowerCase()}`;

  /*
   * ---------------------------------------------------------
   * 1. RESTORE CACHE IMMEDIATELY
   * ---------------------------------------------------------
   */

  let hasCachedState = false;

  try {
    const cachedRaw =
      localStorage.getItem(
        cacheKey
      );

    if (cachedRaw) {
      const cached =
        JSON.parse(
          cachedRaw
        );

      if (
        cached?.state &&
        !cancelled
      ) {
        hasCachedState = true;


        setGenesisState(
          cached.state
        );
      }
    }
  } catch (error) {
    console.warn(
      "[GENESIS CACHE READ ERROR]",
      error
    );
  }

  setGenesisInitialLoading(
    !hasCachedState
  );


  /*
   * ---------------------------------------------------------
   * 2. REFRESH FROM BLOCKCHAIN IN BACKGROUND
   * ---------------------------------------------------------
   */

  async function loadGenesisState() {
    try {
      setGenesisLoading(true);
      setGenesisError("");

      const state =
        await getGenesisState();

      if (cancelled) {
        return;
      }

      setGenesisState(
        state
      );


      /*
       * BigInt cannot be JSON.stringify'd.
       *
       * Raw price fields are BigInt,
       * so convert them to strings only
       * inside the cached copy.
       */

      const cacheState = {
        ...state,

        ogPriceRaw:
          state.ogPriceRaw?.toString(),

        fcfsPriceRaw:
          state.fcfsPriceRaw?.toString(),

        publicPriceRaw:
          state.publicPriceRaw?.toString(),
      };

      localStorage.setItem(
        cacheKey,
        JSON.stringify({
          savedAt:
            Date.now(),

          state:
            cacheState,
        })
      );

    } catch (error) {
      console.error(
        "[GENESIS STATE ERROR]",
        error
      );

      if (!cancelled) {
        setGenesisError(
          "FAILED TO REFRESH GENESIS DATA_"
        );
      }
    } finally {
      if (!cancelled) {
        setGenesisLoading(false);
        setGenesisInitialLoading(false);
      }
    }
  }

  loadGenesisState();

  return () => {
    cancelled = true;
  };
}, [genesisDropOpen]);


  const genesisTeamEligible =
    !!address &&
    !!genesisState?.owner &&
    address.toLowerCase() ===
    genesisState.owner.toLowerCase();

  const genesisOgEligible =
    !!address &&
    genesisEligibility.og === true;

  const genesisFcfsEligible =
    !!address &&
    genesisEligibility.fcfs === true;

  const genesisTeamLive =
    !!genesisState &&
    genesisNow >=
    genesisState.teamStart &&
    genesisNow <
    genesisState.teamEnd;

  const genesisOgLive =
    !!genesisState &&
    genesisNow >= genesisState.ogStart &&
    genesisNow < genesisState.ogEnd;

  const genesisFcfsLive =
    !!genesisState &&
    genesisNow >= genesisState.fcfsStart &&
    genesisNow < genesisState.fcfsEnd;

  const genesisPublicLive =
    !!genesisState &&
    genesisNow >= genesisState.publicStart &&
    genesisNow < genesisState.publicEnd;


  const genesisFcfsInitialAllocationExhausted =
    !!genesisState &&
    genesisState.fcfsMintedSupply >=
      genesisState.fcfsInitialSupply;

  const genesisFcfsRolloverPending =
    genesisFcfsLive &&
    genesisNow < genesisState.ogEnd &&
    genesisFcfsInitialAllocationExhausted;


  const genesisNextTarget =
    genesisState &&
    genesisNow < genesisState.teamStart
      ? genesisState.teamStart
      : 0;

  const genesisCountdownSeconds =
    genesisNextTarget > genesisNow
      ? genesisNextTarget - genesisNow
      : 0;

    const genesisCountdownDays =
      Math.floor(
        genesisCountdownSeconds / 86400
      );

    const genesisCountdownHours =
      Math.floor(
        (
          genesisCountdownSeconds % 86400
        ) / 3600
      );

    const genesisCountdownMinutes =
      Math.floor(
        (
          genesisCountdownSeconds % 3600
        ) / 60
      );

    const genesisCountdownSecs =
      genesisCountdownSeconds % 60;

    const padGenesisCountdown = (
      value
    ) =>
      String(value).padStart(
        2,
        "0"
      );

  const formatGenesisTime = (
    timestamp
  ) => {
    if (!timestamp) {
      return "—";
    }

    return new Date(
      timestamp * 1000
    ).toLocaleString(
      undefined,
      {
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZoneName: "short",
      }
    );
  };


  useEffect(() => {
    if (!genesisDropOpen) {
      return;
    }

    const updateNow = () => {
      setGenesisNow(
        Math.floor(Date.now() / 1000)
      );
    };

    updateNow();

    const timer =
      setInterval(
        updateNow,
        1000
      );

    return () => {
      clearInterval(timer);
    };
  }, [genesisDropOpen]);

  useEffect(() => {
    let cancelled = false;

    async function loadGenesisEligibility() {
      if (!genesisDropOpen || !address) {
        setGenesisEligibility({
          og: false,
          fcfs: false,
        });

        setGenesisProofs({
          og: [],
          fcfs: [],
        });

        setGenesisEligibilityLoading(false);

        return;
      }

      setGenesisEligibilityLoading(true);

      try {
        const result =
          await getGenesisEligibility(
            address
          );

        if (cancelled) return;

        setGenesisEligibility({
          og:
            result.ogEligible === true,

          fcfs:
            result.fcfsEligible === true,
        });

        setGenesisProofs({
          og:
            Array.isArray(result.ogProof)
              ? result.ogProof
              : [],

          fcfs:
            Array.isArray(result.fcfsProof)
              ? result.fcfsProof
              : [],
        });

      } catch (error) {
        console.error(
          "[GENESIS ELIGIBILITY]",
          error
        );

        if (!cancelled) {
          setGenesisEligibility({
            og: false,
            fcfs: false,
          });

          setGenesisProofs({
            og: [],
            fcfs: [],
          });
        }
      } finally {
        if (!cancelled) {
          setGenesisEligibilityLoading(false);
        }
      }
    }

    loadGenesisEligibility();

    return () => {
      cancelled = true;
    };
  }, [
    genesisDropOpen,
    address,
  ]);

  const renderGenesisEligibilityBadge = (
    eligible
  ) => {
    if (!address) {
      return (
        <span className="genesis-eligibility-badge disconnected">
          CONNECT WALLET
        </span>
      );
    }

    if (genesisEligibilityLoading) {
      return (
        <span className="genesis-eligibility-badge checking">
          CHECKING...
        </span>
      );
    }

    return (
      <span
        className={
          eligible
            ? "genesis-eligibility-badge eligible"
            : "genesis-eligibility-badge ineligible"
        }
      >
        {eligible
          ? "ELIGIBLE"
          : "NOT ELIGIBLE"}
      </span>
    );
  };

  useEffect(() => {
    let cancelled = false;

    async function loadGenesisWalletState() {
      if (
        !connected ||
        !address
      ) {
        setGenesisWalletState({
          ogMinted: 0,
          fcfsMinted: 0,
          publicMinted: 0,
        });

        return;
      }

      try {
        const walletState =
          await getGenesisWalletState(
            address
          );

        if (cancelled) {
          return;
        }

        setGenesisWalletState(
          walletState
        );

      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error(
          "[GENESIS WALLET STATE ERROR]",
          error
        );
      }
    }

    loadGenesisWalletState();

    return () => {
      cancelled = true;
    };
  }, [
    connected,
    address,
    genesisState?.totalSupply,
  ]);


useEffect(() => {
  if (!genesisDropOpen) {
    return;
  }

  let cancelled = false;

  async function loadWhitelistCounts() {
    try {
      const counts =
        await getGenesisWhitelistCounts();

      if (cancelled) {
        return;
      }

      setGenesisWhitelistCounts(
        counts
      );
    } catch (error) {
      console.error(
        "[GENESIS WHITELIST COUNT ERROR]",
        error
      );
    }
  }

  loadWhitelistCounts();

  return () => {
    cancelled = true;
  };
}, [genesisDropOpen]);

  if (isGenesisVerifyPage) {
    return <GenesisVerifyPage />;
  }



  useEffect(() => {
    let cancelled = false;
  
    async function loadDexMarket() {
      setDexMarketError(null);
  
      /*
       * If stale cache already exists,
       * show it immediately.
       *
       * Do not cover usable market data
       * with the loading overlay.
       */
      const cachedMarket =
        getCachedArcDexMarket();
  
      const hasCachedTokens =
        Array.isArray(
          cachedMarket?.tokens
        ) &&
        cachedMarket.tokens.length > 0;
  
      if (hasCachedTokens) {
        setDexTokens(
          cachedMarket.tokens
        );
  
        setDexMarketLoading(false);
      } else {
        /*
         * No cache at all.
         *
         * Show loader only until the
         * initial 30-token batch arrives.
         */
        setDexMarketLoading(true);
      }
  
      try {
        await getArcDexMarket({
          /*
           * Critical first paint.
           *
           * As soon as the first 30 tokens
           * are available, release the UI.
           */
          onInitialBatch: (
            market
          ) => {
            if (cancelled) {
              return;
            }
  
            const tokens =
              Array.isArray(
                market?.tokens
              )
                ? market.tokens
                : [];
  
            setDexTokens(
              tokens
            );
  
            setDexMarketLoading(
              false
            );
          },
  
          /*
           * Remaining batches arrive in
           * the background.
           *
           * Never turn the loading overlay
           * back on here.
           */
          onBatch: (
            market
          ) => {
            if (cancelled) {
              return;
            }
  
            const tokens =
              Array.isArray(
                market?.tokens
              )
                ? market.tokens
                : [];
  
            setDexTokens(
              tokens
            );
          },
        });
  
      } catch (error) {
        if (cancelled) {
          return;
        }
  
        console.error(
          "Failed to load ARC DEX market:",
          error
        );
  
        /*
         * Preserve stale cache if the
         * network refresh fails.
         */
        const fallbackMarket =
          getCachedArcDexMarket();
  
        if (
          Array.isArray(
            fallbackMarket?.tokens
          ) &&
          fallbackMarket.tokens.length > 0
        ) {
          setDexTokens(
            fallbackMarket.tokens
          );
  
          setDexMarketError(
            null
          );
  
        } else {
          setDexMarketError(
            error instanceof Error
              ? error.message
              : "Failed to load DEX market."
          );
        }
  
      } finally {
        /*
         * Safety fallback.
         *
         * Normally the loader is already
         * removed by onInitialBatch.
         */
        if (!cancelled) {
          setDexMarketLoading(
            false
          );
        }
      }
    }
  
    loadDexMarket();
  
    return () => {
      cancelled = true;
    };
  }, []);


  useEffect(() => {
    let cancelled = false;
  
    async function testArgusMetadata() {
      try {
  
        const metadata =
          await getArcArgusTokenMetadata(
            "0xdaB8bD22f2BfC8F82ED071A4a337e0637e1bce52"
          );
  
        if (cancelled) return;
  
      } catch (error) {
        if (cancelled) return;
  
      }
    }
  
    testArgusMetadata();
  
    return () => {
      cancelled = true;
    };
  }, []);


  useEffect(() => {
    let cancelled = false;
  
    async function testRecentArgusBatch() {
      try {
  
        const metadata =
          await getRecentArcArgusMetadata();
  
        if (cancelled) return;
  
        const earn =
          metadata.get(
            "0xdab8bd22f2bfc8f82ed071a4a337e0637e1bce52"
          );
  
      } catch (error) {
        if (cancelled) return;
  
      }
    }
  
    testRecentArgusBatch();
  
    return () => {
      cancelled = true;
    };
  }, []);



  const filteredDexTokens =
  [...dexTokens]
    .filter((token) => {
      if (
        marketFilter ===
        "NEW_LAUNCH"
      ) {
        if (!token.pairCreatedAt) {
          return false;
        }

        const ageMs =
          Date.now() -
          Number(
            token.pairCreatedAt
          );

        const tenHoursMs =
          10 * 60 * 60 * 1000;

        return (
          ageMs >= 0 &&
          ageMs <= tenHoursMs
        );
      }


      /*
       * DEX Screener does not expose an
       * authoritative lastTradeAt field.
       *
       * Do not fabricate LAST_TRADE
       * timestamps from volume/txn data.
       */
      if (
        marketFilter ===
        "LAST_TRADE"
      ) {
        return false;
      }


      return true;
    })
    .sort((a, b) => {
      if (
        marketFilter ===
        "NEW_LAUNCH"
      ) {
        return (
          Number(
            b.pairCreatedAt || 0
          ) -
          Number(
            a.pairCreatedAt || 0
          )
        );
      }


      if (
        marketFilter ===
        "TOP_MCAP"
      ) {
        return (
          Number(
            b.marketCap || 0
          ) -
          Number(
            a.marketCap || 0
          )
        );
      }


      /*
       * Default DEX ordering:
       * highest liquidity first.
       *
       * This gives deterministic ordering
       * without changing SEIS ordering.
       */
      return (
        Number(
          b.pairCreatedAt || 0
        ) -
        Number(
          a.pairCreatedAt || 0
        )
      );
    })
    .filter((token) => {
      const query =
        tokenSearch
          .trim()
          .toLowerCase();

      if (!query) {
        return true;
      }


      const address =
        String(
          token.tokenAddress || ""
        ).toLowerCase();

      const name =
        String(
          token.name || ""
        ).toLowerCase();

      const symbol =
        String(
          token.symbol || ""
        ).toLowerCase();


      return (
        address.includes(query) ||
        name.includes(query) ||
        symbol.includes(query)
      );
    });

    function DexTokenLogo({
      token,
      fallback = "identicon",
    }) {
      const candidates =
      Array.from(
        new Set(
          [
            ...(Array.isArray(token?.logoCandidates)
              ? token.logoCandidates
              : []),
            token?.logoUrl,
          ]
            .filter(Boolean)
            .filter(
              (url) =>
                !String(url)
                  .toLowerCase()
                  .includes("ipfs.io/ipfs/")
            )
        )
      );
    
      const [
        imageIndex,
        setImageIndex,
      ] = useState(0);
    
      const imageUrl =
        candidates[imageIndex];
    
      if (!imageUrl) {
        if (fallback === "letter") {
          return (
            <span>
              {token?.symbol
                ?.charAt(0)
                .toUpperCase() || "?"}
            </span>
          );
        }
    
        return (
          <TokenIdenticon
            address={
              token?.tokenAddress
            }
          />
        );
      }
    
      return (
        <img
          src={imageUrl}
          alt={
            token?.symbol ||
            token?.name ||
            "Token"
          }
          loading="lazy"
          onError={() => {
            setImageIndex(
              (current) =>
                current + 1
            );
          }}
        />
      );
    }


    function TokenIdenticon({
      address,
      size = 5,
    }) {
      const normalized =
        String(address || "")
          .toLowerCase()
          .replace(/^0x/, "");
    
      /*
       * Build a deterministic 5x5 pattern.
       * Left side is generated from the
       * contract address and mirrored to
       * the right side.
       */
      const cells = [];
    
      for (
        let row = 0;
        row < size;
        row += 1
      ) {
        const half =
          Math.ceil(size / 2);
    
        const rowCells = [];
    
        for (
          let column = 0;
          column < half;
          column += 1
        ) {
          const index =
            (row * half + column) %
            Math.max(
              normalized.length,
              1
            );
    
          const value =
            parseInt(
              normalized[index] || "0",
              16
            );
    
          rowCells.push(
            value % 2 === 0
          );
        }
    
        const mirrored =
          [
            ...rowCells,
            ...rowCells
              .slice(
                0,
                Math.floor(
                  size / 2
                )
              )
              .reverse(),
          ];
    
        cells.push(
          ...mirrored
        );
      }
    
    
      /*
       * Accent is also derived from the
       * address, but stays inside the
       * SEIS green visual language.
       */
    
    
      return (
        <div
          className="token-identicon"
          aria-hidden="true"
        >
          <div
            className="token-identicon-grid"
            style={{
              "--identicon-size":
                size,
    
            }}
          >
            {cells.map(
              (active, index) => (
                <span
                  key={index}
                  className={
                    active
                      ? "is-active"
                      : ""
                  }
                />
              )
            )}
          </div>
        </div>
      );
    }





  return (
    <div className="terminal-app">
      <button
        type="button"
        className={
          mobileSidebarOpen
            ? "mobile-sidebar-toggle mobile-open"
            : "mobile-sidebar-toggle"
        }
        onClick={() => {
          setMobileSidebarOpen((open) => !open);
        }}
        aria-label={
          mobileSidebarOpen
            ? "Close navigation"
            : "Open navigation"
        }
      >
        {mobileSidebarOpen ? "<" : ">"}
      </button>
      <aside
        className={
          mobileSidebarOpen
            ? "sidebar mobile-open"
            : "sidebar"
        }
      >
        <div className="sidebar-brand">
          <span className="brand-mark">&gt;_</span>

          <div className="sidebar-brand-text">
            <span className="sidebar-brand-title">
              SEIS TERMINAL
            </span>

            <span className="sidebar-brand-powered">
              powered by ARC TERMINAL
            </span>
          </div>
        </div>

          <nav className="sidebar-nav">
            <button
              type="button"
              className={
                activePage === "MARKET"
                  ? "sidebar-nav-item sidebar-nav-active"
                  : "sidebar-nav-item"
              }
              onClick={() => {
                setActivePage("MARKET");
              }}
            >
              <span className="sidebar-nav-icon">
                ◇
              </span>

              <span>
                MARKET
              </span>
            </button>

            <button
              type="button"
              className="sidebar-nav-item"
              onClick={() => {
                setLaunchOpen(true);
              }}
            >
              <span className="sidebar-nav-icon">
                +
              </span>

              <span>
                LAUNCH
              </span>
            </button>

            <button
              type="button"
              className={
                activePage === "SWAP"
                  ? "sidebar-nav-item sidebar-nav-active"
                  : "sidebar-nav-item"
              }
              onClick={() => {
                setActivePage("SWAP");
              }}
            >
              <span className="sidebar-nav-icon">
                ↔
              </span>

              <span className="sidebar-nav-label">
                SWAP
              </span>
            </button>

            <div className="sidebar-nav-divider" />

            <button
              type="button"
              className={
                activePage === "DOCS"
                  ? "sidebar-nav-item sidebar-nav-active"
                  : "sidebar-nav-item"
              }
              onClick={() => {
                setActivePage("DOCS");
              }}
            >
              <span className="sidebar-nav-icon">
                ▤
              </span>

              <span>
                DOCS
              </span>
            </button>

            <button
              type="button"
              className={
                activePage === "LITEPAPER"
                  ? "sidebar-nav-item sidebar-nav-active"
                  : "sidebar-nav-item"
              }
              onClick={() => {
                setActivePage("LITEPAPER");
              }}
            >
              <span className="sidebar-nav-icon">
                □
              </span>

              <span>
                LITEPAPER
              </span>
            </button>
          </nav>

        <div className="sidebar-bottom">



          <button
            type="button"
            className="sidebar-launch-button"
            onClick={() => {
              setLaunchOpen(true);
            }}
          >
            LAUNCH TOKEN_
          </button>

          <button
            type="button"
            className="sidebar-wallet-button"
            onClick={() => {
              clearWalletError();

              if (connected) {
                setAccountModalOpen(true);
              } else {
                setWalletModalOpen(true);
              }
            }}
          >
            {connected
              ? `${address.slice(0, 6)}...${address.slice(-4)}`
              : "CONNECT WALLET"}
          </button>
        </div>
      </aside>

      {mobileSidebarOpen && (
        <button
          type="button"
          className="mobile-sidebar-backdrop"
          aria-label="Close navigation"
          onClick={() => {
            setMobileSidebarOpen(false);
          }}
        />
      )}

      <main className="app-main">

        {activePage === "MARKET" && (
          <>
            <section className="market">

            <div className="market-filter-bar">
              <button
                type="button"
                className={
                  marketFilter === "TOP_MCAP"
                    ? "market-filter-button active"
                    : "market-filter-button"
                }
                onClick={() => {
                  setMarketFilter(
                    marketFilter === "TOP_MCAP"
                      ? ""
                      : "TOP_MCAP"
                  );
                }}
              >
                <img
                  className="market-filter-icon"
                  src="/icon/topmarketcap.png"
                  alt=""
                  aria-hidden="true"
                />
                <span>TOP MARKET CAP</span>
              </button>

              <button
                type="button"
                className={
                  marketFilter === "NEW_LAUNCH"
                    ? "market-filter-button active"
                    : "market-filter-button"
                }
                onClick={() => {
                  setMarketFilter(
                    marketFilter === "NEW_LAUNCH"
                      ? ""
                      : "NEW_LAUNCH"
                  );
                }}
              >
               <img
                className="market-filter-icon"
                src="/icon/newtoken.png"
                alt=""
                aria-hidden="true"
              />
              <span>NEW LAUNCH</span>
              </button>

              <button
                type="button"
                className={
                  marketFilter === "LAST_TRADE"
                    ? "market-filter-button active"
                    : "market-filter-button"
                }
                onClick={() => {
                  setMarketFilter(
                    marketFilter === "LAST_TRADE"
                      ? ""
                      : "LAST_TRADE"
                  );
                }}
              >
                <img
                  className="market-filter-icon"
                  src="/icon/lasttrade.png"
                  alt=""
                  aria-hidden="true"
                />
                <span>LAST TRADE</span>
              </button>
            </div>

            <div className="market-toolbar">
            <div className="search-box">
              <span className="search-icon">
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle
                    cx="11"
                    cy="11"
                    r="7"
                  />

                  <path d="M16.5 16.5L21 21" />
                </svg>
              </span>
              <input
                type="text"
                placeholder="Search name, symbol or contract"
                value={tokenSearch}
                onChange={(event) => {
                  setTokenSearch(event.target.value);
                }}
                spellCheck="false"
                autoComplete="off"
              />
            </div>

            <div className="market-ticker">
              <div
                className="market-ticker-track"
                style={{
                  animationDuration: `${Math.max(
                    24,
                    tickerTokens.length * 1.7
                  )}s`,
                }}
              >

                {[...tickerTokens, ...tickerTokens].map(
                  (token, index) => (
                  <div
                    className="market-ticker-item"
                    key={`${token.tokenAddress}-${index}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      if (token.source !== "SEIS") {
                        return;
                      }
                    
                      const launch =
                        liveLaunches.find(
                          (item) =>
                            item.tokenAddress
                              .toLowerCase() ===
                            token.tokenAddress
                              .toLowerCase()
                        );
                    
                      if (!launch) {
                        return;
                      }
                    
                      setSelectedLaunch(launch);
                      setTradeSide("BUY");
                      setTradeModalOpen(true);
                    }}
                    onKeyDown={(event) => {
                      if (
                        event.key !== "Enter" &&
                        event.key !== " "
                      ) {
                        return;
                      }
                    
                      if (token.source !== "SEIS") {
                        return;
                      }
                    
                      event.preventDefault();
                    
                      const launch =
                        liveLaunches.find(
                          (item) =>
                            item.tokenAddress
                              .toLowerCase() ===
                            token.tokenAddress
                              .toLowerCase()
                        );
                    
                      if (!launch) {
                        return;
                      }
                    
                      setSelectedLaunch(launch);
                      setTradeSide("BUY");
                      setTradeModalOpen(true);
                    }}
                  >
                      <div className="market-ticker-logo">
                        {token.source === "DEX" ? (
                            <DexTokenLogo
                            token={token}
                            fallback="letter"
                            />
                        ) : token.logoUrl ? (
                          <img
                            src={token.logoUrl}
                            alt=""
                            decoding="async"
                            fetchPriority="low"
                          />
                        ) : (
                          <span>
                            {token.symbol
                              ?.charAt(0)
                              .toUpperCase()}
                          </span>
                        )}
                      </div>

                      <strong>
                        {token.symbol}
                      </strong>

                    </div>
                  )
                )}

              </div>
            </div>
          </div>

          <div
            className={`market-table ${
              (launchesLoading || dexMarketLoading)
                ? "market-table-loading"
                : ""
            }`}
          >

            {(
              (launchesLoading && liveLaunches.length === 0) ||
              dexMarketLoading
            ) && (
              <div className="market-loading-layer">
                <div className="market-loading-toast">
                  <div className="market-loading-spinner" />

                  <div className="market-loading-content">
                    <strong>LOADING MARKET_</strong>
                    <span>Fetching tokens from ARC Mainnet...</span>
                  </div>
                </div>
              </div>
            )}

            {!launchesLoading &&
              launchesError && (
                <div className="market-row">
                  <div className="market-token">
                    <div className="token-icon">
                      !
                    </div>

                    <div>
                      <strong>
                        RPC ERROR_
                      </strong>

                      <small>
                        {launchesError}
                      </small>
                    </div>
                  </div>
                </div>
            )}

            {!launchesLoading &&
              !launchesError &&
              liveLaunches.length === 0 && (
                <div className="market-row">
                  <div className="market-token">
                    <div className="token-icon">
                      &gt;_
                    </div>

                    <div>
                      <strong>
                        NO LAUNCHES_
                      </strong>

                      <small>
                        Waiting for the first ARC launch.
                      </small>
                    </div>
                  </div>
                </div>
            )}
            <div className="market-card-grid">

            {!dexMarketLoading &&
                !dexMarketError &&
                filteredDexTokens.map(
                  (token) => {
                    const marketCap =
                      Number(
                        token.marketCap || 0
                      );

                    const priceUsd =
                      Number(
                        token.priceUsd || 0
                      );

                    const liquidityUsd =
                      Number(
                        token.liquidityUsd || 0
                      );

                    const volume24h =
                      Number(
                        token.volume24h || 0
                      );

                    const txns24h =
                      Number(
                        token.txns24h || 0
                      );


                    const formatUsd = (
                      value
                    ) => {
                      const number =
                        Number(value);

                      if (
                        !Number.isFinite(
                          number
                        )
                      ) {
                        return "$0";
                      }

                      if (
                        number >= 1_000_000_000
                      ) {
                        return `$${(
                          number /
                          1_000_000_000
                        ).toFixed(2)}B`;
                      }

                      if (
                        number >= 1_000_000
                      ) {
                        return `$${(
                          number /
                          1_000_000
                        ).toFixed(2)}M`;
                      }

                      if (
                        number >= 1_000
                      ) {
                        return `$${(
                          number /
                          1_000
                        ).toFixed(2)}K`;
                      }

                      return `$${number.toFixed(
                        2
                      )}`;
                    };


                    const formatPrice = (
                      value
                    ) => {
                      const number =
                        Number(value);

                      if (
                        !Number.isFinite(
                          number
                        ) ||
                        number <= 0
                      ) {
                        return "$0";
                      }

                      if (number >= 1) {
                        return `$${number.toLocaleString(
                          undefined,
                          {
                            maximumFractionDigits:
                              6,
                          }
                        )}`;
                      }

                      return `$${number.toLocaleString(
                        undefined,
                        {
                          maximumSignificantDigits:
                            6,
                        }
                      )}`;
                    };


                    return (
                      <article
                        key={`DEX-${token.tokenAddress}`}
                        className="market-card market-card-dex"
                        tabIndex={0}
                        role="button"
                        onClick={() => {
                          setSelectedLaunch({
                            source: "DEX",
                        
                            tokenAddress:
                              token.tokenAddress,
                        
                            name:
                              token.name ||
                              "Unknown Token",
                        
                            symbol:
                              token.symbol ||
                              "UNKNOWN",
                        
                            logoUrl:
                              token.logoUrl ||
                              "",
                        
                            logoCandidates:
                              token.logoCandidates ||
                              [],
                        
                            creator: null,
                        
                            dexId:
                              token.dexId ||
                              "",
                        
                            pairAddress:
                              token.pairAddress ||
                              "",
                        
                            quoteAddress:
                              token.quoteAddress ||
                              "",
                        
                            quoteSymbol:
                              token.quoteSymbol ||
                              "USDC",
                        
                            priceUsd:
                              token.priceUsd || 0,
                        
                            marketCap:
                              token.marketCap || 0,
                        
                            liquidityUsd:
                              token.liquidityUsd || 0,
                        
                            volume24h:
                              token.volume24h || 0,
                        
                            priceChange24h:
                              token.priceChange24h || 0,
                        
                            buys24h:
                              token.buys24h || 0,
                        
                            sells24h:
                              token.sells24h || 0,
                        
                            txns24h:
                              token.txns24h || 0,
                        
                            rawDex:
                              token,
                          });
                        
                          setTradeSide("BUY");
                          setTradeModalOpen(true);
                        }}
                        onKeyDown={(event) => {
                          if (
                            event.key === "Enter" ||
                            event.key === " "
                          ) {
                            event.preventDefault();
                        
                            setSelectedLaunch({
                              source: "DEX",
                        
                              tokenAddress:
                                token.tokenAddress,
                        
                              name:
                                token.name ||
                                "Unknown Token",
                        
                              symbol:
                                token.symbol ||
                                "UNKNOWN",
                        
                              logoUrl:
                                token.logoUrl ||
                                "",
                        
                              logoCandidates:
                                token.logoCandidates ||
                                [],
                        
                              creator: null,
                        
                              dexId:
                                token.dexId ||
                                "",
                        
                              pairAddress:
                                token.pairAddress ||
                                "",
                        
                              quoteAddress:
                                token.quoteAddress ||
                                "",
                        
                              quoteSymbol:
                                token.quoteSymbol ||
                                "USDC",
                        
                              priceUsd:
                                token.priceUsd || 0,
                        
                              marketCap:
                                token.marketCap || 0,
                        
                              liquidityUsd:
                                token.liquidityUsd || 0,
                        
                              volume24h:
                                token.volume24h || 0,
                        
                              priceChange24h:
                                token.priceChange24h || 0,
                        
                              buys24h:
                                token.buys24h || 0,
                        
                              sells24h:
                                token.sells24h || 0,
                        
                              txns24h:
                                token.txns24h || 0,
                        
                              rawDex:
                                token,
                            });
                        
                            setTradeSide("BUY");
                            setTradeModalOpen(true);
                          }
                        }}
                      >
                        <div className="market-card-media">
                          <div className="market-card-media">
                            <DexTokenLogo
                              token={token}
                            />
                          </div>
                        </div>


                        <div className="market-card-body">
                          <div className="market-card-title-row">
                            <div>
                              <h3>
                                {token.name ||
                                  "Unknown Token"}
                              </h3>

                              <span>
                                $
                                {token.symbol ||
                                  "UNKNOWN"}
                              </span>
                            </div>

                            <span>
                              DEX
                            </span>
                          </div>


                          <div className="market-card-mcap">
                            <span>
                              MC
                            </span>

                            <strong>
                              {formatUsd(
                                marketCap
                              )}
                            </strong>
                          </div>


                          <div className="market-card-stats">
                            <div>
                              <span>
                                PRICE
                              </span>

                              <strong>
                                {formatPrice(
                                  priceUsd
                                )}
                              </strong>
                            </div>

                            <div>
                              <span>
                                TXNS 24H
                              </span>

                              <strong>
                                {txns24h.toLocaleString()}
                              </strong>
                            </div>
                          </div>


                          <div className="market-card-stats">
                            <div>
                              <span>
                                LIQUIDITY
                              </span>

                              <strong>
                                {formatUsd(
                                  liquidityUsd
                                )}
                              </strong>
                            </div>

                            <div>
                              <span>
                                VOL 24H
                              </span>

                              <strong>
                                {formatUsd(
                                  volume24h
                                )}
                              </strong>
                            </div>
                          </div>


                          <div className="market-card-contract">
                            <span>
                              CONTRACT
                            </span>

                            <strong>
                              {token.tokenAddress
                                ? `${token.tokenAddress.slice(
                                    0,
                                    6
                                  )}...${token.tokenAddress.slice(
                                    -4
                                  )}`
                                : "--"}
                            </strong>

                            <button
                              type="button"
                              onClick={(
                                event
                              ) => {
                                event.stopPropagation();

                                if (
                                  token.tokenAddress
                                ) {
                                  navigator.clipboard
                                    ?.writeText(
                                      token.tokenAddress
                                    );
                                }
                              }}
                              aria-label="Copy token contract"
                            >
                              COPY
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  }
                )}


            {!launchesLoading &&
              !launchesError &&
              [...liveLaunches]
                .filter((launch) => {
                  const now =
                    Date.now();

                  if (
                    marketFilter ===
                    "NEW_LAUNCH"
                  ) {
                    if (
                      !launch.createdAt
                    ) {
                      return false;
                    }

                    const createdTime =
                      new Date(
                        launch.createdAt
                      ).getTime();

                    return (
                      Number.isFinite(
                        createdTime
                      ) &&
                      now - createdTime >= 0 &&
                      now - createdTime <=
                        10 * 60 * 60 * 1000
                    );
                  }

                  if (
                    marketFilter ===
                    "LAST_TRADE"
                  ) {
                    if (
                      !launch.lastTradeAt
                    ) {
                      return false;
                    }

                    const lastTradeTime =
                      new Date(
                        launch.lastTradeAt
                      ).getTime();

                    return (
                      Number.isFinite(
                        lastTradeTime
                      ) &&
                      now - lastTradeTime >= 0 &&
                      now - lastTradeTime <=
                        6 * 60 * 60 * 1000
                    );
                  }

                  return true;
                })
                .sort((a, b) => {
                  if (
                    marketFilter ===
                    "NEW_LAUNCH"
                  ) {
                    return (
                      new Date(
                        b.createdAt
                      ).getTime() -
                      new Date(
                        a.createdAt
                      ).getTime()
                    );
                  }

                  if (
                    marketFilter ===
                    "LAST_TRADE"
                  ) {
                    return (
                      new Date(
                        b.lastTradeAt
                      ).getTime() -
                      new Date(
                        a.lastTradeAt
                      ).getTime()
                    );
                  }

                  if (
                    marketFilter ===
                    "TOP_MCAP"
                  ) {
                    const getMarketCap = (
                      launch
                    ) => {
                      const sold =
                        Number(
                          launch.formatted
                            .tokensSold
                        );

                      const reserve =
                        Number(
                          launch.formatted
                            .quoteReserve
                        );

                      const totalSupply =
                        Number(
                          launch.formatted
                            .totalSupply
                        );

                      const currentVirtualTokenReserve =
                        1_200_000_000 -
                        sold;

                      const currentVirtualQuoteReserve =
                        12_000 +
                        reserve;

                      const spotPrice =
                        currentVirtualQuoteReserve /
                        currentVirtualTokenReserve;

                      return (
                        spotPrice *
                        totalSupply
                      );
                    };

                    return (
                      getMarketCap(b) -
                      getMarketCap(a)
                    );
                  }

                  return 0;
                })
                .filter((launch) => {
                  const query =
                    tokenSearch
                      .trim()
                      .toLowerCase();

                  if (!query) {
                    return true;
                  }

                  const tokenAddress = (
                    launch.tokenAddress ||
                    launch.token_address ||
                    ""
                  ).toLowerCase();

                  const tokenName = (
                    launch.tokenName ||
                    launch.token_name ||
                    launch.name ||
                    ""
                  ).toLowerCase();

                  const tokenSymbol = (
                    launch.tokenSymbol ||
                    launch.token_symbol ||
                    launch.symbol ||
                    ""
                  ).toLowerCase();

                  return (
                    tokenAddress.includes(
                      query
                    ) ||
                    tokenName.includes(
                      query
                    ) ||
                    tokenSymbol.includes(
                      query
                    )
                  );
                })
                .map((launch) => {
                const sold =
                  Number(
                    launch.formatted.tokensSold
                  );

                const reserve =
                  Number(
                    launch.formatted.quoteReserve
                  );

                /*
                * More precise than the current
                * reader's display percentage.
                *
                * bigint math keeps large uint256
                * values safe before converting
                * the reduced result to Number.
                */
                const progressScaled =
                  launch.raw.bondingSupply > 0n
                    ? (
                        launch.raw.tokensSold *
                        1_000_000n
                      ) /
                      launch.raw.bondingSupply
                    : 0n;

                const progress =
                  Number(progressScaled) /
                  10_000;

                const shortAddress =
                  `${launch.tokenAddress.slice(
                    0,
                    6
                  )}...${launch.tokenAddress.slice(
                    -4
                  )}`;

                  const totalSupply =
                  Number(
                    launch.formatted.totalSupply
                  );

                const currentVirtualTokenReserve =
                  1_200_000_000 - sold;

                const currentVirtualQuoteReserve =
                  12_000 + reserve;

                const spotPrice =
                  currentVirtualQuoteReserve /
                  currentVirtualTokenReserve;

                const marketCap =
                  spotPrice * totalSupply;

                  return (
                    <div
                      className="market-card"
                      key={`${marketFilter || "DEFAULT"}-${launch.launchId.toString()}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        setSelectedLaunch(launch);
                        setTradeSide("BUY");
                        setTradeModalOpen(true);
                      }}
                      onKeyDown={(event) => {
                        if (
                          event.key === "Enter" ||
                          event.key === " "
                        ) {
                          event.preventDefault();
                  
                          setSelectedLaunch(launch);
                          setTradeSide("BUY");
                          setTradeModalOpen(true);
                        }
                      }}
                    >
                      <div className="market-card-image">
                        {launch.logoUrl ? (
                          <img
                            src={launch.logoUrl}
                            alt=""
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          <span className="market-card-image-fallback">
                            {launch.symbol
                              .charAt(0)
                              .toUpperCase()}
                          </span>
                        )}
                  
                        <div className="market-card-progress">
                          <span
                            style={{
                              width: `${Math.min(
                                Math.max(progress, 0),
                                100
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                  
                      <div className="market-card-body">
                        <div className="market-card-title">
                          <strong>{launch.name}</strong>
                  
                          <span>${launch.symbol}</span>
                        </div>
                  
                        <div className="market-card-mcap">
                          <strong>
                            $
                            {marketCap >= 1_000_000_000
                              ? `${(marketCap / 1_000_000_000)
                                  .toFixed(1)
                                  .replace(/\.0$/, "")}B`
                              : marketCap >= 1_000_000
                                ? `${(marketCap / 1_000_000)
                                    .toFixed(1)
                                    .replace(/\.0$/, "")}M`
                                : marketCap >= 1_000
                                  ? `${(marketCap / 1_000)
                                      .toFixed(1)
                                      .replace(/\.0$/, "")}K`
                                  : marketCap.toFixed(2)}
                          </strong>
                  
                          <span>MC</span>
                        </div>
                  
                        <div className="market-card-stats">
                          <span>
                            TXNS{" "}
                            <strong>
                              {launch.transactionCount.toString()}
                            </strong>
                          </span>
                  
                          <span>
                            PROGRESS{" "}
                            <strong>
                              {progress.toFixed(4)}%
                            </strong>
                          </span>
                        </div>
                  
                        <div className="market-card-contract">
                          <a
                            href={getTokenExplorerUrl(
                              launch.tokenAddress
                            )}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(event) =>
                              event.stopPropagation()
                            }
                          >
                            {shortAddress}
                          </a>
                  
                          <button
                            type="button"
                            onClick={async (event) => {
                              event.stopPropagation();
                  
                              await navigator.clipboard.writeText(
                                launch.tokenAddress
                              );
                  
                              setCopiedTokenAddress(
                                launch.tokenAddress
                              );
                  
                              setTimeout(() => {
                                setCopiedTokenAddress("");
                              }, 1500);
                            }}
                          >
                            {copiedTokenAddress ===
                            launch.tokenAddress
                              ? "COPIED ✓"
                              : "COPY"}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
              })}

              </div>
              {launchOpen && (
                <div
                  className="launch-modal-backdrop"
                  onMouseDown={(event) => {
                    if (event.target === event.currentTarget) {
                      setLaunchOpen(false);
                    }
                  }}
                >
                  <div className="launch-mini-modal">
                    <div className="launch-modal-header">
                      <div>
                        <span>SEIS TERMINAL</span>
                        <h2>LAUNCH TOKEN_</h2>
                      </div>

                      <button
                        className="launch-modal-close"
                        onClick={() => setLaunchOpen(false)}
                        aria-label="Close launch modal"
                      >
                        ×
                      </button>
                    </div>

                    <div className="launch-modal-body">

                      <div className="launch-main-grid">

                        {/* LEFT COLUMN */}
                        <div className="launch-main-left">

                          <div className="launch-type-section">
                            <span className="launch-type-label">
                              LAUNCH TYPE
                            </span>

                            <div className="launch-type-grid">
                              <button
                                type="button"
                                className={
                                  launchType === "fair"
                                    ? "launch-type-card launch-type-active"
                                    : "launch-type-card"
                                }
                                onClick={() =>
                                  setLaunchType("fair")
                                }
                              >
                                <strong>
                                  FAIR LAUNCH_
                                </strong>

                                <span>
                                  No initial liquidity pool.
                                </span>

                                <small>
                                  Pool is created after the
                                  launch target is reached.
                                </small>
                              </button>

                              <button
                                type="button"
                                className="launch-type-card"
                                disabled
                              >
                                <strong>
                                  LIQUIDITY LAUNCH_
                                </strong>

                                <span>
                                  Add initial liquidity.
                                </span>

                                <small>
                                  COMING SOON
                                </small>
                              </button>
                            </div>
                          </div>


                          <label className="launch-field">
                            <span>
                              TOKEN NAME
                            </span>

                            <input
                              type="text"
                              value={tokenName}
                              onChange={(event) =>
                                setTokenName(
                                  event.target.value
                                )
                              }
                              placeholder="Example: Arc Dog"
                              maxLength={32}
                            />
                          </label>


                          <label className="launch-field">
                            <span>
                              SYMBOL
                            </span>

                            <input
                              type="text"
                              value={tokenSymbol}
                              onChange={(event) =>
                                setTokenSymbol(
                                  event.target.value
                                    .toUpperCase()
                                    .replace(
                                      /[^A-Z0-9]/g,
                                      ""
                                    )
                                )
                              }
                              placeholder="ADOG"
                              maxLength={10}
                            />
                          </label>

                        </div>


                        {/* RIGHT COLUMN — TOKEN LOGO */}
                        <div className="launch-logo-column">
                          <span className="launch-type-label">
                            TOKEN LOGO (REQUIRED)
                          </span>

                          <div className="token-logo-card">

                            {tokenLogoPreview ? (
                              <div className="token-logo-preview-wrap">
                                <img
                                  className="token-logo-preview"
                                  src={tokenLogoPreview}
                                  alt="Token logo preview"
                                />

                                <button
                                  type="button"
                                  className="token-logo-remove"
                                  onClick={() => {
                                    URL.revokeObjectURL(
                                      tokenLogoPreview
                                    );

                                    setTokenLogoFile(null);
                                    setTokenLogoPreview("");
                                  }}
                                >
                                  ×
                                </button>
                              </div>
                            ) : (
                              <div className="token-logo-placeholder">
                                {tokenSymbol
                                  ? tokenSymbol
                                      .charAt(0)
                                      .toUpperCase()
                                  : "?"}
                              </div>
                            )}

                            <label className="token-logo-button">
                              ↑ CHOOSE IMAGE

                              <input
                                type="file"
                                accept="image/png,image/jpeg,image/webp,image/gif"
                                onChange={
                                  handleTokenLogoChange
                                }
                                hidden
                              />
                            </label>

                            <div className="token-logo-help">
                              <span>
                                PNG, JPG, GIF or WEBP
                              </span>

                              <span>
                                Max size 2 MB
                              </span>

                              <span>
                                Square image recommended
                              </span>

                              <span>
                                (300 × 300)
                              </span>
                            </div>

                          </div>
                        </div>

                      </div>


                      {/* FIXED LAUNCH ECONOMICS */}
                      <div className="launch-stats-grid">

                        <div className="launch-stat-item">
                          <span>
                            TOTAL SUPPLY
                          </span>

                          <strong>
                            1,000,000,000
                          </strong>

                          <small>
                            Fixed supply for all ARC Fair
                            Launch tokens.
                          </small>
                        </div>


                        <div className="launch-stat-item">
                          <span>
                            INITIAL MARKET CAP
                          </span>

                          <strong>
                            $10,000
                          </strong>

                          <small>
                            Based on initial bonding
                            curve state.
                          </small>
                        </div>


                        <div className="launch-stat-item">
                          <span>
                            GRADUATION MARKET CAP
                          </span>

                          <strong>
                            $60,000
                          </strong>

                          <small>
                            Liquidity migration begins
                            when the Fair Launch reaches
                            the graduation target.
                          </small>
                        </div>

                      </div>

                      <div className="dev-buy-section">
                        <div className="dev-buy-header">
                          <div>
                            <span>DEV BUY</span>

                            <small>
                              Optional initial purchase by the
                              deployer wallet.
                            </small>
                          </div>
                        </div>

                        <div className="input-with-unit">
                          <input
                            type="number"
                            value={devBuyAmount}
                            onChange={(event) =>
                              setDevBuyAmount(
                                event.target.value
                              )
                            }
                            placeholder="0.00"
                            min="0"
                            step="0.01"
                          />

                          <strong>USDC</strong>
                        </div>
                      </div>

                      <div className="launch-modal-note">
                        Dev buy is optional and is executed
                        through the Fair Launch bonding curve.
                      </div>

                    </div>

                    {launchError && (
                      <div className="launch-modal-error">
                        {launchError}
                      </div>
                    )}

                    {launchSuccess && (
                      <div className="launch-modal-success">
                        TOKEN LAUNCHED_
                      </div>
                    )}

                    <div className="launch-modal-actions">
                      <button
                        className="launch-cancel-button"
                        onClick={() => setLaunchOpen(false)}
                      >
                        CANCEL
                      </button>

                      <button
                        className="launch-confirm-button"
                        disabled={
                          launching ||
                          !tokenName.trim() ||
                          !tokenSymbol.trim() ||
                          !tokenLogoFile
                        }
                        onClick={handleLaunchToken}
                      >
                        {launching
                          ? "LAUNCHING..."
                          : "LAUNCH TOKEN_"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {walletModalOpen && (
                <div
                  className="wallet-modal-backdrop"
                  onMouseDown={(event) => {
                    if (
                      event.target ===
                      event.currentTarget
                    ) {
                      setWalletModalOpen(false);
                    }
                  }}
                >
                  <div className="wallet-mini-modal">
                    <div className="wallet-modal-header">
                      <div>
                        <span>
                          SEIS TERMINAL
                        </span>

                        <h2>
                          CONNECT WALLET_
                        </h2>
                      </div>

                      <button
                        className="wallet-modal-close"
                        onClick={() =>
                          setWalletModalOpen(false)
                        }
                      >
                        ×
                      </button>
                    </div>

                    <div className="wallet-modal-body">
                      {providers.length === 0 ? (
                        <div className="wallet-empty">
                          NO EVM WALLET DETECTED_
                        </div>
                      ) : (
                        providers.map(
                          (wallet) => (
                            <button
                              key={
                                wallet.info.uuid ||
                                wallet.info.rdns
                              }
                              className="wallet-option"
                              disabled={connecting}
                              onClick={async () => {
                                await connectProvider(
                                  wallet
                                );

                                setWalletModalOpen(
                                  false
                                );
                              }}
                            >
                              {wallet.info.icon && (
                                <img
                                  src={
                                    wallet.info.icon
                                  }
                                  alt=""
                                />
                              )}

                              <div>
                                <strong>
                                  {wallet.info.name}
                                </strong>

                                <span>
                                  {wallet.info.rdns}
                                </span>
                              </div>

                              <b>
                                {connecting
                                  ? "..."
                                  : "CONNECT"}
                              </b>
                            </button>
                          )
                        )
                      )}

                      {walletError && (
                        <div className="wallet-modal-error">
                          {walletError}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {accountModalOpen && connected && (
                <div
                  className="wallet-modal-backdrop"
                  onMouseDown={(event) => {
                    if (event.target === event.currentTarget) {
                      setAccountModalOpen(false);
                    }
                  }}
                >
                  <div className="account-mini-modal">
                    <div className="wallet-modal-header">
                      <div>
                        <span>SEIS TERMINAL</span>
                        <h2>CONNECTED WALLET_</h2>
                      </div>

                      <button
                        className="wallet-modal-close"
                        onClick={() =>
                          setAccountModalOpen(false)
                        }
                        aria-label="Close account modal"
                      >
                        ×
                      </button>
                    </div>

                    <div className="account-modal-body">
                      <div className="account-wallet-row">
                        {selectedProvider?.info?.icon && (
                          <img
                            src={selectedProvider.info.icon}
                            alt=""
                          />
                        )}

                        <div>
                          <span>WALLET</span>
                          <strong>
                            {selectedProvider?.info?.name ||
                              "EVM Wallet"}
                          </strong>
                        </div>
                      </div>

                      <div className="account-info-block">
                      <span>NETWORK</span>

                      <strong
                        className={
                          isArcMainnet
                            ? "network-status network-correct"
                            : "network-status network-wrong"
                        }
                      >
                        {isArcMainnet
                          ? "● ARC MAINNET"
                          : "● WRONG NETWORK"}
                      </strong>

                      <small className="network-chain-id">
                        Current Chain ID:{" "}
                        {chainId
                          ? parseInt(chainId, 16)
                          : "—"}
                      </small>
                    </div>

                    {!isArcMainnet && !arcNetworkNeedsAdd && (
                      <button
                        className="account-switch-button"
                        onClick={async () => {
                          const result =
                            await switchToArcMainnet();

                          if (result.needsAdd) {
                            setArcNetworkNeedsAdd(true);
                          }
                        }}
                      >
                        SWITCH TO ARC MAINNET
                      </button>
                    )}

                    {!isArcMainnet && arcNetworkNeedsAdd && (
                      <button
                        className="account-switch-button"
                        onClick={async () => {
                          const success =
                            await addArcMainnet();

                          if (success) {
                            setArcNetworkNeedsAdd(false);
                          }
                        }}
                      >
                        ADD ARC MAINNET
                      </button>
                    )}

                      <button
                        className="account-copy-button"
                        onClick={() =>
                          navigator.clipboard.writeText(address)
                        }
                      >
                        COPY ADDRESS
                      </button>

                      <button
                        className="account-disconnect-button"
                        onClick={() => {
                          disconnectWallet();
                          setAccountModalOpen(false);
                        }}
                      >
                        DISCONNECT
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {tradeModalOpen && selectedLaunch && (
                <div
                  className="trade-terminal-backdrop"
                  onClick={() => {
                    setTradeModalOpen(false);
                    setSelectedLaunch(null);
                  }}
                >
                  <div
                    className="trade-terminal-modal"
                    onClick={(event) => {
                      event.stopPropagation();
                    }}
                  >
                    {/* HEADER */}
                    <div className="trade-terminal-header">
                      <div className="trade-terminal-token-info">
                        <div className="trade-terminal-logo">
                          {selectedLaunch.logoUrl ? (
                            <img
                              src={selectedLaunch.logoUrl}
                              alt=""
                              decoding="async"
                            />
                          ) : (
                            <span>
                              {selectedLaunch.symbol
                                .charAt(0)
                                .toUpperCase()}
                            </span>
                          )}

                        </div>

                        <div className="trade-terminal-token-text">
                          <strong>
                            {selectedLaunch.symbol}
                          </strong>

                          <span>
                            {selectedLaunch.name}
                          </span>

                          <div className="trade-terminal-address-row">
                            <span>
                              {selectedLaunch.tokenAddress.slice(0, 6)}
                              ...
                              {selectedLaunch.tokenAddress.slice(-4)}
                            </span>

                            <button
                              type="button"
                              className={
                                copiedTokenAddress ===
                                selectedLaunch.tokenAddress
                                  ? "token-copy-button token-copy-button-copied"
                                  : "token-copy-button"
                              }
                              onClick={async (event) => {
                                event.stopPropagation();

                                await navigator.clipboard.writeText(
                                  selectedLaunch.tokenAddress
                                );

                                setCopiedTokenAddress(
                                  selectedLaunch.tokenAddress
                                );

                                setTimeout(() => {
                                  setCopiedTokenAddress("");
                                }, 1500);
                              }}
                            >
                              {copiedTokenAddress ===
                              selectedLaunch.tokenAddress
                                ? "COPIED ✓"
                                : "COPY"}
                            </button>

                            <span className="trade-terminal-badge">
                              Launched on ARC Mainnet
                            </span>

                          </div>
                        </div>
                      </div>

                      <div className="trade-terminal-mcap">
                        <span>Market cap</span>
                        <strong>
                          {selectedLaunch?.source === "DEX"
                            ? `$${Number(
                                selectedLaunch.marketCap || 0
                              ).toLocaleString(
                                undefined,
                                {
                                  notation: "compact",
                                  maximumFractionDigits: 2,
                                }
                              )}`
                            : "$10K"}
                        </strong>
                      </div>

                      <button
                        type="button"
                        className="trade-terminal-close"
                        onClick={() => {
                          setTradeModalOpen(false);
                          setSelectedLaunch(null);
                        }}
                      >
                        ×
                      </button>
                    </div>

                    {/* BODY */}
                    <div className="trade-terminal-body">
                      {/* LEFT */}
                      <div className="trade-terminal-left">
                        <div className="trade-chart-panel">
                          <div className="trade-chart-toolbar">
                            <div className="trade-chart-timeframes">
                            <button
                              type="button"
                              className={
                                chartInterval === "1m"
                                  ? "active"
                                  : ""
                              }
                              onClick={() =>
                                setChartInterval("1m")
                              }
                            >
                              1m
                            </button>

                            <button
                              type="button"
                              className={
                                chartInterval === "5m"
                                  ? "active"
                                  : ""
                              }
                              onClick={() =>
                                setChartInterval("5m")
                              }
                            >
                              5m
                            </button>

                            <button
                              type="button"
                              className={
                                chartInterval === "1h"
                                  ? "active"
                                  : ""
                              }
                              onClick={() =>
                                setChartInterval("1h")
                              }
                            >
                              1h
                            </button>

                            <button
                              type="button"
                              className={
                                chartInterval === "4h"
                                  ? "active"
                                  : ""
                              }
                              onClick={() =>
                                setChartInterval("4h")
                              }
                            >
                              4h
                            </button>

                            <button
                              type="button"
                              className={
                                chartInterval === "D"
                                  ? "active"
                                  : ""
                              }
                              onClick={() =>
                                setChartInterval("D")
                              }
                            >
                              D
                            </button>
                            </div>

                            <div className="trade-chart-tabs">
                              <button>Trade Display</button>
                              <button>Show All Bubbles</button>
                              <button className="active">
                                Price / MCap
                              </button>
                            </div>
                          </div>

                          <div className="trade-chart-title">
                            {selectedLaunch.symbol}/USDC Market Cap
                          </div>

                          <div className="trade-chart-placeholder">
                            {tradeHistoryLoading ? (
                              <span>
                                LOADING CHART_
                              </span>
                            ) : tradeHistory.length === 0 ? (
                              <span>
                                NO TRADE DATA_
                              </span>
                            ) : (
                              <TradeCandlestickChart
                                tradeHistory={
                                  tradeHistory
                                }
                                intervalSeconds={
                                  chartIntervalSeconds[
                                    chartInterval
                                  ]
                                }
                              />
                            )}
                          </div>

                          <div className="trade-chart-footer">
                            <div>
                              <button>1D</button>
                              <button>5D</button>
                              <button>1M</button>
                              <button>3M</button>
                              <button>1Y</button>
                            </div>

                            <div>
                              ARC MAINNET_
                            </div>
                          </div>
                        </div>

                        <div className="trade-holder-tabs">
                        <button
                          type="button"
                          className={
                            tradeDataTab === "TRADES"
                              ? "active"
                              : ""
                          }
                          onClick={() =>
                            setTradeDataTab(
                              "TRADES"
                            )
                          }
                        >
                          Trades
                        </button>

                        <button
                          type="button"
                          className={
                            tradeDataTab === "HOLDERS"
                              ? "active"
                              : ""
                          }
                          onClick={() =>
                            setTradeDataTab(
                              "HOLDERS"
                            )
                          }
                        >
                          Holders
                        </button>
                        </div>

                        <div className="trade-holder-panel">

                        {tradeDataTab ===
                        "HOLDERS" ? (
                          <>
                            <div className="trade-holder-head trade-holder-head-simple">
                              <span>
                                Holder
                              </span>

                              <span>
                                Supply (%)
                              </span>
                            </div>

                            {holdersLoading ? (
                              <div className="trade-empty-state">
                                LOADING HOLDERS_
                              </div>
                            ) : tokenHolders.length ===
                              0 ? (
                              <div className="trade-empty-state">
                                NO HOLDERS_
                              </div>
                            ) : (
                              <div className="trade-holder-list">
                                {tokenHolders.map(
                                  (holder) => (
                                    <div
                                      className="trade-holder-row"
                                      key={
                                        holder.holder_address
                                      }
                                    >
                                      <span
                                        title={
                                          holder.holder_address
                                        }
                                      >
                                        {formatTradeAddress(
                                          holder.holder_address
                                        )}
                                      </span>

                                      <span>
                                        {Number(
                                          holder.supply_percent
                                        ).toLocaleString(
                                          undefined,
                                          {
                                            minimumFractionDigits:
                                              4,

                                            maximumFractionDigits:
                                              8,
                                          }
                                        )}
                                        %
                                      </span>
                                    </div>
                                  )
                                )}
                              </div>
                            )}
                          </>
                        ) : (
                          <>
                            <div className="trade-trades-head">
                              <span>Account</span>
                              <span>Type</span>
                              <span>
                                Amount (USDC)
                              </span>
                              <span>Time</span>
                              <span>Txn</span>
                            </div>

                            {tradeHistory.length ===
                            0 ? (
                              <div className="trade-empty-state">
                                NO TRADES_
                              </div>
                            ) : (
                              <div className="trade-trades-list">
                                {[...tradeHistory]
                                  .reverse()
                                  .map(
                                    (trade) => (
                                      <div
                                        className="trade-trades-row"
                                        key={
                                          trade.transaction_hash
                                        }
                                      >
                                        <span
                                          className="trade-table-account"
                                          title={
                                            trade.trader_address
                                          }
                                        >
                                          {formatTradeAddress(
                                            trade.trader_address
                                          )}
                                        </span>

                                        <span
                                          className={
                                            trade.side ===
                                            "BUY"
                                              ? "trade-table-buy"
                                              : "trade-table-sell"
                                          }
                                        >
                                          {trade.side ===
                                          "BUY"
                                            ? "Buy"
                                            : "Sell"}
                                        </span>

                                        <span>
                                          {formatTradeUsdc(
                                            trade.quote_amount
                                          )}
                                        </span>

                                        <span>
                                          {formatTradeAge(
                                            trade.timestamp
                                          )}
                                        </span>

                                        <a
                                          className="trade-table-txn"
                                          href={`https://explorer.arc.io/tx/${trade.transaction_hash}`}
                                          target="_blank"
                                          rel="noreferrer"
                                          title={
                                            trade.transaction_hash
                                          }
                                        >
                                          {trade.transaction_hash
                                            ? `${trade.transaction_hash.slice(
                                                0,
                                                6
                                              )}...${trade.transaction_hash.slice(
                                                -4
                                              )}`
                                            : "—"}
                                        </a>
                                      </div>
                                    )
                                  )}
                              </div>
                            )}
                          </>
                        )}

                        </div>
                      </div>

                      {/* RIGHT */}
                      <div className="trade-terminal-right">
                        <div className="trade-box trade-buy-box">
                          <div className="trade-buy-sell-tabs">
                            <button
                              type="button"
                              className={
                                tradeSide === "BUY"
                                  ? "active"
                                  : ""
                              }
                              onClick={() => {
                                handleTradeSideChange(
                                  "BUY"
                                );
                              }}
                            >
                              Buy
                            </button>

                            <button
                              type="button"
                              className={
                                tradeSide === "SELL"
                                  ? "active"
                                  : ""
                              }
                              onClick={() => {
                                handleTradeSideChange(
                                  "SELL"
                                );
                              }}
                            >
                              Sell
                            </button>
                          </div>

                          <div className="trade-amount-box">
                          <input
                            type="text"
                            inputMode="decimal"
                            placeholder="0.0"
                            value={tradeAmount}
                            onChange={(event) => {
                              const value =
                                event.target.value;

                              if (
                                value === "" ||
                                /^\d*\.?\d{0,18}$/.test(
                                  value
                                )
                              ) {
                                setTradeAmount(
                                  value
                                );

                                setTradeError("");
                              }
                            }}
                          />

                            <div className="trade-currency">
                              {tradeSide === "BUY"
                                ? "USDC"
                                : selectedLaunch.symbol}
                            </div>
                          </div>

                          <div className="trade-balance-row">
                            <span>
                              BALANCE
                            </span>

                            <strong>
                              {Number(
                                tradeSide === "BUY"
                                  ? tradeQuoteBalance.formatted
                                  : tradeTokenBalance.formatted
                              ).toLocaleString(
                                undefined,
                                {
                                  maximumFractionDigits: 6,
                                }
                              )}{" "}
                              {tradeSide === "BUY"
                                ? "USDC"
                                : selectedLaunch.symbol}
                            </strong>
                          </div>

                          <div className="trade-quick-buttons">
                            {tradeSide === "BUY" ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setTradeAmount("25")
                                  }
                                >
                                  $25
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    setTradeAmount("100")
                                  }
                                >
                                  $100
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    setTradeAmount("250")
                                  }
                                >
                                  $250
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    setTradeAmount("500")
                                  }
                                >
                                  $500
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  disabled={
                                    Number(
                                      tradeTokenBalance.formatted
                                    ) <= 0
                                  }
                                  onClick={() =>
                                    handleSellPercent(25)
                                  }
                                >
                                  25%
                                </button>

                                <button
                                  type="button"
                                  disabled={
                                    Number(
                                      tradeTokenBalance.formatted
                                    ) <= 0
                                  }
                                  onClick={() =>
                                    handleSellPercent(50)
                                  }
                                >
                                  50%
                                </button>

                                <button
                                  type="button"
                                  disabled={
                                    Number(
                                      tradeTokenBalance.formatted
                                    ) <= 0
                                  }
                                  onClick={() =>
                                    handleSellPercent(75)
                                  }
                                >
                                  75%
                                </button>

                                <button
                                  type="button"
                                  disabled={
                                    Number(
                                      tradeTokenBalance.formatted
                                    ) <= 0
                                  }
                                  onClick={() =>
                                    handleSellPercent(100)
                                  }
                                >
                                  100%
                                </button>
                              </>
                            )}
                          </div>
                          

                          <button
                            type="button"
                            className="trade-wallet-button"
                            disabled={trading}
                            onClick={handleTrade}
                          >
                            {trading
                              ? `${tradeSide}ING...`
                              : tradeSide === "BUY"
                                ? `BUY ${selectedLaunch.symbol}`
                                : `SELL ${selectedLaunch.symbol}`}
                          </button>

                          {tradeError && (
                            <div className="trade-error">
                              {tradeError}
                            </div>
                          )}
                        </div>

                        <div className="trade-box">
                          <div className="trade-stats-top">
                            <div>
                              <button className="active">
                                Stats
                              </button>
                            </div>

                            <div>
                            <button
                              type="button"
                              className={
                                statsTimeframe === "5m"
                                  ? "active"
                                  : ""
                              }
                              onClick={() =>
                                setStatsTimeframe(
                                  "5m"
                                )
                              }
                            >
                              5m
                            </button>

                            <button
                              type="button"
                              className={
                                statsTimeframe === "1h"
                                  ? "active"
                                  : ""
                              }
                              onClick={() =>
                                setStatsTimeframe(
                                  "1h"
                                )
                              }
                            >
                              1h
                            </button>

                            <button
                              type="button"
                              className={
                                statsTimeframe === "24h"
                                  ? "active"
                                  : ""
                              }
                              onClick={() =>
                                setStatsTimeframe(
                                  "24h"
                                )
                              }
                            >
                              24h
                            </button>
                            </div>
                          </div>

                          <div className="trade-stat-line">
                            <span>
                              Price change
                            </span>

                            <span
                              className={
                                statsPriceChange ===
                                null
                                  ? ""
                                  : statsPriceChange >= 0
                                    ? "stats-positive"
                                    : "stats-negative"
                              }
                            >
                              {selectedLaunch?.source === "DEX"
                              ? `${Number(
                                  selectedLaunch.priceChange24h || 0
                                ) >= 0
                                  ? "+"
                                  : ""
                                }${Number(
                                  selectedLaunch.priceChange24h || 0
                                ).toFixed(2)}%`
                              : formattedPriceChange}
                            </span>
                          </div>

                          <div className="trade-stat-line">
                            <span>
                              Volume
                            </span>

                            <span>
                              {selectedLaunch?.source === "DEX"
                              ? `$${Number(
                                  selectedLaunch.volume24h || 0
                                ).toLocaleString(
                                  undefined,
                                  {
                                    notation: "compact",
                                    maximumFractionDigits: 2,
                                  }
                                )}`
                              : `$${formattedStatsVolume}`}
                            </span>
                          </div>

                          <div className="trade-stat-bars">
                            <div>
                            <span className="positive">
                              {selectedLaunch?.source === "DEX"
                                ? Number(
                                    selectedLaunch.buys24h || 0
                                  ).toLocaleString()
                                : tradeStats.buyCount}{" "}
                              buys
                            </span>

                            <span className="negative">
                              {selectedLaunch?.source === "DEX"
                                ? Number(
                                    selectedLaunch.sells24h || 0
                                  ).toLocaleString()
                                : tradeStats.sellCount}{" "}
                              sells
                            </span>
                            </div>

                            <div className="trade-stat-bar">
                            <span
                              style={{
                                width:
                                  `${buyPercent}%`,
                              }}
                            />

                            <span
                              style={{
                                width:
                                  `${sellPercent}%`,
                              }}
                            />
                          </div>
                          </div>
                        </div>

                        <div className="trade-box trade-creator-box">
                          <span>Creator</span>

                          <strong>
                            {selectedLaunch.creator
                              ? `${selectedLaunch.creator.slice(
                                  0,
                                  6
                                )}...${selectedLaunch.creator.slice(
                                  -4
                                )}`
                              : "—"}
                          </strong>
                        </div>

                        {selectedLaunch?.source !== "DEX" && (
                          <div className="trade-box">
                            <div className="trade-progress-row">
                              <strong>MC $10K</strong>
                              <span>→</span>
                              <strong>$60K</strong>
                            </div>

                            <div className="trade-progress-track">
                              <span />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
          </div>

          {genesisDropOpen && (
                <div
                  className="genesis-drop-overlay"
                  onClick={() => setGenesisDropOpen(false)}
                >
                  <div
                    className="genesis-drop-modal"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      className="genesis-drop-close"
                      onClick={() => setGenesisDropOpen(false)}
                      aria-label="Close Genesis Drop"
                    >
                      ×
                    </button>

                    {genesisDropView === "details" ? (
                      <div className="genesis-details">

                        {genesisDropView === "details" && (
                          <div className="genesis-details">

                            <div className="genesis-details-heading">
                              <span className="genesis-details-kicker">
                                &gt; GENESIS_MINT_DETAILS
                              </span>

                              <h2>
                                ARC TERMINAL GENESIS
                              </h2>

                              <p>
                                The Arc Terminal Genesis collection consists of
                                5,555 terminal-inspired pixel art NFTs on Arc,
                                forming part of the broader ecosystem that includes
                                SEIS TERMINAL Launchpad, DEX Trading, and more.
                              </p>
                            </div>


                            <div className="genesis-details-total">
                              <span>MAX SUPPLY</span>
                              <strong>5555</strong>
                            </div>


                            <div className="genesis-details-grid">

                              <div className="genesis-details-phase">
                                <div className="genesis-details-phase-head">
                                  <strong>TEAM</strong>
                                  <span>55 NFT</span>
                                </div>

                                <div className="genesis-details-line">
                                  <span>PRICE</span>
                                  <strong>FREE</strong>
                                </div>

                                <div className="genesis-details-line">
                                  <span>WALLET LIMIT</span>
                                  <strong>55</strong>
                                </div>

                                <div className="genesis-details-line">
                                  <span>START</span>
                                  <strong>
                                    {genesisState
                                      ? formatGenesisTime(genesisState.teamStart)
                                      : "LOADING_"}
                                  </strong>
                                </div>

                                <div className="genesis-details-line">
                                  <span>END</span>
                                  <strong>
                                    {genesisState
                                      ? formatGenesisTime(genesisState.teamEnd)
                                      : "LOADING_"}
                                  </strong>
                                </div>
                              </div>


                              <div className="genesis-details-phase">
                                <div className="genesis-details-phase-head">
                                  <strong>OG (GTD)</strong>
                                  <span>3200 NFT</span>
                                </div>

                                <div className="genesis-details-line">
                                  <span>PRICE</span>
                                  <strong>FREE</strong>
                                </div>

                                <div className="genesis-details-line">
                                  <span>WALLET LIMIT</span>
                                  <strong>1 NFT</strong>
                                </div>

                                <div className="genesis-details-line">
                                  <span>START</span>
                                  <strong>
                                    {genesisState
                                      ? formatGenesisTime(genesisState.ogStart)
                                      : "LOADING_"}
                                  </strong>
                                </div>

                                <div className="genesis-details-line">
                                  <span>END</span>
                                  <strong>
                                    {genesisState
                                      ? formatGenesisTime(genesisState.ogEnd)
                                      : "LOADING_"}
                                  </strong>
                                </div>
                              </div>


                              <div className="genesis-details-phase">
                                <div className="genesis-details-phase-head">
                                  <strong>FCFS</strong>
                                  <span>2000 NFT</span>
                                </div>

                                <div className="genesis-details-line">
                                  <span>PRICE</span>
                                  <strong>5.55 USDC</strong>
                                </div>

                                <div className="genesis-details-line">
                                  <span>WALLET LIMIT</span>
                                  <strong>2 NFT</strong>
                                </div>

                                <div className="genesis-details-line">
                                  <span>START</span>
                                  <strong>
                                    {genesisState
                                      ? formatGenesisTime(genesisState.fcfsStart)
                                      : "LOADING_"}
                                  </strong>
                                </div>

                                <div className="genesis-details-line">
                                  <span>END</span>
                                  <strong>
                                    {genesisState
                                      ? formatGenesisTime(genesisState.fcfsEnd)
                                      : "LOADING_"}
                                  </strong>
                                </div>
                              </div>


                              <div className="genesis-details-phase">
                                <div className="genesis-details-phase-head">
                                  <strong>PUBLIC</strong>
                                  <span>300 NFT</span>
                                </div>

                                <div className="genesis-details-line">
                                  <span>PRICE</span>
                                  <strong>8.55 USDC</strong>
                                </div>

                                <div className="genesis-details-line">
                                  <span>WALLET LIMIT</span>
                                  <strong>2 NFT</strong>
                                </div>

                                <div className="genesis-details-line">
                                  <span>START</span>
                                  <strong>
                                    {genesisState
                                      ? formatGenesisTime(genesisState.publicStart)
                                      : "LOADING_"}
                                  </strong>
                                </div>

                                <div className="genesis-details-line">
                                  <span>END</span>
                                  <strong>
                                    {genesisState
                                      ? formatGenesisTime(genesisState.publicEnd)
                                      : "LOADING_"}
                                  </strong>
                                </div>
                              </div>

                            </div>


                            <div className="genesis-details-note">
                              <span>&gt; MINT_INFO_</span>

                              <p>
                                OG (GTD) and FCFS begin at the same time.
                                FCFS initially has an allocation of 2,000 NFTs.
                                If the OG allocation is not fully minted before the OG phase ends,
                                the remaining unminted OG supply will roll over to FCFS.
                                The rollover becomes available only after the OG phase has ended
                                and while the FCFS phase remains active.
                              </p>
                            </div>


                            <button
                              type="button"
                              className="genesis-details-enter"
                              onClick={() =>
                                setGenesisDropView("mint")
                              }
                            >
                              ENTER GENESIS MINT_
                            </button>

                          </div>
                        )}

                      </div>

                    ) : (

                    <div className="genesis-drop-content">
                      {/* =========================================================
                          COLLECTION HEADER
                          ========================================================= */}

                      <div className="genesis-collection-header">

                        <div className="genesis-collection-banner">
                          <img
                            src="/bannergenesis.png"
                            alt="Genesis Banner"
                            className="genesis-banner-image"
                          />
                        </div>

                        <div className="genesis-collection-info">

                          <div className="genesis-collection-logo">
                            <img
                              src="/logogenesis.png"
                              alt="Genesis Logo"
                              className="genesis-logo-image"
                            />
                          </div>

                          <div className="genesis-collection-meta">

                            <div className="genesis-collection-title-row">

                            <div>
                              <div className="genesis-collection-name-row">
                                <h2 className="genesis-collection-title">
                                  GENESIS
                                </h2>
                              </div>

                              <span className="genesis-collection-subtitle">
                                ARC TERMINAL
                              </span>

                              <a
                                  href={`https://explorer.arc.io/address/${GENESIS_CONTRACT_ADDRESS}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="genesis-contract-address"
                                  title="View contract on Arc Explorer"
                                >
                                  {GENESIS_CONTRACT_ADDRESS}
                                </a>
                            </div>

                              <div className="genesis-social-links">

                                <a
                                  href="https://www.arcterminal.space/#home"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="genesis-social-link"
                                  aria-label="ARC TERMINAL Website"
                                >
                                  <img
                                    src="/icon/website.png"
                                    alt=""
                                    className="genesis-social-icon"
                                  />
                                </a>

                                <a
                                  href="https://x.com/ArcTerminalss"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="genesis-social-link"
                                  aria-label="ARC TERMINAL on X"
                                >
                                  <img
                                    src="/icon/x.png"
                                    alt=""
                                    className="genesis-social-icon"
                                  />
                                </a>

                                <a
                                  href="https://discord.gg/arcterminal"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="genesis-social-link"
                                  aria-label="ARC TERMINAL Discord"
                                >
                                  <img
                                    src="/icon/discord.png"
                                    alt=""
                                    className="genesis-social-icon genesis-social-icon-discord"
                                  />
                                </a>

                                </div>

                            </div>

                          </div>

                        </div>

                      </div>


                      {/* =========================================================
                          AVAILABLE ITEMS
                          ========================================================= */}

                      <div className="genesis-available-section">
                        {genesisNextTarget > 0 && (
                          <div className="genesis-countdown-row">

                            <div className="genesis-countdown">

                              <div className="genesis-countdown-unit">
                                <div
                                  className="genesis-countdown-number"
                                  key={`d-${genesisCountdownDays}`}
                                >
                                  {padGenesisCountdown(
                                    genesisCountdownDays
                                  )}
                                </div>

                                <span>DAYS</span>
                              </div>

                              <div className="genesis-countdown-separator">
                                :
                              </div>

                              <div className="genesis-countdown-unit">
                                <div
                                  className="genesis-countdown-number"
                                  key={`h-${genesisCountdownHours}`}
                                >
                                  {padGenesisCountdown(
                                    genesisCountdownHours
                                  )}
                                </div>

                                <span>HOURS</span>
                              </div>

                              <div className="genesis-countdown-separator">
                                :
                              </div>

                              <div className="genesis-countdown-unit">
                                <div
                                  className="genesis-countdown-number"
                                  key={`m-${genesisCountdownMinutes}`}
                                >
                                  {padGenesisCountdown(
                                    genesisCountdownMinutes
                                  )}
                                </div>

                                <span>MINS</span>
                              </div>

                              <div className="genesis-countdown-separator">
                                :
                              </div>

                              <div className="genesis-countdown-unit">
                                <div
                                  className="genesis-countdown-number"
                                  key={`s-${genesisCountdownSecs}`}
                                >
                                  {padGenesisCountdown(
                                    genesisCountdownSecs
                                  )}
                                </div>

                                <span>SECS</span>
                              </div>

                            </div>

                          </div>
                        )}

                        <div className="genesis-available-row">
                          <span>
                            AVAILABLE ITEMS
                          </span>

                          <strong>
                            {genesisState
                              ? `${genesisState.totalSupply} / ${genesisState.maxSupply}`
                              : "0 / 5555"}
                          </strong>
                        </div>

                        <div className="genesis-supply-track">
                          <div
                            className="genesis-supply-fill"
                            style={{
                              width: genesisState
                                ? `${
                                    (
                                      genesisState.totalSupply /
                                      genesisState.maxSupply
                                    ) * 100
                                  }%`
                                : "0%",
                            }}
                          />
                        </div>
                      </div>


                      {/* =========================================================
                          ARTWORK PREVIEW
                          ========================================================= */}

                      <div className="genesis-art-grid">

                        <div className="genesis-art-card">
                          <img
                            src="/preview/previewa.png"
                            alt="Genesis preview 01"
                            className="genesis-art-image"
                          />
                        </div>

                        <div className="genesis-art-card">
                          <img
                            src="/preview/previewb.png"
                            alt="Genesis preview 02"
                            className="genesis-art-image"
                          />
                        </div>

                        <div className="genesis-art-card">
                          <img
                            src="/preview/previewc.png"
                            alt="Genesis preview 03"
                            className="genesis-art-image"
                          />
                        </div>

                        <div className="genesis-art-card">
                          <img
                            src="/preview/previewd.png"
                            alt="Genesis preview 04"
                            className="genesis-art-image"
                          />
                        </div>

                      </div>

                      {/* =========================================================
                          GENESIS PHASES
                          ========================================================= */}

                      <div className="genesis-phase-grid">

                      {/* =======================================================
                          TEAM
                          ======================================================= */}

                      <section className="genesis-phase-card">

                        <span
                          className={
                            genesisTeamLive
                              ? "genesis-live-badge genesis-live-badge-active"
                              : "genesis-live-badge"
                          }
                        >
                          {genesisTeamLive
                            ? "LIVE"
                            : "NOT LIVE"}
                        </span>

                        <div className="genesis-phase-card-copy">

                          <div className="genesis-phase-card-title-row">
                            <h3>TEAM</h3>
                          </div>

                          <span className="genesis-phase-date">
                            Starts:{" "}
                            {genesisState
                              ? formatGenesisTime(
                                  genesisState.teamStart
                                )
                              : "—"}
                          </span>

                          <span className="genesis-phase-date">
                            Ends:{" "}
                            {genesisState
                              ? formatGenesisTime(
                                  genesisState.teamEnd
                                )
                              : "—"}
                          </span>

                          <code>
                            FREE
                          </code>

                        </div>

                        <div className="genesis-phase-card-actions">

                          <div className="genesis-mint-quantity">

                            <button
                              type="button"
                              onClick={() =>
                                setGenesisMintQuantity(
                                  (prev) =>
                                    Math.max(
                                      1,
                                      prev - 1
                                    )
                                )
                              }
                              disabled={
                                genesisMinting ||
                                genesisMintQuantity <= 1
                              }
                            >
                              −
                            </button>

                            <span>
                              {genesisMintQuantity}
                            </span>

                            <button
                              type="button"
                              onClick={() =>
                                setGenesisMintQuantity(
                                  (prev) =>
                                    Math.min(
                                      55,
                                      prev + 1
                                    )
                                )
                              }
                              disabled={
                                genesisMinting ||
                                genesisMintQuantity >= 55
                              }
                            >
                              +
                            </button>

                          </div>

                          <button
                            type="button"
                            className={`genesis-phase-action ${
                              genesisTeamLive &&
                              genesisTeamEligible
                                ? "genesis-phase-action-live"
                                : genesisTeamLive &&
                                    !genesisTeamEligible
                                  ? "genesis-phase-action-ineligible"
                                  : genesisState &&
                                      genesisNow >=
                                        genesisState.teamEnd
                                    ? "genesis-phase-action-ended"
                                    : "genesis-phase-action-upcoming"
                            }`}
                            onClick={
                              handleGenesisTeamMint
                            }
                            disabled={
                              genesisMinting ||
                              !connected ||
                              !genesisTeamLive ||
                              !genesisTeamEligible
                            }
                          >
                            {genesisMinting
                              ? "MINTING..."
                              : !connected
                                ? "CONNECT WALLET"
                                : genesisTeamLive
                                  ? genesisTeamEligible
                                    ? "MINT"
                                    : "NOT ELIGIBLE"
                                  : genesisState &&
                                      genesisNow >=
                                        genesisState.teamEnd
                                    ? "ENDED"
                                    : "UPCOMING"}
                          </button>

                          </div>

                      </section>


                      {/* =======================================================
                          OG
                          ======================================================= */}

                      <section className="genesis-phase-card">
                        <span
                          className={`genesis-eligibility-badge ${
                            genesisOgEligible
                              ? "genesis-eligibility-badge-eligible"
                              : "genesis-eligibility-badge-ineligible"
                          }`}
                        >
                          {genesisOgEligible
                            ? "ELIGIBLE"
                            : "NOT ELIGIBLE"}
                        </span>
                        <span
                          className={
                            genesisOgLive
                              ? "genesis-live-badge genesis-live-badge-active"
                              : "genesis-live-badge"
                          }
                        >
                          {genesisOgLive
                            ? "LIVE"
                            : "NOT LIVE"}
                        </span>

                        <div className="genesis-phase-card-copy">

                          <div className="genesis-phase-card-title-row">
                            <h3>OG (GTD)</h3>

                            <button
                              type="button"
                              className="genesis-address-count-button"
                              onClick={() =>
                                setGenesisCountOpen(
                                  (prev) => ({
                                    ...prev,
                                    og: !prev.og,
                                  })
                                )
                              }
                            >
                              {genesisCountOpen.og
                                ? `[${genesisWhitelistCounts.og ?? "—"}]`
                                : "[ADDRESS]"}
                            </button>
                          </div>

                          <span className="genesis-phase-date">
                            Starts:{" "}
                            {genesisState
                              ? formatGenesisTime(
                                  genesisState.ogStart
                                )
                              : "—"}
                          </span>

                          <span className="genesis-phase-date">
                            Ends:{" "}
                            {genesisState
                              ? formatGenesisTime(
                                  genesisState.ogEnd
                                )
                              : "—"}
                          </span>

                          <code>
                            FREE | LIMIT 1 PER WALLET
                          </code>

                        </div>

                        <div className="genesis-phase-card-actions">

                          <div className="genesis-mint-quantity">
                            <button
                              type="button"
                              disabled
                            >
                              −
                            </button>

                            <span>
                              {genesisOgQuantity}
                            </span>

                            <button
                              type="button"
                              disabled
                            >
                              +
                            </button>
                          </div>

                          <button
                            type="button"
                            className={`genesis-phase-action ${
                              genesisOgLive && genesisOgEligible
                                ? "genesis-phase-action-live"
                                : genesisOgLive && !genesisOgEligible
                                  ? "genesis-phase-action-ineligible"
                                  : genesisState &&
                                      genesisNow >= genesisState.ogEnd
                                    ? "genesis-phase-action-ended"
                                    : "genesis-phase-action-upcoming"
                            }`}
                            onClick={
                              handleGenesisOgMint
                            }
                            disabled={
                              genesisMinting ||
                              !connected ||
                              !genesisOgLive ||
                              !genesisOgEligible ||
                              genesisOgWalletMaxed
                            }
                          >
                          {genesisMinting
                            ? "MINTING..."
                            : !connected
                              ? "CONNECT WALLET"
                              : genesisOgWalletMaxed
                                ? "MINT LIMIT REACHED"
                                : genesisOgLive
                                  ? genesisOgEligible
                                    ? "MINT"
                                    : "NOT ELIGIBLE"
                                  : genesisState &&
                                      genesisNow >=
                                        genesisState.ogEnd
                                    ? "ENDED"
                                    : "UPCOMING"}
                          </button>
                        </div>
                      </section>


                      {/* =======================================================
                          FCFS
                          ======================================================= */}

                      <section className="genesis-phase-card">
                        <span
                          className={`genesis-eligibility-badge ${
                            genesisFcfsEligible
                              ? "genesis-eligibility-badge-eligible"
                              : "genesis-eligibility-badge-ineligible"
                          }`}
                        >
                          {genesisFcfsEligible
                            ? "ELIGIBLE"
                            : "NOT ELIGIBLE"}
                        </span>
                        <span
                          className={
                            genesisFcfsLive
                              ? "genesis-live-badge genesis-live-badge-active"
                              : "genesis-live-badge"
                          }
                        >
                          {genesisFcfsLive
                            ? "LIVE"
                            : "NOT LIVE"}
                        </span>

                        <div className="genesis-phase-card-copy">

                          <div className="genesis-phase-card-title-row">
                            <h3>FCFS</h3>

                            <button
                              type="button"
                              className="genesis-address-count-button"
                              onClick={() =>
                                setGenesisCountOpen(
                                  (prev) => ({
                                    ...prev,
                                    fcfs: !prev.fcfs,
                                  })
                                )
                              }
                            >
                              {genesisCountOpen.fcfs
                                ? `[${genesisWhitelistCounts.fcfs ?? "—"}]`
                                : "[ADDRESS]"}
                            </button>
                          </div>

                          <span className="genesis-phase-date">
                            Starts:{" "}
                            {genesisState
                              ? formatGenesisTime(
                                  genesisState.fcfsStart
                                )
                              : "—"}
                          </span>

                          <span className="genesis-phase-date">
                            Ends:{" "}
                            {genesisState
                              ? formatGenesisTime(
                                  genesisState.fcfsEnd
                                )
                              : "—"}
                          </span>

                          <code>
                            {genesisState
                              ? `${genesisState.fcfsPrice} USDC`
                              : "— USDC"}{" "}
                            | LIMIT 2 PER WALLET
                          </code>

                        </div>

                        <div className="genesis-phase-card-actions">

                          <div className="genesis-mint-quantity">
                            <button
                              type="button"
                              onClick={() =>
                                setGenesisFcfsQuantity(
                                  (prev) =>
                                    Math.max(
                                      1,
                                      prev - 1
                                    )
                                )
                              }
                              disabled={
                                genesisMinting ||
                                genesisFcfsWalletMaxed ||
                                genesisFcfsQuantity <= 1
                              }
                            >
                              −
                            </button>

                            <span>
                              {genesisFcfsQuantity}
                            </span>

                            <button
                              type="button"
                              onClick={() =>
                                setGenesisFcfsQuantity(
                                  (prev) =>
                                    Math.min(
                                      genesisFcfsRemaining,
                                      prev + 1
                                    )
                                )
                              }
                              disabled={
                                genesisMinting ||
                                genesisFcfsWalletMaxed ||
                                genesisFcfsQuantity >=
                                  genesisFcfsRemaining
                              }
                            >
                              +
                            </button>
                          </div>

                          <button
                            type="button"
                            className={`genesis-phase-action ${
                              genesisFcfsWalletMaxed
                                ? "genesis-phase-action-ended"
                                : genesisFcfsRolloverPending
                                  ? "genesis-phase-action-upcoming"
                                  : genesisFcfsLive &&
                                      genesisFcfsEligible
                                    ? "genesis-phase-action-live"
                                    : genesisFcfsLive &&
                                        !genesisFcfsEligible
                                      ? "genesis-phase-action-ineligible"
                                      : genesisState &&
                                          genesisNow >=
                                            genesisState.fcfsEnd
                                        ? "genesis-phase-action-ended"
                                        : "genesis-phase-action-upcoming"
                            }`}
                            onClick={
                              handleGenesisFcfsMint
                            }
                            disabled={
                              genesisMinting ||
                              !connected ||
                              !genesisFcfsLive ||
                              !genesisFcfsEligible ||
                              genesisFcfsWalletMaxed ||
                              genesisFcfsRolloverPending
                            }
                          >
                            {genesisMinting
                              ? "MINTING..."
                              : !connected
                                ? "CONNECT WALLET"
                                : genesisFcfsWalletMaxed
                                  ? "MINT LIMIT REACHED"
                                  : genesisFcfsRolloverPending
                                    ? "OG ROLLOVER PENDING"
                                    : genesisFcfsLive
                                      ? genesisFcfsEligible
                                        ? "MINT"
                                        : "NOT ELIGIBLE"
                                      : genesisState &&
                                          genesisNow >=
                                            genesisState.fcfsEnd
                                        ? "ENDED"
                                        : "UPCOMING"}
                          </button>
                        </div>
                      </section>


                      {/* =======================================================
                          PUBLIC
                          ======================================================= */}

                      <section className="genesis-phase-card">

                        <span
                          className={
                            genesisPublicLive
                              ? "genesis-live-badge genesis-live-badge-active"
                              : "genesis-live-badge"
                          }
                        >
                          {genesisPublicLive
                            ? "LIVE"
                            : "NOT LIVE"}
                        </span>

                        <div className="genesis-phase-card-copy">

                          <div className="genesis-phase-card-title-row">
                            <h3>PUBLIC</h3>

                            <span className="genesis-phase-tag">
                              PUBLIC
                            </span>
                          </div>

                          <span className="genesis-phase-date">
                            Starts:{" "}
                            {genesisState
                              ? formatGenesisTime(
                                  genesisState.publicStart
                                )
                              : "—"}
                          </span>

                          <span className="genesis-phase-date">
                            Ends:{" "}
                            {genesisState
                              ? formatGenesisTime(
                                  genesisState.publicEnd
                                )
                              : "—"}
                          </span>

                          <code>
                            {genesisState
                              ? `${genesisState.publicPrice} USDC`
                              : "— USDC"}{" "}
                            | LIMIT 2 PER WALLET
                          </code>

                        </div>

                        <div className="genesis-phase-card-actions">

                          <div className="genesis-mint-quantity">
                            <button
                              type="button"
                              onClick={() =>
                                setGenesisPublicQuantity(
                                  (prev) =>
                                    Math.max(
                                      1,
                                      prev - 1
                                    )
                                )
                              }
                              disabled={
                                genesisMinting ||
                                genesisPublicWalletMaxed ||
                                genesisPublicQuantity <= 1
                              }
                            >
                              −
                            </button>

                            <span>
                              {genesisPublicQuantity}
                            </span>

                            <button
                              type="button"
                              onClick={() =>
                                setGenesisPublicQuantity(
                                  (prev) =>
                                    Math.min(
                                      genesisPublicRemaining,
                                      prev + 1
                                    )
                                )
                              }
                              disabled={
                                genesisMinting ||
                                genesisPublicWalletMaxed ||
                                genesisPublicQuantity >=
                                  genesisPublicRemaining
                              }
                            >
                              +
                            </button>
                          </div>
                          <button
                            type="button"
                            className={`genesis-phase-action ${
                              genesisPublicWalletMaxed
                                ? "genesis-phase-action-ended"
                                : genesisPublicLive
                                  ? "genesis-phase-action-live"
                                  : genesisState &&
                                      genesisNow >=
                                        genesisState.publicEnd
                                    ? "genesis-phase-action-ended"
                                    : "genesis-phase-action-upcoming"
                            }`}
                            onClick={
                              handleGenesisPublicMint
                            }
                            disabled={
                              genesisMinting ||
                              !connected ||
                              !genesisPublicLive ||
                              genesisPublicWalletMaxed
                            }
                          >
                          {genesisMinting
                            ? "MINTING..."
                            : !connected
                              ? "CONNECT WALLET"
                              : genesisPublicWalletMaxed
                                ? "MINT LIMIT REACHED"
                                : genesisPublicLive
                                  ? "MINT"
                                  : genesisState &&
                                      genesisNow >=
                                        genesisState.publicEnd
                                    ? "ENDED"
                                    : "UPCOMING"}
                          </button>
                        </div>
                      </section>

                      </div>

                    </div>
                  )}
                  </div>
                </div>
              )}
        </section>
        </>
        )}

        {activePage === "SWAP" && (
          <SwapPage
            connected={connected}
            address={address}
            chainId={chainId}
            eip1193Provider={selectedProvider?.provider || null}
            switchToArcMainnet={switchToArcMainnet}
          />
        )}

        {activePage === "DOCS" && (
          <DocsPage />
        )}

        {activePage === "LITEPAPER" && (
          <LitepaperPage />
        )}

        {genesisDropOpen &&
          genesisLoading &&
          !genesisState && (
            <div className="genesis-loading-overlay">
              <div className="genesis-loading-modal">
                <span className="genesis-loading-spinner" />

                <span className="genesis-loading-text">
                  LOADING GENESIS DATA_
                </span>
              </div>
            </div>
          )}

        {genesisToast && (
          <>
            <div
              className="genesis-tx-backdrop"
              aria-hidden="true"
            />

            <div
              className="genesis-tx-toast"
              role="dialog"
              aria-modal="true"
            >

            <button
              type="button"
              className="genesis-tx-toast-close"
              onClick={() =>
                setGenesisToast(null)
              }
              aria-label="Close"
            >
              ×
            </button>


            {/* ================================================
                PENDING
                ================================================ */}

            {genesisToast.status ===
              "pending" && (
              <>
                <div className="genesis-tx-spinner" />

                <div className="genesis-tx-toast-copy">
                  <span className="genesis-tx-toast-eyebrow">
                    TRANSACTION PENDING
                  </span>

                  <strong>
                    MINTING GENESIS_
                  </strong>

                  <p>
                    Waiting for blockchain
                    confirmation...
                  </p>

                  <code>
                    QTY {genesisToast.quantity}
                  </code>
                </div>
              </>
            )}


            {/* ================================================
                SUCCESS
                ================================================ */}

            {genesisToast.status ===
              "success" && (
              <>
                <div className="genesis-fireworks">
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                </div>

                <div className="genesis-tx-success-icon">
                  ✓
                </div>

                <div className="genesis-tx-toast-copy">
                  <span className="genesis-tx-toast-eyebrow">
                    TRANSACTION CONFIRMED
                  </span>

                  <strong>
                    MINT SUCCESS_
                  </strong>

                  <p>
                    Successfully minted{" "}
                    {genesisToast.quantity} Genesis NFT
                    {genesisToast.quantity > 1
                      ? "s"
                      : ""}
                    .
                  </p>
                </div>

                <div className="genesis-tx-toast-actions">

                <a
                  href="https://opensea.io/collection/arc-terminal-genesis"
                  className="genesis-tx-opensea"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  VIEW ON OPENSEA
                </a>

                  <button
                    type="button"
                    className="genesis-tx-dismiss"
                    onClick={() =>
                      setGenesisToast(null)
                    }
                  >
                    CLOSE
                  </button>

                </div>
              </>
            )}


            {/* ================================================
                ERROR
                ================================================ */}

            {genesisToast.status ===
              "error" && (
              <>
                <div className="genesis-tx-error-icon">
                  ×
                </div>

                <div className="genesis-tx-toast-copy">
                  <span className="genesis-tx-toast-eyebrow">
                    TRANSACTION FAILED
                  </span>

                  <strong>
                    MINT FAILED_
                  </strong>

                  <p>
                    {genesisToast.message}
                  </p>
                </div>

                <button
                  type="button"
                  className="genesis-tx-dismiss genesis-tx-error-dismiss"
                  onClick={() =>
                    setGenesisToast(null)
                  }
                >
                  CLOSE
                </button>
              </>
            )}

          </div>
          </>
        )}
      </main>
    </div>
  );
}

export default App;
