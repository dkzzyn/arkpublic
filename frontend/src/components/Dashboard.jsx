import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Sidebar from "./Sidebar";
import KpiCard from "./KpiCard";
import MetricsChart from "./MetricsChart";
import DailyLineChart from "./DailyLineChart";
import ChartMetricToggle from "./ChartMetricToggle";
import ClientesChart from "./ClientesChart";
import ClienteFatiaChart from "./ClienteFatiaChart";
import Faturamento from "./Faturamento";
import ExportSlidesModal from "./ExportSlidesModal";
import { buildExportSnapshot } from "../utils/exportSlides";
import { OPERATION_COLORS, SECTION_COLORS } from "../theme/colors";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:8000",
});

const OPERATION_META = {
  implantacao: { title: "Implantação", color: OPERATION_COLORS.implantacao },
  sustentacao: { title: "Sustentação", color: OPERATION_COLORS.sustentacao },
  impressoras: { title: "Impressoras", color: OPERATION_COLORS.impressoras },
};
const SECTION_META = {
  dados: { title: "Dados", color: SECTION_COLORS.dados },
  expedicao: { title: "Expedição", color: SECTION_COLORS.expedicao },
  faturamento: { title: "Faturamento", color: SECTION_COLORS.faturamento },
  clientes: { title: "Top clientes", color: SECTION_COLORS.clientes },
};

const emptyClientesPayload = {
  ranking: [],
  totais_escopo: { VALOR_TOTAL: 0, QTD_NF: 0, QTD_ITENS: 0 },
  top_cliente_share_pct: null,
};

const RS_KEY = "RAZÃO SOCIAL";

const emptyPayload = { mensal: [], anual: [], diario: [] };
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

function RankBadge({ index }) {
  return (
    <span className="mr-2 inline-flex w-5 shrink-0 tabular-nums text-[11px] font-semibold text-slate-500">
      {index + 1}.
    </span>
  );
}

