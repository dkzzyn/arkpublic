import React from "react";
import { DEFAULT_ACCENT } from "../theme/colors";

function ChartMetricToggle({
  value,
  onChange,
  accentColor = DEFAULT_ACCENT,
  className = "",
  valorLabel = "Valor (R$)",
  altLabel = "Qtd. itens",
  altKey = "itens",
}) {
  return (
    <div
      className={`inline-flex shrink-0 rounded-lg border border-brand-200 bg-brand-50 p-0.5 ${className}`}
    >
      <button
        type="button"
        onClick={() => onChange("valor")}
        className={`rounded-md px-2 py-1 text-[10px] font-semibold ${
          value === "valor" ? "text-white shadow-sm" : "text-slate-600 hover:bg-white"
        }`}
        style={value === "valor" ? { backgroundColor: accentColor } : undefined}
      >
        {valorLabel}
      </button>
      <button
        type="button"
        onClick={() => onChange(altKey)}
        className={`rounded-md px-2 py-1 text-[10px] font-semibold ${
          value === altKey ? "bg-brand-800 text-white shadow-sm" : "text-brand-800 hover:bg-white"
        }`}
      >
        {altLabel}
      </button>
    </div>
  );
}

export default ChartMetricToggle;
