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

function formatBRL(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

function formatBRLCompact(value) {
  const n = Number(value || 0);
  if (n >= 1_000_000) return `R$ ${(n / 1_000_000).toFixed(1)} mi`;
  if (n >= 1_000) return `R$ ${(n / 1_000).toFixed(1)} mil`;
  return `R$ ${n.toFixed(0)}`;
}

function tooltipFormatter(value) {
  return formatBRL(value);
}

function DailyLineChart({ data, color = "#dc2626", domainFromZero = false }) {
  const yAxisExtra = domainFromZero ? { domain: [0, "auto"] } : {};
  const showLabels = (data || []).length <= 31;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 24, right: 12, left: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="2 6" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="DIA_LABEL" stroke="#64748b" interval="preserveStartEnd" />
        <YAxis hide {...yAxisExtra} />
        <Tooltip formatter={tooltipFormatter} />
        <Line
          type="monotone"
          dataKey="VALOR_TOTAL"
          name="Valor Total"
          stroke={color}
          strokeWidth={2.6}
          dot={{ r: 3, fill: color }}
          activeDot={{ r: 5 }}
        >
          {showLabels && (
            <LabelList
              dataKey="VALOR_TOTAL"
              position="top"
              formatter={formatBRLCompact}
              style={{ fill: "#0f172a", fontSize: 10, fontWeight: 600 }}
            />
          )}
        </Line>
      </LineChart>
    </ResponsiveContainer>
  );
}

export default DailyLineChart;
