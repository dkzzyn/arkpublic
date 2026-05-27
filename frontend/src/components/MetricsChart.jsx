import React from "react";
import { BRAND, CHART_ITENS, CHART_MUTED } from "../theme/colors";
import {
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CHART_BAR_ANIMATION, VALUE_AXIS_DOMAIN, chartMountKey } from "./chartAnimation";
import { BAR_CHART_MARGIN_TOP, BAR_LABEL_TOP_STYLE } from "./chartLabels";

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

function MetricsChart({
  data,
  xKey,
  color,
  metric = "valor",
  selectable = false,
  selectedKey = "",
  highlightKey = "",
  onSelect,
}) {
  const isValor = metric !== "itens";
  const dataKey = isValor ? "VALOR_TOTAL" : "QTD_ITENS";
  const barColor = isValor ? color : CHART_ITENS;
  const mutedColor = isValor ? `${color}88` : CHART_MUTED;
  const selectedColor = isValor ? `${color}cc` : BRAND[900];
  const name = isValor ? "Valor Total" : "Quantidade Itens";
  const labelFormatter = isValor ? formatBRLCompact : formatIntCompact;
  const tooltipFormatter = (value) =>
    isValor ? formatBRL(value) : Number(value || 0).toLocaleString("pt-BR");

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        key={chartMountKey("metrics", dataKey, selectedKey, data.length)}
        data={data}
        margin={{ top: BAR_CHART_MARGIN_TOP, right: 12, left: 8, bottom: 8 }}
      >
        <CartesianGrid strokeDasharray="2 6" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey={xKey} stroke="#64748b" />
        <YAxis hide domain={VALUE_AXIS_DOMAIN} />
        <Tooltip formatter={tooltipFormatter} />
        <Bar
          dataKey={dataKey}
          name={name}
          fill={barColor}
          radius={[8, 8, 0, 0]}
          {...CHART_BAR_ANIMATION}
          onClick={(entry) => {
            if (selectable && onSelect && entry?.MES_ANO) onSelect(entry.MES_ANO);
          }}
        >
          <LabelList
            dataKey={dataKey}
            position="top"
            formatter={labelFormatter}
            style={BAR_LABEL_TOP_STYLE}
          />
          {selectable &&
            data.map((entry) => (
              <Cell
                key={`cell-${entry.MES_ANO || entry[xKey]}`}
                fill={
                  entry.MES_ANO === selectedKey
                    ? selectedColor
                    : entry.MES_ANO === highlightKey
                      ? isValor
                        ? color
                        : BRAND[700]
                      : mutedColor
                }
                cursor={selectable ? "pointer" : undefined}
              />
            ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export default MetricsChart;
