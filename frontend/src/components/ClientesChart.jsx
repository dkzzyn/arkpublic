import React, { useMemo } from "react";
import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const RS_KEY = "RAZÃO SOCIAL";

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

function truncate(str, max) {
  const s = String(str || "");
  if (s.length <= max) return s;
  return `${s.slice(0, Math.max(0, max - 1))}…`;
}

function ClientesTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md">
      <p className="font-semibold text-slate-800">{p[RS_KEY]}</p>
      <p className="text-slate-700">{formatBRL(p.VALOR_TOTAL)}</p>
      <p className="text-slate-500">
        {Number(p.QTD_NF || 0).toLocaleString("pt-BR")} NF ·{" "}
        {Number(p.QTD_ITENS || 0).toLocaleString("pt-BR")} itens
      </p>
    </div>
  );
}

function ClientesChart({ ranking, color = "#0d9488", selectedRazao = "", onSelectCliente }) {
  const chartData = useMemo(() => {
    const sorted = [...(ranking || [])].sort((a, b) => Number(b.VALOR_TOTAL || 0) - Number(a.VALOR_TOTAL || 0));
    return sorted.map((row) => ({
      ...row,
      nomeCurto: truncate(row[RS_KEY], 24),
    }));
  }, [ranking]);

  if (!chartData.length) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-2 text-center text-xs text-slate-500">
        Nenhum cliente no escopo selecionado.
      </div>
    );
  }

  const topIdx = 0;
  const interactive = typeof onSelectCliente === "function";

  return (
    <div className="flex h-full min-h-0 flex-col gap-1">
      {!selectedRazao ? (
        <p className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Valor por cliente (top 10)
          {interactive ? " · clique para detalhes" : ""}
        </p>
      ) : null}
      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 4, right: 72, left: 4, bottom: 4 }}
            barCategoryGap={6}
          >
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="nomeCurto"
              width={108}
              stroke="#64748b"
              tick={{ fontSize: 10 }}
            />
            <Tooltip content={<ClientesTooltip />} cursor={{ fill: "rgba(148, 163, 184, 0.12)" }} />
            <Bar dataKey="VALOR_TOTAL" radius={[0, 4, 4, 0]} maxBarSize={22}>
              <LabelList
                dataKey="VALOR_TOTAL"
                position="right"
                formatter={formatBRLCompact}
                style={{ fill: "#0f172a", fontSize: 10, fontWeight: 600 }}
              />
              {chartData.map((entry, index) => {
                const isSel = selectedRazao && entry[RS_KEY] === selectedRazao;
                const isLeader = index === topIdx;
                const fill = isSel
                  ? color
                  : !selectedRazao && isLeader
                    ? color
                    : `${color}70`;
                return (
                  <Cell
                    key={`${entry[RS_KEY]}-${index}`}
                    fill={fill}
                    style={{ cursor: interactive ? "pointer" : undefined }}
                    onClick={
                      interactive
                        ? () => {
                            onSelectCliente(entry[RS_KEY]);
                          }
                        : undefined
                    }
                  />
                );
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default ClientesChart;
