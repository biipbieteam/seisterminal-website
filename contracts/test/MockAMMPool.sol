// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title MockAMMPool
 *
 * @notice Test-only constant-product AMM primitive used to
 *         design ARC TERMINAL's migration lifecycle.
 *
 *         Pair:
 *
 *             MemeToken / native quote
 *
 *         Initial liquidity may be added exactly once.
 *
 *         LP shares are minted as:
 *
 *             sqrt(tokenAmount * quoteAmount)
 *
 *         This contract deliberately has:
 *
 *         - no admin withdrawal
 *         - no arbitrary rescue
 *         - no second liquidity initialization
 *         - no swap yet
 *
 *         It is NOT intended for production deployment.
 */
contract MockAMMPool is ERC20, ReentrancyGuard {
    address public immutable factory;
    IERC20 public immutable token;

    uint256 public tokenReserve;
    uint256 public quoteReserve;

    bool public initialized;

    error OnlyFactory();
    error AlreadyInitialized();
    error InvalidLiquidity();
    error TokenTransferFailed();
    error InvalidRecipient();
    error DirectNativeTransferDisabled();

    event InitialLiquidityAdded(
        address indexed provider,
        address indexed lpRecipient,
        uint256 tokenAmount,
        uint256 quoteAmount,
        uint256 lpMinted
    );

    constructor(
        address token_
    )
        ERC20(
            "ARC Mock LP",
            "ARC-LP"
        )
    {
        if (token_ == address(0)) {
            revert InvalidRecipient();
        }

        factory = msg.sender;
        token = IERC20(token_);
    }

    modifier onlyFactory() {
        if (msg.sender != factory) {
            revert OnlyFactory();
        }

        _;
    }

    /**
     * @notice Initializes pool reserves exactly once.
     *
     * @dev Factory transfers tokenAmount from provider.
     *      Native quote must equal msg.value exactly.
     *
     *      LP is minted to lpRecipient. Migration layer
     *      will later choose the burn destination/policy.
     */
    function addInitialLiquidity(
        address provider,
        address lpRecipient,
        uint256 tokenAmount
    )
        external
        payable
        onlyFactory
        nonReentrant
        returns (uint256 lpMinted)
    {
        if (initialized) {
            revert AlreadyInitialized();
        }

        if (
            provider == address(0) ||
            lpRecipient == address(0)
        ) {
            revert InvalidRecipient();
        }

        if (
            tokenAmount == 0 ||
            msg.value == 0
        ) {
            revert InvalidLiquidity();
        }

        /*
         * LP shares represent geometric mean
         * of the initial reserves.
         *
         * Math.mulDiv avoids materializing
         * tokenAmount * msg.value directly.
         */
        uint256 ratio =
            Math.mulDiv(
                tokenAmount,
                msg.value,
                1
            );

        lpMinted =
            Math.sqrt(ratio);

        if (lpMinted == 0) {
            revert InvalidLiquidity();
        }

        /*
         * Effects first.
         */
        initialized = true;

        tokenReserve =
            tokenAmount;

        quoteReserve =
            msg.value;

        /*
         * Pull exact token inventory.
         */
        bool success =
            token.transferFrom(
                provider,
                address(this),
                tokenAmount
            );

        if (!success) {
            revert TokenTransferFailed();
        }

        _mint(
            lpRecipient,
            lpMinted
        );

        emit InitialLiquidityAdded(
            provider,
            lpRecipient,
            tokenAmount,
            msg.value,
            lpMinted
        );
    }

    /**
     * @notice Constant-product invariant.
     *
     * @dev Used only for testing / inspection.
     */
    function invariant()
        external
        view
        returns (uint256)
    {
        return Math.mulDiv(
            tokenReserve,
            quoteReserve,
            1
        );
    }

    /**
     * @notice Current spot quote per 1 token unit,
     *         scaled by 1e18.
     */
    function spotPrice()
        external
        view
        returns (uint256)
    {
        if (
            !initialized ||
            tokenReserve == 0
        ) {
            return 0;
        }

        return Math.mulDiv(
            quoteReserve,
            1e18,
            tokenReserve
        );
    }

    /**
     * @dev Native quote must enter only through
     *      the explicit liquidity function.
     */
    receive() external payable {
        revert DirectNativeTransferDisabled();
    }
}