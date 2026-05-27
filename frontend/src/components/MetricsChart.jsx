import React from "react";
import {
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
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

function formatIntCompact(value) {
  const n = Number(value || 0);
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} mi`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)} mil`;
  return n.toLocaleString("pt-BR");
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
      <BarChart data={data} margin={{ top: 24, right: 12, left: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="2 6" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey={xKey} stroke="#64748b" />
        <Tooltip formatter={formatTooltip} />
        <Bar
          dataKey="VALOR_TOTAL"
          name="Valor Total"
          fill={color}
          radius={[8, 8, 0, 0]}
          onClick={(entry) => {
            if (selectable && onSelect && entry?.MES_ANO) onSelect(entry.MES_ANO);
          }}
        >
          <LabelList
            dataKey="VALOR_TOTAL"
            position="top"
            formatter={formatBRLCompact}
            style={{ fill: "#0f172a", fontSize: 11, fontWeight: 600 }}
          />
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
            dataKey="QTD_ITENS"
            name="Quantidade Itens"
            fill="#64748b"
            radius={[8, 8, 0, 0]}
          >
            <LabelList
              dataKey="QTD_ITENS"
              position="top"
              formatter={formatIntCompact}
              style={{ fill: "#334155", fontSize: 10, fontWeight: 500 }}
            />
          </Bar>
        )}
      </BarChart>
    </ResponsiveContainer>
  );
}

export default MetricsChart;
