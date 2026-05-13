import React from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function AnnualItemsChart({ data, accentColor }) {
  const lineColor = accentColor || "#475569";
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 8, right: 12, left: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="2 6" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="MES_LABEL" stroke="#64748b" />
        <YAxis stroke="#64748b" tickFormatter={(v) => Number(v).toLocaleString("pt-BR")} />
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
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export default AnnualItemsChart;
