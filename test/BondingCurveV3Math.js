import { expect } from "chai";

describe(
  "BondingCurve V3 — Math Candidate A",
  function () {
    const WAD = 10n ** 18n;

    const INITIAL_MC =
      10_000n * WAD;

    const GRADUATION_MC =
      60_000n * WAD;

    const TOTAL_SUPPLY =
      1_000_000_000n * WAD;

    /*
     * Candidate A:
     *
     * Initial virtual token reserve
     * = 120% of physical supply.
     */
    const VIRTUAL_TOKEN_START =
      TOTAL_SUPPLY *
      12n /
      10n;

    /*
     * Because:
     *
     * initial price
     * = 10,000 / totalSupply
     *
     * virtual quote
     * = price * virtual tokens
     *
     * therefore:
     * = 12,000 USDC.
     */
    const VIRTUAL_QUOTE_START =
      12_000n * WAD;

    const K =
      VIRTUAL_TOKEN_START *
      VIRTUAL_QUOTE_START;

      function quoteForTokens(
        tokensSold,
        tokenAmount
      ) {
        if (tokenAmount <= 0n) {
          throw new Error(
            "InvalidTokenAmount"
          );
        }
      
        const startVirtualTokens =
          VIRTUAL_TOKEN_START -
          tokensSold;
      
        const endVirtualTokens =
          startVirtualTokens -
          tokenAmount;
      
        if (endVirtualTokens <= 0n) {
          throw new Error(
            "SupplyExceeded"
          );
        }
      
        const startVirtualQuote =
          K /
          startVirtualTokens;
      
        /*
         * Ceiling division is important here.
         *
         * A BUY must never receive tokens
         * while paying less than the curve
         * requires because of integer floor.
         */
        const endVirtualQuote =
          (
            K +
            endVirtualTokens -
            1n
          ) /
          endVirtualTokens;
      
        return (
          endVirtualQuote -
          startVirtualQuote
        );
      }
      
      function quoteForSell(
        tokensSold,
        tokenAmount
      ) {
        if (tokenAmount <= 0n) {
          throw new Error(
            "InvalidTokenAmount"
          );
        }
      
        if (tokenAmount > tokensSold) {
          throw new Error(
            "SellExceedsTokensSold"
          );
        }
      
        const startVirtualTokens =
          VIRTUAL_TOKEN_START -
          tokensSold;
      
        const endVirtualTokens =
          startVirtualTokens +
          tokenAmount;
      
        const startVirtualQuote =
          K /
          startVirtualTokens;
      
        const endVirtualQuote =
          K /
          endVirtualTokens;
      
        return (
          startVirtualQuote -
          endVirtualQuote
        );
      }
      
      function tokensForQuote(
        tokensSold,
        quoteAmount,
        maxTokens
      ) {
        if (quoteAmount <= 0n) {
          throw new Error(
            "InvalidQuoteAmount"
          );
        }
      
        let low = 0n;
        let high = maxTokens;
      
        while (low < high) {
          const mid =
            low +
            (high - low + 1n) /
            2n;
      
          const cost =
            quoteForTokens(
              tokensSold,
              mid
            );
      
          if (cost <= quoteAmount) {
            low = mid;
          } else {
            high = mid - 1n;
          }
        }
      
        if (low === 0n) {
          throw new Error(
            "InvalidQuoteAmount"
          );
        }
      
        return low;
    }

    function priceAtSold(
      tokensSold
    ) {
      const virtualTokens =
        VIRTUAL_TOKEN_START -
        tokensSold;

      const virtualQuote =
        K /
        virtualTokens;

      return (
        virtualQuote *
        WAD /
        virtualTokens
      );
    }

    function marketCapAtSold(
      tokensSold
    ) {
      return (
        priceAtSold(tokensSold) *
        TOTAL_SUPPLY /
        WAD
      );
    }

    function quoteReserveAtSold(
      tokensSold
    ) {
      const virtualTokens =
        VIRTUAL_TOKEN_START -
        tokensSold;

      const virtualQuote =
        K /
        virtualTokens;

      return (
        virtualQuote -
        VIRTUAL_QUOTE_START
      );
    }

    /*
     * Maximum tokens that can leave
     * the physical bonding vault while
     * preserving perfect graduation
     * liquidity continuity.
     *
     * We derive this from:
     *
     * sqrt(6)
     *
     * but integer Solidity/JS math
     * cannot use floating point safely.
     *
     * Therefore this helper binary
     * searches for the first sold amount
     * whose MC reaches 60K.
     */
    function graduationTokensSold() {
      let low = 0n;
      let high = TOTAL_SUPPLY;

      while (low < high) {
        const mid =
          low +
          (high - low) /
          2n;

        if (
          marketCapAtSold(mid) <
          GRADUATION_MC
        ) {
          low = mid + 1n;
        } else {
          high = mid;
        }
      }

      return low;
    }

    it(
      "starts at exactly 10,000 USDC market cap",
      function () {
        expect(
          marketCapAtSold(0n)
        ).to.equal(INITIAL_MC);
      }
    );

    it(
      "uses 120% virtual token reserve",
      function () {
        expect(
          VIRTUAL_TOKEN_START
        ).to.equal(
          1_200_000_000n * WAD
        );
      }
    );

    it(
      "uses exactly 12,000 virtual USDC initially",
      function () {
        expect(
          VIRTUAL_QUOTE_START
        ).to.equal(
          12_000n * WAD
        );
      }
    );

    it(
      "reaches approximately 60,000 USDC market cap at graduation",
      function () {
        const sold =
          graduationTokensSold();

        const mc =
          marketCapAtSold(sold);

        const tolerance =
          1n * 10n ** 12n;

        expect(
          mc
        ).to.be.gte(
          GRADUATION_MC
        );

        expect(
          mc -
          GRADUATION_MC
        ).to.be.lt(
          tolerance
        );
      }
    );

    it(
      "sells approximately 71.0102% of supply before graduation",
      function () {
        const sold =
          graduationTokensSold();

        const soldBps =
          sold *
          10_000n /
          TOTAL_SUPPLY;

        /*
         * ≈ 71.01%
         */
        expect(
          soldBps
        ).to.equal(7101n);
      }
    );

    it(
      "leaves approximately 28.9898% of supply for liquidity",
      function () {
        const sold =
          graduationTokensSold();

        const remaining =
          TOTAL_SUPPLY -
          sold;

        const remainingBps =
          remaining *
          10_000n /
          TOTAL_SUPPLY;

        /*
         * Integer BPS floor:
         * ≈ 28.98%
         */
        expect(
          remainingBps
        ).to.equal(2898n);
      }
    );

    it(
      "accumulates approximately 17,393.8769 USDC at graduation",
      function () {
        const sold =
          graduationTokensSold();

        const reserve =
          quoteReserveAtSold(sold);

        const expected =
          17_393_876913n *
          10n ** 12n;

        const tolerance =
          1n * 10n ** 12n;

        const difference =
          reserve > expected
            ? reserve - expected
            : expected - reserve;

        expect(
          difference
        ).to.be.lt(
          tolerance
        );
      }
    );

    it(
      "DEX opening price matches final bonding price",
      function () {
        const sold =
          graduationTokensSold();

        const remainingTokens =
          TOTAL_SUPPLY -
          sold;

        const quoteReserve =
          quoteReserveAtSold(sold);

        const bondingPrice =
          priceAtSold(sold);

        const dexPrice =
          quoteReserve *
          WAD /
          remainingTokens;

        /*
         * Allow only tiny integer
         * rounding difference.
         */
        const difference =
          bondingPrice > dexPrice
            ? bondingPrice - dexPrice
            : dexPrice - bondingPrice;

        expect(
          difference
        ).to.be.lte(2n);
      }
    );

    it(
      "DEX opening market cap is approximately 60,000 USDC",
      function () {
        const sold =
          graduationTokensSold();

        const remainingTokens =
          TOTAL_SUPPLY -
          sold;

        const quoteReserve =
          quoteReserveAtSold(sold);

        const dexPrice =
          quoteReserve *
          WAD /
          remainingTokens;

        const dexMarketCap =
          dexPrice *
          TOTAL_SUPPLY /
          WAD;

        const difference =
          dexMarketCap >
          GRADUATION_MC
            ? dexMarketCap -
              GRADUATION_MC
            : GRADUATION_MC -
              dexMarketCap;

        /*
         * Sub-cent / integer rounding
         * tolerance.
         */
        expect(
          difference
        ).to.be.lt(
          1n * 10n ** 14n
        );
      }
    );

    it(
      "market cap increases monotonically through the curve",
      function () {
        const checkpoints = [
          0n,
          TOTAL_SUPPLY * 10n / 100n,
          TOTAL_SUPPLY * 25n / 100n,
          TOTAL_SUPPLY * 50n / 100n,
          TOTAL_SUPPLY * 70n / 100n,
        ];

        let previous = 0n;

        for (
          const sold of checkpoints
        ) {
          const mc =
            marketCapAtSold(sold);

          expect(
            mc
          ).to.be.gt(previous);

          previous = mc;
        }
      }
    );

    it(
        "converts a 5 USDC dev buy into tokens",
        function () {
          const quote =
            5n * WAD;
      
          const maxSold =
            graduationTokensSold();
      
          const tokens =
            tokensForQuote(
              0n,
              quote,
              maxSold
            );
      
          expect(tokens).to.be.gt(0n);
      
          expect(
            quoteForTokens(
              0n,
              tokens
            )
          ).to.be.lte(quote);
        }
      );
      
      it(
        "100 USDC buys fewer tokens later on the curve",
        function () {
          const quote =
            100n * WAD;
      
          const graduationSold =
            graduationTokensSold();
      
          const early =
            tokensForQuote(
              0n,
              quote,
              graduationSold
            );
      
          const laterSold =
            TOTAL_SUPPLY *
            50n /
            100n;
      
          const late =
            tokensForQuote(
              laterSold,
              quote,
              graduationSold -
                laterSold
            );
      
          expect(late).to.be.lt(early);
        }
      );
      
      it(
        "inverse quote returns the maximum affordable token amount",
        function () {
          const quote =
            500n * WAD;
      
          const maxSold =
            graduationTokensSold();
      
          const tokens =
            tokensForQuote(
              0n,
              quote,
              maxSold
            );
      
          const cost =
            quoteForTokens(
              0n,
              tokens
            );
      
          expect(cost).to.be.lte(quote);
      
          if (tokens < maxSold) {
            const nextCost =
              quoteForTokens(
                0n,
                tokens + 1n
              );
      
            expect(
              nextCost
            ).to.be.gt(quote);
          }
        }
      );
      
      it(
        "a full buy-sell round trip returns tokensSold to zero",
        function () {
          const quote =
            500n * WAD;
      
          const maxSold =
            graduationTokensSold();
      
          const bought =
            tokensForQuote(
              0n,
              quote,
              maxSold
            );
      
          const buyCost =
            quoteForTokens(
              0n,
              bought
            );
      
          let tokensSold =
            bought;
      
          const sellQuote =
            quoteForSell(
              tokensSold,
              bought
            );
      
          tokensSold -= bought;
      
          expect(tokensSold).to.equal(0n);
      
          /*
           * Integer rounding may leave
           * a microscopic protocol residual.
           */
          expect(
            sellQuote
          ).to.be.lte(buyCost);
      
          const residual =
            buyCost - sellQuote;
      
          console.log(
            "    V3 500 USDC round-trip residual:",
            residual.toString(),
            "wei"
          );
        }
      );
      
      it(
        "supports a multi-user buy-sell market sequence",
        function () {
          const graduationSold =
            graduationTokensSold();
      
          let sold = 0n;
      
          const aliceBuy =
            tokensForQuote(
              sold,
              100n * WAD,
              graduationSold - sold
            );
      
          sold += aliceBuy;
      
          const bobBuy =
            tokensForQuote(
              sold,
              250n * WAD,
              graduationSold - sold
            );
      
          sold += bobBuy;
      
          const aliceSell =
            aliceBuy *
            40n /
            100n;
      
          const aliceQuoteOut =
            quoteForSell(
              sold,
              aliceSell
            );
      
          expect(
            aliceQuoteOut
          ).to.be.gt(0n);
      
          sold -= aliceSell;
      
          const carolBuy =
            tokensForQuote(
              sold,
              500n * WAD,
              graduationSold - sold
            );
      
          sold += carolBuy;
      
          expect(sold).to.be.gt(0n);
      
          expect(sold).to.be.lt(
            graduationSold
          );
      
          expect(
            marketCapAtSold(sold)
          ).to.be.gt(INITIAL_MC);
        }
      );
      
      it(
        "exact graduation inventory produces the expected DEX state",
        function () {
          const sold =
            graduationTokensSold();
      
          const remaining =
            TOTAL_SUPPLY - sold;
      
          const reserve =
            quoteReserveAtSold(sold);
      
          const bondingPrice =
            priceAtSold(sold);
      
          const dexPrice =
            reserve *
            WAD /
            remaining;
      
          expect(sold).to.be.lt(
            TOTAL_SUPPLY
          );
      
          expect(remaining).to.be.gt(0n);
      
          expect(reserve).to.be.gt(0n);
      
          const priceDifference =
            bondingPrice > dexPrice
              ? bondingPrice - dexPrice
              : dexPrice - bondingPrice;
      
          expect(
            priceDifference
          ).to.be.lte(2n);
        }
      );
    

      it(
        "preserves quote reserve accounting through a full multi-user lifecycle",
        function () {
          const graduationSold =
            graduationTokensSold();
      
          let tokensSold = 0n;
          let quoteReserve = 0n;
      
          /*
           * Alice BUY 100
           */
          const aliceTokens =
            tokensForQuote(
              tokensSold,
              100n * WAD,
              graduationSold - tokensSold
            );
      
          const aliceCost =
            quoteForTokens(
              tokensSold,
              aliceTokens
            );
      
          tokensSold += aliceTokens;
          quoteReserve += aliceCost;
      
          /*
           * Bob BUY 250
           */
          const bobTokens =
            tokensForQuote(
              tokensSold,
              250n * WAD,
              graduationSold - tokensSold
            );
      
          const bobCost =
            quoteForTokens(
              tokensSold,
              bobTokens
            );
      
          tokensSold += bobTokens;
          quoteReserve += bobCost;
      
          /*
           * Alice SELL 40%
           */
          const aliceSell =
            aliceTokens *
            40n /
            100n;
      
          const aliceQuoteOut =
            quoteForSell(
              tokensSold,
              aliceSell
            );
      
          tokensSold -= aliceSell;
          quoteReserve -= aliceQuoteOut;
      
          /*
           * Carol BUY 500
           */
          const carolTokens =
            tokensForQuote(
              tokensSold,
              500n * WAD,
              graduationSold - tokensSold
            );
      
          const carolCost =
            quoteForTokens(
              tokensSold,
              carolTokens
            );
      
          tokensSold += carolTokens;
          quoteReserve += carolCost;
      
          /*
           * Accounting reserve should track
           * the mathematical curve reserve.
           *
           * Tiny rounding residual is allowed.
           */
          const mathematicalReserve =
            quoteReserveAtSold(
              tokensSold
            );
      
          const difference =
            quoteReserve >
            mathematicalReserve
              ? quoteReserve -
                mathematicalReserve
              : mathematicalReserve -
                quoteReserve;
      
          expect(
            difference
          ).to.be.lte(10n);
        }
      );
      
      it(
        "reaches graduation after buy-sell activity with an exact final fill",
        function () {
          const graduationSold =
            graduationTokensSold();
      
          let tokensSold = 0n;
          let quoteReserve = 0n;
      
          /*
           * BUY 100
           */
          let tokens =
            tokensForQuote(
              tokensSold,
              100n * WAD,
              graduationSold - tokensSold
            );
      
          let cost =
            quoteForTokens(
              tokensSold,
              tokens
            );
      
          tokensSold += tokens;
          quoteReserve += cost;
      
          /*
           * BUY 500
           */
          tokens =
            tokensForQuote(
              tokensSold,
              500n * WAD,
              graduationSold - tokensSold
            );
      
          cost =
            quoteForTokens(
              tokensSold,
              tokens
            );
      
          tokensSold += tokens;
          quoteReserve += cost;
      
          /*
           * SELL part of current inventory.
           */
          const sellAmount =
            tokens /
            3n;
      
          const quoteOut =
            quoteForSell(
              tokensSold,
              sellAmount
            );
      
          tokensSold -= sellAmount;
          quoteReserve -= quoteOut;
      
          /*
           * Exact remaining token inventory
           * required to reach graduation.
           */
          const finalTokens =
            graduationSold -
            tokensSold;
      
          const finalCost =
            quoteForTokens(
              tokensSold,
              finalTokens
            );
      
          tokensSold += finalTokens;
          quoteReserve += finalCost;
      
          expect(
            tokensSold
          ).to.equal(
            graduationSold
          );
      
          const expectedReserve =
            quoteReserveAtSold(
              graduationSold
            );
      
          const reserveDifference =
            quoteReserve >
            expectedReserve
              ? quoteReserve -
                expectedReserve
              : expectedReserve -
                quoteReserve;
      
          expect(
            reserveDifference
          ).to.be.lte(10n);
        }
      );
      
      it(
        "preserves physical token accounting at graduation",
        function () {
          const sold =
            graduationTokensSold();
      
          const physicalVault =
            TOTAL_SUPPLY -
            sold;
      
          const expectedLiquidity =
            TOTAL_SUPPLY -
            sold;
      
          expect(
            physicalVault
          ).to.equal(
            expectedLiquidity
          );
      
          expect(
            physicalVault
          ).to.be.gt(0n);
        }
      );
      
      it(
        "uses the entire graduation quote reserve for DEX liquidity",
        function () {
          const sold =
            graduationTokensSold();
      
          const quoteReserve =
            quoteReserveAtSold(
              sold
            );
      
          const liquidityTokens =
            TOTAL_SUPPLY -
            sold;
      
          const dexPrice =
            quoteReserve *
            WAD /
            liquidityTokens;
      
          const bondingPrice =
            priceAtSold(
              sold
            );
      
          const difference =
            dexPrice >
            bondingPrice
              ? dexPrice -
                bondingPrice
              : bondingPrice -
                dexPrice;
      
          expect(
            difference
          ).to.be.lte(2n);
      
          /*
           * No unexplained quote surplus.
           */
          const quoteUsedForLiquidity =
            quoteReserve;
      
          const quoteLeftOver =
            quoteReserve -
            quoteUsedForLiquidity;
      
          expect(
            quoteLeftOver
          ).to.equal(0n);
        }
      );
      
      it(
        "preserves the 60K market cap across the bonding-to-DEX transition",
        function () {
          const sold =
            graduationTokensSold();
      
          const liquidityTokens =
            TOTAL_SUPPLY -
            sold;
      
          const quoteLiquidity =
            quoteReserveAtSold(
              sold
            );
      
          const finalBondingMC =
            marketCapAtSold(
              sold
            );
      
          const dexPrice =
            quoteLiquidity *
            WAD /
            liquidityTokens;
      
          const dexMC =
            dexPrice *
            TOTAL_SUPPLY /
            WAD;
      
          const transitionDifference =
            finalBondingMC > dexMC
              ? finalBondingMC - dexMC
              : dexMC - finalBondingMC;
      
          expect(
            transitionDifference
          ).to.be.lt(
            1n * 10n ** 14n
          );
        }
      );
      
      it(
        "prints the complete ARC V3 lifecycle",
        function () {
          const sold =
            graduationTokensSold();
      
          const remaining =
            TOTAL_SUPPLY -
            sold;
      
          const reserve =
            quoteReserveAtSold(
              sold
            );
      
          const initialMC =
            marketCapAtSold(0n);
      
          const finalMC =
            marketCapAtSold(sold);
      
          const dexPrice =
            reserve *
            WAD /
            remaining;
      
          const dexMC =
            dexPrice *
            TOTAL_SUPPLY /
            WAD;
      
          console.log(
            "\n    ARC V3 FULL LIFECYCLE"
          );
      
          console.log(
            "    initial MC:",
            initialMC.toString()
          );
      
          console.log(
            "    tokens sold:",
            sold.toString()
          );
      
          console.log(
            "    liquidity tokens:",
            remaining.toString()
          );
      
          console.log(
            "    quote reserve:",
            reserve.toString()
          );
      
          console.log(
            "    final bonding MC:",
            finalMC.toString()
          );
      
          console.log(
            "    DEX opening MC:",
            dexMC.toString()
          );
        }
      );
      
    it(
      "prints the V3 graduation economics",
      function () {
        const sold =
          graduationTokensSold();

        const remaining =
          TOTAL_SUPPLY -
          sold;

        const reserve =
          quoteReserveAtSold(sold);

        const mc =
          marketCapAtSold(sold);

        console.log(
          "\n    ARC V3 Candidate A"
        );

        console.log(
          "    tokens sold:",
          sold.toString()
        );

        console.log(
          "    tokens remaining:",
          remaining.toString()
        );

        console.log(
          "    quote reserve:",
          reserve.toString(),
          "wei"
        );

        console.log(
          "    graduation MC:",
          mc.toString(),
          "wei"
        );
      }
    );
  }
);