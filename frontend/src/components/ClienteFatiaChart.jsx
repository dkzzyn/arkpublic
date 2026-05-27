import React, { useMemo } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { CHART_PIE_ANIMATION, chartMountKey } from "./chartAnimation";
import { createPieInsideLabel, formatPieShareLabel } from "./chartLabels";
import { CHART_RED_SCALE, DEFAULT_ACCENT } from "../theme/colors";

const EXTRA_FILLS = CHART_RED_SCALE.slice(1);

function formatBRL(v) {
  return Number(v || 0).toLocaleString("pt-BR", {
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

function ClienteFatiaChart({ data, color = DEFAULT_ACCENT }) {
  const total = useMemo(() => data?.reduce((s, d) => s + Number(d.value || 0), 0) ?? 0, [data]);

  const fills = useMemo(() => {
    if (!data?.length) return [];
    return data.map((_, i) => (i === 0 ? color : EXTRA_FILLS[(i - 1) % EXTRA_FILLS.length]));
  }, [data, color]);

  const renderPieLabel = useMemo(
    () =>
      createPieInsideLabel((value, percent) =>
        formatPieShareLabel(value, percent, formatBRLCompact),
      ),
    [],
  );

  if (!data?.length || total <= 0) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center px-2 text-center text-xs text-slate-500">
        Sem dados de faturamento por mês para este cliente.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart key={chartMountKey("fatia", data.length, total)} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
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
          label={renderPieLabel}
          labelLine={false}
          {...CHART_PIE_ANIMATION}
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
