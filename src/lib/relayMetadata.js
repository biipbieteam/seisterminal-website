const RELAY_API_URL = "https://api.relay.link";

const ZERO_ADDRESS =
  "0x0000000000000000000000000000000000000000";

function normalizeAddress(address) {
  return String(address || "").toLowerCase();
}

function normalizeToken(chain, token, fallbackLogoURI = "") {
  return {
    id: token.id || `${chain.id}:${normalizeAddress(token.address)}`,
    chainId: Number(chain.id),
    chainName: chain.displayName || chain.name,
    chainSlug: chain.name,
    chainIconUrl: chain.iconUrl || "",
    vmType: chain.vmType || "",
    symbol: token.symbol || "",
    name: token.name || token.symbol || "",
    address: token.address || "",
    decimals: Number(token.decimals ?? 18),
    supportsBridging: token.supportsBridging !== false,
    logoURI:
      token.metadata?.logoURI ||
      fallbackLogoURI ||
      chain.iconUrl ||
      "",
    isNative:
      normalizeAddress(token.address) === ZERO_ADDRESS,
  };
}

function normalizeChain(chain) {
    const featuredTokens = Array.isArray(chain.featuredTokens)
    ? chain.featuredTokens.map((token) =>
        normalizeToken(chain, token)
      )
    : [];
  
  const nativeLogoURI = chain.currency
    ? featuredTokens.find(
        (token) =>
          token.id === chain.currency.id ||
          token.symbol?.toUpperCase() ===
            chain.currency.symbol?.toUpperCase()
      )?.logoURI || ""
    : "";
  
  const nativeCurrency = chain.currency
    ? normalizeToken(
        chain,
        chain.currency,
        nativeLogoURI || chain.iconUrl || ""
      )
    : null;

  return {
    id: Number(chain.id),
    name: chain.name,
    displayName: chain.displayName || chain.name,
    iconUrl: chain.iconUrl || "",
    explorerUrl: chain.explorerUrl || "",
    explorerName: chain.explorerName || "",
    httpRpcUrl: chain.httpRpcUrl || "",
    vmType: chain.vmType || "",
    tokenSupport: chain.tokenSupport || "",
    depositEnabled: chain.depositEnabled !== false,
    disabled: Boolean(chain.disabled),
    tags: Array.isArray(chain.tags) ? chain.tags : [],
    nativeCurrency,
    featuredTokens,
  };
}

export async function getRelayChains() {
  const response = await fetch(`${RELAY_API_URL}/chains`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Relay chains request failed (${response.status}).`
    );
  }

  const payload = await response.json();

  if (!Array.isArray(payload?.chains)) {
    throw new Error("Invalid Relay chains response.");
  }

  return payload.chains
    .filter((chain) => !chain.disabled)
    .map(normalizeChain);
}

export function getRelayChainTokens(chain) {
  if (!chain) {
    return [];
  }

  const tokens = [];

  if (chain.nativeCurrency) {
    tokens.push(chain.nativeCurrency);
  }

  for (const token of chain.featuredTokens || []) {
    const duplicate = tokens.some(
      (existing) =>
        existing.chainId === token.chainId &&
        normalizeAddress(existing.address) ===
          normalizeAddress(token.address)
    );

    if (!duplicate) {
      tokens.push(token);
    }
  }

  return tokens;
}