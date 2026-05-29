import React from "react";

const LOGO_SRC = `${process.env.PUBLIC_URL || ""}/Logo.png`;

function SidebarLogo({ collapsed }) {
  if (collapsed) {
    return (
      <div className="mx-auto flex h-10 w-10 items-center justify-center overflow-hidden" title="Arklok">
        <img
          src={LOGO_SRC}
          alt="Arklok"
          className="h-10 w-auto max-w-none shrink-0 object-cover object-left"
          draggable={false}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <img
        src={LOGO_SRC}
        alt="Arklok — Infinita para você"
        className="h-auto w-full max-h-[48px] object-contain object-left"
        draggable={false}
      />
      <div className="border-t border-brand-200 pt-2">
        <p className="text-xs font-semibold text-brand-900">ControleExped</p>
        <p className="mt-0.5 text-[11px] text-brand-700/80">Painel operacional</p>
      </div>
    </div>
  );
}

function Sidebar({ section, onSectionChange }) {
  const [collapsed, setCollapsed] = React.useState(false);
  const modules = [
    { value: "dados", label: "Dados", hint: "Planilhas de base" },
    { value: "expedicao", label: "Expedição", hint: "Volume e NF" },
    { value: "faturamento", label: "Faturamento", hint: "NF por local" },
    { value: "clientes", label: "Clientes", hint: "Principais clientes" },
  ];

  return (
    <aside
      className={`flex h-full shrink-0 flex-col border-r border-brand-200 bg-white transition-[width] duration-200 ${
        collapsed ? "w-[4.5rem]" : "w-60"
      }`}
    >
      <div className="flex shrink-0 items-start justify-between gap-2 border-b border-brand-200 px-3 py-3">
        <div className="min-w-0 flex-1">{!collapsed ? <SidebarLogo collapsed={false} /> : <SidebarLogo collapsed />}</div>
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="mt-0.5 shrink-0 rounded border border-brand-200 bg-brand-50 p-1 text-brand-800 hover:bg-brand-100"
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
          title={collapsed ? "Expandir menu" : "Recolher menu"}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 20 20"
            className={`transition-transform ${collapsed ? "rotate-180" : ""}`}
            aria-hidden="true"
          >
            <path d="M7 4l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto p-2">
        {!collapsed && <p className="mb-1 px-2 text-[11px] font-medium text-slate-500">Módulos</p>}
        <ul className="space-y-0.5">
          {modules.map((item) => {
            const active = section === item.value;
            return (
              <li key={item.value}>
                <button
                  type="button"
                  onClick={() => onSectionChange(item.value)}
                  className={`flex w-full items-center gap-2 border-l-[3px] px-2 py-2 text-left transition-colors ${
                    active
                      ? "border-brand-600 bg-brand-50 text-brand-950"
                      : "border-transparent text-brand-900/80 hover:bg-brand-50 hover:text-brand-950"
                  } ${collapsed ? "justify-center px-1" : ""}`}
                  title={item.label}
                >
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded text-[11px] font-bold ${
                      active ? "bg-brand-600 text-white" : "bg-brand-100 text-brand-800"
                    }`}
                  >
                    {item.label.slice(0, 1)}
                  </span>
                  {!collapsed && (
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{item.label}</span>
                      <span className="block truncate text-[11px] text-slate-500">{item.hint}</span>
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        {!collapsed && section === "faturamento" && (
          <p className="mt-3 border-t border-brand-200 px-2 pt-3 text-[11px] leading-relaxed text-brand-800">
            Compara NF geradas e aguardando faturamento por LOCAL.
          </p>
        )}
      </nav>
    </aside>
  );
}

export default Sidebar;
