// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../libraries/BondingCurve.sol";

contract BondingCurveHarness {
    function initialPrice(
        uint256 totalSupply
    )
        external
        pure
        returns (uint256)
    {
        return BondingCurve.initialPrice(
            totalSupply
        );
    }

    function graduationPrice(
        uint256 totalSupply
    )
        external
        pure
        returns (uint256)
    {
        return BondingCurve.graduationPrice(
            totalSupply
        );
    }

    function priceAt(
        uint256 tokensSold,
        uint256 totalSupply,
        uint256 bondingSupply
    )
        external
        pure
        returns (uint256)
    {
        return BondingCurve.priceAt(
            tokensSold,
            totalSupply,
            bondingSupply
        );
    }

    function quoteForTokens(
        uint256 tokensSold,
        uint256 tokenAmount,
        uint256 totalSupply,
        uint256 bondingSupply
    )
        external
        pure
        returns (uint256)
    {
        return BondingCurve.quoteForTokens(
            tokensSold,
            tokenAmount,
            totalSupply,
            bondingSupply
        );
    }

    function tokensForQuote(
        uint256 tokensSold,
        uint256 quoteAmount,
        uint256 totalSupply,
        uint256 bondingSupply
    )
        external
        pure
        returns (uint256)
    {
        return BondingCurve.tokensForQuote(
            tokensSold,
            quoteAmount,
            totalSupply,
            bondingSupply
        );
    }
}