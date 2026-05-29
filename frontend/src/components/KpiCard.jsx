import React from "react";

function formatValue(value, type) {
  const safeValue = Number(value || 0);
  if (type === "currency") {
    return safeValue.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
    });
  }
  if (type === "percent") return `${safeValue.toFixed(1)}%`;
  return safeValue.toLocaleString("pt-BR");
}

function KpiCard({
  title,
  value,
  type = "number",
  primary = false,
  trend = null,
  accentColor = "#b91c1c",
  compact = false,
}) {
  const trendColor = trend == null ? "text-slate-500" : trend >= 0 ? "text-brand-600" : "text-brand-900";
  const trendLabel =
    trend == null
      ? "Sem base comparativa"
      : `${trend >= 0 ? "+" : ""}${trend.toFixed(1)}% vs. mês anterior`;

  return (
    <div
      className={`h-full border border-brand-200 bg-white ${
        primary ? "border-t-[3px] bg-brand-50/50" : "border-t border-t-brand-100"
      }`}
      style={primary ? { borderTopColor: accentColor } : undefined}
    >
      <div className={compact ? "px-3 py-2.5" : "px-4 py-3"}>
        <p className={`mb-0.5 ${primary ? "text-sm font-medium text-slate-700" : "text-xs text-slate-500"}`}>
          {title}
        </p>
        <p
          className={`font-semibold tabular-nums text-slate-900 ${
            primary ? (compact ? "text-xl" : "text-2xl") : compact ? "text-base" : "text-lg"
          }`}
        >
          {formatValue(value, type)}
        </p>
        {trend != null && (
          <p className={`mt-1 text-xs ${trendColor}`}>{trendLabel}</p>
        )}
      </div>
    </div>
  );
}

export default KpiCard;
