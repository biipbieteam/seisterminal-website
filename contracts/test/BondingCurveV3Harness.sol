// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../libraries/BondingCurveV3.sol";

contract BondingCurveV3Harness {
    function initialVirtualTokenReserve(
        uint256 totalSupply
    ) external pure returns (uint256) {
        return BondingCurveV3.initialVirtualTokenReserve(
            totalSupply
        );
    }


    function virtualTokenReserve(
        uint256 totalSupply,
        uint256 tokensSold
    ) external pure returns (uint256) {
        return BondingCurveV3.virtualTokenReserve(
            totalSupply,
            tokensSold
        );
    }

    function virtualQuoteReserve(
        uint256 totalSupply,
        uint256 tokensSold
    ) external pure returns (uint256) {
        return BondingCurveV3.virtualQuoteReserve(
            totalSupply,
            tokensSold
        );
    }

    function realQuoteReserve(
        uint256 totalSupply,
        uint256 tokensSold
    ) external pure returns (uint256) {
        return BondingCurveV3.realQuoteReserve(
            totalSupply,
            tokensSold
        );
    }

    function priceAt(
        uint256 totalSupply,
        uint256 tokensSold
    ) external pure returns (uint256) {
        return BondingCurveV3.priceAt(
            totalSupply,
            tokensSold
        );
    }

    function marketCapAt(
        uint256 totalSupply,
        uint256 tokensSold
    ) external pure returns (uint256) {
        return BondingCurveV3.marketCapAt(
            totalSupply,
            tokensSold
        );
    }

    function graduationTokensSold(
        uint256 totalSupply
    ) external pure returns (uint256) {
        return BondingCurveV3.graduationTokensSold(
            totalSupply
        );
    }

    function quoteForTokens(
        uint256 totalSupply,
        uint256 tokensSold,
        uint256 tokenAmount
    ) external pure returns (uint256) {
        return BondingCurveV3.quoteForTokens(
            totalSupply,
            tokensSold,
            tokenAmount
        );
    }

    function quoteForSell(
        uint256 totalSupply,
        uint256 tokensSold,
        uint256 tokenAmount
    ) external pure returns (uint256) {
        return BondingCurveV3.quoteForSell(
            totalSupply,
            tokensSold,
            tokenAmount
        );
    }

    function tokensForQuote(
        uint256 totalSupply,
        uint256 tokensSold,
        uint256 quoteAmount,
        uint256 maxTokens
    ) external pure returns (uint256) {
        return BondingCurveV3.tokensForQuote(
            totalSupply,
            tokensSold,
            quoteAmount,
            maxTokens
        );
    }
}