function Dashboard() {
  const [section, setSection] = useState("expedicao");
  const [mode, setMode] = useState("mensal");
  const [operation, setOperation] = useState("implantacao");
  const [dataMap, setDataMap] = useState({
    implantacao: emptyPayload,
    sustentacao: emptyPayload,
    impressoras: emptyPayload,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [clienteTipo, setClienteTipo] = useState("todos");
  const [clientesData, setClientesData] = useState(emptyClientesPayload);
  const [selectedClienteRazao, setSelectedClienteRazao] = useState("");
  const [clienteDetalhe, setClienteDetalhe] = useState(null);
  const [clienteDetalheLoading, setClienteDetalheLoading] = useState(false);
  const [clienteDetalheError, setClienteDetalheError] = useState("");
  const [clienteSelectedMonth, setClienteSelectedMonth] = useState("");
  const [exportOpen, setExportOpen] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [dailyLineMetric, setDailyLineMetric] = useState("valor");
  const [clienteDailyLineMetric, setClienteDailyLineMetric] = useState("valor");

  const fetchDashboard = async () => {
    setIsLoading(true);
    setError("");
    try {
      const clientesParams = clienteTipo === "todos" ? {} : { tipo: clienteTipo };
      const [implantacao, sustentacao, impressoras, clientesRes] = await Promise.all([
        api.get("/implantacao"),
        api.get("/sustentacao"),
        api.get("/impressoras"),
        api.get("/clientes", { params: clientesParams }),
      ]);
      setDataMap({
        implantacao: implantacao.data,
        sustentacao: sustentacao.data,
        impressoras: impressoras.data,
      });
      setClientesData(clientesRes.data || emptyClientesPayload);
    } catch (err) {
      const detail =
        err?.response?.data?.detail ||
        (err?.request
          ? "API offline. Inicie o backend FastAPI em http://localhost:8000."
          : "Falha ao buscar dados da API.");
      setError(String(detail));
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsLoading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      await api.post("/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      await fetchDashboard();
    } catch (err) {
      const detail =
        err?.response?.data?.detail ||
        (err?.request
          ? "Nao foi possivel conectar na API. Inicie o backend FastAPI em http://localhost:8000."
          : "Falha no upload do arquivo de expedição.");
      setError(String(detail));
    } finally {
      setIsLoading(false);
      event.target.value = "";
    }
  };

  const handleUploadFaturamento = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsLoading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      await api.post("/faturamento/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setSection("faturamento");
    } catch (err) {
      const detail =
        err?.response?.data?.detail ||
        (err?.request
          ? "Nao foi possivel conectar na API. Inicie o backend FastAPI em http://localhost:8000."
          : "Falha no upload do arquivo de faturamento.");
      setError(String(detail));
    } finally {
      setIsLoading(false);
      event.target.value = "";
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  useEffect(() => {
    if (section !== "clientes") return;
    let cancelled = false;
    (async () => {
      try {
        const params = clienteTipo === "todos" ? {} : { tipo: clienteTipo };
        const { data } = await api.get("/clientes", { params });
        if (!cancelled) setClientesData(data || emptyClientesPayload);
      } catch (err) {
        if (!cancelled) {
          const detail =
            err?.response?.data?.detail ||
            (err?.request
              ? "API offline. Inicie o backend FastAPI em http://localhost:8000."
              : "Falha ao buscar ranking de clientes.");
          setError(String(detail));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [section, clienteTipo]);

  useEffect(() => {
    if (section === "clientes") return;
    setSelectedClienteRazao("");
    setClienteDetalhe(null);
    setClienteDetalheError("");
    setClienteDetalheLoading(false);
    setClienteSelectedMonth("");
  }, [section]);

  useEffect(() => {
    setSelectedClienteRazao("");
    setClienteDetalhe(null);
    setClienteDetalheError("");
    setClienteSelectedMonth("");
  }, [clienteTipo]);

  useEffect(() => {
    if (section !== "clientes") return;
    if (!selectedClienteRazao) {
      setClienteDetalhe(null);
      setClienteDetalheError("");
      setClienteDetalheLoading(false);
      return;
    }
    let cancelled = false;
    setClienteDetalheLoading(true);
    setClienteDetalheError("");
    (async () => {
      try {
        const params = { razao_social: selectedClienteRazao };
        if (clienteTipo !== "todos") params.tipo = clienteTipo;
        const { data } = await api.get("/clientes/detalhe", { params });
        if (!cancelled) {
          setClienteDetalhe(data);
          setClienteDetalheError("");
        }
      } catch (err) {
        if (!cancelled) {
          setClienteDetalhe(null);
          const st = err?.response?.status;
          const detail = err?.response?.data?.detail;
          if (st === 404) {
            setSelectedClienteRazao("");
            setClienteDetalheError(
              typeof detail === "string" ? detail : "Cliente não encontrado neste escopo.",
            );
          } else {
            setClienteDetalheError(
              typeof detail === "string"
                ? detail
                : err?.request
                  ? "API offline."
                  : "Falha ao carregar detalhe do cliente.",
            );
          }
        }
      } finally {
        if (!cancelled) setClienteDetalheLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [section, selectedClienteRazao, clienteTipo]);

  const selected = section === "expedicao" ? dataMap[operation] || emptyPayload : emptyPayload;
  const monthOptions = useMemo(() => {
    const months = [...new Set((selected.diario || []).map((row) => row.MES_ANO).filter(Boolean))];
    return months.sort();
  }, [selected]);

  useEffect(() => {
    if (!monthOptions.length) {
      setSelectedMonth("");
      return;
    }
    if (!selectedMonth || !monthOptions.includes(selectedMonth)) {
      setSelectedMonth(monthOptions[monthOptions.length - 1]);
    }
  }, [monthOptions, selectedMonth]);
  const yearlyOptions = useMemo(() => {
    const years = [...new Set((selected.mensal || []).map((row) => Number(row.ANO)).filter(Boolean))];
    return years.sort((a, b) => b - a);
  }, [selected]);

  useEffect(() => {
    if (!yearlyOptions.length) {
      setSelectedYear("");
      return;
    }
    if (!selectedYear || !yearlyOptions.includes(Number(selectedYear))) {
      setSelectedYear(String(yearlyOptions[0]));
    }
  }, [yearlyOptions, selectedYear]);

  const annualByMonthData = useMemo(() => {
    const source = selected.mensal || [];
    const yearNum = Number(selectedYear);
    if (!yearNum) return [];

    const byMonth = source
      .filter((row) => Number(row.ANO) === yearNum)
      .reduce((acc, row) => {
        const month = Number(row.MES);
        if (!month) return acc;
        if (!acc[month]) {
          acc[month] = {
            MES: month,
            MES_LABEL: MONTH_LABELS[month] || String(month),
            VALOR_TOTAL: 0,
            QTD_ITENS: 0,
            QTD_NF: 0,
          };
        }
        acc[month].VALOR_TOTAL += Number(row.VALOR_TOTAL || 0);
        acc[month].QTD_ITENS += Number(row.QTD_ITENS || 0);
        acc[month].QTD_NF += Number(row.QTD_NF || 0);
        return acc;
      }, {});

    return Object.values(byMonth).sort((a, b) => a.MES - b.MES);
  }, [selected, selectedYear]);

  const monthlyByMonthData = useMemo(() => {
    const source = selected.mensal || [];
    const byMonth = source.reduce((acc, row) => {
      const key = row.MES_ANO;
      if (!key) return acc;
      if (!acc[key]) {
        acc[key] = {
          MES_ANO: key,
          ANO: Number(row.ANO || 0),
          MES: Number(row.MES || 0),
          VALOR_TOTAL: 0,
          QTD_ITENS: 0,
          QTD_NF: 0,
        };
      }
      acc[key].VALOR_TOTAL += Number(row.VALOR_TOTAL || 0);
      acc[key].QTD_ITENS += Number(row.QTD_ITENS || 0);
      acc[key].QTD_NF += Number(row.QTD_NF || 0);
      return acc;
    }, {});
    return Object.values(byMonth).sort((a, b) => a.MES_ANO.localeCompare(b.MES_ANO));
  }, [selected]);

  const chartData = mode === "mensal" ? monthlyByMonthData : annualByMonthData;
  const xKey = mode === "mensal" ? "MES_ANO" : "MES_LABEL";
  const meta = section === "expedicao" ? OPERATION_META[operation] : SECTION_META[section];
  const dailyData = useMemo(() => {
    if (mode !== "mensal" || !selectedMonth) return [];
    return (selected.diario || []).filter((row) => row.MES_ANO === selectedMonth);
  }, [mode, selected, selectedMonth]);

  const monthlyFilteredData = useMemo(() => {
    if (mode !== "mensal" || !selectedMonth) return chartData;
    return chartData.filter((row) => row.MES_ANO === selectedMonth);
  }, [mode, chartData, selectedMonth]);

  const totals = useMemo(
    () =>
      (mode === "mensal" ? monthlyFilteredData : chartData).reduce(
        (acc, row) => {
          acc.valor += Number(row.VALOR_TOTAL || 0);
          acc.nf += Number(row.QTD_NF || 0);
          acc.itens += Number(row.QTD_ITENS || 0);
          return acc;
        },
        { valor: 0, nf: 0, itens: 0 }
      ),
    [chartData, monthlyFilteredData, mode]
  );

  const ticketMedio = totals.nf > 0 ? totals.valor / totals.nf : 0;

  const crescimento = useMemo(() => {
    if (mode !== "mensal" || !selectedMonth) return null;
    const idx = monthlyByMonthData.findIndex((item) => item.MES_ANO === selectedMonth);
    if (idx <= 0) return null;
    const atual = Number(monthlyByMonthData[idx].VALOR_TOTAL || 0);
    const anterior = Number(monthlyByMonthData[idx - 1].VALOR_TOTAL || 0);
    if (!anterior) return null;
    return ((atual - anterior) / anterior) * 100;
  }, [mode, selectedMonth, monthlyByMonthData]);

  const clienteMonthOptions = useMemo(() => {
    const months = [...new Set((clienteDetalhe?.diario || []).map((row) => row.MES_ANO).filter(Boolean))];
    return months.sort();
  }, [clienteDetalhe]);

  useEffect(() => {
    if (!clienteMonthOptions.length) {
      setClienteSelectedMonth("");
      return;
    }
    setClienteSelectedMonth((prev) =>
      prev && clienteMonthOptions.includes(prev) ? prev : clienteMonthOptions[clienteMonthOptions.length - 1],
    );
  }, [clienteMonthOptions]);

  const clienteMonthlyByMonthData = useMemo(() => {
    const source = clienteDetalhe?.mensal || [];
    const byMonth = source.reduce((acc, row) => {
      const key = row.MES_ANO;
      if (!key) return acc;
      if (!acc[key]) {
        acc[key] = {
          MES_ANO: key,
          ANO: Number(row.ANO || 0),
          MES: Number(row.MES || 0),
          VALOR_TOTAL: 0,
          QTD_ITENS: 0,
          QTD_NF: 0,
        };
      }
      acc[key].VALOR_TOTAL += Number(row.VALOR_TOTAL || 0);
      acc[key].QTD_ITENS += Number(row.QTD_ITENS || 0);
      acc[key].QTD_NF += Number(row.QTD_NF || 0);
      return acc;
    }, {});
    return Object.values(byMonth).sort((a, b) => a.MES_ANO.localeCompare(b.MES_ANO));
  }, [clienteDetalhe]);

  const clientePieData = useMemo(
    () =>
      clienteMonthlyByMonthData
        .map((row) => ({
          name: row.MES_ANO,
          value: Number(row.VALOR_TOTAL || 0),
        }))
        .filter((d) => d.value > 0),
    [clienteMonthlyByMonthData],
  );

  const clienteDailyData = useMemo(() => {
    if (!clienteSelectedMonth || !clienteDetalhe?.diario) return [];
    return clienteDetalhe.diario.filter((row) => row.MES_ANO === clienteSelectedMonth);
  }, [clienteDetalhe, clienteSelectedMonth]);

  const handleBuildExportSnapshot = async (exportConfig) => {
    setExportLoading(true);
    try {
      let faturamentoData = null;
      if (exportConfig.includeFaturamento) {
        try {
          const { data } = await api.get("/faturamento");
          faturamentoData = data;
        } catch {
          faturamentoData = null;
        }
      }
      return buildExportSnapshot({
        config: exportConfig,
        dataMap,
        expedicaoContext: { mode, selectedMonth, selectedYear },
        faturamentoData,
        clientesData,
        clienteTipo,
      });
    } finally {
      setExportLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-brand-50">
      <Sidebar section={section} onSectionChange={setSection} />

      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-3">
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden border border-brand-200 bg-white">
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-brand-200 px-4 py-3">
            <div>
              <h2
                className="border-l-[3px] pl-2.5 text-lg font-semibold text-slate-900"
                style={{ borderColor: meta.color }}
              >
                {meta.title}
              </h2>
              <p className="mt-0.5 pl-[calc(0.625rem+3px)] text-xs text-slate-500">
                {section === "expedicao"
                  ? `${OPERATION_META[operation].title} · ${mode === "mensal" ? selectedMonth || "—" : selectedYear || "—"}`
                  : "ControleExped · Arklok"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {isLoading && <span className="text-xs text-slate-500">Atualizando…</span>}
              <button
                type="button"
                onClick={() => setExportOpen(true)}
                className="rounded border border-brand-200 bg-white px-3 py-1.5 text-xs font-medium text-brand-900 hover:bg-brand-50"
                title="Gerar apresentação HTML com resumo dos dados"
              >
                Exportar relatório
              </button>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-4">

          <ExportSlidesModal
            open={exportOpen}
            onClose={() => setExportOpen(false)}
            onBuildSnapshot={handleBuildExportSnapshot}
            isExporting={exportLoading}
          />

          {error && (
            <div className="mb-2 shrink-0 rounded-lg border border-red-300 bg-red-50 px-2 py-1.5 text-xs text-red-700">
              {error}
            </div>
          )}

          {section === "expedicao" && (
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
                <p className="mb-1 text-xs text-brand-800">Operação</p>
                <div className="inline-flex flex-wrap overflow-hidden rounded border border-brand-200 bg-white text-xs">
                  {[
                    { value: "implantacao", label: "Implantação" },
                    { value: "sustentacao", label: "Sustentação" },
                    { value: "impressoras", label: "Impressoras" },
                  ].map((opt, idx) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setOperation(opt.value)}
                      className={`px-3 py-1.5 font-medium ${
                        idx > 0 ? "border-l border-brand-200" : ""
                      } ${operation === opt.value ? "text-white" : "text-brand-900 hover:bg-brand-50"}`}
                      style={
                        operation === opt.value
                          ? { backgroundColor: OPERATION_COLORS[opt.value] }
                          : undefined
                      }
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
                    onChange={(event) => setSelectedMonth(event.target.value)}
                    className="w-full rounded border border-brand-200 bg-white px-2 py-1.5 text-xs text-brand-950"
                  >
                    {monthOptions.map((month) => (
                      <option key={month} value={month}>
                        {month}
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    value={selectedYear}
                    onChange={(event) => setSelectedYear(event.target.value)}
                    className="w-full rounded border border-brand-200 bg-white px-2 py-1.5 text-xs text-brand-950"
                  >
                    {yearlyOptions.map((year) => (
                      <option key={year} value={String(year)}>
                        {year}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          )}

          {section === "clientes" && (
            <div className="mb-3 flex shrink-0 flex-wrap items-end gap-x-5 border-b border-brand-200 pb-3">
              <div className="min-w-[180px]">
                <p className="mb-1 text-xs text-brand-800">Escopo</p>
                <select
                  value={clienteTipo}
                  onChange={(event) => setClienteTipo(event.target.value)}
                  className="w-full rounded border border-brand-200 bg-white px-2 py-1.5 text-xs text-brand-950"
                >
                  <option value="todos">Todos</option>
                  <option value="implantacao">Implantação</option>
                  <option value="sustentacao">Sustentação</option>
                  <option value="impressoras">Impressoras</option>
                </select>
              </div>
            </div>
          )}

          {section === "dados" ? (
            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
              <div className="shrink-0 border-b border-brand-200 pb-3">
                <h3 className="text-base font-semibold text-slate-900">Carga de planilhas</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Selecione os arquivos de expedição e faturamento para atualizar o painel.
                </p>
              </div>

              <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-y-auto lg:grid-cols-2">
                <label className="flex cursor-pointer flex-col gap-3 rounded border border-brand-200 bg-brand-50/60 p-4 hover:border-brand-300">
                  <div>
                    <p className="text-sm font-medium text-slate-900">Expedição</p>
                    <p className="mt-1 text-xs text-slate-600">Planilha com movimentação diária (.xlsx ou .csv)</p>
                  </div>
                  <span className="inline-flex w-fit rounded border border-brand-200 bg-white px-3 py-1.5 text-xs font-medium text-brand-900">
                    Selecionar arquivo
                  </span>
                  <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleUpload} />
                </label>

                <label className="flex cursor-pointer flex-col gap-3 rounded border border-brand-200 bg-brand-50/60 p-4 hover:border-brand-300">
                  <div>
                    <p className="text-sm font-medium text-slate-900">Faturamento</p>
                    <p className="mt-1 text-xs text-slate-600">Planilha com NF e status por LOCAL (.xlsx ou .csv)</p>
                  </div>
                  <span className="inline-flex w-fit rounded border border-brand-200 bg-white px-3 py-1.5 text-xs font-medium text-brand-900">
                    Selecionar arquivo
                  </span>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={handleUploadFaturamento}
                  />
                </label>
              </div>
            </div>
          ) : section === "faturamento" ? (
            <Faturamento api={api} />
          ) : section === "clientes" ? (
            <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
              <div className="shrink-0 grid grid-cols-12 gap-2">
                <div className="col-span-12 lg:col-span-4">
                  <KpiCard
                    title="Faturamento no escopo"
                    value={clientesData.totais_escopo?.VALOR_TOTAL ?? 0}
                    type="currency"
                    primary
                    accentColor={meta.color}
                    compact
                  />
                </div>
                <div className="col-span-6 sm:col-span-4 lg:col-span-2">
                  <KpiCard
                    title="Notas fiscais (escopo)"
                    value={clientesData.totais_escopo?.QTD_NF ?? 0}
                    accentColor={meta.color}
                    compact
                  />
                </div>
                <div className="col-span-6 sm:col-span-4 lg:col-span-2">
                  <KpiCard
                    title="Itens expedidos (escopo)"
                    value={clientesData.totais_escopo?.QTD_ITENS ?? 0}
                    accentColor={meta.color}
                    compact
                  />
                </div>
                <div className="col-span-12 sm:col-span-12 lg:col-span-4">
                  <div className="h-full border border-brand-200 bg-brand-50/40 px-3 py-2.5">
                    <p className="mb-1 text-xs text-slate-600">Maior participação</p>
                    {clientesData.ranking?.length > 0 && clientesData.top_cliente_share_pct != null ? (
                      <p className="text-sm leading-snug text-slate-800">
                        <span className="font-medium">{clientesData.ranking[0][RS_KEY]}</span> concentra{" "}
                        <span className="font-semibold text-slate-900">{clientesData.top_cliente_share_pct}%</span> do
                        faturamento.
                      </p>
                    ) : (
                      <p className="text-sm text-slate-500">Sem dados para o escopo.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
                {!selectedClienteRazao ? (
                  <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 overflow-hidden lg:grid-cols-2">
                    <div className="flex min-h-0 min-w-0 flex-col overflow-hidden border border-brand-200 bg-white p-3">
                      <p className="mb-2 shrink-0 text-sm font-medium text-slate-700">Ranking por faturamento</p>
                      <div className="min-h-0 min-w-0 flex-1">
                        <ClientesChart
                          ranking={clientesData.ranking}
                          color={meta.color}
                          selectedRazao=""
                          onSelectCliente={setSelectedClienteRazao}
                        />
                      </div>
                    </div>
                    <div className="flex min-h-0 min-w-0 flex-col overflow-hidden border border-brand-200 bg-white p-3">
                      <p className="mb-2 shrink-0 text-sm font-medium text-slate-700">Top 10 · clique para detalhes</p>
                      <ul className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1 text-xs">
                        {(clientesData.ranking || []).map((row, idx) => {
                          const brl = Number(row.VALOR_TOTAL || 0).toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                            minimumFractionDigits: 2,
                          });
                          return (
                            <li key={`${row[RS_KEY]}-${idx}`}>
                              <button
                                type="button"
                                onClick={() => setSelectedClienteRazao(row[RS_KEY])}
                                className={`flex w-full items-start justify-between gap-2 border px-2 py-1.5 text-left transition-colors ${
                                  idx === 0
                                    ? "border-brand-300 bg-brand-50 hover:bg-brand-100"
                                    : "border-brand-100 bg-white hover:bg-brand-50"
                                }`}
                              >
                                <span className="min-w-0 flex-1 font-medium text-slate-800">
                                  <RankBadge index={idx} />
                                  <span className="break-words">{row[RS_KEY]}</span>
                                </span>
                                <span className="shrink-0 font-semibold tabular-nums text-slate-900">{brl}</span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </div>
                ) : null}

                {selectedClienteRazao ? (
                  <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden border border-brand-200 bg-brand-50/50 p-3">
                    <div className="shrink-0 flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs text-slate-500">Cliente selecionado</p>
                        <h3 className="break-words text-base font-semibold text-slate-900">{selectedClienteRazao}</h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedClienteRazao("")}
                        className="shrink-0 rounded border border-brand-200 bg-white px-2.5 py-1 text-xs font-medium text-brand-900 hover:bg-brand-50"
                      >
                        Limpar seleção
                      </button>
                    </div>
                    {clienteDetalheLoading && (
                      <p className="shrink-0 text-xs text-slate-600">Carregando detalhes…</p>
                    )}
                    {clienteDetalheError && !clienteDetalheLoading && (
                      <p className="shrink-0 text-xs text-red-700">{clienteDetalheError}</p>
                    )}
                    {clienteDetalhe && !clienteDetalheLoading && (
                      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
                        <div className="shrink-0 grid grid-cols-12 gap-2">
                          <div className="col-span-12 sm:col-span-6 lg:col-span-3">
                            <KpiCard
                              title="Faturamento (cliente)"
                              value={clienteDetalhe.totais?.VALOR_TOTAL ?? 0}
                              type="currency"
                              primary
                              accentColor={meta.color}
                              compact
                            />
                          </div>
                          <div className="col-span-6 sm:col-span-3 lg:col-span-3">
                            <KpiCard
                              title="Notas fiscais"
                              value={clienteDetalhe.totais?.QTD_NF ?? 0}
                              accentColor={meta.color}
                              compact
                            />
                          </div>
                          <div className="col-span-6 sm:col-span-3 lg:col-span-3">
                            <KpiCard
                              title="Itens expedidos"
                              value={clienteDetalhe.totais?.QTD_ITENS ?? 0}
                              accentColor={meta.color}
                              compact
                            />
                          </div>
                          <div className="col-span-12 sm:col-span-12 lg:col-span-3">
                            <KpiCard
                              title="Participação no escopo"
                              value={clienteDetalhe.participacao_valor_pct ?? 0}
                              type="percent"
                              accentColor={meta.color}
                              compact
                            />
                          </div>
                        </div>
                        <div className="grid min-h-0 flex-1 gap-2 overflow-hidden lg:grid-cols-2 [grid-template-rows:minmax(0,1fr)]">
                          <div className="flex min-h-[220px] flex-1 flex-col overflow-hidden border border-brand-200 bg-white p-3">
                            <p className="mb-2 shrink-0 text-sm font-medium text-slate-700">Faturamento por mês</p>
                            <div className="relative min-h-[160px] flex-1">
                              <ClienteFatiaChart data={clientePieData} color={meta.color} />
                            </div>
                          </div>
                          <div className="flex min-h-[220px] flex-1 flex-col overflow-hidden border border-brand-200 bg-white p-3">
                            <div className="mb-2 flex shrink-0 flex-wrap items-center justify-between gap-2">
                              <p className="text-sm font-medium text-slate-700">Movimento diário</p>
                              <div className="flex flex-wrap items-center gap-2">
                                <ChartMetricToggle
                                  value={clienteDailyLineMetric}
                                  onChange={setClienteDailyLineMetric}
                                  accentColor={meta.color}
                                />
                                {clienteMonthOptions.length > 0 ? (
                                  <select
                                    value={clienteSelectedMonth}
                                    onChange={(e) => setClienteSelectedMonth(e.target.value)}
                                    className="rounded border border-brand-200 bg-white px-2 py-1 text-xs text-brand-950"
                                  >
                                    {clienteMonthOptions.map((m) => (
                                      <option key={m} value={m}>
                                        {m}
                                      </option>
                                    ))}
                                  </select>
                                ) : null}
                              </div>
                            </div>
                            <div className="relative min-h-[160px] flex-1">
                              {clienteDailyData.length > 0 ? (
                                <DailyLineChart
                                  data={clienteDailyData}
                                  color={meta.color}
                                  metric={clienteDailyLineMetric}
                                  domainFromZero
                                />
                              ) : (
                                <div className="flex h-full min-h-[160px] items-center justify-center rounded border border-dashed border-brand-200 bg-brand-50/50 px-2 text-center text-xs text-brand-800">
                                  Sem movimento diário neste mês.
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
              <div className="mb-2 shrink-0 grid grid-cols-12 gap-2">
                <div className="col-span-12 lg:col-span-4">
                  <KpiCard
                    title={mode === "mensal" ? "Valor Total no Mês" : "Valor Total no Ano"}
                    value={totals.valor}
                    type="currency"
                    primary
                    trend={crescimento}
                    accentColor={meta.color}
                    compact
                  />
                </div>
                <div className="col-span-6 sm:col-span-4 lg:col-span-2">
                  <KpiCard title="NF no período" value={totals.nf} accentColor={meta.color} compact />
                </div>
                <div className="col-span-6 sm:col-span-4 lg:col-span-2">
                  <KpiCard
                    title={mode === "mensal" ? "Itens no mês" : "Itens no ano"}
                    value={totals.itens}
                    accentColor={meta.color}
                    compact
                  />
                </div>

                <div className="col-span-12 sm:col-span-12 lg:col-span-4">
                  <KpiCard
                    title="Crescimento mensal"
                    value={crescimento ?? 0}
                    type="percent"
                    trend={crescimento}
                    accentColor={meta.color}
                    compact
                  />
                </div>
              </div>

              <div
                className={`grid min-h-0 flex-1 gap-2 ${
                  mode === "anual"
                    ? "[grid-template-rows:minmax(0,1fr)]"
                    : "[grid-template-rows:minmax(0,1fr)_minmax(0,1fr)]"
                }`}
              >
                <div className="flex min-h-0 min-w-0 flex-col gap-1 border border-brand-200 bg-white p-3">
                  <p className="mb-2 shrink-0 text-sm font-medium text-slate-700">
                    {mode === "mensal" ? "Valor por mês" : "Valor por mês do ano"}
                  </p>
                  <div className="min-h-0 flex-1">
                    <MetricsChart
                      data={chartData}
                      xKey={xKey}
                      color={meta.color}
                      metric="valor"
                      selectable={mode === "mensal"}
                      selectedKey={selectedMonth}
                      highlightKey={monthOptions[monthOptions.length - 1] || ""}
                      onSelect={mode === "mensal" ? setSelectedMonth : undefined}
                    />
                  </div>
                </div>

                {mode === "mensal" && (
                  <div className="flex min-h-0 min-w-0 flex-col border border-brand-200 bg-white p-3">
                    <div className="mb-2 flex shrink-0 items-center justify-between gap-2">
                      <p className="text-sm font-medium text-slate-700">Evolução diária</p>
                      <ChartMetricToggle
                        value={dailyLineMetric}
                        onChange={setDailyLineMetric}
                        accentColor={meta.color}
                      />
                    </div>
                    <div className="min-h-0 flex-1">
                      <DailyLineChart
                        data={dailyData}
                        color={meta.color}
                        metric={dailyLineMetric}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          </div>

          {isLoading && (
            <div className="pointer-events-none absolute inset-0 bg-white/60">
              <div className="flex h-full items-center justify-center">
                <div
                  className="h-7 w-7 animate-spin rounded-full border-[3px] border-brand-200"
                  style={{ borderTopColor: meta.color }}
                />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
