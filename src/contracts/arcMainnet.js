/*
 * ============================================================
 * ARC TERMINAL
 * ARC Mainnet â€” Frontend Contract Configuration
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

export const ARC_MAINNET = Object.freeze({
    chainId: 5042,

    chainIdHex: "0x13b2",

    chainName: "Arc Mainnet",

    rpcUrl:
      "https://rpc.mainnet.arc.io",

    blockExplorerUrl:
      "https://explorer.arc.io",

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
   * ARC Mainnet â€” chain ID 5042
   *
   * Dependency graph:
   *
   * Uniswap V2 Factory
   *      â†“
   * UniswapV2AMMFactory
   *      â†“
   * MigrationAdapter
   *      â†“
   * LaunchFactory
   */

  export const ARC_MAINNET_CONTRACTS =
    Object.freeze({
      uniswapV2Factory:
        "0x89e5DB8B5aA49aA85AC63f691524311AEB649eba",

      ammFactory:
        "0xF5230fE3E676F184490b87316FF99601B7351fe6",

      migrationAdapter:
        "0x6Ab39fB0038Be7a4d15914023f813cEB6193A097",

      launchFactory:
        "0x56FC882244f8FB1d05C2171d180872B38800706F",

      lpBurn:
        "0x000000000000000000000000000000000000dEaD",
    });


  /*
   * ------------------------------------------------------------
   * FAIR LAUNCH PROTOCOL PARAMETERS
   * ------------------------------------------------------------
   *
   * DISPLAY / frontend configuration.
   * Smart contracts remain the source of truth.
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


  export function isArcMainnetChainId(
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
        ARC_MAINNET.chainId
      );
    }

    return (
      Number(chainId) ===
      ARC_MAINNET.chainId
    );
  }
