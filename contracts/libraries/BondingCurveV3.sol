// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

/**
 * @title BondingCurveV3
 * @notice ARC TERMINAL Fair Launch constant-product
 *         bonding curve using virtual reserves.
 *
 * Candidate A:
 *
 * Initial MC:              10,000 quote
 * Graduation MC:           60,000 quote
 * Initial virtual tokens:  120% of physical supply
 * Initial virtual quote:   12,000 quote
 *
 * Quote uses ARC native-asset 18-decimal representation.
 */
library BondingCurveV3 {
    uint256 internal constant WAD = 1e18;

    uint256 internal constant INITIAL_VIRTUAL_QUOTE =
        12_000 ether;

    uint256 internal constant GRADUATION_MARKET_CAP =
        60_000 ether;

    error InvalidSupply();
    error InvalidTokenAmount();
    error InvalidQuoteAmount();
    error SupplyExceeded();
    error SellExceedsTokensSold();
    error InvalidMaxTokens();

    /**
     * @notice Initial virtual token reserve = 120% of supply.
     *
     * mulDiv avoids overflowing on:
     * totalSupply * 12
     */
    function initialVirtualTokenReserve(
        uint256 totalSupply
    ) internal pure returns (uint256) {
        if (totalSupply == 0) {
            revert InvalidSupply();
        }

        return Math.mulDiv(
            totalSupply,
            12,
            10
        );
    }

    function virtualTokenReserve(
        uint256 totalSupply,
        uint256 tokensSold
    ) internal pure returns (uint256) {
        uint256 startVT =
            initialVirtualTokenReserve(
                totalSupply
            );

        if (tokensSold >= startVT) {
            revert SupplyExceeded();
        }

        return startVT - tokensSold;
    }

    /**
     * @dev Computes:
     *
     * VT0 * VQ0 / VT
     *
     * without materializing the constant-product
     * invariant inside a uint256.
     */
    function virtualQuoteReserve(
        uint256 totalSupply,
        uint256 tokensSold
    ) internal pure returns (uint256) {
        uint256 startVT =
            initialVirtualTokenReserve(
                totalSupply
            );

        uint256 currentVT =
            virtualTokenReserve(
                totalSupply,
                tokensSold
            );

        return Math.mulDiv(
            startVT,
            INITIAL_VIRTUAL_QUOTE,
            currentVT
        );
    }

    function realQuoteReserve(
        uint256 totalSupply,
        uint256 tokensSold
    ) internal pure returns (uint256) {
        return
            virtualQuoteReserve(
                totalSupply,
                tokensSold
            ) -
            INITIAL_VIRTUAL_QUOTE;
    }

    function priceAt(
        uint256 totalSupply,
        uint256 tokensSold
    ) internal pure returns (uint256) {
        uint256 vt =
            virtualTokenReserve(
                totalSupply,
                tokensSold
            );

        uint256 vq =
            virtualQuoteReserve(
                totalSupply,
                tokensSold
            );

        return Math.mulDiv(
            vq,
            WAD,
            vt
        );
    }

    function marketCapAt(
        uint256 totalSupply,
        uint256 tokensSold
    ) internal pure returns (uint256) {
        return Math.mulDiv(
            priceAt(
                totalSupply,
                tokensSold
            ),
            totalSupply,
            WAD
        );
    }

    /**
     * @notice First net-sold amount whose MC reaches
     *         the 60K graduation threshold.
     */
    function graduationTokensSold(
        uint256 totalSupply
    ) internal pure returns (uint256) {
        if (totalSupply == 0) {
            revert InvalidSupply();
        }

        uint256 low;
        uint256 high = totalSupply;

        while (low < high) {
            uint256 mid =
                low +
                (high - low) /
                2;

            if (
                marketCapAt(
                    totalSupply,
                    mid
                ) <
                GRADUATION_MARKET_CAP
            ) {
                low = mid + 1;
            } else {
                high = mid;
            }
        }

        return low;
    }

    /**
     * @notice Quote required for an exact token BUY.
     *
     * Start reserve uses floor.
     * End reserve uses ceil.
     *
     * This prevents integer rounding from
     * undercharging the buyer.
     */
    function quoteForTokens(
        uint256 totalSupply,
        uint256 tokensSold,
        uint256 tokenAmount
    ) internal pure returns (uint256) {
        if (tokenAmount == 0) {
            revert InvalidTokenAmount();
        }

        uint256 startVT =
            virtualTokenReserve(
                totalSupply,
                tokensSold
            );

        if (tokenAmount >= startVT) {
            revert SupplyExceeded();
        }

        uint256 endVT =
            startVT - tokenAmount;

        uint256 initialVT =
            initialVirtualTokenReserve(
                totalSupply
            );

        uint256 startVQ =
            Math.mulDiv(
                initialVT,
                INITIAL_VIRTUAL_QUOTE,
                startVT
            );

        uint256 endVQ =
            Math.mulDiv(
                initialVT,
                INITIAL_VIRTUAL_QUOTE,
                endVT,
                Math.Rounding.Ceil
            );

        return endVQ - startVQ;
    }

    /**
     * @notice Quote returned when tokens are sold
     *         back to the curve.
     *
     * SELL intentionally rounds down.
     */
    function quoteForSell(
        uint256 totalSupply,
        uint256 tokensSold,
        uint256 tokenAmount
    ) internal pure returns (uint256) {
        if (tokenAmount == 0) {
            revert InvalidTokenAmount();
        }

        if (tokenAmount > tokensSold) {
            revert SellExceedsTokensSold();
        }

        uint256 startVT =
            virtualTokenReserve(
                totalSupply,
                tokensSold
            );

        uint256 endVT =
            startVT + tokenAmount;

        uint256 initialVT =
            initialVirtualTokenReserve(
                totalSupply
            );

        uint256 startVQ =
            Math.mulDiv(
                initialVT,
                INITIAL_VIRTUAL_QUOTE,
                startVT
            );

        uint256 endVQ =
            Math.mulDiv(
                initialVT,
                INITIAL_VIRTUAL_QUOTE,
                endVT
            );

        return startVQ - endVQ;
    }

    /**
     * @notice Maximum number of tokens purchasable
     *         using quoteAmount.
     */
    function tokensForQuote(
        uint256 totalSupply,
        uint256 tokensSold,
        uint256 quoteAmount,
        uint256 maxTokens
    ) internal pure returns (uint256) {
        if (quoteAmount == 0) {
            revert InvalidQuoteAmount();
        }

        if (maxTokens == 0) {
            revert InvalidMaxTokens();
        }

        uint256 startVT =
            virtualTokenReserve(
                totalSupply,
                tokensSold
            );

        /*
         * Prevent the binary search from ever asking
         * quoteForTokens() for an impossible amount.
         */
        if (maxTokens >= startVT) {
            revert SupplyExceeded();
        }

        uint256 low;
        uint256 high = maxTokens;

        while (low < high) {
            uint256 mid =
                low +
                (high - low + 1) /
                2;

            uint256 cost =
                quoteForTokens(
                    totalSupply,
                    tokensSold,
                    mid
                );

            if (cost <= quoteAmount) {
                low = mid;
            } else {
                high = mid - 1;
            }
        }

        if (low == 0) {
            revert InvalidQuoteAmount();
        }

        return low;
    }
}