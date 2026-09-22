import {
    useState,
  } from "react";
  
  import {
    useWallet,
  } from "../context/wallet-context";

  import {
    supabase,
  } from "../lib/supabase";

  import "./GenesisVerifyPage.css";
  
  
  function GenesisVerifyPage() {
  
    const {
      providers,
      selectedProvider,
      connected,
      connecting,
      address,
      walletError,
      connectProvider,
    } = useWallet();
  
  
    const [
      walletPickerOpen,
      setWalletPickerOpen,
    ] = useState(false);
  
    const [
      challengeLoading,
      setChallengeLoading,
    ] = useState(false);

    const [
      challengeReady,
      setChallengeReady,
    ] = useState(false);

    const [
      challengeError,
      setChallengeError,
    ] = useState("");

    const [
        challengeMessage,
        setChallengeMessage,
      ] = useState("");
      
    const [
        signatureLoading,
        setSignatureLoading,
      ] = useState(false);
      
    const [
        signatureReady,
        setSignatureReady,
      ] = useState(false);

    const params =
      new URLSearchParams(
        window.location.search
      );
  
    const session =
      params.get("session") || "";
  
  
    const shortAddress =
      address
        ? `${address.slice(0, 6)}...${address.slice(-4)}`
        : "";
  
    const requestChallenge =
        async () => {
  
          if (
            !session ||
            !address
          ) {
            return;
          }
  
          setChallengeLoading(true);
          setChallengeReady(false);
          setChallengeError("");
          setChallengeMessage("");
          setSignatureReady(false);

          try {
  
            const {
              data,
              error,
            } =
              await supabase
                .functions
                .invoke(
                  "genesis-verification-challenge",
                  {
                    body: {
                      session,
                      walletAddress:
                        address,
                    },
                  }
                );
  
  
            if (error) {
              throw error;
            }
  
  
            if (
              !data?.success ||
              !data?.challenge?.message
            ) {
              throw new Error(
                data?.error ||
                "Invalid verification challenge."
              );
            }
  
  
            setChallengeMessage(
            data.challenge.message
            );

            setChallengeReady(true);
  
          } catch (error) {
  
            console.error(
              "Genesis challenge error:",
              error
            );
  
            setChallengeError(
              error instanceof Error
                ? error.message
                : "Unable to prepare verification."
            );
  
          } finally {
  
            setChallengeLoading(false);
  
          }
        };

        const signChallenge =
        async () => {
      
          if (
            !selectedProvider?.provider ||
            !address ||
            !challengeMessage
          ) {
            setChallengeError(
              "Wallet or verification challenge unavailable."
            );
      
            return;
          }
      
      
          setSignatureLoading(true);
          setChallengeError("");
          setSignatureReady(false);
      
      
          try {
      
            const signature =
              await selectedProvider.provider.request({
                method:
                  "personal_sign",
      
                params: [
                  challengeMessage,
                  address,
                ],
              });
      
      
            if (
              typeof signature !== "string" ||
              !signature.startsWith("0x")
            ) {
              throw new Error(
                "Invalid wallet signature."
              );
            }
      
      
            const {
                data: verifyData,
                error: verifyError,
              } =
                await supabase
                  .functions
                  .invoke(
                    "genesis-verification-challenge",
                    {
                      body: {
                        action: "verify",
                        session,
                        walletAddress:
                          address,
                        signature,
                      },
                    }
                  );
              
              
              if (verifyError) {
                throw verifyError;
              }
              
              
              if (
                !verifyData?.success ||
                verifyData?.status !==
                  "verified"
              ) {
                throw new Error(
                  verifyData?.status ||
                  verifyData?.error ||
                  "Wallet verification failed."
                );
              }
              
              
              setSignatureReady(true);
      
      
          } catch (error) {
      
            console.error(
              "Genesis signature error:",
              error
            );
      
      
            if (
              error?.code === 4001
            ) {
              setChallengeError(
                "Signature request rejected."
              );
            } else {
              setChallengeError(
                error instanceof Error
                  ? error.message
                  : "Unable to sign verification message."
              );
            }
      
          } finally {
      
            setSignatureLoading(false);
      
          }
        };

    return (
      <div className="genesis-verify-page">
  
        <div className="genesis-verify-card">
  
          <div className="genesis-verify-brand">
            SEIS TERMINAL
          </div>
  
          <div className="genesis-verify-label">
            GENESIS VERIFICATION
          </div>
  
          <h1>
            Verify your Genesis wallet
          </h1>
  
          <p>
            Connect the wallet that holds your
            Genesis NFT to verify ownership for
            Discord.
          </p>
  
  
          {!session ? (
  
            <div className="genesis-verify-error">
              INVALID OR MISSING VERIFICATION SESSION_
            </div>
  
          ) : (
  
            <>
  
              <div className="genesis-verify-status">
                <span />
                VERIFICATION SESSION DETECTED_
              </div>
  
  
              {connected ? (
                <>
                    <div className="genesis-verify-connected">

                    <div className="genesis-verify-connected-label">
                        WALLET CONNECTED_
                    </div>

                    <div className="genesis-verify-address">
                        {shortAddress}
                    </div>

                    </div>


                    {!challengeReady ? (

                    <button
                        type="button"
                        className="genesis-verify-button genesis-challenge-button"
                        disabled={challengeLoading}
                        onClick={requestChallenge}
                    >
                        {challengeLoading
                        ? "PREPARING..."
                        : "CONTINUE VERIFICATION"}
                    </button>

                    ) : (

                    <button
                        type="button"
                        className="genesis-verify-button genesis-challenge-button"
                        disabled={
                        signatureLoading ||
                        signatureReady
                        }
                        onClick={signChallenge}
                    >
                        {signatureLoading
                        ? "SIGNING..."
                        : signatureReady
                            ? "SIGNATURE READY_"
                            : "SIGN MESSAGE"}
                    </button>

                    )}


                    {challengeError && (
                        <div className="genesis-verify-error genesis-wallet-error">
                        {challengeError}
                        </div>
                    )}
                </>
              ) : (
  
                <>
  
                  <button
                    type="button"
                    className="genesis-verify-button"
                    disabled={connecting}
                    onClick={() => {
                      setWalletPickerOpen(
                        (current) => !current
                      );
                    }}
                  >
                    {connecting
                      ? "CONNECTING..."
                      : "CONNECT WALLET"}
                  </button>
  
  
                  {walletPickerOpen && (
  
                    <div className="genesis-wallet-list">
  
                      {providers.length === 0 ? (
  
                        <div className="genesis-wallet-empty">
                          NO EVM WALLET DETECTED_
                        </div>
  
                      ) : (
  
                        providers.map(
                          (wallet) => (
  
                            <button
                              type="button"
                              key={
                                wallet.info.uuid ||
                                wallet.info.rdns ||
                                wallet.info.name
                              }
                              className="genesis-wallet-option"
                              disabled={connecting}
                              onClick={async () => {
  
                                const success =
                                  await connectProvider(
                                    wallet
                                  );
  
                                if (success) {
                                  setWalletPickerOpen(
                                    false
                                  );
                                }
                              }}
                            >
  
                              {wallet.info.icon && (
                                <img
                                  src={wallet.info.icon}
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
  
                            </button>
  
                          )
                        )
  
                      )}
  
                    </div>
  
                  )}
  
  
                  {walletError && (
                    <div className="genesis-verify-error genesis-wallet-error">
                      {walletError}
                    </div>
                  )}
  
                </>
  
              )}
  
  
              <div className="genesis-verify-hint">
                Connecting a wallet does not
                complete verification or grant
                Discord roles.
              </div>
  
            </>
  
          )}
  
        </div>
  
      </div>
    );
  }
  
  
  export default GenesisVerifyPage;