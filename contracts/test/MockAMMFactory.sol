// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {MockAMMPool} from "./MockAMMPool.sol";

interface IERC20Approve {
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) external returns (bool);
}

/**
 * @title MockAMMFactory
 *
 * @notice Test-only AMM factory for ARC TERMINAL
 *         migration architecture.
 *
 *         One MemeToken -> one MockAMMPool.
 *
 *         It does not custody liquidity after pool
 *         initialization.
 */
contract MockAMMFactory {
    mapping(address => address)
        public poolForToken;

    address[]
        public allPools;

    error InvalidToken();
    error PoolAlreadyExists();
    error InvalidLiquidity();
    error TokenTransferFailed();
    error TokenApproveFailed();

    event PoolCreated(
        address indexed token,
        address indexed pool,
        uint256 indexed poolId
    );

    event PoolInitialized(
        address indexed token,
        address indexed pool,
        address indexed provider,
        address lpRecipient,
        uint256 tokenAmount,
        uint256 quoteAmount,
        uint256 lpMinted
    );

    /**
     * @notice Creates exactly one pool for a token.
     */
    function createPool(
        address token
    )
        public
        returns (address pool)
    {
        if (token == address(0)) {
            revert InvalidToken();
        }

        if (
            poolForToken[token] !=
            address(0)
        ) {
            revert PoolAlreadyExists();
        }

        pool =
            address(
                new MockAMMPool(
                    token
                )
            );

        poolForToken[token] =
            pool;

        allPools.push(
            pool
        );

        emit PoolCreated(
            token,
            pool,
            allPools.length - 1
        );
    }

    /**
     * @notice Creates a pool and initializes its
     *         liquidity atomically.
     *
     * @dev Caller is the liquidity provider.
     *
     *      Flow:
     *
     *      provider
     *        -> Factory
     *        -> Pool
     *
     *      This mirrors the future migration adapter
     *      boundary without coupling LaunchFactory yet.
     */
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
        )
    {
        if (
            tokenAmount == 0 ||
            msg.value == 0
        ) {
            revert InvalidLiquidity();
        }

        pool =
            createPool(
                token
            );

        /*
         * Pull exact token amount from provider
         * into this Factory temporarily.
         */
        bool pulled =
            IERC20Approve(token)
                .transferFrom(
                    msg.sender,
                    address(this),
                    tokenAmount
                );

        if (!pulled) {
            revert TokenTransferFailed();
        }

        /*
         * Approve exactly the migration amount.
         */
        (bool success, bytes memory data) =
            token.call(
                abi.encodeWithSignature(
                    "approve(address,uint256)",
                    pool,
                    tokenAmount
                )
            );

        if (
            !success ||
            (
                data.length != 0 &&
                !abi.decode(
                    data,
                    (bool)
                )
            )
        ) {
            revert TokenApproveFailed();
        }

        /*
         * Pool sees Factory as provider because
         * Factory currently holds the exact tokens.
         */
        lpMinted =
            MockAMMPool(
                payable(pool)
            )
                .addInitialLiquidity{
                    value:
                        msg.value
                }(
                    address(this),
                    lpRecipient,
                    tokenAmount
                );

        emit PoolInitialized(
            token,
            pool,
            msg.sender,
            lpRecipient,
            tokenAmount,
            msg.value,
            lpMinted
        );
    }

    function allPoolsLength()
        external
        view
        returns (uint256)
    {
        return allPools.length;
    }
}