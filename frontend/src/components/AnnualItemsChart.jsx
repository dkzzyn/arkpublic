import React from "react";
import {
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CHART_LINE_ANIMATION, VALUE_AXIS_DOMAIN, chartMountKey } from "./chartAnimation";

function formatIntCompact(value) {
  const n = Number(value || 0);
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} mi`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)} mil`;
  return n.toLocaleString("pt-BR");
}

function AnnualItemsChart({ data, accentColor }) {
  const lineColor = accentColor || "#475569";
  const showLabels = (data || []).length <= 12;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart
        key={chartMountKey("annual-itens", data?.length)}
        data={data}
        margin={{ top: 24, right: 12, left: 8, bottom: 8 }}
      >
        <CartesianGrid strokeDasharray="2 6" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="MES_LABEL" stroke="#64748b" />
        <YAxis hide domain={VALUE_AXIS_DOMAIN} />
        <Tooltip formatter={(v) => [Number(v || 0).toLocaleString("pt-BR"), "Itens"]} />
        <Line
          type="monotone"
          dataKey="QTD_ITENS"
          name="Quantidade de itens"
          stroke={lineColor}
          strokeWidth={2}
          strokeOpacity={0.85}
          dot={{ r: 3, fill: lineColor }}
          activeDot={{ r: 5 }}
          {...CHART_LINE_ANIMATION}
        >
          {showLabels && (
            <LabelList
              dataKey="QTD_ITENS"
              position="top"
              formatter={formatIntCompact}
              style={{ fill: "#0f172a", fontSize: 10, fontWeight: 600 }}
            />
          )}
        </Line>
      </LineChart>
    </ResponsiveContainer>
  );
}

export default AnnualItemsChart;
