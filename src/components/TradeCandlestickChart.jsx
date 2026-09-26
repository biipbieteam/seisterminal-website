import {
    useEffect,
    useMemo,
    useRef,
  } from "react";
  
  import {
    createChart,
    CandlestickSeries,
    HistogramSeries,
    CrosshairMode,
  } from "lightweight-charts";
  
  
  function buildCandles(
    tradeHistory,
    intervalSeconds = 60
  ) {
    const sortedTrades =
      [...tradeHistory]
        .filter(
          (trade) =>
            Number.isFinite(
              Number(
                trade.marketCap
              )
            ) &&
            Number.isFinite(
              Number(
                trade.timestamp
              )
            )
        )
        .sort(
          (a, b) =>
            Number(
              a.timestamp
            ) -
            Number(
              b.timestamp
            )
        );
  
  
    const buckets =
      new Map();
  
  
    for (
      const trade of
      sortedTrades
    ) {
      const timestamp =
        Math.floor(
          Number(
            trade.timestamp
          ) /
          1000
        );
  
  
      const bucketTime =
        Math.floor(
          timestamp /
          intervalSeconds
        ) *
        intervalSeconds;
  
  
      const marketCap =
        Number(
          trade.marketCap
        );
  
  
        const hasNormalizedQuoteAmount =
        trade.quoteAmountUsd !== null &&
        trade.quoteAmountUsd !== undefined &&
        trade.quoteAmountUsd !== "";
      
      const normalizedQuoteAmount =
        Number(
          trade.quoteAmountUsd
        );
      
      const legacyQuoteAmount =
        Number(
          trade.quote_amount
        ) /
        1e18;
      
      const quoteAmount =
        hasNormalizedQuoteAmount &&
        Number.isFinite(
          normalizedQuoteAmount
        )
          ? normalizedQuoteAmount
          : legacyQuoteAmount;
  
  
      const existing =
        buckets.get(
          bucketTime
        );
  
  
      if (!existing) {
        buckets.set(
          bucketTime,
          {
            time:
              bucketTime,
  
            trades: [
              marketCap,
            ],
  
            volume:
              Number.isFinite(
                quoteAmount
              )
                ? quoteAmount
                : 0,
          }
        );
  
        continue;
      }
  
  
      existing.trades.push(
        marketCap
      );
  
  
      existing.volume +=
        Number.isFinite(
          quoteAmount
        )
          ? quoteAmount
          : 0;
    }
  
  
    const orderedBuckets =
      Array.from(
        buckets.values()
      ).sort(
        (a, b) =>
          a.time -
          b.time
      );
  
  
    let previousClose =
      null;
  
  
    return orderedBuckets.map(
      (bucket) => {
        const firstTrade =
          bucket.trades[0];
  
        const lastTrade =
          bucket.trades[
            bucket.trades.length -
            1
          ];
  
  
        /*
         * Sparse Fair Launch trading:
         *
         * Carry the previous close into
         * the next candle as its open.
         *
         * This keeps visible candles even
         * when only one trade occurred
         * inside a time bucket.
         */
        const open =
          previousClose === null
            ? firstTrade
            : previousClose;
  
  
        const close =
          lastTrade;
  
  
        const high =
          Math.max(
            open,
            ...bucket.trades
          );
  
  
        const low =
          Math.min(
            open,
            ...bucket.trades
          );
  
  
        const candle = {
          time:
            bucket.time,
  
          open,
  
          high,
  
          low,
  
          close,
  
          volume:
            bucket.volume,
        };
  
  
        previousClose =
          close;
  
  
        return candle;
      }
    );
  }
  
  
  export default function TradeCandlestickChart({
    tradeHistory,
    intervalSeconds,
  }) {
    const containerRef =
      useRef(null);
  
  
      const candleData =
      useMemo(
        () =>
          buildCandles(
            tradeHistory,
            intervalSeconds
          ),
        [
          tradeHistory,
          intervalSeconds,
        ]
      );
  
  
    useEffect(() => {
      const container =
        containerRef.current;
  
  
      if (!container) {
        return;
      }
  
  
      const chart =
        createChart(
          container,
          {
            width:
              container.clientWidth,
  
            height:
              container.clientHeight,
  
            layout: {
              background: {
                color:
                  "transparent",
              },
  
              textColor:
                "#8b9388",
            },
  
            grid: {
              vertLines: {
                color:
                  "rgba(255,255,255,0.045)",
              },
  
              horzLines: {
                color:
                  "rgba(255,255,255,0.045)",
              },
            },
  
            crosshair: {
              mode:
                CrosshairMode.Normal,
  
              vertLine: {
                visible:
                  true,
  
                labelVisible:
                  true,
              },
  
              horzLine: {
                visible:
                  true,
  
                labelVisible:
                  true,
              },
            },
  
            rightPriceScale: {
              visible:
                true,
  
              borderColor:
                "rgba(255,255,255,0.08)",
            },
  
            timeScale: {
              visible: true,
              timeVisible: true,
              secondsVisible: false,
              borderColor: "rgba(255,255,255,0.08)",
              barSpacing: 12,
              minBarSpacing: 4,
            },
          }
          
        );
  
  
      const candleSeries =
        chart.addSeries(
          CandlestickSeries,
          {
            upColor:
              "#48f58a",
  
            downColor:
              "#ff6060",
  
            borderUpColor:
              "#48f58a",
  
            borderDownColor:
              "#ff6060",
  
            wickUpColor:
              "#48f58a",
  
            wickDownColor:
              "#ff6060",
  
            priceFormat: {
              type:
                "custom",
  
              formatter:
                (value) => {
                  if (
                    value >=
                    1_000_000
                  ) {
                    return `$${(
                      value /
                      1_000_000
                    ).toFixed(
                      2
                    )}M`;
                  }
  
                  if (
                    value >=
                    1_000
                  ) {
                    return `$${(
                      value /
                      1_000
                    ).toFixed(
                      2
                    )}K`;
                  }
  
                  return `$${value.toFixed(
                    2
                  )}`;
                },
            },
          }
        );
  
  
      const volumeSeries =
        chart.addSeries(
          HistogramSeries,
          {
            priceScaleId:
              "",
  
            priceFormat: {
              type:
                "volume",
            },
          }
        );
  
  
      volumeSeries
        .priceScale()
        .applyOptions({
          scaleMargins: {
            top:
              0.8,
  
            bottom:
              0,
          },
        });
  
  
      candleSeries.setData(
        candleData.map(
          (candle) => ({
            time:
              candle.time,
  
            open:
              candle.open,
  
            high:
              candle.high,
  
            low:
              candle.low,
  
            close:
              candle.close,
          })
        )
      );
  
  
      volumeSeries.setData(
        candleData.map(
          (candle) => ({
            time:
              candle.time,
  
            value:
              candle.volume,
  
            color:
              candle.close >=
              candle.open
                ? "rgba(72,245,138,0.45)"
                : "rgba(255,96,96,0.45)",
          })
        )
      );
  
  
      chart
      .timeScale()
      .applyOptions({
        barSpacing: 12,
      });
  
  
      const resizeObserver =
        new ResizeObserver(
          () => {
            chart.applyOptions({
              width:
                container.clientWidth,
  
              height:
                container.clientHeight,
            });
          }
        );
  
  
      resizeObserver.observe(
        container
      );
  
  
      return () => {
        resizeObserver.disconnect();
  
        chart.remove();
      };
  
    }, [
      candleData,
    ]);
  
  
    return (
      <div
        ref={
          containerRef
        }
        className="trade-candlestick-chart"
      />
    );
  }