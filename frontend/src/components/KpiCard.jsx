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
  accentColor = "#dc2626",
  compact = false,
}) {
  const trendColor = trend == null ? "text-slate-500" : trend >= 0 ? "text-brand-600" : "text-brand-900";
  const trendLabel =
    trend == null
      ? "Sem base comparativa"
      : `${trend >= 0 ? "↑" : "↓"} ${Math.abs(trend).toFixed(1)}% vs mes anterior`;

  return (
    <div
      className={`h-full rounded-2xl border border-slate-200 shadow-sm transition-all duration-300 hover:shadow-md ${
        primary ? "bg-brand-50" : "bg-white"
      }`}
      style={{
        padding: compact ? "7px 9px" : "14px",
        borderLeftWidth: "2px",
        borderLeftColor: accentColor,
      }}
    >
      <p
        className={`mb-1 ${
          primary
            ? compact
              ? "text-[11px] font-semibold text-slate-700"
              : "text-base font-semibold text-slate-700"
            : "text-[10px] font-medium text-slate-500"
        }`}
      >
        {title}
      </p>
      <h3
        className={`${
          primary ? (compact ? "text-lg xl:text-xl" : "text-3xl xl:text-4xl") : "text-sm xl:text-base"
        } font-bold leading-tight text-slate-900`}
      >
        {formatValue(value, type)}
      </h3>
      {trend != null && (
        <p className={`mt-0.5 text-[10px] font-semibold ${trendColor}`}>{trendLabel}</p>
      )}
    </div>
  );
}

export default KpiCard;
