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
    <div className={`inline-flex shrink-0 overflow-hidden rounded border border-brand-200 bg-brand-50 text-xs ${className}`}>
      <button
        type="button"
        onClick={() => onChange("valor")}
        className={`px-2.5 py-1 font-medium ${
          value === "valor" ? "text-white" : "text-brand-900 hover:bg-white"
        }`}
        style={value === "valor" ? { backgroundColor: accentColor } : undefined}
      >
        {valorLabel}
      </button>
      <button
        type="button"
        onClick={() => onChange(altKey)}
        className={`border-l border-brand-200 px-2.5 py-1 font-medium ${
          value === altKey ? "bg-brand-800 text-white" : "text-brand-900 hover:bg-white"
        }`}
      >
        {altLabel}
      </button>
    </div>
  );
}

export default ChartMetricToggle;
