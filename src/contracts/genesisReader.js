import { ethers } from "ethers";

export const GENESIS_CONTRACT_ADDRESS =
  "0x493f5e2d5A798f945F801046d8E8D104d3B8Aea0";

export const ARC_MAINNET_RPC =
  "https://rpc.mainnet.arc.io";

export const ARC_MAINNET_CHAIN_ID =
  5042;

const GENESIS_ABI = [
  // Supply
  "function totalSupply() view returns (uint256)",
  "function remainingSupply() view returns (uint256)",
  "function MAX_SUPPLY() view returns (uint256)",

  "function TEAM_INITIAL_SUPPLY() view returns (uint256)",
  "function OG_INITIAL_SUPPLY() view returns (uint256)",
  "function FCFS_INITIAL_SUPPLY() view returns (uint256)",
  "function PUBLIC_INITIAL_SUPPLY() view returns (uint256)",

  "function teamMintedSupply() view returns (uint256)",
  "function ogMintedSupply() view returns (uint256)",
  "function fcfsMintedSupply() view returns (uint256)",
  "function publicMintedSupply() view returns (uint256)",


  // Schedule
  "function teamMintStart() view returns (uint256)",
  "function teamMintEnd() view returns (uint256)",

  "function ogMintStart() view returns (uint256)",
  "function ogMintEnd() view returns (uint256)",

  "function fcfsMintStart() view returns (uint256)",
  "function fcfsMintEnd() view returns (uint256)",

  "function publicMintStart() view returns (uint256)",
  "function publicMintEnd() view returns (uint256)",

  // Prices
  "function ogPrice() view returns (uint256)",
  "function fcfsPrice() view returns (uint256)",
  "function publicPrice() view returns (uint256)",

  // Wallet limits
  "function maxOgMintPerWallet() view returns (uint256)",
  "function maxFcfsMintPerWallet() view returns (uint256)",
  "function maxPublicMintPerWallet() view returns (uint256)",

  // Wallet mint counters
  "function ogMinted(address wallet) view returns (uint256)",
  "function fcfsMinted(address wallet) view returns (uint256)",
  "function publicMinted(address wallet) view returns (uint256)",

  "function owner() view returns (address)",
];

let provider = null;
let contract = null;

export function getGenesisProvider() {
  if (!provider) {
    provider =
      new ethers.JsonRpcProvider(
        ARC_MAINNET_RPC
      );
  }

  return provider;
}

export function getGenesisContract() {
  if (!contract) {
    contract =
      new ethers.Contract(
        GENESIS_CONTRACT_ADDRESS,
        GENESIS_ABI,
        getGenesisProvider()
      );
  }

  return contract;
}

export async function getGenesisState() {
    const c =
      getGenesisContract();
  
    /*
     * =========================================================
     * ROUND 1 — UI CRITICAL DATA
     *
     * Schedule + prices.
     * These are required to render the mint cards.
     * =========================================================
     */
  
    const [
      teamStart,
      teamEnd,
  
      ogStart,
      ogEnd,
  
      fcfsStart,
      fcfsEnd,
  
      publicStart,
      publicEnd,
  
      ogPrice,
      fcfsPrice,
      publicPrice,
    ] = await Promise.all([
      c.teamMintStart(),
      c.teamMintEnd(),
  
      c.ogMintStart(),
      c.ogMintEnd(),
  
      c.fcfsMintStart(),
      c.fcfsMintEnd(),
  
      c.publicMintStart(),
      c.publicMintEnd(),
  
      c.ogPrice(),
      c.fcfsPrice(),
      c.publicPrice(),
    ]);
  
  
    /*
     * =========================================================
     * ROUND 2 — SECONDARY DATA
     *
     * Supply / owner / FCFS accounting.
     * =========================================================
     */

  
    const [
      totalSupply,
      maxSupply,
      owner,

      ogMintedSupply,
      ogInitialSupply,

      fcfsMintedSupply,
      fcfsInitialSupply,
    ] = await Promise.all([
      c.totalSupply(),
      c.MAX_SUPPLY(),
      c.owner(),

      c.ogMintedSupply(),
      c.OG_INITIAL_SUPPLY(),
  
      c.fcfsMintedSupply(),
      c.FCFS_INITIAL_SUPPLY(),
    ]);
  
  
    return {
      totalSupply:
        Number(totalSupply),
  
      maxSupply:
        Number(maxSupply),
  
      remainingSupply:
        Number(maxSupply) -
        Number(totalSupply),
  
      owner,
  
      teamStart:
        Number(teamStart),
  
      teamEnd:
        Number(teamEnd),
  
      ogStart:
        Number(ogStart),
  
      ogEnd:
        Number(ogEnd),
  
      fcfsStart:
        Number(fcfsStart),
  
      fcfsEnd:
        Number(fcfsEnd),
  
      publicStart:
        Number(publicStart),
  
      publicEnd:
        Number(publicEnd),
  
      ogPriceRaw:
        ogPrice,
  
      fcfsPriceRaw:
        fcfsPrice,
  
      publicPriceRaw:
        publicPrice,
  
      ogPrice:
        ethers.formatUnits(
          ogPrice,
          18
        ),
  
      fcfsPrice:
        ethers.formatUnits(
          fcfsPrice,
          18
        ),
  
      publicPrice:
        ethers.formatUnits(
          publicPrice,
          18
        ),

      ogMintedSupply:
        Number(ogMintedSupply),
      
      ogInitialSupply:
        Number(ogInitialSupply),
  
      fcfsMintedSupply:
        Number(fcfsMintedSupply),
  
      fcfsInitialSupply:
        Number(fcfsInitialSupply),
    };
}

export async function getGenesisWalletState(
    walletAddress
  ) {
    if (
      !walletAddress ||
      !ethers.isAddress(
        walletAddress
      )
    ) {
      return {
        ogMinted: 0,
        fcfsMinted: 0,
        publicMinted: 0,
      };
    }
  
    const c =
      getGenesisContract();
  
    const [
      ogMinted,
      fcfsMinted,
      publicMinted,
    ] = await Promise.all([
      c.ogMinted(
        walletAddress
      ),
  
      c.fcfsMinted(
        walletAddress
      ),
  
      c.publicMinted(
        walletAddress
      ),
    ]);
  
    return {
      ogMinted:
        Number(ogMinted),
  
      fcfsMinted:
        Number(fcfsMinted),
  
      publicMinted:
        Number(publicMinted),
    };
}