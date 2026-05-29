import React from "react";
import { CHART_LINE_ANIMATION, VALUE_AXIS_DOMAIN } from "./chartAnimation";
import { BAR_CHART_MARGIN_TOP, BAR_LABEL_TOP_STYLE } from "./chartLabels";
import { CHART_ITENS } from "../theme/colors";
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
import { chartMountKey } from "./chartAnimation";

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

function DailyLineChart({ data, color = "#dc2626", metric = "valor", domainFromZero = true }) {
  const isValor = metric !== "itens" && metric !== "nf";
  const dataKey =
    metric === "nf" ? "QTD_GERADAS" : metric === "itens" ? "QTD_ITENS" : "VALOR_TOTAL";
  const lineColor = isValor ? color : CHART_ITENS;
  const name =
    metric === "nf" ? "Qtd. NF" : metric === "itens" ? "Quantidade Itens" : "Valor Total";
  const labelFormatter = isValor ? formatBRLCompact : formatIntCompact;
  const yDomain = domainFromZero ? VALUE_AXIS_DOMAIN : undefined;
  const showLabels = (data || []).length <= 31;

  const tooltipFormatter = (value) =>
    isValor ? formatBRL(value) : Number(value || 0).toLocaleString("pt-BR");

  return (
    <ResponsiveContainer width="100%" height="100%" minHeight={160}>
      <LineChart
        key={chartMountKey("daily-line", metric, data?.length)}
        data={data}
        margin={{ top: BAR_CHART_MARGIN_TOP, right: 12, left: 8, bottom: 8 }}
      >
        <CartesianGrid strokeDasharray="2 6" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="DIA_LABEL" stroke="#64748b" interval="preserveStartEnd" />
        <YAxis hide domain={yDomain} />
        <Tooltip formatter={tooltipFormatter} />
        <Line
          type="monotone"
          dataKey={dataKey}
          name={name}
          stroke={lineColor}
          strokeWidth={2.6}
          dot={{ r: 3, fill: lineColor }}
          activeDot={{ r: 5 }}
          {...CHART_LINE_ANIMATION}
        >
          {showLabels && (
            <LabelList
              dataKey={dataKey}
              position="top"
              formatter={labelFormatter}
              style={{ ...BAR_LABEL_TOP_STYLE, fontSize: 10 }}
            />
          )}
        </Line>
      </LineChart>
    </ResponsiveContainer>
  );
}

export default DailyLineChart;
