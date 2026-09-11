/*
 * ============================================================
 * ARC TERMINAL
 * Minimal Frontend ABIs
 * ============================================================
 *
 * Only methods required by the public Fair Launch UI
 * are exposed here.
 *
 * Security / simplicity policy:
 *
 * - no signing methods
 * - no Permit / Permit2
 * - no setApprovalForAll
 * - no privileged methods
 * - no unlimited approval helper
 * - no unnecessary contract surface
 *
 * Smart contracts remain the source of truth.
 */


/*
 * ------------------------------------------------------------
 * LaunchFactory
 * ------------------------------------------------------------
 */

export const LAUNCH_FACTORY_ABI =
  Object.freeze([
    /*
     * READ — total number of launches
     */
    "function totalFairLaunches() view returns (uint256)",

    /*
     * READ — FairLaunch public array getter
     *
 /*
 * Struct order:
 *
 * token
 * creator
 * totalSupply
 * bondingSupply
 * liquiditySupply
 * tokensSold
 * quoteReserve
 * transactionCount
 * status
 */
"function fairLaunches(uint256) view returns (address token, address creator, uint256 totalSupply, uint256 bondingSupply, uint256 liquiditySupply, uint256 tokensSold, uint256 quoteReserve, uint256 transactionCount, uint8 status)",

    /*
     * CREATE
     *
     * Supply is NOT a creator input.
     * Every launch is fixed to 1B tokens
     * by LaunchFactory.
     *
     * msg.value may optionally contain
     * the creator's paid dev buy.
     */
    "function launchFairToken(string name_, string symbol_) payable returns (uint256 launchId, address tokenAddress)",

    /*
     * READ — creator dev-buy quote
     */
    "function quoteDevBuy(uint256 quoteAmount_) pure returns (uint256 tokenAmount)",

    /*
     * READ — public BUY quote
     *
     * Returns:
     * tokensOut
     * actualCost
     *
     * actualCost can be microscopically
     * lower than quoteAmount because of
     * integer curve rounding.
     */
    "function quoteBuy(uint256 launchId_, uint256 quoteAmount_) view returns (uint256 tokensOut, uint256 actualCost)",

    /*
     * WRITE — public BUY
     *
     * Native ARC Testnet USDC is supplied
     * through msg.value.
     */
    "function buyFairToken(uint256 launchId_, uint256 minTokensOut_) payable returns (uint256 tokensOut)",

    /*
     * READ — SELL quote
     */
    "function quoteSell(uint256 launchId_, uint256 tokenAmount_) view returns (uint256 quoteOut)",

    /*
     * WRITE — SELL
     *
     * Requires an explicit ERC20 approval
     * beforehand for tokenAmount_.
     */
    "function sellFairToken(uint256 launchId_, uint256 tokenAmount_, uint256 minQuoteOut_) returns (uint256 quoteOut)",


    /*
     * EVENTS
     */

    "event FairTokenBought(uint256 indexed launchId, address indexed buyer, address indexed token, uint256 quoteAmount, uint256 tokenAmount, uint256 tokensSold, uint256 quoteReserve)",

    "event FairTokenSold(uint256 indexed launchId, address indexed seller, address indexed token, uint256 tokenAmount, uint256 quoteOut, uint256 tokensSold, uint256 quoteReserve)",
  ]);


/*
 * ------------------------------------------------------------
 * MemeToken
 * ------------------------------------------------------------
 *
 * Fixed-supply ERC20 deployed by LaunchFactory.
 */

export const MEME_TOKEN_ABI =
  Object.freeze([
    /*
     * READ
     */
    "function name() view returns (string)",

    "function symbol() view returns (string)",

    "function decimals() view returns (uint8)",

    "function totalSupply() view returns (uint256)",

    "function balanceOf(address account) view returns (uint256)",

    "function allowance(address owner, address spender) view returns (uint256)",


    /*
     * WRITE
     *
     * Frontend policy:
     *
     * approve() must be called only after
     * explicit SELL action.
     *
     * The UI will approve the exact required
     * sell amount rather than MaxUint256.
     */
    "function approve(address spender, uint256 amount) returns (bool)",


    /*
     * EVENTS
     */
    "event Approval(address indexed owner, address indexed spender, uint256 value)",

    "event Transfer(address indexed from, address indexed to, uint256 value)",
  ]);