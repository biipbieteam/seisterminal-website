import { useEffect, useState } from "react";
import {
  useWallet,
} from "./context/wallet-context";
import {
  getAllFairLaunches,
  getTokenExplorerUrl,
} from "./contracts/launchReader.js";
import {
  launchFairToken,
} from "./contracts/launchWriter.js";
import {
  getLaunchMetadata,
  getIndexedLaunches,
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
import "./App.css";



function App() {

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
    activePage,
    setActivePage,
  ] = useState("MARKET");

  const [
    mobileSidebarOpen, 
    setMobileSidebarOpen
  ] = useState(false);

  const {
    providers,
    selectedProvider,
    connected,
    connecting,
    address,
    chainId,
    isArcTestnet,
    switchToArcTestnet,
    addArcTestnet,
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
  
  
      let orderedLaunches;
  
  
      /*
       * ========================================================
       * PRIMARY MARKET SOURCE:
       * SUPABASE INDEX
       * ========================================================
       *
       * One database query instead of
       * N sequential blockchain RPC reads.
       */
      try {
        orderedLaunches =
          await getIndexedLaunches();
  
      } catch (
        indexedError
      ) {
        console.error(
          "Indexed market read failed. Falling back to ARC RPC:",
          indexedError
        );
  
  
        /*
         * ======================================================
         * EMERGENCY FALLBACK:
         * BLOCKCHAIN READER
         * ======================================================
         *
         * Keep the existing RPC path available
         * if the indexed database is unavailable.
         */
  
        const blockchainLaunches =
          await getAllFairLaunches(
            cachedLaunches
          );
  
  
        /*
         * Existing metadata enrichment
         * remains available for fallback.
         */
        let metadata = [];
  
        try {
          metadata =
            await getLaunchMetadata();
        } catch (
          metadataError
        ) {
          console.error(
            "Failed to load launch metadata:",
            metadataError
          );
        }
  
  
        const metadataByToken =
          new Map(
            metadata.map(
              (item) => [
                item.token_address
                  .toLowerCase(),
  
                item,
              ]
            )
          );
  
  
        const enrichedLaunches =
          blockchainLaunches.map(
            (launch) => {
              const tokenAddress =
                launch?.tokenAddress;
  
              if (
                !tokenAddress
              ) {
                return {
                  ...launch,
                  logoUrl:
                    null,
                };
              }
  
  
              const metadataItem =
                metadataByToken.get(
                  tokenAddress
                    .toLowerCase()
                );
  
  
              return {
                ...launch,
  
                logoUrl:
                  metadataItem
                    ?.logoUrl ||
                  null,
  
                launchTransactionHash:
                  metadataItem
                    ?.transaction_hash ||
                  null,
              };
            }
          );
  
  
        orderedLaunches =
          [
            ...enrichedLaunches,
          ].reverse();
      }
  
  
      /*
       * Database query is already:
       *
       * launch_id DESC
       *
       * so no reverse() is needed for
       * the normal indexed path.
       */
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
      
        console.log(
          "ARC TRADE HISTORY DATA:",
          history
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
      const balance =
        await getTradeTokenBalance({
          eip1193Provider:
            selectedProvider.provider,

          tokenAddress:
            launch.tokenAddress,

          walletAddress:
            address,
        });

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
  
    if (!isArcTestnet) {
      setLaunchError(
        "Switch to ARC Testnet before launching."
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
  
    if (!isArcTestnet) {
      setTradeError(
        "Switch to ARC Testnet before trading."
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
       * On-chain transaction is already
       * confirmed at this point.
       *
       * Supabase indexing failure must not
       * turn the trade into a failed trade.
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
       * Unlock immediately after
       * confirmed trade.
       *
       * Keep tradeAmount unchanged so
       * user may trade again instantly.
       */
      setTrading(false);
  
      /*
       * Refresh ancillary UI independently.
       */
      await Promise.allSettled([
        refreshLaunches(),
      
        refreshTradeStats(
          selectedLaunch.launchId
        ),
      
        refreshTradeTokenBalance(
          selectedLaunch
        ),

        refreshTradeQuoteBalance(),
      
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
  
  useEffect(() => {
    async function testSupabase() {
      try {
        const rows =
          await getLaunchMetadata();
  
        console.log(
          "Supabase launch metadata:",
          rows
        );
      } catch (error) {
        console.error(
          "Supabase test failed:",
          error
        );
      }
    }
  
    testSupabase();
  }, []);



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

  const tickerTokens =
  liveLaunches
    .map((launch) => {
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

      return {
        tokenAddress:
          launch.tokenAddress,

        symbol:
          launch.symbol,

        logoUrl:
          launch.logoUrl,

        progress,
      };
    })
    .filter(
      (token) =>
        token.progress > 0
    )
    .sort(
      (a, b) =>
        b.progress -
        a.progress
    );

    const refreshTradeQuoteBalance =
    async () => {
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
        const balance =
          await getTradeQuoteBalance({
            eip1193Provider:
              selectedProvider.provider,
    
            walletAddress:
              address,
          });
    
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
    
      refreshTradeQuoteBalance();
    
    }, [
      address,
      connected,
      selectedProvider?.provider,
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
              className="sidebar-nav-item"
            >
              <span className="sidebar-nav-icon">
                ↔
              </span>

              <span className="sidebar-nav-label">
                SWAP
                <small className="sidebar-soon">
                  SOON
                </small>
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
            <section className="trending-section">
              <div className="section-label">
                PLATFORM STATS_
              </div>

              <div className="platform-stats-grid">

                <div className="platform-stat-card">
                  <span className="platform-stat-label">
                    TOTAL TOKENS
                  </span>

                  <strong>
                    {platformStats.totalTokens}
                  </strong>
                </div>

                <div className="platform-stat-card">
                  <span className="platform-stat-label">
                    TOTAL VOLUME
                  </span>

                  <strong>
                    $
                    {platformStats.totalVolume.toLocaleString(
                      undefined,
                      {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }
                    )}
                  </strong>
                </div>

                <div className="platform-stat-card">
                  <span className="platform-stat-label">
                    TOTAL TXNS
                  </span>

                  <strong>
                    {platformStats.totalTxns}
                  </strong>
                </div>
              </div>
            </section>

        <section className="market">
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
                placeholder="Search contract address"
                value={tokenSearch}
                onChange={(event) => {
                  setTokenSearch(
                    event.target.value
                  );
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
                        event.key === "Enter" ||
                        event.key === " "
                      ) {
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
                      }
                    }}
                  >
                      <div className="market-ticker-logo">
                        {token.logoUrl ? (
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

                      <span>
                        +{token.progress.toFixed(4)}%
                      </span>
                    </div>
                  )
                )}

              </div>
            </div>
          </div>

          <div className="market-table">
            <div className="market-row market-header">
              <span>TOKEN</span>
              <span>MARKET CAP</span>
              <span>TXNS</span>
              <span>PRICE (USDC)</span>
              <span>PROGRESS</span>
              <span>LIQUIDITY</span>

            </div>

            {launchesLoading && liveLaunches.length === 0 && (
              <div className="market-loading-layer">
                <div className="market-loading-toast">
                  <div className="market-loading-spinner" />

                  <div className="market-loading-content">
                    <strong>LOADING MARKET_</strong>
                    <span>Fetching tokens from ARC Testnet...</span>
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

            {!launchesLoading &&
              !launchesError &&
              liveLaunches
                .filter((launch) => {
                  const query =
                    tokenSearch
                      .trim()
                      .toLowerCase();

                  if (!query) {
                    return true;
                  }

                  return (
                    launch.tokenAddress &&
                    launch.tokenAddress
                      .toLowerCase()
                      .includes(query)
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
                    className="market-row"
                    key={launch.launchId.toString()}
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
                  <div className="market-token">
                    <div className="token-icon">
                    {launch.logoUrl ? (
                      <img
                        className="token-icon-image"
                        src={launch.logoUrl}
                        alt=""
                        loading="lazy"
                        decoding="async"
                      />
                    ) : null}

                    <span
                      className={
                        launch.logoUrl
                          ? "token-icon-fallback token-icon-fallback-hidden"
                          : "token-icon-fallback"
                      }
                    >
                      {launch.symbol
                        .charAt(0)
                        .toUpperCase()}
                    </span>
                    </div>

                    <div>
                      <strong>
                        {launch.symbol}
                      </strong>

                      <small>
                        {launch.name}
                      </small>

                      <div className="token-contract-row">
                      <a
                        className="token-contract-address"
                        href={getTokenExplorerUrl(
                          launch.tokenAddress
                        )}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {shortAddress}
                      </a>

                      <button
                        type="button"
                        className={
                          copiedTokenAddress ===
                          launch.tokenAddress
                            ? "token-copy-button token-copy-button-copied"
                            : "token-copy-button"
                        }
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

                  <span className="market-cap-live">
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
                  </span>

                  <span>
                    {launch.transactionCount.toString()}
                  </span>

                  <span>
                    {spotPrice.toLocaleString(
                      undefined,
                      {
                        minimumFractionDigits: 8,
                        maximumFractionDigits: 8,
                      }
                    )}
                  </span>

                    <span className="positive">
                      {progress.toFixed(4)}%
                    </span>

                    <span>
                      {launch.statusLabel === "GRADUATED"
                        ? "DEX"
                        : "—"}
                    </span>
                  </div>
                );
              })}

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
                            TOKEN LOGO (OPTIONAL)
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
                          !tokenSymbol.trim()
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
                        <span>ADDRESS</span>

                        <strong>
                          {address.slice(0, 10)}
                          ...
                          {address.slice(-8)}
                        </strong>
                      </div>

                      <div className="account-info-block">
                      <span>NETWORK</span>

                      <strong
                        className={
                          isArcTestnet
                            ? "network-status network-correct"
                            : "network-status network-wrong"
                        }
                      >
                        {isArcTestnet
                          ? "● ARC TESTNET"
                          : "● WRONG NETWORK"}
                      </strong>

                      <small className="network-chain-id">
                        Current Chain ID:{" "}
                        {chainId
                          ? parseInt(chainId, 16)
                          : "—"}
                      </small>
                      </div>

                      {!isArcTestnet && !arcNetworkNeedsAdd && (
                        <button
                          className="account-switch-button"
                          onClick={async () => {
                            const result =
                              await switchToArcTestnet();

                            if (result.needsAdd) {
                              setArcNetworkNeedsAdd(true);
                            }
                          }}
                        >
                          SWITCH TO ARC
                        </button>
                      )}

                      {!isArcTestnet && arcNetworkNeedsAdd && (
                        <button
                          className="account-switch-button"
                          onClick={async () => {
                            const success =
                              await addArcTestnet();

                            if (success) {
                              setArcNetworkNeedsAdd(false);
                            }
                          }}
                        >
                          ADD ARC TESTNET
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
                              Launched on ARC Testnet
                            </span>

                          </div>
                        </div>
                      </div>

                      <div className="trade-terminal-mcap">
                        <span>Market cap</span>
                        <strong>$10K</strong>
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
                              ARC TESTNET_
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
                                          href={`https://testnet.arcscan.app/tx/${trade.transaction_hash}`}
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
                              {formattedPriceChange}
                            </span>
                          </div>

                          <div className="trade-stat-line">
                            <span>
                              Volume
                            </span>

                            <span>
                              ${formattedStatsVolume}
                            </span>
                          </div>

                          <div className="trade-stat-bars">
                            <div>
                            <span className="positive">
                              {tradeStats.buyCount} buys
                            </span>

                            <span className="negative">
                              {tradeStats.sellCount} sells
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
                      </div>
                    </div>
                  </div>
                </div>
              )}
          </div>
        </section>
        </>
        )}

        {activePage === "DOCS" && (
          <DocsPage />
        )}

        {activePage === "LITEPAPER" && (
          <LitepaperPage />
        )}
      </main>
    </div>
  );
}

export default App;