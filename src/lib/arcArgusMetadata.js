import { Interface, JsonRpcProvider } from "ethers";
import { runArcRpcRead } from "../contracts/launchReader.js";

const ARC_RPC_URL = "https://rpc.mainnet.arc.io";

const ARGUS_PORTAL =
  "0xB021Be536808f551b31789422Fd28a6c9c6e97Da";

const ARGUS_START_BLOCK = 20395275;
const SCAN_CHUNK_SIZE = 8000;

const provider = new JsonRpcProvider(ARC_RPC_URL);

const ARGUS_LOGO_CACHE_KEY =
  "arc_terminal_argus_logo_cache_v1";

const ARGUS_LOGO_CACHE_TTL_MS =
  10 * 60 * 1000;


const iface = new Interface([
  "event TokenCreated(address indexed token,address indexed creator,string name,string symbol,bytes32 poolId,string imageURI,string website,string twitter,string telegram)",
]);

const TOKEN_CREATED_TOPIC =
  iface.getEvent("TokenCreated").topicHash;

// Session-only cache.
// Nothing large is written to localStorage.
const metadataCache = new Map();

const inflightRequests = new Map();

export function normalizeArgusImageUri(uri) {
  if (!uri || typeof uri !== "string") {
    return "";
  }

  const value = uri.trim();

  if (!value) {
    return "";
  }

  if (value.startsWith("ipfs://")) {
    const path = value
      .slice("ipfs://".length)
      .replace(/^ipfs\//, "");

    if (!path) {
      return "";
    }

    return `https://gateway.pinata.cloud/ipfs/${path}`;
  }

  if (
    value.startsWith("https://") ||
    value.startsWith("http://")
  ) {
    return value;
  }

  return "";
}

function readArgusLogoCache() {
    if (typeof window === "undefined") {
      return null;
    }
  
    try {
      const raw =
        localStorage.getItem(ARGUS_LOGO_CACHE_KEY);
  
      if (!raw) {
        return null;
      }
  
      const parsed = JSON.parse(raw);
  
      if (
        !Number.isFinite(parsed?.cachedAt) ||
        !Array.isArray(parsed?.entries)
      ) {
        return null;
      }
  
      return parsed;
    } catch (error) {
      console.warn(
        "Failed to read Argus logo cache:",
        error
      );
  
      return null;
    }
  }
  
  
  function writeArgusLogoCache(metadataMap) {
    if (typeof window === "undefined") {
      return;
    }
  
    try {
      const entries = [];
  
      for (const [address, metadata] of metadataMap) {
        if (!metadata?.imageUrl) {
          continue;
        }
  
        entries.push([
          address,
          metadata.imageUrl,
        ]);
      }
  
      localStorage.setItem(
        ARGUS_LOGO_CACHE_KEY,
        JSON.stringify({
          cachedAt: Date.now(),
          entries,
        })
      );
    } catch (error) {
      console.warn(
        "Failed to write Argus logo cache:",
        error
      );
    }
  }


function normalizeAddress(address) {
  return typeof address === "string"
    ? address.toLowerCase()
    : "";
}

function addressToTopic(address) {
  const normalized = normalizeAddress(address);

  if (!/^0x[a-f0-9]{40}$/.test(normalized)) {
    return "";
  }

  return (
    "0x" +
    normalized
      .slice(2)
      .padStart(64, "0")
  );
}

function parseTokenCreatedLog(log) {
  try {
    const parsed = iface.parseLog(log);

    if (!parsed) {
      return null;
    }

    const tokenAddress =
      normalizeAddress(parsed.args.token);

    const imageURI =
      typeof parsed.args.imageURI === "string"
        ? parsed.args.imageURI.trim()
        : "";

    return {
      tokenAddress,

      name:
        typeof parsed.args.name === "string"
          ? parsed.args.name
          : "",

      symbol:
        typeof parsed.args.symbol === "string"
          ? parsed.args.symbol
          : "",

      imageURI,

      imageUrl:
        normalizeArgusImageUri(imageURI),

      source: "ARGUS",
    };
  } catch (error) {
    console.warn(
      "Failed to parse Argus TokenCreated log:",
      error
    );

    return null;
  }
}

async function findArgusTokenMetadata(tokenAddress) {
  const address = normalizeAddress(tokenAddress);

  const tokenTopic = addressToTopic(address);

  if (!tokenTopic) {
    return null;
  }

  const latestBlock = await runArcRpcRead(() =>
    provider.getBlockNumber()
  );

  /*
   * Search backwards.
   *
   * Newly discovered DEX tokens are overwhelmingly recent, so
   * starting from latest avoids scanning millions of old blocks
   * before reaching a newly launched token such as EARN.
   */
  for (
    let toBlock = latestBlock;
    toBlock >= ARGUS_START_BLOCK;
    toBlock -= SCAN_CHUNK_SIZE
  ) {
    const fromBlock = Math.max(
      ARGUS_START_BLOCK,
      toBlock - SCAN_CHUNK_SIZE + 1
    );

    const logs = await runArcRpcRead(() =>
      provider.getLogs({
        address: ARGUS_PORTAL,

        topics: [
          TOKEN_CREATED_TOPIC,
          tokenTopic,
        ],

        fromBlock,
        toBlock,
      })
    );

    if (logs.length > 0) {
      return parseTokenCreatedLog(
        logs[logs.length - 1]
      );
    }
  }

  return null;
}

export async function getArcArgusTokenMetadata(
  tokenAddress
) {
  const address = normalizeAddress(tokenAddress);

  if (!address) {
    return null;
  }

  if (metadataCache.has(address)) {
    return metadataCache.get(address);
  }

  if (inflightRequests.has(address)) {
    return inflightRequests.get(address);
  }

  const request = findArgusTokenMetadata(address);

  inflightRequests.set(address, request);

  try {
    const metadata = await request;

    // Cache null too so a non-Argus token is not scanned
    // repeatedly during the same browser session.
    metadataCache.set(
      address,
      metadata || null
    );

    return metadata || null;
  } finally {
    inflightRequests.delete(address);
  }
}

export async function getRecentArcArgusMetadata({
    lookbackBlocks = 50000,
  } = {}) {

    const cached =
    readArgusLogoCache();

  if (
    cached &&
    Date.now() - cached.cachedAt <
      ARGUS_LOGO_CACHE_TTL_MS
  ) {
    const result = new Map();

    for (const [address, imageUrl] of cached.entries) {
      const metadata = {
        tokenAddress: address,
        imageUrl,
        source: "ARGUS_CACHE",
      };

      result.set(
        address,
        metadata
      );

      metadataCache.set(
        address,
        metadata
      );
    }

    return result;
  }

    const latestBlock = await runArcRpcRead(() =>
      provider.getBlockNumber()
    );
  
    const startBlock = Math.max(
      ARGUS_START_BLOCK,
      latestBlock - lookbackBlocks
    );
  
    const result = new Map();
  
    for (
      let fromBlock = startBlock;
      fromBlock <= latestBlock;
      fromBlock += SCAN_CHUNK_SIZE
    ) {
      const toBlock = Math.min(
        fromBlock + SCAN_CHUNK_SIZE - 1,
        latestBlock
      );
  
      const logs = await runArcRpcRead(() =>
        provider.getLogs({
          address: ARGUS_PORTAL,
          topics: [TOKEN_CREATED_TOPIC],
          fromBlock,
          toBlock,
        })
      );
  
      for (const log of logs) {
        const metadata =
          parseTokenCreatedLog(log);
  
        if (!metadata?.tokenAddress) {
          continue;
        }
  
        result.set(
          metadata.tokenAddress,
          metadata
        );
  
        metadataCache.set(
          metadata.tokenAddress,
          metadata
        );
      }
    }
  
    writeArgusLogoCache(result);

    return result;
  }