import {
    useEffect,
    useMemo,
    useState,
  } from "react";
  
  import {
    WalletContext,
  } from "./wallet-context";
  import {
    ARC_TESTNET,
    ARC_MAINNET,
  } from "../lib/arcNetwork";
  
  const WALLET_SESSION_KEY =
  "arc_terminal_wallet_session";

  export function WalletProvider({ children }) {
    const [providers, setProviders] = useState([]);
    const [selectedProvider, setSelectedProvider] =
      useState(null);
  
    const [address, setAddress] = useState("");
    const [chainId, setChainId] = useState("");
  
    const [connecting, setConnecting] =
      useState(false);
  
    const [walletError, setWalletError] =
      useState("");
  
    const connected = Boolean(
      selectedProvider && address
    );

    const isArcTestnet =
    chainId?.toLowerCase() ===
    ARC_TESTNET.chainId.toLowerCase();

    const isArcMainnet =
    chainId?.toLowerCase() ===
    ARC_MAINNET.chainId.toLowerCase();
  
    // =======================================================
    // EIP-6963 PROVIDER DISCOVERY
    // =======================================================
  
    useEffect(() => {
      const discovered = new Map();
  
      const handleProviderAnnouncement = (
        event
      ) => {
        const detail = event?.detail;
  
        if (
          !detail?.info ||
          !detail?.provider
        ) {
          return;
        }
  
        const key =
          detail.info.uuid ||
          detail.info.rdns ||
          detail.info.name;
  
        if (!key) return;
  
        discovered.set(key, detail);
  
        setProviders(
          Array.from(discovered.values())
        );
      };
  
      window.addEventListener(
        "eip6963:announceProvider",
        handleProviderAnnouncement
      );
  
      // Ask installed wallets to announce themselves.
      window.dispatchEvent(
        new Event(
          "eip6963:requestProvider"
        )
      );
  
      return () => {
        window.removeEventListener(
          "eip6963:announceProvider",
          handleProviderAnnouncement
        );
      };
    }, []);

    useEffect(() => {
        if (
          providers.length === 0 ||
          selectedProvider
        ) {
          return;
        }
      
        const rawSession =
          localStorage.getItem(
            WALLET_SESSION_KEY
          );
      
        if (!rawSession) {
          return;
        }
      
        let savedSession;
      
        try {
          savedSession =
            JSON.parse(
              rawSession
            );
        } catch {
          localStorage.removeItem(
            WALLET_SESSION_KEY
          );
      
          return;
        }
      
      
        const providerDetail =
          providers.find(
            (item) => {
              const info =
                item?.info;
      
              if (!info) {
                return false;
              }
      
              if (
                savedSession.uuid &&
                info.uuid ===
                  savedSession.uuid
              ) {
                return true;
              }
      
              if (
                savedSession.rdns &&
                info.rdns ===
                  savedSession.rdns
              ) {
                return true;
              }
      
              if (
                savedSession.name &&
                info.name ===
                  savedSession.name
              ) {
                return true;
              }
      
              return false;
            }
          );
      
      
        if (
          !providerDetail?.provider
        ) {
          return;
        }
      
      
        let cancelled = false;
      
      
        const restoreWallet =
          async () => {
            try {
              const provider =
                providerDetail.provider;
      
      
              /*
               * IMPORTANT:
               * Silent read only.
               * Never request wallet permission here.
               */
              const accounts =
                await provider.request({
                  method:
                    "eth_accounts",
                });
      
      
              if (
                cancelled
              ) {
                return;
              }
      
      
              const nextAddress =
                accounts?.[0] || "";
      
      
              /*
               * Wallet permission/session is no
               * longer available.
               *
               * Do not auto-connect.
               */
              if (!nextAddress) {
                localStorage.removeItem(
                  WALLET_SESSION_KEY
                );
      
                return;
              }
      
      
              const currentChainId =
                await provider.request({
                  method:
                    "eth_chainId",
                });
      
      
              if (
                cancelled
              ) {
                return;
              }
      
      
              setSelectedProvider(
                providerDetail
              );
      
              setAddress(
                nextAddress
              );
      
              setChainId(
                currentChainId || ""
              );
      
            } catch (error) {
              console.warn(
                "Wallet session restore failed:",
                error
              );
            }
          };
      
      
        restoreWallet();
      
      
        return () => {
          cancelled = true;
        };
      
      }, [
        providers,
        selectedProvider,
    ]);
  
    // =======================================================
    // CONNECT
    // =======================================================
  
    const connectProvider = async (
      providerDetail
    ) => {
      setWalletError("");
  
      if (!providerDetail?.provider) {
        setWalletError(
          "Wallet provider unavailable."
        );
        return false;
      }
  
      try {
        setConnecting(true);
  
        const provider =
          providerDetail.provider;
  
        const accounts =
          await provider.request({
            method:
              "eth_requestAccounts",
          });
  
        const currentChainId =
          await provider.request({
            method: "eth_chainId",
          });
  
        const nextAddress =
          accounts?.[0] || "";
  
          if (!nextAddress) {
            setWalletError(
              "No wallet account returned."
            );
            return false;
          }
  
        setSelectedProvider(
          providerDetail
        );
  
        setAddress(nextAddress);
        setChainId(
          currentChainId || ""
        );

        localStorage.setItem(
            WALLET_SESSION_KEY,
            JSON.stringify({
              uuid:
                providerDetail.info?.uuid ||
                "",
          
              rdns:
                providerDetail.info?.rdns ||
                "",
          
              name:
                providerDetail.info?.name ||
                "",
            })
        );

        return true;
  
    } catch (error) {
        console.error(
          "Wallet connection failed:",
          error
        );
      
        if (error?.code === 4001) {
          setWalletError(
            "Wallet connection was rejected."
          );
        } else {
          setWalletError(
            "Unable to connect wallet."
          );
        }
      
        return false;
      } finally {
        setConnecting(false);
      }
    };


    const switchToArcTestnet = async () => {
        setWalletError("");
      
        if (!selectedProvider?.provider) {
          setWalletError(
            "Wallet provider unavailable."
          );
      
          return {
            success: false,
            needsAdd: false,
          };
        }
      
        try {
          await selectedProvider.provider.request({
            method: "wallet_switchEthereumChain",
            params: [
              {
                chainId: ARC_TESTNET.chainId,
              },
            ],
          });
      
          return {
            success: true,
            needsAdd: false,
          };
        } catch (error) {
          console.error(
            "Network switch failed:",
            error
          );
      
          // MetaMask: requested chain does not exist
          if (error?.code === 4902) {
            return {
              success: false,
              needsAdd: true,
            };
          }
      
          if (error?.code === 4001) {
            setWalletError(
              "Network switch was rejected."
            );
          } else {
            setWalletError(
              "Unable to switch network."
            );
          }
      
          return {
            success: false,
            needsAdd: false,
          };
        }
    };

    const switchToArcMainnet = async () => {
      setWalletError("");
    
      if (!selectedProvider?.provider) {
        setWalletError(
          "Wallet provider unavailable."
        );
    
        return {
          success: false,
          needsAdd: false,
        };
      }
    
      try {
        await selectedProvider.provider.request({
          method: "wallet_switchEthereumChain",
          params: [
            {
              chainId: ARC_MAINNET.chainId,
            },
          ],
        });
    
        return {
          success: true,
          needsAdd: false,
        };
      } catch (error) {
        console.error(
          "Mainnet network switch failed:",
          error
        );
    
        if (error?.code === 4902) {
          return {
            success: false,
            needsAdd: true,
          };
        }
    
        if (error?.code === 4001) {
          setWalletError(
            "Network switch was rejected."
          );
        } else {
          setWalletError(
            "Unable to switch network."
          );
        }
    
        return {
          success: false,
          needsAdd: false,
        };
      }
    };

    const addArcTestnet = async () => {
        setWalletError("");
      
        if (!selectedProvider?.provider) {
          setWalletError(
            "Wallet provider unavailable."
          );
      
          return false;
        }
      
        try {
          await selectedProvider.provider.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: ARC_TESTNET.chainId,
                chainName: ARC_TESTNET.chainName,
                nativeCurrency: ARC_TESTNET.nativeCurrency,
                rpcUrls: ARC_TESTNET.rpcUrls,
                blockExplorerUrls:
                  ARC_TESTNET.blockExplorerUrls,
              },
            ],
          });
      
          return true;
        } catch (error) {
          console.error(
            "Add ARC Testnet failed:",
            error
          );
      
          if (error?.code === 4001) {
            setWalletError(
              "Adding ARC Testnet was rejected."
            );
          } else {
            setWalletError(
              "Unable to add ARC Testnet."
            );
          }
      
          return false;
        }
    };

    const addArcMainnet = async () => {
      setWalletError("");
    
      if (!selectedProvider?.provider) {
        setWalletError(
          "Wallet provider unavailable."
        );
    
        return false;
      }
    
      try {
        await selectedProvider.provider.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: ARC_MAINNET.chainId,
              chainName: ARC_MAINNET.chainName,
              nativeCurrency:
                ARC_MAINNET.nativeCurrency,
              rpcUrls: ARC_MAINNET.rpcUrls,
              blockExplorerUrls:
                ARC_MAINNET.blockExplorerUrls,
            },
          ],
        });
    
        return true;
      } catch (error) {
        console.error(
          "Add ARC Mainnet failed:",
          error
        );
    
        if (error?.code === 4001) {
          setWalletError(
            "Adding ARC Mainnet was rejected."
          );
        } else {
          setWalletError(
            "Unable to add ARC Mainnet."
          );
        }
    
        return false;
      }
    };
  
    // =======================================================
    // LOCAL DISCONNECT
    // =======================================================
  
    const disconnectWallet = async () => {
        setWalletError("");
      
        const provider =
          selectedProvider?.provider;
      
        if (provider) {
          try {
            await provider.request({
              method: "wallet_revokePermissions",
              params: [
                {
                  eth_accounts: {},
                },
              ],
            });
          } catch (error) {
            console.warn(
              "Wallet permission revoke failed:",
              error
            );
          }
        }

        localStorage.removeItem(
            WALLET_SESSION_KEY
        );
      
        setSelectedProvider(null);
        setAddress("");
        setChainId("");
    };
  
    // =======================================================
    // PROVIDER EVENTS
    // =======================================================
  
    useEffect(() => {
      if (!selectedProvider?.provider) {
        return;
      }
  
      const provider =
        selectedProvider.provider;
  
      const handleAccountsChanged = (
        accounts
      ) => {
        const nextAddress =
          accounts?.[0] || "";
  
        setAddress(nextAddress);
  
        if (!nextAddress) {
            localStorage.removeItem(
              WALLET_SESSION_KEY
            );
          
            setSelectedProvider(null);
            setChainId("");
        }
      };
  
      const handleChainChanged = (
        nextChainId
      ) => {
        setChainId(nextChainId);
      };
  
      provider.on?.(
        "accountsChanged",
        handleAccountsChanged
      );
  
      provider.on?.(
        "chainChanged",
        handleChainChanged
      );
  
      return () => {
        provider.removeListener?.(
          "accountsChanged",
          handleAccountsChanged
        );
  
        provider.removeListener?.(
          "chainChanged",
          handleChainChanged
        );
      };
    }, [selectedProvider]);
  
    // =======================================================
    // CONTEXT
    // =======================================================
  
    const value = useMemo(
        () => ({
          providers,
          selectedProvider,
      
          connected,
          connecting,
      
          address,
          chainId,
          isArcTestnet,
          isArcMainnet,
      
          walletError,
      
          connectProvider,
          switchToArcTestnet,
          addArcTestnet,
          switchToArcMainnet,
          addArcMainnet,
          disconnectWallet,
          clearWalletError: () =>
            setWalletError(""),
        }),
        [
          providers,
          selectedProvider,
          connected,
          connecting,
          address,
          chainId,
          isArcTestnet,
          isArcMainnet,
          walletError,
        ]
    );
  
    return (
      <WalletContext.Provider
        value={value}
      >
        {children}
      </WalletContext.Provider>
    );
  }
