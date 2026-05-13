import React from "react";
import {
  CartesianGrid,
  Legend,
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

function tooltipFormatter(value, name) {
  if (name === "Valor Total") return formatBRL(value);
  return Number(value || 0).toLocaleString("pt-BR");
}

function DailyLineChart({ data, color = "#dc2626", domainFromZero = false }) {
  const yAxisExtra = domainFromZero ? { domain: [0, "auto"] } : {};
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 8, right: 12, left: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="2 6" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="DIA_LABEL" stroke="#64748b" />
        <YAxis
          yAxisId="valor"
          stroke="#64748b"
          tickFormatter={(value) => `R$ ${Number(value).toLocaleString("pt-BR")}`}
          {...yAxisExtra}
        />
        <YAxis
          yAxisId="itens"
          orientation="right"
          stroke="#94a3b8"
          tickFormatter={(value) => Number(value).toLocaleString("pt-BR")}
          {...yAxisExtra}
        />
        <Tooltip formatter={tooltipFormatter} />
        <Legend />
        <Line
          yAxisId="valor"
          type="monotone"
          dataKey="VALOR_TOTAL"
          name="Valor Total"
          stroke={color}
          strokeWidth={2.6}
          dot={false}
        />
        <Line
          yAxisId="itens"
          type="monotone"
          dataKey="QTD_ITENS"
          name="Quantidade Itens"
          stroke="#334155"
          strokeWidth={1.6}
          strokeOpacity={0.75}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export default DailyLineChart;
