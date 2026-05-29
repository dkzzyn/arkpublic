import React, { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  CHART_BAR_ANIMATION,
  CHART_BAR_ANIMATION_DELAYED,
  CHART_LINE_ANIMATION,
  BAR_LABEL_ANIMATION,
  GrowingBarShape,
  VALUE_AXIS_DOMAIN,
  chartMountKey,
} from "./chartAnimation";
import { BAR_CHART_MARGIN_TOP, BAR_LABEL_TOP_STYLE } from "./chartLabels";
import KpiCard from "./KpiCard";
import ChartMetricToggle from "./ChartMetricToggle";
import { BRAND, CHART_ITENS, FATURAMENTO_COLORS } from "../theme/colors";

const LOCAL_OPTIONS = [
  { value: "todos", label: "Todos" },
  { value: "implantacao", label: "Implantação" },
  { value: "sustentacao", label: "Sustentação (08)" },
];

const COLOR_ACCENT = FATURAMENTO_COLORS.accent;
const COLOR_GERADA = FATURAMENTO_COLORS.gerada;
const COLOR_AGUARDANDO = FATURAMENTO_COLORS.aguardando;

// No modo mensal apresentamos apenas os meses do ano corrente do calendário.
const MENSAL_YEAR = new Date().getFullYear();

const MONTH_LABELS = {
  1: "Jan",
  2: "Fev",
  3: "Mar",
  4: "Abr",
  5: "Mai",
  6: "Jun",
  7: "Jul",
  8: "Ago",
  9: "Set",
  10: "Out",
  11: "Nov",
  12: "Dez",
};

const emptyPayload = {
  filtro_local: "todos",
  totais: {
    VALOR_TOTAL: 0,
    VALOR_GERADAS: 0,
    VALOR_AGUARDANDO: 0,
    QTD_GERADAS: 0,
    QTD_AGUARDANDO: 0,
    QTD_TOTAL: 0,
  },
  mensal: [],
  anual: [],
  diario: [],
  por_local: [],
};

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

function StatusTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md">
      <p className="font-semibold text-slate-800">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {Number(p.value || 0).toLocaleString("pt-BR")}
        </p>
      ))}
    </div>
  );
}

function MensalTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const p = payload[0]?.payload || {};
  const entry = payload[0];
  const isNf = entry?.dataKey === "QTD_GERADAS";
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md">
      <p className="font-semibold text-slate-800">{label}</p>
      {isNf ? (
        <p className="text-slate-700">
          {Number(entry.value || 0).toLocaleString("pt-BR")} notas fiscais
        </p>
      ) : (
        <>
          <p className="text-slate-700">
            {Number(p.VALOR_TOTAL || 0).toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
              minimumFractionDigits: 2,
            })}
          </p>
          <p className="text-slate-500">{Number(p.QTD_GERADAS || 0).toLocaleString("pt-BR")} NF</p>
        </>
      )}
    </div>
  );
}

