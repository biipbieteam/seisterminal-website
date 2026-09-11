// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./MemeToken.sol";
import "./libraries/BondingCurveV3.sol";
import {
    IMigrationAdapter
} from "./interfaces/IMigrationAdapter.sol";

import {Math} from
    "@openzeppelin/contracts/utils/math/Math.sol";

import {ReentrancyGuard} from
    "@openzeppelin/contracts/utils/ReentrancyGuard.sol";


contract LaunchFactory is ReentrancyGuard {
    IMigrationAdapter public immutable
        migrationAdapter;
    uint256 public constant BPS_DENOMINATOR =
        10_000;
    address public constant
        EXPECTED_LP_BURN_ADDRESS =
        0x000000000000000000000000000000000000dEaD;
    /*
     * ARC policy.
     *
     * This is NOT part of the bonding-curve math.
     * Creator may buy at most 5% of total supply
     * during launch creation.
     */
    uint256 public constant MAX_DEV_BUY_BPS =
        500;

    /*
     * MemeToken uses 18 decimals.
     *
     * launchFairToken() accepts human whole-token
     * supply and scales it before deployment.
     */
    /*
    * ARC Fair Launch policy.
    *
    * Every Fair Launch always has exactly
    * 1,000,000,000 physical tokens.
    *
    * Supply is protocol-defined and cannot
    * be selected by the creator.
    */
    uint256 public constant TOKEN_DECIMALS =
        1e18;

    uint256 public constant
        FAIR_LAUNCH_TOTAL_SUPPLY =
        1_000_000_000;

    uint256 public constant
        FAIR_LAUNCH_SCALED_SUPPLY =
        FAIR_LAUNCH_TOTAL_SUPPLY *
        TOKEN_DECIMALS;

    uint256 public constant MAX_NAME_LENGTH =
        32;

    uint256 public constant MAX_SYMBOL_LENGTH =
        10;


    enum LaunchStatus {
        ACTIVE,
        GRADUATING,
        GRADUATED
    }


    struct FairLaunch {
        address token;
        address creator;

        /*
         * Physical ERC20 supply.
         */
        uint256 totalSupply;

        /*
         * V3 meaning:
         *
         * bondingSupply =
         * maximum NET tokens distributed before
         * graduation.
         *
         * For Candidate A this is approximately
         * 71.010205% of total supply.
         */
        uint256 bondingSupply;

        /*
         * Physical tokens expected to remain in
         * Factory at exact graduation.
         *
         * Approximately 28.989795%.
         */
        uint256 liquiditySupply;

        /*
         * NET tokens outside the bonding vault.
         *
         * BUY  => increases
         * SELL => decreases
         */
        uint256 tokensSold;

        /*
         * Real native quote belonging to this
         * launch.
         *
         * Does NOT include virtual quote.
         */
        uint256 quoteReserve;

        uint256 transactionCount;

        LaunchStatus status;
    }


    FairLaunch[] public fairLaunches;


    mapping(address => bool)
        public isLaunchedToken;

    mapping(address => uint256)
        public launchIdByToken;


    event FairLaunchCreated(
        uint256 indexed launchId,
        address indexed token,
        address indexed creator,
        uint256 totalSupply,
        uint256 bondingSupply,
        uint256 liquiditySupply
    );

    event FairTokenBought(
        uint256 indexed launchId,
        address indexed buyer,
        address indexed token,
        uint256 quoteAmount,
        uint256 tokenAmount,
        uint256 tokensSold,
        uint256 quoteReserve
    );

    event FairTokenSold(
        uint256 indexed launchId,
        address indexed seller,
        address indexed token,
        uint256 tokenAmount,
        uint256 quoteAmount,
        uint256 tokensSold,
        uint256 quoteReserve
    );

    event FairLaunchMigrated(
        uint256 indexed launchId,
        address indexed token,
        address indexed pool,
        uint256 tokenAmount,
        uint256 quoteAmount,
        uint256 lpMinted
    );


    error InvalidName();
    error NameTooLong();

    error InvalidSymbol();
    error SymbolTooLong();

    error DevBuyTooLarge();
    error InvalidDevBuyPayment();

    error InvalidLaunch();

    error InvalidBuyAmount();
    error InvalidSellAmount();

    error SlippageExceeded();

    error BondingSupplySoldOut();
    error BuyExceedsRemainingSupply();
    error SellExceedsTokensSold();

    error InsufficientQuoteReserve();

    error TokenTransferFailed();
    error SellTransferFailed();
    error RefundTransferFailed();

    error LaunchNotActive();

    error InvalidCurveState();
    error InvalidMigrationAdapter();

    error LaunchNotGraduating();
    error MigrationAlreadyCompleted();
    error InvalidMigrationPool();
    error InvalidMigrationLP();

    /*
     * --------------------------------------------------
     * CONSTRUCTOR
     * --------------------------------------------------
     */

    constructor(
        address migrationAdapter_
    ) {
        if (
            migrationAdapter_ ==
            address(0) ||
            migrationAdapter_.code.length == 0
        ) {
            revert InvalidMigrationAdapter();
        }

        /*
        * Deployment-time adapter compatibility check.
        *
        * A valid ARC migration adapter must expose
        * LP_BURN_ADDRESS() and must use the protocol's
        * expected irreversible LP destination.
        *
        * This rejects:
        * - EOAs
        * - arbitrary contracts
        * - incompatible adapters
        * - adapters configured with another LP recipient
        */
        try
            IMigrationAdapter(
                migrationAdapter_
            ).LP_BURN_ADDRESS()
        returns (
            address burnAddress
        ) {
            if (
                burnAddress !=
                EXPECTED_LP_BURN_ADDRESS
            ) {
                revert InvalidMigrationAdapter();
            }
        } catch {
            revert InvalidMigrationAdapter();
        }

        migrationAdapter =
            IMigrationAdapter(
                migrationAdapter_
            );
    }

    /*
     * --------------------------------------------------
     * LAUNCH
     * --------------------------------------------------
     */

    function launchFairToken(
        string calldata name_,
        string calldata symbol_
    )
        external
        payable
        nonReentrant
        returns (
            uint256 launchId,
            address tokenAddress
        )
    {
        _validateFairLaunch(
            name_,
            symbol_
        );

        uint256 scaledSupply =
            FAIR_LAUNCH_SCALED_SUPPLY;

        /*
         * V3:
         *
         * No 80/20 hard-coded allocation.
         *
         * BondingCurveV3 derives the exact
         * graduation inventory required for:
         *
         * 10K initial MC
         * ->
         * 60K graduation MC
         * ->
         * DEX price continuity.
         */
        uint256 bondingSupply =
            BondingCurveV3
                .graduationTokensSold(
                    scaledSupply
                );

        if (
            bondingSupply == 0 ||
            bondingSupply >= scaledSupply
        ) {
            revert InvalidCurveState();
        }

        uint256 liquiditySupply =
            scaledSupply -
            bondingSupply;

        /*
         * MemeToken mints the entire physical
         * supply to this Factory.
         *
         * Nothing is separately minted to LP.
         */
        MemeToken token =
            new MemeToken(
                name_,
                symbol_,
                scaledSupply,
                msg.sender
            );

        tokenAddress =
            address(token);

        launchId =
            fairLaunches.length;

        fairLaunches.push();

        FairLaunch storage launch =
            fairLaunches[launchId];

        launch.token =
            tokenAddress;

        launch.creator =
            msg.sender;

        launch.totalSupply =
            scaledSupply;

        launch.bondingSupply =
            bondingSupply;

        launch.liquiditySupply =
            liquiditySupply;

        launch.status =
            LaunchStatus.ACTIVE;


        isLaunchedToken[
            tokenAddress
        ] = true;

        launchIdByToken[
            tokenAddress
        ] = launchId;


        /*
         * Emit CREATE state first.
         */
        _emitFairLaunchCreated(
            launchId,
            launch
        );


        /*
         * Optional creator/dev BUY.
         *
         * This is a REAL curve purchase.
         * No free creator allocation.
         */
        if (msg.value > 0) {
            _executeDevBuy(
                launchId,
                launch,
                msg.value
            );
        }
    }


    /*
     * --------------------------------------------------
     * BUY
     * --------------------------------------------------
     */

    function buyFairToken(
        uint256 launchId_,
        uint256 minTokensOut_
    )
        external
        payable
        nonReentrant
        returns (uint256 tokensOut)
    {
        if (
            launchId_ >=
            fairLaunches.length
        ) {
            revert InvalidLaunch();
        }

        if (msg.value == 0) {
            revert InvalidBuyAmount();
        }


        FairLaunch storage launch =
            fairLaunches[launchId_];


        if (
            launch.status !=
            LaunchStatus.ACTIVE
        ) {
            revert LaunchNotActive();
        }


        if (
            launch.tokensSold >=
            launch.bondingSupply
        ) {
            revert BondingSupplySoldOut();
        }


        uint256 remainingTokens =
            launch.bondingSupply -
            launch.tokensSold;


        /*
         * Exact quote required to consume all
         * remaining graduation inventory.
         *
         * We continue the conservative V2 policy:
         * a user may not submit a quote larger than
         * the complete remaining curve cost.
         */
        uint256 remainingCost =
            BondingCurveV3
                .quoteForTokens(
                    launch.totalSupply,
                    launch.tokensSold,
                    remainingTokens
                );


        if (msg.value > remainingCost) {
            revert BuyExceedsRemainingSupply();
        }


        tokensOut =
            BondingCurveV3
                .tokensForQuote(
                    launch.totalSupply,
                    launch.tokensSold,
                    msg.value,
                    remainingTokens
                );


        if (
            tokensOut <
            minTokensOut_
        ) {
            revert SlippageExceeded();
        }


        /*
         * tokensForQuote() returns the maximum
         * affordable amount.
         *
         * Because integer pricing is discrete,
         * actualCost may be microscopically smaller
         * than msg.value.
         *
         * Only actualCost belongs to quoteReserve.
         * The remainder is refunded.
         */
        uint256 actualCost =
            BondingCurveV3
                .quoteForTokens(
                    launch.totalSupply,
                    launch.tokensSold,
                    tokensOut
                );


        if (actualCost > msg.value) {
            revert InvalidDevBuyPayment();
        }


        uint256 refund =
            msg.value -
            actualCost;


        /*
         * Effects.
         */
        launch.tokensSold +=
            tokensOut;

        launch.quoteReserve +=
            actualCost;

        launch.transactionCount += 1;

        /*
         * Exact final fill:
         *
         * ACTIVE -> GRADUATING
         */
        if (
            launch.tokensSold ==
            launch.bondingSupply
        ) {
            launch.status =
                LaunchStatus.GRADUATING;
        }


        /*
         * Physical tokens leave the Factory.
         */
        _safeTokenTransfer(
            launch.token,
            msg.sender,
            tokensOut
        );


        /*
         * Refund inverse-quote rounding remainder.
         */
        if (refund > 0) {
            _refundQuote(
                msg.sender,
                refund
            );
        }


        emit FairTokenBought(
            launchId_,
            msg.sender,
            launch.token,
            actualCost,
            tokensOut,
            launch.tokensSold,
            launch.quoteReserve
        );
    }


    /*
     * --------------------------------------------------
     * SELL
     * --------------------------------------------------
     */

    function sellFairToken(
        uint256 launchId_,
        uint256 tokenAmount_,
        uint256 minQuoteOut_
    )
        external
        nonReentrant
        returns (uint256 quoteOut)
    {
        if (
            launchId_ >=
            fairLaunches.length
        ) {
            revert InvalidLaunch();
        }


        if (tokenAmount_ == 0) {
            revert InvalidSellAmount();
        }


        FairLaunch storage launch =
            fairLaunches[launchId_];


        if (
            launch.status !=
            LaunchStatus.ACTIVE
        ) {
            revert LaunchNotActive();
        }


        if (
            tokenAmount_ >
            launch.tokensSold
        ) {
            revert SellExceedsTokensSold();
        }


        /*
         * V3 uses the explicit reverse path.
         *
         * SELL rounds quote output DOWN.
         */
        quoteOut =
            BondingCurveV3
                .quoteForSell(
                    launch.totalSupply,
                    launch.tokensSold,
                    tokenAmount_
                );


        if (
            quoteOut <
            minQuoteOut_
        ) {
            revert SlippageExceeded();
        }


        if (
            quoteOut >
            launch.quoteReserve
        ) {
            revert InsufficientQuoteReserve();
        }


        /*
         * Effects first.
         */
        launch.tokensSold -=
            tokenAmount_;

        launch.quoteReserve -=
            quoteOut;

        launch.transactionCount += 1;

        /*
         * Seller returns physical token inventory
         * to the Factory.
         *
         * Requires prior ERC20 approval.
         */
        bool tokenSuccess =
            MemeToken(launch.token)
                .transferFrom(
                    msg.sender,
                    address(this),
                    tokenAmount_
                );


        if (!tokenSuccess) {
            revert TokenTransferFailed();
        }


        /*
         * Native quote payout.
         */
        (
            bool quoteSuccess,
        ) =
            payable(msg.sender).call{
                value: quoteOut
            }("");


        if (!quoteSuccess) {
            revert SellTransferFailed();
        }


        emit FairTokenSold(
            launchId_,
            msg.sender,
            launch.token,
            tokenAmount_,
            quoteOut,
            launch.tokensSold,
            launch.quoteReserve
        );
    }

    /*
     * --------------------------------------------------
     * MIGRATION
     * --------------------------------------------------
     */

    function migrateFairLaunch(
        uint256 launchId_
    )
        external
        nonReentrant
        returns (
            address pool,
            uint256 lpMinted
        )
    {
        if (
            launchId_ >=
            fairLaunches.length
        ) {
            revert InvalidLaunch();
        }

        FairLaunch storage launch =
            fairLaunches[launchId_];

        /*
         * Migration is only valid after the exact
         * bonding graduation fill.
         */
        if (
            launch.status !=
            LaunchStatus.GRADUATING
        ) {
            if (
                launch.status ==
                LaunchStatus.GRADUATED
            ) {
                revert MigrationAlreadyCompleted();
            }

            revert LaunchNotGraduating();
        }

        /*
         * Use the ACTUAL launch state.
         *
         * Do not recompute Candidate A economics here.
         */
        uint256 tokenAmount =
            launch.liquiditySupply;

        uint256 quoteAmount =
            launch.quoteReserve;

        if (
            tokenAmount == 0 ||
            quoteAmount == 0
        ) {
            revert InvalidCurveState();
        }

        /*
         * Exact approval only.
         *
         * MigrationAdapter pulls tokenAmount from
         * this Factory using transferFrom().
         */
        bool approvalSuccess =
            MemeToken(
                launch.token
            ).approve(
                address(
                    migrationAdapter
                ),
                tokenAmount
            );

        if (!approvalSuccess) {
            revert TokenTransferFailed();
        }

        /*
         * Entire operation is atomic.
         *
         * If Adapter / AMM migration reverts,
         * approval + all state changes roll back.
         */
        (
            pool,
            lpMinted
        ) =
            migrationAdapter
                .migrate{
                    value: quoteAmount
                }(
                    launch.token,
                    tokenAmount
                );

        if (pool == address(0)) {
            revert InvalidMigrationPool();
        }

        if (lpMinted == 0) {
            revert InvalidMigrationLP();
        }

        /*
         * Verify Adapter's own recorded migration
         * agrees with its returned result.
         */
        if (
            !migrationAdapter
                .migrated(
                    launch.token
                )
        ) {
            revert InvalidMigrationPool();
        }

        if (
            migrationAdapter
                .migrationPool(
                    launch.token
                ) != pool
        ) {
            revert InvalidMigrationPool();
        }

        /*
         * Exact allowance should already be consumed
         * by transferFrom().
         *
         * Explicitly clear it anyway so Factory never
         * leaves migration approval behind.
         */
        approvalSuccess =
            MemeToken(
                launch.token
            ).approve(
                address(
                    migrationAdapter
                ),
                0
            );

        if (!approvalSuccess) {
            revert TokenTransferFailed();
        }

        /*
         * The launch no longer owns native quote
         * after successful migration.
         *
         * liquiditySupply remains historical launch
         * metadata describing the migrated inventory.
         */
        launch.quoteReserve = 0;

        launch.status =
            LaunchStatus.GRADUATED;

        emit FairLaunchMigrated(
            launchId_,
            launch.token,
            pool,
            tokenAmount,
            quoteAmount,
            lpMinted
        );
    }

    /*
     * --------------------------------------------------
     * DEV BUY
     * --------------------------------------------------
     */

    function _executeDevBuy(
        uint256 launchId_,
        FairLaunch storage launch_,
        uint256 quoteAmount_
    )
        internal
    {
        uint256 maxDevTokens =
            Math.mulDiv(
                launch_.totalSupply,
                MAX_DEV_BUY_BPS,
                BPS_DENOMINATOR
            );


        /*
         * 5% is currently well below the
         * ~71.01% graduation inventory.
         *
         * Still enforce this defensively.
         */
        if (
            maxDevTokens == 0 ||
            maxDevTokens >
            launch_.bondingSupply
        ) {
            revert DevBuyTooLarge();
        }


        uint256 maxDevQuote =
            BondingCurveV3
                .quoteForTokens(
                    launch_.totalSupply,
                    0,
                    maxDevTokens
                );


        if (
            quoteAmount_ >
            maxDevQuote
        ) {
            revert DevBuyTooLarge();
        }


        uint256 devTokens =
            BondingCurveV3
                .tokensForQuote(
                    launch_.totalSupply,
                    0,
                    quoteAmount_,
                    maxDevTokens
                );


        if (
            devTokens >
            maxDevTokens
        ) {
            revert DevBuyTooLarge();
        }


        uint256 actualCost =
            BondingCurveV3
                .quoteForTokens(
                    launch_.totalSupply,
                    0,
                    devTokens
                );


        if (
            actualCost >
            quoteAmount_
        ) {
            revert InvalidDevBuyPayment();
        }


        uint256 refund =
            quoteAmount_ -
            actualCost;


        launch_.tokensSold =
            devTokens;

        launch_.quoteReserve =
            actualCost;

        launch_.transactionCount += 1;
        
        _safeTokenTransfer(
            launch_.token,
            launch_.creator,
            devTokens
        );


        if (refund > 0) {
            _refundQuote(
                launch_.creator,
                refund
            );
        }


        emit FairTokenBought(
            launchId_,
            launch_.creator,
            launch_.token,
            actualCost,
            devTokens,
            launch_.tokensSold,
            launch_.quoteReserve
        );
    }


    /*
     * --------------------------------------------------
     * VALIDATION
     * --------------------------------------------------
     */

    function _validateFairLaunch(
        string calldata name_,
        string calldata symbol_
    )
        internal
        pure
    {
        uint256 nameLength =
            bytes(name_).length;

        if (nameLength == 0) {
            revert InvalidName();
        }

        if (
            nameLength >
            MAX_NAME_LENGTH
        ) {
            revert NameTooLong();
        }

        uint256 symbolLength =
            bytes(symbol_).length;

        if (symbolLength == 0) {
            revert InvalidSymbol();
        }

        if (
            symbolLength >
            MAX_SYMBOL_LENGTH
        ) {
            revert SymbolTooLong();
        }
    }


    /*
     * --------------------------------------------------
     * SAFE TRANSFERS
     * --------------------------------------------------
     */

    function _safeTokenTransfer(
        address token_,
        address to_,
        uint256 amount_
    )
        internal
    {
        bool success =
            MemeToken(token_)
                .transfer(
                    to_,
                    amount_
                );


        if (!success) {
            revert TokenTransferFailed();
        }
    }


    function _refundQuote(
        address to_,
        uint256 amount_
    )
        internal
    {
        (
            bool success,
        ) =
            payable(to_).call{
                value: amount_
            }("");


        if (!success) {
            revert RefundTransferFailed();
        }
    }


    /*
     * --------------------------------------------------
     * EVENTS
     * --------------------------------------------------
     */

    function _emitFairLaunchCreated(
        uint256 launchId_,
        FairLaunch storage launch_
    )
        internal
    {
        emit FairLaunchCreated(
            launchId_,
            launch_.token,
            launch_.creator,
            launch_.totalSupply,
            launch_.bondingSupply,
            launch_.liquiditySupply
        );
    }


    /*
     * --------------------------------------------------
     * QUOTES
     * --------------------------------------------------
     */

    function quoteDevBuy(
        uint256 quoteAmount_
    )
        external
        pure
        returns (uint256 tokenAmount)
    {
        if (quoteAmount_ == 0) {
            return 0;
        }

        uint256 scaledSupply =
            FAIR_LAUNCH_SCALED_SUPPLY;

        uint256 bondingSupply =
            BondingCurveV3
                .graduationTokensSold(
                    scaledSupply
                );

        uint256 maxDevTokens =
            Math.mulDiv(
                scaledSupply,
                MAX_DEV_BUY_BPS,
                BPS_DENOMINATOR
            );

        if (
            maxDevTokens == 0 ||
            maxDevTokens >
            bondingSupply
        ) {
            revert DevBuyTooLarge();
        }

        uint256 maxDevQuote =
            BondingCurveV3
                .quoteForTokens(
                    scaledSupply,
                    0,
                    maxDevTokens
                );

        if (
            quoteAmount_ >
            maxDevQuote
        ) {
            revert DevBuyTooLarge();
        }

        tokenAmount =
            BondingCurveV3
                .tokensForQuote(
                    scaledSupply,
                    0,
                    quoteAmount_,
                    maxDevTokens
                );
    }


    /*
     * Useful frontend quote for a normal BUY.
     */
    function quoteBuy(
        uint256 launchId_,
        uint256 quoteAmount_
    )
        external
        view
        returns (
            uint256 tokensOut,
            uint256 actualCost
        )
    {
        if (
            launchId_ >=
            fairLaunches.length
        ) {
            revert InvalidLaunch();
        }


        if (quoteAmount_ == 0) {
            revert InvalidBuyAmount();
        }


        FairLaunch storage launch =
            fairLaunches[launchId_];


        if (
            launch.status !=
            LaunchStatus.ACTIVE
        ) {
            revert LaunchNotActive();
        }


        uint256 remainingTokens =
            launch.bondingSupply -
            launch.tokensSold;


        if (remainingTokens == 0) {
            revert BondingSupplySoldOut();
        }


        uint256 remainingCost =
            BondingCurveV3
                .quoteForTokens(
                    launch.totalSupply,
                    launch.tokensSold,
                    remainingTokens
                );


        if (
            quoteAmount_ >
            remainingCost
        ) {
            revert BuyExceedsRemainingSupply();
        }


        tokensOut =
            BondingCurveV3
                .tokensForQuote(
                    launch.totalSupply,
                    launch.tokensSold,
                    quoteAmount_,
                    remainingTokens
                );


        actualCost =
            BondingCurveV3
                .quoteForTokens(
                    launch.totalSupply,
                    launch.tokensSold,
                    tokensOut
                );
    }


    /*
     * Useful frontend quote for SELL.
     */
    function quoteSell(
        uint256 launchId_,
        uint256 tokenAmount_
    )
        external
        view
        returns (uint256 quoteOut)
    {
        if (
            launchId_ >=
            fairLaunches.length
        ) {
            revert InvalidLaunch();
        }


        if (tokenAmount_ == 0) {
            revert InvalidSellAmount();
        }


        FairLaunch storage launch =
            fairLaunches[launchId_];


        if (
            launch.status !=
            LaunchStatus.ACTIVE
        ) {
            revert LaunchNotActive();
        }


        if (
            tokenAmount_ >
            launch.tokensSold
        ) {
            revert SellExceedsTokensSold();
        }


        quoteOut =
            BondingCurveV3
                .quoteForSell(
                    launch.totalSupply,
                    launch.tokensSold,
                    tokenAmount_
                );
    }


    function totalFairLaunches()
        external
        view
        returns (uint256)
    {
        return fairLaunches.length;
    }
}