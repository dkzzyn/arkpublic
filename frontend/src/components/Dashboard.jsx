import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Sidebar from "./Sidebar";
import KpiCard from "./KpiCard";
import MetricsChart from "./MetricsChart";
import DailyLineChart from "./DailyLineChart";
import ClientesChart from "./ClientesChart";
import ClienteFatiaChart from "./ClienteFatiaChart";
import Faturamento from "./Faturamento";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:8000",
});

const OPERATION_META = {
  implantacao: { title: "Implantação", color: "#dc2626" },
  sustentacao: { title: "Sustentação", color: "#1f2937" },
  impressoras: { title: "Impressoras", color: "#4338ca" },
};
const SECTION_META = {
  dados: { title: "Dados", color: "#0f172a" },
  expedicao: { title: "Expedição", color: "#dc2626" },
  faturamento: { title: "Faturamento", color: "#7c3aed" },
  clientes: { title: "Top clientes", color: "#0d9488" },
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
  const tone =
    index === 0 ? { fill: "#f59e0b", stroke: "#b45309" } : index === 1 ? { fill: "#cbd5e1", stroke: "#64748b" } : { fill: "#d97706", stroke: "#92400e" };
  const label = String(index + 1);
  return (
    <span className="mr-1.5 inline-flex h-4 w-4 items-center justify-center">
      <svg width="16" height="16" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <circle cx="10" cy="10" r="8" fill={tone.fill} stroke={tone.stroke} strokeWidth="1.4" />
        <text x="10" y="13" textAnchor="middle" fontSize="9" fontWeight="700" fill="#0f172a">
          {label}
        </text>
      </svg>
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

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-100">
      <Sidebar section={section} onSectionChange={setSection} />

      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-3">
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-2 flex shrink-0 items-center justify-between">
            <h2 className="text-xl font-semibold" style={{ color: meta.color }}>
              {meta.title}
            </h2>
            {isLoading && <span className="text-xs text-slate-500">Atualizando...</span>}
          </div>

          {error && (
            <div className="mb-2 shrink-0 rounded-lg border border-red-300 bg-red-50 px-2 py-1.5 text-xs text-red-700">
              {error}
            </div>
          )}

          {section === "expedicao" && (
            <div className="mb-2 shrink-0 grid grid-cols-1 gap-2 lg:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-2">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Relatório</p>
                <div className="inline-flex rounded-lg border border-slate-300 bg-white p-1 shadow-sm">
                  <button
                    type="button"
                    onClick={() => setMode("mensal")}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium ${mode === "mensal" ? "bg-red-600 text-white" : "text-slate-700 hover:bg-slate-50"}`}
                  >
                    Mensal
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("anual")}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium ${mode === "anual" ? "bg-red-600 text-white" : "text-slate-700 hover:bg-slate-50"}`}
                  >
                    Anual
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-2">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Operação</p>
                <div className="inline-flex rounded-lg border border-slate-300 bg-white p-1 shadow-sm">
                  {[
                    { value: "implantacao", label: "Implantação" },
                    { value: "sustentacao", label: "Sustentação" },
                    { value: "impressoras", label: "Impressoras" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setOperation(opt.value)}
                      className={`rounded-md px-2 py-1 text-xs font-medium ${
                        operation === opt.value ? "bg-red-600 text-white" : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-2">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  {mode === "mensal" ? "Mês" : "Ano"}
                </p>
                {mode === "mensal" ? (
                  <select
                    value={selectedMonth}
                    onChange={(event) => setSelectedMonth(event.target.value)}
                    className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800"
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
                    className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800"
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
            <div className="mb-2 shrink-0 grid grid-cols-1 gap-2 lg:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-2">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Escopo</p>
                <select
                  value={clienteTipo}
                  onChange={(event) => setClienteTipo(event.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800"
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
            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
              <div className="relative shrink-0 rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-50 via-white to-slate-100 px-4 py-3 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">Upload de Arquivos</h3>
                <p className="mt-0.5 text-xs text-slate-600">Envie e organize arquivos de base para o dashboard.</p>
                <div className="absolute right-3 top-3 hidden rounded-xl border border-slate-200 bg-white p-2 shadow-sm sm:block">
                  <svg width="44" height="44" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <ellipse cx="32" cy="14" rx="18" ry="8" fill="#cbd5e1" />
                    <rect x="14" y="14" width="36" height="28" fill="#93c5fd" />
                    <ellipse cx="32" cy="42" rx="18" ry="8" fill="#60a5fa" />
                    <line x1="14" y1="28" x2="50" y2="28" stroke="#334155" strokeWidth="2" />
                    <line x1="14" y1="36" x2="50" y2="36" stroke="#334155" strokeWidth="2" />
                  </svg>
                </div>
              </div>

              <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-y-auto lg:grid-cols-2">
                <label className="flex min-h-[220px] cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white p-3 text-center shadow-sm hover:bg-slate-50">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Upload Expedição</p>
                  <svg width="38" height="38" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M7 18h10a4 4 0 0 0 .3-8A5 5 0 0 0 7.6 8.6 3.5 3.5 0 0 0 7 18Z" stroke="#475569" strokeWidth="1.8" />
                    <path d="M12 15V9m0 0-2 2m2-2 2 2" stroke="#2563eb" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                  <p className="text-sm font-medium text-slate-800">Arraste seus arquivos aqui ou clique para selecionar</p>
                  <p className="text-xs text-slate-500">Upload da base de expedição (.xlsx ou .csv)</p>
                  <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleUpload} />
                </label>

                <label className="flex min-h-[220px] cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white p-3 text-center shadow-sm hover:bg-slate-50">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Upload Faturamento</p>
                  <svg width="38" height="38" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M7 18h10a4 4 0 0 0 .3-8A5 5 0 0 0 7.6 8.6 3.5 3.5 0 0 0 7 18Z" stroke="#475569" strokeWidth="1.8" />
                    <path d="M12 15V9m0 0-2 2m2-2 2 2" stroke="#2563eb" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                  <p className="text-sm font-medium text-slate-800">Arraste seus arquivos aqui ou clique para selecionar</p>
                  <p className="text-xs text-slate-500">Upload da base de faturamento (.xlsx ou .csv)</p>
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
                  <div
                    className="h-full rounded-2xl border border-slate-200 bg-slate-50 shadow-sm"
                    style={{ padding: "7px 9px", borderLeftWidth: "2px", borderLeftColor: meta.color }}
                  >
                    <p className="mb-1 text-[11px] font-semibold text-slate-700">Líder no escopo</p>
                    {clientesData.ranking?.length > 0 && clientesData.top_cliente_share_pct != null ? (
                      <p className="text-xs leading-snug text-slate-800">
                        <span className="font-semibold">{clientesData.ranking[0][RS_KEY]}</span> concentra{" "}
                        <span className="font-semibold text-teal-700">{clientesData.top_cliente_share_pct}%</span> do
                        faturamento.
                      </p>
                    ) : (
                      <p className="text-xs text-slate-500">Sem dados para o escopo.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
                {!selectedClienteRazao ? (
                  <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 overflow-hidden lg:grid-cols-2">
                    <div className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
                      <p className="mb-1 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        Top clientes
                      </p>
                      <div className="min-h-0 min-w-0 flex-1">
                        <ClientesChart
                          ranking={clientesData.ranking}
                          color={meta.color}
                          selectedRazao=""
                          onSelectCliente={setSelectedClienteRazao}
                        />
                      </div>
                    </div>
                    <div className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
                      <p className="mb-2 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        Ranking (top 10) · clique para detalhes
                      </p>
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
                                className={`flex w-full items-start justify-between gap-2 rounded-lg border px-2 py-1.5 text-left transition-colors ${
                                  idx === 0
                                    ? "border-teal-200 bg-teal-50/60 hover:bg-teal-50"
                                    : "border-slate-100 bg-slate-50/80 hover:bg-white"
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
                  <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden rounded-xl border border-teal-200 bg-teal-50/40 p-2 shadow-sm sm:p-3">
                    <div className="shrink-0 flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Cliente selecionado</p>
                        <h3 className="break-words text-sm font-semibold text-slate-900">{selectedClienteRazao}</h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedClienteRazao("")}
                        className="shrink-0 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
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
                      <div className="flex min-h-0 flex-1 flex-col gap-2">
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
                        <div className="grid min-h-0 flex-1 basis-0 grid-cols-1 gap-2 overflow-hidden lg:grid-cols-2">
                          <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white p-2 shadow-sm ring-1 ring-slate-100 sm:p-3">
                            <p className="mb-1 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                              Faturamento por mês (proporção)
                            </p>
                            <div className="min-h-0 flex-1">
                              <ClienteFatiaChart data={clientePieData} color={meta.color} />
                            </div>
                          </div>
                          <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white p-2 shadow-sm ring-1 ring-slate-100 sm:p-3">
                            <div className="mb-1 flex shrink-0 flex-wrap items-center justify-between gap-2">
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                Diário no mês
                              </p>
                              {clienteMonthOptions.length > 0 ? (
                                <select
                                  value={clienteSelectedMonth}
                                  onChange={(e) => setClienteSelectedMonth(e.target.value)}
                                  className="rounded-lg border border-slate-200 bg-slate-50/80 px-2.5 py-1.5 text-[11px] font-medium text-slate-800 shadow-sm outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-300"
                                >
                                  {clienteMonthOptions.map((m) => (
                                    <option key={m} value={m}>
                                      {m}
                                    </option>
                                  ))}
                                </select>
                              ) : null}
                            </div>
                            <div className="min-h-0 min-w-0 flex-1">
                              {clienteDailyData.length > 0 ? (
                                <DailyLineChart data={clienteDailyData} color={meta.color} domainFromZero />
                              ) : (
                                <div className="flex h-full min-h-0 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/50 px-2 text-center text-xs text-slate-500">
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
                <div className="col-span-6 sm:col-span-3 lg:col-span-2">
                  <KpiCard title="NF no período" value={totals.nf} accentColor={meta.color} compact />
                </div>

                <div className="col-span-6 sm:col-span-6 lg:col-span-4">
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
                <div className="flex min-h-0 min-w-0 flex-col gap-1 rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
                  <p className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Valor (R$) por mês
                  </p>
                  <div className="min-h-0 flex-1">
                    <MetricsChart
                      data={chartData}
                      xKey={xKey}
                      color={meta.color}
                      showItemsSeries={false}
                      selectable={mode === "mensal"}
                      selectedKey={selectedMonth}
                      highlightKey={monthOptions[monthOptions.length - 1] || ""}
                      onSelect={mode === "mensal" ? setSelectedMonth : undefined}
                    />
                  </div>
                </div>

                {mode === "mensal" && (
                  <div className="flex min-h-0 min-w-0 flex-col rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
                    <div className="min-h-0 flex-1">
                      <DailyLineChart data={dailyData} color={meta.color} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {isLoading && (
            <div className="pointer-events-none absolute inset-0 rounded-2xl bg-white/45 backdrop-blur-[1px]">
              <div className="flex h-full items-center justify-center">
                <div
                  className="h-8 w-8 animate-spin rounded-full border-4 border-slate-300"
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
