"use client";

import { useMemo } from "react";
import type { OHLC } from "@/lib/ohlc";

type Props = { candles: OHLC[]; height?: number };

/**
 * Pure SVG candlestick chart — no Recharts needed for this.
 * Green (profit) for close ≥ open, red (loss) for close < open.
 *
 * 40 lines vs adding a charting lib. Replace with lightweight
 * charting (lightweight-charts, tradingview) if users need zoom/pan.
 */
export function CandlestickChart({ candles, height = 180 }: Props) {
  const { scale, w, pad } = useMemo(() => {
    if (candles.length === 0) return { scale: () => 0, w: 0, pad: 0 };
    let min = Infinity, max = -Infinity;
    for (const c of candles) {
      if (c.high > max) max = c.high;
      if (c.low < min) min = c.low;
    }
    const padAmt = (max - min) * 0.05 || 1;
    const paddedMin = min - padAmt;
    const paddedMax = max + padAmt;
    const range = paddedMax - paddedMin;
    return {
      scale: (v: number) => height - ((v - paddedMin) / range) * height,
      w: Math.max(2, Math.min(8, (90 / candles.length) * 8)),
      pad: 2,
    };
  }, [candles, height]);

  if (candles.length === 0) return null;

  const gap = Math.max(1, (90 / candles.length) * 2);

  return (
    <svg width="100%" height={height} className="overflow-visible">
      {candles.map((c, i) => {
        const x = i * (w + gap) + pad;
        const bodyTop = Math.min(scale(c.open), scale(c.close));
        const bodyBottom = Math.max(scale(c.open), scale(c.close));
        const bodyH = Math.max(1, bodyBottom - bodyTop);
        const up = c.close >= c.open;
        const color = up ? "var(--profit)" : "var(--loss)";
        return (
          <g key={c.time}>
            {/* Wick (high-low line) */}
            <line
              x1={x + w / 2}
              y1={scale(c.high)}
              x2={x + w / 2}
              y2={scale(c.low)}
              stroke={color}
              strokeWidth={1}
            />
            {/* Body (open-close rect) */}
            <rect x={x} y={bodyTop} width={w} height={bodyH} fill={color} rx={1} />
          </g>
        );
      })}
    </svg>
  );
}
