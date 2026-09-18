// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from
    "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {SafeERC20} from
    "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {ReentrancyGuard} from
    "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IUniswapV2Factory {
    function getPair(
        address tokenA,
        address tokenB
    )
        external
        view
        returns (address pair);

    function createPair(
        address tokenA,
        address tokenB
    )
        external
        returns (address pair);
}

interface IUniswapV2Pair {
    function mint(
        address to
    )
        external
        returns (uint256 liquidity);
}

/**
 * @title UniswapV2AMMFactory
 *
 * @notice ARC TERMINAL production migration boundary
 *         for Uniswap V2 on Arc Mainnet.
 *
 * Pair:
 *
 *     MemeToken / USDC
 *
 * Arc USDC:
 *
 *     native representation: 18 decimals
 *     ERC20 representation:   6 decimals
 *
 * The two representations refer to the same underlying
 * USDC balance.
 */
contract UniswapV2AMMFactory is ReentrancyGuard {
    using SafeERC20 for IERC20;

    address public constant ARC_USDC =
        0x3600000000000000000000000000000000000000;

    uint256 public constant
        NATIVE_TO_ERC20_SCALE =
        1e12;

    IUniswapV2Factory public immutable
        uniswapFactory;

    mapping(address => address)
        public poolForToken;

    error InvalidFactory();
    error InvalidToken();
    error InvalidLiquidity();
    error InvalidRecipient();
    error PoolAlreadyExists();
    error PairCreationFailed();
    error InvalidLPMint();
    error NativeRemainderTransferFailed();

    event PoolCreated(
        address indexed token,
        address indexed pool
    );

    event PoolInitialized(
        address indexed token,
        address indexed pool,
        address indexed provider,
        address lpRecipient,
        uint256 tokenAmount,
        uint256 nativeQuoteAmount,
        uint256 erc20QuoteAmount,
        uint256 lpMinted
    );

    constructor(
        address uniswapFactory_
    ) {
        if (
            uniswapFactory_ == address(0) ||
            uniswapFactory_.code.length == 0
        ) {
            revert InvalidFactory();
        }

        uniswapFactory =
            IUniswapV2Factory(
                uniswapFactory_
            );
    }

    function createPoolAndAddLiquidity(
        address token,
        uint256 tokenAmount,
        address lpRecipient
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
            token == address(0) ||
            token == ARC_USDC
        ) {
            revert InvalidToken();
        }

        if (
            tokenAmount == 0 ||
            msg.value == 0
        ) {
            revert InvalidLiquidity();
        }

        if (lpRecipient == address(0)) {
            revert InvalidRecipient();
        }

        if (
            poolForToken[token] !=
            address(0)
        ) {
            revert PoolAlreadyExists();
        }

        /*
        * ARC native USDC uses 18 decimals while its
        * ERC20 facade exposes 6 decimals.
        *
        * The ERC20-representable portion is supplied
        * to the V2 pair.
        *
        * Any sub-6-decimal native remainder cannot be
        * represented by the ERC20 facade. It is sent
        * to the same irreversible burn destination
        * supplied by MigrationAdapter, preventing
        * migration funds from remaining in this
        * boundary contract.
        */
        uint256 quoteAmount =
            msg.value /
            NATIVE_TO_ERC20_SCALE;

        uint256 nativeRemainder =
            msg.value %
            NATIVE_TO_ERC20_SCALE;

        if (quoteAmount == 0) {
            revert InvalidLiquidity();
        }

        /*
         * ARC dual-USDC semantics mean the native
         * msg.value received by this contract is visible
         * through the ERC20 USDC interface at 6 decimals.
         */

        address existingPair =
            uniswapFactory.getPair(
                token,
                ARC_USDC
            );

        if (existingPair != address(0)) {
            revert PoolAlreadyExists();
        }

        pool =
            uniswapFactory.createPair(
                token,
                ARC_USDC
            );

        if (pool == address(0)) {
            revert PairCreationFailed();
        }

        poolForToken[token] =
            pool;

        emit PoolCreated(
            token,
            pool
        );

        /*
         * Pull migration token inventory from the
         * MigrationAdapter.
         */
        IERC20(token).safeTransferFrom(
            msg.sender,
            address(this),
            tokenAmount
        );

        /*
         * Seed both assets directly into the V2 pair.
         *
         * No Router.
         * No WETH.
         */
        IERC20(token).safeTransfer(
            pool,
            tokenAmount
        );

        IERC20(ARC_USDC).safeTransfer(
            pool,
            quoteAmount
        );

        /*
        * Dispose of the native precision remainder
        * that cannot be represented by ARC's
        * 6-decimal ERC20 USDC facade.
        *
        * lpRecipient is the protocol-defined
        * irreversible LP burn destination.
        */
        if (nativeRemainder != 0) {
            (bool remainderSent, ) =
                payable(lpRecipient).call{
                    value: nativeRemainder
                }("");

            if (!remainderSent) {
                revert NativeRemainderTransferFailed();
            }
        }

        /*
         * Pair reads its actual balances and mints
         * LP shares from the initial reserves.
         *
         * MigrationAdapter supplies the irreversible
         * LP recipient (0x...dEaD).
         */
        lpMinted =
            IUniswapV2Pair(pool).mint(
                lpRecipient
            );

        if (lpMinted == 0) {
            revert InvalidLPMint();
        }

        emit PoolInitialized(
            token,
            pool,
            msg.sender,
            lpRecipient,
            tokenAmount,
            msg.value,
            quoteAmount,
            lpMinted
        );
    }
}