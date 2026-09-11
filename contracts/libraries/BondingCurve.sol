// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

library BondingCurve {
    uint256 internal constant WAD = 1e18;

    uint256 internal constant INITIAL_MARKET_CAP =
        10_000 ether;

    uint256 internal constant GRADUATION_MARKET_CAP =
        60_000 ether;

    error InvalidTotalSupply();
    error InvalidBondingSupply();
    error InvalidTokenAmount();
    error InvalidQuoteAmount();
    error SupplyExceeded();

    function initialPrice(
        uint256 totalSupply
    )
        internal
        pure
        returns (uint256)
    {
        if (totalSupply == 0) {
            revert InvalidTotalSupply();
        }

        return (
            INITIAL_MARKET_CAP *
            WAD /
            totalSupply
        );
    }

    function graduationPrice(
        uint256 totalSupply
    )
        internal
        pure
        returns (uint256)
    {
        if (totalSupply == 0) {
            revert InvalidTotalSupply();
        }

        return (
            GRADUATION_MARKET_CAP *
            WAD /
            totalSupply
        );
    }

    function priceAt(
        uint256 tokensSold,
        uint256 totalSupply,
        uint256 bondingSupply
    )
        internal
        pure
        returns (uint256)
    {
        if (totalSupply == 0) {
            revert InvalidTotalSupply();
        }

        if (bondingSupply == 0) {
            revert InvalidBondingSupply();
        }

        if (tokensSold > bondingSupply) {
            revert SupplyExceeded();
        }

        uint256 start =
            initialPrice(totalSupply);

        uint256 end =
            graduationPrice(totalSupply);

        uint256 increase =
            (end - start) *
            tokensSold /
            bondingSupply;

        return start + increase;
    }

    function quoteForTokens(
        uint256 tokensSold,
        uint256 tokenAmount,
        uint256 totalSupply,
        uint256 bondingSupply
    )
        internal
        pure
        returns (uint256)
    {
        if (tokenAmount == 0) {
            revert InvalidTokenAmount();
        }

        if (bondingSupply == 0) {
            revert InvalidBondingSupply();
        }

        uint256 endSold =
            tokensSold +
            tokenAmount;

        if (endSold > bondingSupply) {
            revert SupplyExceeded();
        }

        uint256 priceStart =
            priceAt(
                tokensSold,
                totalSupply,
                bondingSupply
            );

        uint256 priceEnd =
            priceAt(
                endSold,
                totalSupply,
                bondingSupply
            );

        return (
            tokenAmount *
            (priceStart + priceEnd) /
            (2 * WAD)
        );
    }

    function tokensForQuote(
        uint256 tokensSold,
        uint256 quoteAmount,
        uint256 totalSupply,
        uint256 bondingSupply
    )
        internal
        pure
        returns (uint256)
    {
        if (quoteAmount == 0) {
            revert InvalidQuoteAmount();
        }

        if (bondingSupply == 0) {
            revert InvalidBondingSupply();
        }

        if (tokensSold >= bondingSupply) {
            revert SupplyExceeded();
        }

        uint256 remaining =
            bondingSupply -
            tokensSold;

        uint256 low = 0;
        uint256 high = remaining;

        while (low < high) {
            uint256 mid =
                low +
                (high - low + 1) /
                2;

            uint256 cost =
                quoteForTokens(
                    tokensSold,
                    mid,
                    totalSupply,
                    bondingSupply
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