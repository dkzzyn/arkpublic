import React from "react";
import {
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
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

function formatTooltip(value, name) {
  if (name === "Valor Total") return formatBRL(value);
  return Number(value || 0).toLocaleString("pt-BR");
}

function MetricsChart({
  data,
  xKey,
  color,
  showItemsSeries = false,
  selectable = false,
  selectedKey = "",
  highlightKey = "",
  onSelect,
}) {
  const mutedColor = `${color}88`;
  const selectedColor = `${color}cc`;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 12, left: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="2 6" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey={xKey} stroke="#64748b" />
        <YAxis
          yAxisId="valor"
          stroke="#64748b"
          tickFormatter={(value) => `R$ ${Number(value).toLocaleString("pt-BR")}`}
        />
        {showItemsSeries && (
          <YAxis
            yAxisId="itens"
            orientation="right"
            stroke="#94a3b8"
            tickFormatter={(value) => Number(value).toLocaleString("pt-BR")}
          />
        )}
        <Tooltip formatter={formatTooltip} />
        <Bar
          yAxisId="valor"
          dataKey="VALOR_TOTAL"
          name="Valor Total"
          fill={color}
          radius={[8, 8, 0, 0]}
          onClick={(entry) => {
            if (selectable && onSelect && entry?.MES_ANO) onSelect(entry.MES_ANO);
          }}
        >
          {selectable &&
            data.map((entry) => (
              <Cell
                key={`cell-${entry.MES_ANO || entry[xKey]}`}
                fill={
                  entry.MES_ANO === selectedKey
                    ? selectedColor
                    : entry.MES_ANO === highlightKey
                      ? color
                      : mutedColor
                }
                cursor="pointer"
              />
            ))}
        </Bar>
        {showItemsSeries && (
          <Bar
            yAxisId="itens"
            dataKey="QTD_ITENS"
            name="Quantidade Itens"
            fill="#64748b"
            radius={[8, 8, 0, 0]}
          />
        )}
      </BarChart>
    </ResponsiveContainer>
  );
}

export default MetricsChart;
