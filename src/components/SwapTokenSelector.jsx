import { useMemo, useState } from "react";
import {
  getRelayChainTokens,
} from "../lib/relayMetadata";
import "./SwapTokenSelector.css";

export default function SwapTokenSelector({
  open,
  chains,
  selectedToken,
  onSelect,
  onClose,
}) {
  const [selectedChainId, setSelectedChainId] =
    useState(null);

  const [search, setSearch] =
    useState("");

  const activeChain =
    chains.find(
      (chain) =>
        chain.id === selectedChainId
    ) ||
    chains.find(
      (chain) =>
        chain.id ===
        selectedToken?.chainId
    ) ||
    chains[0] ||
    null;

    const tokens =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();
  
      if (!query) {
        return getRelayChainTokens(
          activeChain
        );
      }
  
      return chains
        .flatMap((chain) =>
          getRelayChainTokens(chain)
        )
        .filter(
          (token) =>
            token.symbol
              .toLowerCase()
              .includes(query) ||
            token.name
              .toLowerCase()
              .includes(query) ||
            token.address
              .toLowerCase()
              .includes(query)
        );
    }, [
      activeChain,
      chains,
      search,
    ]);

    console.log("[SWAP SEARCH DEBUG]", {
        query: search,
        chainCount: chains.length,
        ethereum: chains.find(
          (chain) => chain.id === 1
        ),
        ethMatches: chains
          .flatMap((chain) =>
            getRelayChainTokens(chain)
          )
          .filter(
            (token) =>
              token.symbol
                ?.toUpperCase()
                .includes("ETH")
          )
          .map((token) => ({
            chainId: token.chainId,
            chainName: token.chainName,
            symbol: token.symbol,
            address: token.address,
          })),
      });
      
  if (!open) {
    return null;
  }

  return (
    <div
      className="swap-selector-backdrop"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <div className="swap-selector-modal">
        <div className="swap-selector-header">
          <div>
            <div className="swap-selector-kicker">
              CROSS-CHAIN_
            </div>

            <h2>SELECT TOKEN</h2>
          </div>

          <button
            type="button"
            className="swap-selector-close"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="swap-selector-body">
          <aside className="swap-selector-chains">
            <div className="swap-selector-section-label">
              NETWORK
            </div>

            <div className="swap-selector-chain-list">
              {chains.map(
                (chain) => {
                  const active =
                    activeChain?.id ===
                    chain.id;

                  return (
                    <button
                      key={chain.id}
                      type="button"
                      className={
                        active
                          ? "swap-selector-chain swap-selector-chain-active"
                          : "swap-selector-chain"
                      }
                      onClick={() => {
                        setSelectedChainId(
                          chain.id
                        );
                      }}
                    >
                      <span className="swap-selector-chain-icon">
                        {chain.iconUrl ? (
                          <img
                            src={
                              chain.iconUrl
                            }
                            alt=""
                          />
                        ) : (
                          chain.displayName
                            .slice(0, 1)
                        )}
                      </span>

                      <span>
                        {chain.displayName}
                      </span>
                    </button>
                  );
                }
              )}
            </div>
          </aside>

          <section className="swap-selector-tokens">
            <div className="swap-selector-search">
              <span>⌕</span>

              <input
                type="text"
                placeholder="Search token or address"
                value={search}
                onChange={(event) => {
                  setSearch(
                    event.target.value
                  );
                }}
                autoFocus
              />
            </div>

            <div className="swap-selector-token-heading">
              <span>
                {activeChain
                  ?.displayName ||
                  "TOKENS"}
              </span>

              <span>
                {tokens.length}
              </span>
            </div>

            <div className="swap-selector-token-list">
              {tokens.map(
                (token) => {
                  const selected =
                    selectedToken
                      ?.chainId ===
                      token.chainId &&
                    selectedToken
                      ?.address
                      ?.toLowerCase() ===
                      token.address
                        .toLowerCase();

                  return (
                    <button
                      key={`${token.chainId}:${token.address}`}
                      type="button"
                      className={
                        selected
                          ? "swap-selector-token swap-selector-token-active"
                          : "swap-selector-token"
                      }
                      onClick={() => {
                        onSelect(token);
                      }}
                    >
                      <span className="swap-selector-token-icon">
                        {token.logoURI ? (
                          <img
                            src={
                              token.logoURI
                            }
                            alt=""
                          />
                        ) : (
                          token.symbol
                            .slice(0, 1)
                        )}
                      </span>

                      <span className="swap-selector-token-meta">
                        <strong>
                          {token.symbol}
                        </strong>

                        <small>
                          {token.name}
                        </small>
                      </span>

                      <span className="swap-selector-token-network">
                        {
                          token.chainName
                        }
                      </span>
                    </button>
                  );
                }
              )}

              {tokens.length ===
                0 && (
                <div className="swap-selector-empty">
                  NO TOKENS FOUND_
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}