function Faturamento({ api }) {
  const [localFilter, setLocalFilter] = useState("todos");
  const [mode, setMode] = useState("mensal");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [data, setData] = useState(emptyPayload);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [dailyLineMetric, setDailyLineMetric] = useState("valor");

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError("");
    const params = localFilter && localFilter !== "todos" ? { local: localFilter } : {};
    api
      .get("/faturamento", { params })
      .then(({ data: res }) => {
        if (!cancelled) setData(res || emptyPayload);
      })
      .catch((err) => {
        if (cancelled) return;
        const detail =
          err?.response?.data?.detail ||
          (err?.request
            ? "API offline. Inicie o backend FastAPI em http://localhost:8000."
            : "Falha ao buscar dados de faturamento.");
        setError(String(detail));
        setData(emptyPayload);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [localFilter, api]);

  // Opções de mês: APENAS meses do ano corrente (MENSAL_YEAR).
  const monthOptions = useMemo(
    () =>
      [
        ...new Set(
          (data.mensal || [])
            .filter((row) => Number(row.ANO) === MENSAL_YEAR)
            .map((row) => row.MES_ANO)
            .filter(Boolean),
        ),
      ].sort(),
    [data.mensal],
  );
  // Opções de ano: todos os anos disponíveis nos dados, mais recente primeiro.
  const yearOptions = useMemo(
    () =>
      [...new Set((data.mensal || []).map((row) => Number(row.ANO)).filter(Boolean))].sort(
        (a, b) => b - a,
      ),
    [data.mensal],
  );

  useEffect(() => {
    if (!monthOptions.length) {
      setSelectedMonth("");
      return;
    }
    setSelectedMonth((prev) =>
      prev && monthOptions.includes(prev) ? prev : monthOptions[monthOptions.length - 1],
    );
  }, [monthOptions]);

  useEffect(() => {
    if (!yearOptions.length) {
      setSelectedYear("");
      return;
    }
    setSelectedYear((prev) =>
      prev && yearOptions.includes(Number(prev)) ? prev : String(yearOptions[0]),
    );
  }, [yearOptions]);

  // Dados do gráfico mensal: APENAS meses do ano corrente (MENSAL_YEAR).
  const monthlyByMonthData = useMemo(
    () =>
      (data.mensal || [])
        .filter((row) => Number(row.ANO) === MENSAL_YEAR)
        .map((row) => ({
          ...row,
          MES_LABEL: MONTH_LABELS[Number(row.MES)] || String(row.MES || ""),
        }))
        .sort((a, b) => String(a.MES_ANO).localeCompare(String(b.MES_ANO))),
    [data.mensal],
  );

  const annualByMonthData = useMemo(() => {
    const yearNum = Number(selectedYear);
    if (!yearNum) return [];
    return (data.mensal || [])
      .filter((row) => Number(row.ANO) === yearNum)
      .map((row) => ({
        ...row,
        MES_LABEL: MONTH_LABELS[Number(row.MES)] || String(row.MES || ""),
      }))
      .sort((a, b) => Number(a.MES) - Number(b.MES));
  }, [data.mensal, selectedYear]);

  // Ano fixo da visão mensal (MENSAL_YEAR); fallback para o mais recente se não houver dado nesse ano.
  const currentYear = useMemo(() => {
    if (yearOptions.includes(MENSAL_YEAR)) return MENSAL_YEAR;
    return yearOptions[0] || null;
  }, [yearOptions]);

  // Serie diaria do mes selecionado (para a linha embaixo do barras no modo mensal).
  // Quando nenhum mes esta selecionado, mostra todos os dias do ano corrente.
  const dailySeries = useMemo(() => {
    const rows = (data.diario || []).map((row) => ({
      ...row,
      ANO: Number(row.ANO),
      MES: Number(row.MES),
      DIA: Number(row.DIA),
      VALOR_TOTAL: Number(row.VALOR_TOTAL || 0),
      QTD_GERADAS: Number(row.QTD_GERADAS || 0),
    }));
    let filtered = rows;
    if (selectedMonth) {
      filtered = rows.filter((row) => row.MES_ANO === selectedMonth);
    } else if (currentYear) {
      filtered = rows.filter((row) => row.ANO === currentYear);
    }
    return filtered
      .sort((a, b) => String(a.DATA).localeCompare(String(b.DATA)))
      .map((row) => ({
        ...row,
        // Quando filtrado para um único mês mostramos só o dia; caso contrário a data completa.
        DIA_LABEL: selectedMonth ? String(row.DIA).padStart(2, "0") : row.DATA,
      }));
  }, [data.diario, selectedMonth, currentYear]);

  const dailyLabel = selectedMonth
    ? `Dias de ${selectedMonth}`
    : currentYear
      ? `Todos os dias de ${currentYear}`
      : "Sem período";

  const chartData = mode === "mensal" ? monthlyByMonthData : annualByMonthData;
  const xKey = mode === "mensal" ? "MES_ANO" : "MES_LABEL";

  // Totais do período selecionado (Mensal = mês selecionado dentro do ano corrente; Anual = ano selecionado).
  const periodTotals = useMemo(() => {
    let source = [];
    if (mode === "mensal") {
      const baseAno = (data.mensal || []).filter((row) => Number(row.ANO) === MENSAL_YEAR);
      source = selectedMonth ? baseAno.filter((row) => row.MES_ANO === selectedMonth) : baseAno;
    } else {
      const yearNum = Number(selectedYear);
      source = yearNum ? (data.mensal || []).filter((row) => Number(row.ANO) === yearNum) : [];
    }
    return source.reduce(
      (acc, row) => {
        acc.valor += Number(row.VALOR_TOTAL || 0);
        acc.geradas += Number(row.QTD_GERADAS || 0);
        return acc;
      },
      { valor: 0, geradas: 0 },
    );
  }, [data.mensal, mode, selectedMonth, selectedYear]);

  const totais = data.totais || emptyPayload.totais;
  const percentualGeradas = useMemo(() => {
    const total = (totais.QTD_GERADAS || 0) + (totais.QTD_AGUARDANDO || 0);
    if (!total) return 0;
    return (totais.QTD_GERADAS / total) * 100;
  }, [totais]);

  const statusComparativo = useMemo(
    () => [
      { STATUS: "NF Gerada", QTD: totais.QTD_GERADAS || 0 },
      { STATUS: "Aguardando faturamento", QTD: totais.QTD_AGUARDANDO || 0 },
    ],
    [totais],
  );

  const porLocalData = useMemo(
    () =>
      (data.por_local || []).map((row) => ({
        ...row,
        LABEL: row.LOCAL_LABEL || row.LOCAL,
      })),
    [data.por_local],
  );

  const noData = !data.mensal?.length && (totais.QTD_TOTAL || 0) === 0;

  const periodoLabel =
    mode === "mensal"
      ? selectedMonth
        ? `Mês ${selectedMonth}`
        : "Todos os meses"
      : selectedYear
        ? `Ano ${selectedYear}`
        : "Sem ano";

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
      <div className="mb-3 flex shrink-0 flex-wrap items-end gap-x-5 gap-y-3 border-b border-brand-200 pb-3">
        <div>
          <p className="mb-1 text-xs text-brand-800">Relatório</p>
          <div className="inline-flex overflow-hidden rounded border border-brand-200 bg-white text-xs">
            <button
              type="button"
              onClick={() => setMode("mensal")}
              className={`px-3 py-1.5 font-medium ${mode === "mensal" ? "bg-brand-600 text-white" : "text-brand-900 hover:bg-brand-50"}`}
            >
              Mensal
            </button>
            <button
              type="button"
              onClick={() => setMode("anual")}
              className={`border-l border-brand-200 px-3 py-1.5 font-medium ${mode === "anual" ? "bg-brand-600 text-white" : "text-brand-900 hover:bg-brand-50"}`}
            >
              Anual
            </button>
          </div>
        </div>

        <div>
          <p className="mb-1 text-xs text-brand-800">Local</p>
          <div className="inline-flex flex-wrap overflow-hidden rounded border border-brand-200 bg-white text-xs">
            {LOCAL_OPTIONS.map((opt, idx) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setLocalFilter(opt.value)}
                className={`px-3 py-1.5 font-medium ${
                  idx > 0 ? "border-l border-brand-200" : ""
                } ${localFilter === opt.value ? "bg-brand-600 text-white" : "text-brand-900 hover:bg-brand-50"}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="min-w-[140px]">
          <p className="mb-1 text-xs text-brand-800">{mode === "mensal" ? "Mês de referência" : "Ano"}</p>
          {mode === "mensal" ? (
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full rounded border border-brand-200 bg-white px-2 py-1.5 text-xs text-brand-950"
            >
              {monthOptions.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          ) : (
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full rounded border border-brand-200 bg-white px-2 py-1.5 text-xs text-brand-950"
            >
              {yearOptions.map((y) => (
                <option key={y} value={String(y)}>
                  {y}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {error && (
        <div className="shrink-0 rounded border border-red-300 bg-red-50 px-2 py-1.5 text-xs text-red-700">
          {error}
        </div>
      )}

      {noData && !isLoading && !error ? (
        <div className="flex min-h-0 flex-1 items-center justify-center border border-dashed border-brand-300 bg-brand-50/60 p-4">
          <div className="max-w-md text-center">
            <p className="text-sm font-semibold text-brand-900">Sem dados de faturamento.</p>
            <p className="mt-1 text-sm text-brand-800">
              Vá à seção <strong>Dados</strong> e carregue a planilha de faturamento (.xlsx ou .csv) com as colunas{" "}
              <code className="text-xs">FILA_ORDEM</code>, <code className="text-xs">LOCAL</code>,{" "}
              <code className="text-xs">DATA_EMISSAO_NF</code> e <code className="text-xs">R$PROJETO</code>.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="shrink-0 grid grid-cols-12 gap-2">
            <div className="col-span-12 lg:col-span-4">
              <KpiCard
                title={mode === "mensal" ? "Valor faturado no mês" : "Valor faturado no ano"}
                value={periodTotals.valor}
                type="currency"
                primary
                accentColor={COLOR_ACCENT}
                compact
              />
            </div>
            <div className="col-span-6 sm:col-span-3 lg:col-span-2">
              <KpiCard
                title={mode === "mensal" ? "NF geradas no mês" : "NF geradas no ano"}
                value={periodTotals.geradas}
                accentColor={COLOR_GERADA}
                compact
              />
            </div>
            <div className="col-span-6 sm:col-span-3 lg:col-span-2">
              <KpiCard
                title="Aguardando (total)"
                value={totais.QTD_AGUARDANDO || 0}
                accentColor={COLOR_AGUARDANDO}
                compact
              />
            </div>
            <div className="col-span-12 sm:col-span-6 lg:col-span-4">
              <KpiCard
                title="% geradas (total)"
                value={percentualGeradas}
                type="percent"
                accentColor={COLOR_ACCENT}
                compact
              />
            </div>
          </div>

          <div className="grid min-h-0 flex-1 gap-2 [grid-template-rows:minmax(0,1fr)_minmax(0,1fr)]">
            <div className="flex min-h-0 min-w-0 flex-col border border-brand-200 bg-white p-3">
              <div className="mb-2 flex shrink-0 items-center justify-between">
                <p className="text-sm font-medium text-slate-700">
                  {mode === "mensal"
                    ? `Valor faturado por mês (${MENSAL_YEAR})`
                    : `Valor faturado por mês do ano (${selectedYear || "—"})`}
                </p>
                <span className="text-[10px] text-slate-500">{periodoLabel}</span>
              </div>
              <div className="min-h-0 flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    key={chartMountKey("fat-mensal", selectedMonth, chartData.length)}
                    data={chartData}
                    margin={{ top: BAR_CHART_MARGIN_TOP, right: 12, left: 8, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="2 6" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey={xKey} stroke="#64748b" />
                    <YAxis hide domain={VALUE_AXIS_DOMAIN} />
                    <Tooltip content={<MensalTooltip />} cursor={{ fill: "rgba(148,163,184,0.12)" }} />
                    <Bar
                      dataKey="VALOR_TOTAL"
                      name="Valor"
                      radius={[8, 8, 0, 0]}
                      shape={GrowingBarShape}
                      {...CHART_BAR_ANIMATION}
                      onClick={(entry) => {
                        if (mode === "mensal" && entry?.MES_ANO) setSelectedMonth(entry.MES_ANO);
                      }}
                    >
                      <LabelList
                        dataKey="VALOR_TOTAL"
                        position="top"
                        formatter={formatBRLCompact}
                        style={BAR_LABEL_TOP_STYLE}
                        {...BAR_LABEL_ANIMATION}
                      />
                      {chartData.map((entry) => {
                        const isSelected =
                          mode === "mensal" && selectedMonth && entry.MES_ANO === selectedMonth;
                        return (
                          <Cell
                            key={`bar-${entry.MES_ANO || entry.MES_LABEL}`}
                            fill={isSelected ? COLOR_GERADA : `${COLOR_GERADA}aa`}
                            cursor={mode === "mensal" ? "pointer" : undefined}
                          />
                        );
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {mode === "mensal" ? (
              <div className="flex min-h-0 min-w-0 flex-col border border-brand-200 bg-white p-3">
                <div className="mb-2 flex shrink-0 flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-slate-700">Evolução diária</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <ChartMetricToggle
                      value={dailyLineMetric}
                      onChange={setDailyLineMetric}
                      accentColor={COLOR_ACCENT}
                      altLabel="Qtd. NF"
                      altKey="nf"
                    />
                    <span className="text-[10px] text-slate-500">{dailyLabel}</span>
                  </div>
                </div>
                <div className="min-h-0 flex-1">
                  {dailySeries.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-[11px] text-slate-500">
                      Sem dados diários para o período.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        key={chartMountKey("fat-diario", dailyLineMetric, selectedMonth, dailySeries.length)}
                        data={dailySeries}
                        margin={{ top: BAR_CHART_MARGIN_TOP, right: 12, left: 8, bottom: 8 }}
                      >
                        <CartesianGrid strokeDasharray="2 6" stroke="#e2e8f0" vertical={false} />
                        <XAxis dataKey="DIA_LABEL" stroke="#64748b" interval="preserveStartEnd" />
                        <YAxis hide domain={VALUE_AXIS_DOMAIN} />
                        <Tooltip content={<MensalTooltip />} cursor={{ stroke: "#cbd5e1" }} />
                        <Line
                          type="monotone"
                          dataKey={dailyLineMetric === "nf" ? "QTD_GERADAS" : "VALOR_TOTAL"}
                          name={dailyLineMetric === "nf" ? "Qtd. NF" : "Valor"}
                          stroke={dailyLineMetric === "nf" ? CHART_ITENS : COLOR_ACCENT}
                          strokeWidth={2.5}
                          dot={{
                            r: 3,
                            fill: dailyLineMetric === "nf" ? CHART_ITENS : COLOR_ACCENT,
                          }}
                          activeDot={{ r: 5 }}
                          {...CHART_LINE_ANIMATION}
                        >
                          {dailySeries.length <= 31 && (
                            <LabelList
                              dataKey={dailyLineMetric === "nf" ? "QTD_GERADAS" : "VALOR_TOTAL"}
                              position="top"
                              formatter={
                                dailyLineMetric === "nf" ? formatIntCompact : formatBRLCompact
                              }
                              style={{ ...BAR_LABEL_TOP_STYLE, fontSize: 10 }}
                            />
                          )}
                        </Line>
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid min-h-0 min-w-0 grid-cols-1 gap-2 lg:grid-cols-2">
                <div className="flex min-h-0 min-w-0 flex-col border border-brand-200 bg-white p-3">
                  <p className="mb-2 shrink-0 text-sm font-medium text-slate-700">NF geradas × aguardando faturamento</p>
                  <div className="min-h-0 flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        key={chartMountKey("fat-status", statusComparativo.length)}
                        data={statusComparativo}
                        margin={{ top: BAR_CHART_MARGIN_TOP, right: 12, left: 8, bottom: 8 }}
                      >
                        <CartesianGrid strokeDasharray="2 6" stroke="#e2e8f0" vertical={false} />
                        <XAxis dataKey="STATUS" stroke="#64748b" />
                        <YAxis hide domain={VALUE_AXIS_DOMAIN} />
                        <Tooltip content={<StatusTooltip />} cursor={{ fill: "rgba(148,163,184,0.12)" }} />
                        <Bar
                          dataKey="QTD"
                          name="Quantidade"
                          radius={[8, 8, 0, 0]}
                          shape={GrowingBarShape}
                          {...CHART_BAR_ANIMATION}
                        >
                          <LabelList
                            dataKey="QTD"
                            position="top"
                            formatter={formatIntCompact}
                            style={BAR_LABEL_TOP_STYLE}
                            {...BAR_LABEL_ANIMATION}
                          />
                          {statusComparativo.map((entry) => (
                            <Cell
                              key={entry.STATUS}
                              fill={entry.STATUS === "NF Gerada" ? COLOR_GERADA : COLOR_AGUARDANDO}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="flex min-h-0 min-w-0 flex-col border border-brand-200 bg-white p-3">
                  <p className="mb-2 shrink-0 text-sm font-medium text-slate-700">Comparativo por local</p>
                  <div className="min-h-0 flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        key={chartMountKey("fat-local", porLocalData.length)}
                        data={porLocalData}
                        margin={{ top: BAR_CHART_MARGIN_TOP, right: 12, left: 8, bottom: 8 }}
                      >
                        <CartesianGrid strokeDasharray="2 6" stroke="#e2e8f0" vertical={false} />
                        <XAxis dataKey="LABEL" stroke="#64748b" />
                        <YAxis hide domain={VALUE_AXIS_DOMAIN} />
                        <Tooltip content={<StatusTooltip />} cursor={{ fill: "rgba(148,163,184,0.12)" }} />
                        <Bar
                          dataKey="QTD_GERADAS"
                          name="NF Gerada"
                          fill={COLOR_GERADA}
                          radius={[8, 8, 0, 0]}
                          shape={GrowingBarShape}
                          {...CHART_BAR_ANIMATION}
                        >
                          <LabelList
                            dataKey="QTD_GERADAS"
                            position="top"
                            formatter={formatIntCompact}
                            style={BAR_LABEL_TOP_STYLE}
                            {...BAR_LABEL_ANIMATION}
                          />
                        </Bar>
                        <Bar
                          dataKey="QTD_AGUARDANDO"
                          name="Aguardando faturamento"
                          fill={COLOR_AGUARDANDO}
                          radius={[8, 8, 0, 0]}
                          shape={(props) => <GrowingBarShape {...props} staggerOffset={120} />}
                          {...CHART_BAR_ANIMATION_DELAYED}
                        >
                          <LabelList
                            dataKey="QTD_AGUARDANDO"
                            position="top"
                            formatter={formatIntCompact}
                            style={BAR_LABEL_TOP_STYLE}
                            {...BAR_LABEL_ANIMATION}
                          />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {isLoading && <p className="shrink-0 text-[11px] text-slate-500">Carregando faturamento...</p>}
    </div>
  );
}

export default Faturamento;
