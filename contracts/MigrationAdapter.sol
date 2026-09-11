// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {
    IERC20
} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {
    SafeERC20
} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {
    ReentrancyGuard
} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import {
    IMigrationAMMFactory
} from "./interfaces/IMigrationAMMFactory.sol";

interface IFactoryBoundToken {
    function factory()
        external
        view
        returns (address);
}

contract MigrationAdapter is ReentrancyGuard {
    using SafeERC20 for IERC20;

    address public constant LP_BURN_ADDRESS =
        0x000000000000000000000000000000000000dEaD;

    IMigrationAMMFactory public immutable ammFactory;

    mapping(
        address token => bool migrated
    ) public migrated;

    mapping(
        address token => address pool
    ) public migrationPool;

    error InvalidAMMFactory();
    error InvalidToken();
    error InvalidTokenAmount();
    error InvalidQuoteAmount();
    error AlreadyMigrated();
    error InvalidPool();
    error InvalidLPMint();
    error TokenResidue();
    error QuoteResidue();

    error UnauthorizedMigrationCaller();

    event Migrated(
        address indexed token,
        address indexed pool,
        address indexed caller,
        uint256 tokenAmount,
        uint256 quoteAmount,
        uint256 lpMinted,
        address lpRecipient
    );

    constructor(
        address ammFactory_
    ) {
        if (
            ammFactory_ == address(0)
        ) {
            revert InvalidAMMFactory();
        }

        ammFactory =
            IMigrationAMMFactory(
                ammFactory_
            );
    }

    function migrate(
        address token,
        uint256 tokenAmount
    )
        external
        payable
        nonReentrant
        returns (
            address pool,
            uint256 lpMinted
        )
    {
        if (
            token == address(0)
        ) {
            revert InvalidToken();
        }

        /*
        * ARC migration authority.
        *
        * Every MemeToken records the Factory that
        * originally deployed it.
        *
        * Only that token's own Factory may consume
        * its migration slot.
        *
        * This prevents an external token holder from
        * preempting official graduation by calling
        * the Adapter directly.
        */
        address tokenFactory;

        try
            IFactoryBoundToken(token)
                .factory()
        returns (
            address factory_
        ) {
            tokenFactory = factory_;
        } catch {
            revert UnauthorizedMigrationCaller();
        }

        if (
            tokenFactory == address(0) ||
            msg.sender != tokenFactory
        ) {
            revert UnauthorizedMigrationCaller();
        }

        if (
            tokenAmount == 0
        ) {
            revert InvalidTokenAmount();
        }

        if (
            msg.value == 0
        ) {
            revert InvalidQuoteAmount();
        }

        if (
            migrated[token]
        ) {
            revert AlreadyMigrated();
        }

        IERC20 asset =
            IERC20(token);

        /*
         * Snapshot balances that already existed
         * before this migration.
         *
         * address(this).balance already includes
         * msg.value at function entry, so subtract
         * the current migration quote.
         *
         * These pre-existing balances may come from:
         *
         * - forced native transfers
         * - unsolicited ERC20 donations
         *
         * They must not be consumed by this migration,
         * but they also must not be allowed to poison it.
         */
        uint256 tokenBalanceBefore =
            asset.balanceOf(
                address(this)
            );

        uint256 quoteBalanceBefore =
            address(this).balance -
            msg.value;

        /*
         * Effects before external interaction.
         *
         * Any downstream revert rolls this flag
         * back atomically.
         */
        migrated[token] = true;

        /*
         * Pull exactly the requested migration
         * inventory from the caller.
         */
        asset.safeTransferFrom(
            msg.sender,
            address(this),
            tokenAmount
        );

        /*
         * Give the AMM factory permission to pull
         * exactly this migration's token amount.
         *
         * No unlimited approval.
         */
        asset.forceApprove(
            address(ammFactory),
            tokenAmount
        );

        /*
         * Create the pool and send the complete
         * current migration quote.
         *
         * LP is minted directly to the burn address.
         */
        (
            pool,
            lpMinted
        ) =
            ammFactory
                .createPoolAndAddLiquidity{
                    value: msg.value
                }(
                    token,
                    tokenAmount,
                    LP_BURN_ADDRESS
                );

        if (
            pool == address(0)
        ) {
            revert InvalidPool();
        }

        if (
            lpMinted == 0
        ) {
            revert InvalidLPMint();
        }

        /*
         * Verify that the AMM factory records the
         * same pool returned by migration.
         */
        if (
            ammFactory
                .poolForToken(token)
                != pool
        ) {
            revert InvalidPool();
        }

        migrationPool[token] =
            pool;

        /*
         * Remove remaining allowance after
         * successful migration.
         */
        asset.forceApprove(
            address(ammFactory),
            0
        );

        /*
         * The migration must leave the adapter
         * with exactly the balances it had before
         * this migration.
         *
         * Pre-existing donations are tolerated.
         * Current migration funds may not remain.
         */
        if (
            asset.balanceOf(
                address(this)
            )
            != tokenBalanceBefore
        ) {
            revert TokenResidue();
        }

        if (
            address(this).balance
            != quoteBalanceBefore
        ) {
            revert QuoteResidue();
        }

        emit Migrated(
            token,
            pool,
            msg.sender,
            tokenAmount,
            msg.value,
            lpMinted,
            LP_BURN_ADDRESS
        );
    }

    receive()
        external
        payable
    {
        revert InvalidQuoteAmount();
    }

    fallback()
        external
        payable
    {
        revert InvalidQuoteAmount();
    }
}