import React from "react";

function ModuleIcon({ module, active }) {
  const stroke = active ? "#ffffff" : "#475569";
  const fill = active ? "rgba(255,255,255,0.18)" : "#f8fafc";

  if (module === "dados") {
    return (
      <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <ellipse cx="10" cy="5" rx="6" ry="2.5" fill={fill} stroke={stroke} strokeWidth="1.2" />
        <path d="M4 5v6c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5V5" stroke={stroke} strokeWidth="1.2" />
      </svg>
    );
  }
  if (module === "faturamento") {
    return (
      <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M4 14.5h12M5.5 12V8.5m4 3.5V6m4 6V9.5" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" />
        <rect x="3.5" y="3.5" width="13" height="13" rx="2.5" fill={fill} stroke={stroke} strokeWidth="1.2" />
      </svg>
    );
  }
  if (module === "clientes") {
    return (
      <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <circle cx="7" cy="7" r="2.5" fill={fill} stroke={stroke} strokeWidth="1.2" />
        <circle cx="13.2" cy="7.6" r="2" fill={fill} stroke={stroke} strokeWidth="1.2" />
        <path d="M3.8 14.7c.6-2 2.1-3 4.4-3s3.8 1 4.4 3" stroke={stroke} strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="3.5" y="3.5" width="13" height="13" rx="2.5" fill={fill} stroke={stroke} strokeWidth="1.2" />
      <path d="M6 6h8M6 10h8M6 14h5" stroke={stroke} strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function Sidebar({
  section,
  onSectionChange,
}) {
  const [collapsed, setCollapsed] = React.useState(false);
  const modules = [
    { value: "dados", label: "Dados", hint: "Uploads e fontes" },
    { value: "expedicao", label: "Expedição", hint: "Indicadores operacionais" },
    { value: "faturamento", label: "Faturamento", hint: "Receita e margem" },
    { value: "clientes", label: "Clientes", hint: "Top ofensivos" },
  ];

  return (
    <aside
      className={`relative z-[110] flex h-full shrink-0 flex-col overflow-visible border-r border-slate-200 bg-white shadow-sm transition-all duration-300 ${
        collapsed ? "w-20" : "w-64"
      }`}
    >
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        className="absolute -right-3 top-1/2 z-[120] flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-red-500 bg-red-600 text-white shadow-md hover:bg-red-500"
        aria-label={collapsed ? "Expandir sidebar" : "Recolher sidebar"}
        title={collapsed ? "Expandir sidebar" : "Recolher sidebar"}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 20 20"
          className={`transition-transform ${collapsed ? "rotate-180" : ""}`}
          aria-hidden="true"
        >
          <path d="M7 4l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>

      <div className="border-b border-slate-100 bg-gradient-to-r from-red-50 to-white p-4">
        {collapsed ? (
          <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-red-100 text-red-600">
            <svg width="16" height="16" viewBox="0 0 20 20" aria-hidden="true">
              <path d="M4 16h12M6 13V8m4 5V5m4 8v-3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </div>
        ) : (
          <>
            <h1 className="text-base font-bold leading-snug tracking-tight text-red-600">Dashboard Expedição</h1>
            <p className="mt-1 text-[11px] text-slate-500">Navegue pelos módulos de análise</p>
          </>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <div className="flex flex-col gap-3">
        <div>
          {!collapsed && <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Módulos</p>}
          <div className="space-y-1.5">
            {modules.map((item) => {
              const active = section === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => onSectionChange(item.value)}
                  className={`group w-full rounded-xl border px-2.5 py-2 text-left transition-all duration-200 ${
                    active
                      ? "border-red-500 bg-red-600 text-white shadow-sm"
                      : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white"
                  }`}
                  title={item.label}
                >
                  <div className={`flex items-center ${collapsed ? "justify-center" : "gap-2"}`}>
                    <span
                      className={`inline-flex h-6 w-6 items-center justify-center rounded-lg border ${
                        active ? "border-white/30 bg-white/10" : "border-slate-200 bg-white"
                      }`}
                    >
                      <ModuleIcon module={item.value} active={active} />
                    </span>
                    {!collapsed && (
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold">{item.label}</p>
                        <p className={`truncate text-[10px] ${active ? "text-white/80" : "text-slate-500"}`}>{item.hint}</p>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {!collapsed && section === "faturamento" && (
          <div className="rounded-xl border border-dashed border-violet-300 bg-violet-50 p-2.5 text-[11px] text-violet-800">
            Módulo de faturamento em preparação.
          </div>
        )}
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
