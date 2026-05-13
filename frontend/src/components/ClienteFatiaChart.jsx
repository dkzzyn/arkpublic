import React, { useMemo } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const EXTRA_FILLS = ["#14b8a6", "#2dd4bf", "#5eead4", "#0f766e", "#115e59", "#134e4a", "#94a3b8", "#64748b", "#475569"];

function formatBRL(v) {
  return Number(v || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

function ClienteFatiaTooltip({ active, payload, total }) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  const name = p.name;
  const value = Number(p.value || 0);
  const t = Number(total || 0);
  const pct = t > 0 ? ((value / t) * 100).toFixed(1) : "0";
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs shadow-md">
      <p className="font-semibold text-slate-800">Mês {name}</p>
      <p className="text-slate-700">{formatBRL(value)}</p>
      <p className="text-slate-500">{pct}% do total do cliente</p>
    </div>
  );
}

function ClienteFatiaChart({ data, color = "#0d9488" }) {
  const total = useMemo(() => data?.reduce((s, d) => s + Number(d.value || 0), 0) ?? 0, [data]);

  const fills = useMemo(() => {
    if (!data?.length) return [];
    return data.map((_, i) => (i === 0 ? color : EXTRA_FILLS[(i - 1) % EXTRA_FILLS.length]));
  }, [data, color]);

  if (!data?.length || total <= 0) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center px-2 text-center text-xs text-slate-500">
        Sem dados de faturamento por mês para este cliente.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius="88%"
          paddingAngle={1.5}
          stroke="#fff"
          strokeWidth={1.5}
        >
          {data.map((entry, i) => (
            <Cell key={entry.name} fill={fills[i]} />
          ))}
        </Pie>
        <Tooltip content={(tipProps) => <ClienteFatiaTooltip {...tipProps} total={total} />} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export default ClienteFatiaChart;
