import React, { useState } from "react";

const DEFAULT_CONFIG = {
  title: "Relatório ControleExped",
  subtitle: "Resumo executivo dos indicadores operacionais",
  company: "",
  author: "",
  footer: "Documento confidencial — uso interno.",
  introNote: "",
  closingNote: "",
  includeExpedicao: true,
  includeFaturamento: true,
  includeClientes: true,
};

function ExportSlidesModal({ open, onClose, onBuildSnapshot, isExporting }) {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [status, setStatus] = useState("");

  if (!open) return null;

  const update = (key, value) => setConfig((prev) => ({ ...prev, [key]: value }));

  const runExport = async (action) => {
    setStatus("");
    try {
      const snapshot = await onBuildSnapshot(config);
      const {
        buildDeckHtml,
        downloadHtmlFile,
        openHtmlPreview,
        loadHeroLogoDataUrl,
        loadBrandLogoDataUrl,
      } = await import("../utils/exportSlides");
      const logoSrc = (await loadHeroLogoDataUrl()) || "LogoMetade.png";
      const brandLogoSrc = (await loadBrandLogoDataUrl()) || "Logo.png";
      const html = buildDeckHtml(snapshot, { logoSrc, brandLogoSrc });
      const filename = `relatorio-controleexped-${new Date().toISOString().slice(0, 10)}.html`;

      if (action === "preview") {
        openHtmlPreview(html);
        setStatus("Apresentação aberta numa nova aba.");
      } else {
        downloadHtmlFile(filename, html);
        setStatus(`Arquivo ${filename} transferido. Pode encaminhar por e-mail ou WhatsApp.`);
      }
    } catch (err) {
      setStatus(err?.message || "Falha ao gerar os slides.");
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 p-3 sm:p-6">
      <div
        className="flex h-[min(92vh,720px)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
        role="dialog"
        aria-labelledby="export-slides-title"
      >
        <div className="shrink-0 border-b border-slate-100 px-4 py-3">
          <h2 id="export-slides-title" className="text-lg font-semibold text-slate-900">
            Exportar apresentação (HTML)
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Gera apresentação HTML em tons de vermelho, com gráficos Chart.js e os seus dados reais.
          </p>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3 text-sm">
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-3">
            <img
              src={`${process.env.PUBLIC_URL || ""}/Logo.png`}
              alt="Arklok"
              className="h-10 w-auto max-w-full object-contain object-left"
            />
          </div>
          <p className="text-[11px] text-slate-500">Logo Arklok no topo e na capa de cada slide exportado.</p>
          <label className="block">
            <span className="text-xs font-semibold text-slate-600">Subtítulo da capa</span>
            <input
              type="text"
              value={config.subtitle}
              onChange={(e) => update("subtitle", e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="text-xs font-semibold text-slate-600">Empresa</span>
              <input
                type="text"
                value={config.company}
                onChange={(e) => update("company", e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-600">Apresentado por</span>
              <input
                type="text"
                value={config.author}
                onChange={(e) => update("author", e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
          </div>
          <label className="block">
            <span className="text-xs font-semibold text-slate-600">Nota de abertura (opcional)</span>
            <textarea
              value={config.introNote}
              onChange={(e) => update("introNote", e.target.value)}
              rows={2}
              placeholder="Contexto da reunião, objetivo da apresentação..."
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-600">Conclusões (opcional)</span>
            <textarea
              value={config.closingNote}
              onChange={(e) => update("closingNote", e.target.value)}
              rows={2}
              placeholder="Próximos passos, recomendações..."
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-600">Rodapé</span>
            <input
              type="text"
              value={config.footer}
              onChange={(e) => update("footer", e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>

          <fieldset className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Incluir nos slides
            </legend>
            <div className="mt-2 space-y-2">
              {[
                { key: "includeExpedicao", label: "Expedição (3 operações)" },
                { key: "includeFaturamento", label: "Faturamento" },
                { key: "includeClientes", label: "Top clientes" },
              ].map((item) => (
                <label key={item.key} className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={config[item.key]}
                    onChange={(e) => update(item.key, e.target.checked)}
                    className="rounded border-slate-300 text-red-600"
                  />
                  <span className="text-sm text-slate-700">{item.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {status && (
            <p
              className={`rounded-lg px-3 py-2 text-xs ${
                status.startsWith("Falha") ? "bg-brand-100 text-brand-800" : "bg-brand-50 text-brand-700"
              }`}
            >
              {status}
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap gap-2 border-t border-slate-100 px-4 py-3">
          <button
            type="button"
            disabled={isExporting}
            onClick={() => runExport("preview")}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50"
          >
            Pré-visualizar
          </button>
          <button
            type="button"
            disabled={isExporting}
            onClick={() => runExport("download")}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50"
          >
            {isExporting ? "A gerar..." : "Transferir HTML"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

export default ExportSlidesModal;
