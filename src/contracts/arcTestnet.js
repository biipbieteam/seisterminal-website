/*
 * ============================================================
 * ARC TERMINAL
 * ARC Testnet — Frontend Contract Configuration
 * ============================================================
 *
 * This file contains PUBLIC blockchain configuration only.
 *
 * NEVER place:
 * - private keys
 * - seed phrases
 * - API secrets
 * - privileged credentials
 *
 * inside frontend source code.
 */

/*
 * ------------------------------------------------------------
 * NETWORK
 * ------------------------------------------------------------
 */

export const ARC_TESTNET = Object.freeze({
    chainId: 5042002,
  
    chainIdHex: "0x4cef52",
  
    chainName: "Arc Testnet",
  
    rpcUrl:
      "https://rpc.testnet.arc.network",
  
    blockExplorerUrl:
      "https://testnet.arcscan.app",
  
    nativeCurrency: Object.freeze({
      name: "USDC",
      symbol: "USDC",
      decimals: 18,
    }),
  });
  
  
  /*
   * ------------------------------------------------------------
   * DEPLOYED CONTRACTS
   * ------------------------------------------------------------
   *
   * Deployment:
   * ARC Testnet — chain ID 5042002
   *
   * Dependency graph:
   *
   * MockAMMFactory
   *      ↓
   * MigrationAdapter
   *      ↓
   * LaunchFactory
   */
  
  export const ARC_TESTNET_CONTRACTS =
  Object.freeze({
    mockAMMFactory:
      "0xd86f61a57Fb1ff4326A134d9a87280b2Aa42E95e",

    migrationAdapter:
      "0x29757b60024A5ea1873f71C73b3d1EC1728E0a5e",

    launchFactory:
      "0x8Da50245171d09a544eb047fc3d4e8cE4514931A",

    lpBurn:
      "0x000000000000000000000000000000000000dEaD",
  });
  
  
  /*
   * ------------------------------------------------------------
   * FAIR LAUNCH PROTOCOL PARAMETERS
   * ------------------------------------------------------------
   *
   * These values mirror the locked V3 production parameters.
   *
   * They are DISPLAY / frontend configuration.
   * The smart contracts remain the source of truth.
   */
  
  export const FAIR_LAUNCH_CONFIG =
    Object.freeze({
      totalSupply:
        1_000_000_000,
  
      initialMarketCap:
        10_000,
  
      graduationMarketCap:
        60_000,
  
      maxDevBuyPercent:
        5,
  
      tokenDecimals:
        18,
  
      quoteDecimals:
        18,
  
      quoteSymbol:
        "USDC",
    });
  
  
  /*
   * ------------------------------------------------------------
   * LAUNCH STATUS
   * ------------------------------------------------------------
   *
   * Must mirror LaunchFactory.LaunchStatus.
   *
   * Current lifecycle:
   *
   * ACTIVE
   *   ↓
   * GRADUATING
   *   ↓
   * GRADUATED
   */
  
  export const LAUNCH_STATUS =
    Object.freeze({
      ACTIVE: 0,
      GRADUATING: 1,
      GRADUATED: 2,
    });
  
  
  export const LAUNCH_STATUS_LABEL =
    Object.freeze({
      [LAUNCH_STATUS.ACTIVE]:
        "ACTIVE",
  
      [LAUNCH_STATUS.GRADUATING]:
        "GRADUATING",
  
      [LAUNCH_STATUS.GRADUATED]:
        "GRADUATED",
    });
  
  
  /*
   * ------------------------------------------------------------
   * HELPERS
   * ------------------------------------------------------------
   */
  
  export function getLaunchStatusLabel(
    status
  ) {
    const numericStatus =
      Number(status);
  
    return (
      LAUNCH_STATUS_LABEL[
        numericStatus
      ] ?? "UNKNOWN"
    );
  }
  
  
  export function isArcTestnetChainId(
    chainId
  ) {
    if (
      typeof chainId ===
      "string"
    ) {
      return (
        Number.parseInt(
          chainId,
          chainId.startsWith("0x")
            ? 16
            : 10
        ) ===
        ARC_TESTNET.chainId
      );
    }
  
    return (
      Number(chainId) ===
      ARC_TESTNET.chainId
    );
  }