import React from "react";

const RADIAN = Math.PI / 180;

/** Rótulo dentro da fatia da pizza (% e valor opcional) */
export function createPieInsideLabel(formatLine) {
  return function PieInsideLabel(props) {
    const { cx, cy, midAngle, innerRadius, outerRadius, percent, value } = props;
    if (percent < 0.04) return null;

    const radius = innerRadius + (outerRadius - innerRadius) * 0.55;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    const line = formatLine
      ? formatLine(value, percent)
      : `${Math.round(percent * 100)}%`;
    const lines = String(line).split("\n");

    return (
      <text
        x={x}
        y={y}
        fill="#ffffff"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={11}
        fontWeight={700}
        stroke="rgba(15, 23, 42, 0.35)"
        strokeWidth={2}
        paintOrder="stroke fill"
      >
        {lines.map((text, i) => (
          <tspan key={i} x={x} dy={i === 0 ? 0 : 12} textAnchor="middle">
            {text}
          </tspan>
        ))}
      </text>
    );
  };
}

export function formatPieShareLabel(value, percent, formatValue) {
  const pct = `${Math.round(percent * 100)}%`;
  if (percent < 0.1) return pct;
  if (formatValue) return `${pct}\n${formatValue(value)}`;
  return pct;
}

export const BAR_LABEL_TOP_STYLE = {
  fill: "#0f172a",
  fontSize: 11,
  fontWeight: 600,
};

export const BAR_CHART_MARGIN_TOP = 32;
