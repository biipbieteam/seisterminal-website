// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IMigrationAdapter {
    function migrate(
        address token,
        uint256 tokenAmount
    )
        external
        payable
        returns (
            address pool,
            uint256 lpMinted
        );

    function migrated(
        address token
    )
        external
        view
        returns (bool);

    function migrationPool(
        address token
    )
        external
        view
        returns (address pool);

    function LP_BURN_ADDRESS()
        external
        view
        returns (address);
}