// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IMigrationAMMFactory
 *
 * @notice Minimal AMM boundary required by the ARC
 *         migration layer.
 *
 * The migration system intentionally does not depend
 * on MockAMMFactory directly.
 *
 * A future real DEX adapter only needs to implement
 * this boundary.
 */
interface IMigrationAMMFactory {
    function createPoolAndAddLiquidity(
        address token,
        uint256 tokenAmount,
        address lpRecipient
    )
        external
        payable
        returns (
            address pool,
            uint256 lpMinted
        );

    function poolForToken(
        address token
    )
        external
        view
        returns (address pool);
}