// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {
    IMigrationAdapter
} from "../interfaces/IMigrationAdapter.sol";

contract MockMigrationAdapter is
    IMigrationAdapter
{
    address public constant
        LP_BURN_ADDRESS =
        0x000000000000000000000000000000000000dEaD;

    mapping(address => bool)
        public migrated;

    mapping(address => address)
        public migrationPool;

    function migrate(
        address token,
        uint256
    )
        external
        payable
        returns (
            address pool,
            uint256 lpMinted
        )
    {
        migrated[token] = true;

        /*
         * Placeholder only.
         *
         * Existing LaunchFactory unit tests
         * do not exercise migration yet.
         */
        pool =
            address(
                uint160(
                    uint256(
                        keccak256(
                            abi.encodePacked(
                                token,
                                address(this)
                            )
                        )
                    )
                )
            );

        /*
         * Never return address(0).
         */
        if (pool == address(0)) {
            pool = address(1);
        }

        migrationPool[token] =
            pool;

        lpMinted = 1;
    }
}