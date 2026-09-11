// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ILaunchFactoryV3 {
    function buyFairToken(
        uint256 launchId,
        uint256 minTokensOut
    ) external payable returns (uint256 tokensOut);

    function sellFairToken(
        uint256 launchId,
        uint256 tokenAmount,
        uint256 minQuoteOut
    ) external returns (uint256 quoteOut);
}

interface IERC20Minimal {
    function approve(
        address spender,
        uint256 amount
    ) external returns (bool);

    function balanceOf(
        address account
    ) external view returns (uint256);
}

/**
 * @title LaunchFactoryV3ReentrancyAttacker
 *
 * @notice Test-only adversarial contract.
 *
 * It deliberately attempts to re-enter LaunchFactory
 * when receiving native quote from:
 *
 * 1. BUY refund
 * 2. SELL payout
 *
 * The callback catches the failed nested call so the
 * legitimate outer transaction can still complete.
 */
contract LaunchFactoryV3ReentrancyAttacker {
    enum AttackMode {
        NONE,
        BUY_REFUND,
        SELL_PAYOUT
    }

    ILaunchFactoryV3 public immutable factory;

    AttackMode public attackMode;

    uint256 public targetLaunchId;

    uint256 public reentryValue;

    uint256 public reentrySellAmount;

    uint256 public callbackCount;

    bool public reentryAttempted;

    bool public reentrySucceeded;

    bytes public lastReentryData;


    constructor(
        address factory_
    ) {
        factory =
            ILaunchFactoryV3(
                factory_
            );
    }


    function attackBuyRefund(
        uint256 launchId,
        uint256 minTokensOut,
        uint256 nestedBuyValue
    )
        external
        payable
    {
        attackMode =
            AttackMode.BUY_REFUND;

        targetLaunchId =
            launchId;

        reentryValue =
            nestedBuyValue;

        callbackCount = 0;

        reentryAttempted = false;

        reentrySucceeded = false;

        delete lastReentryData;


        factory.buyFairToken{
            value: msg.value
        }(
            launchId,
            minTokensOut
        );


        attackMode =
            AttackMode.NONE;
    }


    function attackSellPayout(
        address token,
        uint256 launchId,
        uint256 tokenAmount,
        uint256 minQuoteOut
    )
        external
    {
        attackMode =
            AttackMode.SELL_PAYOUT;

        targetLaunchId =
            launchId;

        reentrySellAmount =
            1;

        callbackCount = 0;

        reentryAttempted = false;

        reentrySucceeded = false;

        delete lastReentryData;


        IERC20Minimal(token)
            .approve(
                address(factory),
                tokenAmount
            );


        factory.sellFairToken(
            launchId,
            tokenAmount,
            minQuoteOut
        );


        attackMode =
            AttackMode.NONE;
    }


    function approveFactory(
        address token,
        uint256 amount
    )
        external
    {
        IERC20Minimal(token)
            .approve(
                address(factory),
                amount
            );
    }


    receive()
        external
        payable
    {
        callbackCount += 1;


        /*
         * Prevent recursion inside the attacker
         * itself. We want exactly one nested
         * attempt against Factory.
         */
        if (
            reentryAttempted
        ) {
            return;
        }


        reentryAttempted = true;


        if (
            attackMode ==
            AttackMode.BUY_REFUND
        ) {
            try factory
                .buyFairToken{
                    value:
                        reentryValue
                }(
                    targetLaunchId,
                    0
                )
            returns (
                uint256
            ) {
                reentrySucceeded =
                    true;
            }
            catch (
                bytes memory reason
            ) {
                lastReentryData =
                    reason;
            }


            return;
        }


        if (
            attackMode ==
            AttackMode.SELL_PAYOUT
        ) {
            try factory
                .sellFairToken(
                    targetLaunchId,
                    reentrySellAmount,
                    0
                )
            returns (
                uint256
            ) {
                reentrySucceeded =
                    true;
            }
            catch (
                bytes memory reason
            ) {
                lastReentryData =
                    reason;
            }
        }
    }
}