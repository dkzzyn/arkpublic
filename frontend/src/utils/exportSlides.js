import { formatBRL, formatInt, formatPct } from "./formatters";

const MONTH_LABELS = {
  1: "Jan", 2: "Fev", 3: "Mar", 4: "Abr", 5: "Mai", 6: "Jun",
  7: "Jul", 8: "Ago", 9: "Set", 10: "Out", 11: "Nov", 12: "Dez",
};

const RED = "#E63946";
const REDS = ["#E63946", "#c1121f", "#FF0000", "#ff6b6b", "#9b0c18", "#ffb3b3"];

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function nl2br(text) {
  return escapeHtml(text).replace(/\n/g, "<br/>");
}

function extractPresentationData(snapshot) {
  const exp = snapshot.expedicao || {};
  const ops = [
    { key: "implantacao", label: "Implantação" },
    { key: "sustentacao", label: "Sustentação" },
    { key: "impressoras", label: "Impressoras" },
  ];

  const barLabels = ops.map((o) => o.label);
  const barValues = ops.map((o) => Math.round((exp[o.key]?.totais?.valor || 0) / 1000));

  const mensalMap = {};
  ops.forEach((o) => {
    (exp[o.key]?.mensal || []).forEach((row) => {
      const key = row.MES_ANO;
      if (!key) return;
      if (!mensalMap[key]) mensalMap[key] = { valor: 0, nf: 0 };
      mensalMap[key].valor += Number(row.VALOR_TOTAL || 0);
      mensalMap[key].nf += Number(row.QTD_NF || 0);
    });
  });
  const months = Object.keys(mensalMap).sort();
  const recent = months.slice(-6);
  const lineLabels = recent.map((m) => m);
  const lineValues = recent.map((m) => Math.round(mensalMap[m].valor / 1000));
  const comboNf = recent.map((m) => mensalMap[m].nf);

  const totalValor = barValues.reduce((a, b) => a + b, 0) * 1000;
  const pieData = barValues.map((v) => (totalValor > 0 ? Math.round((v * 1000 / totalValor) * 100) : 0));

  const fat = snapshot.faturamento?.totais || {};
  const qtdG = fat.QTD_GERADAS || 0;
  const qtdA = fat.QTD_AGUARDANDO || 0;
  const pctGeradas = qtdG + qtdA > 0 ? Math.round((qtdG / (qtdG + qtdA)) * 100) : 0;

  const cli = snapshot.clientes || {};
  const totalNf = ops.reduce((s, o) => s + (exp[o.key]?.totais?.nf || 0), 0);

  const tableRows = recent.map((m) => {
    const impl = Math.round((exp.implantacao?.mensal?.find((r) => r.MES_ANO === m)?.VALOR_TOTAL || 0));
    const sust = Math.round((exp.sustentacao?.mensal?.find((r) => r.MES_ANO === m)?.VALOR_TOTAL || 0));
    const imp = Math.round((exp.impressoras?.mensal?.find((r) => r.MES_ANO === m)?.VALOR_TOTAL || 0));
    const tot = impl + sust + imp;
    return { m, impl, sust, imp, tot };
  });

  return {
    barLabels,
    barValues,
    lineLabels,
    lineValues,
    comboNf,
    pieData,
    donutData: [pctGeradas, 100 - pctGeradas],
    tableRows,
    kpis: {
      valor: totalValor || ops.reduce((s, o) => s + (exp[o.key]?.totais?.valor || 0), 0),
      nf: totalNf,
      aguardando: qtdA,
      pctGeradas,
      clientesShare: cli.top_cliente_share_pct,
      rankingLen: (cli.ranking || []).length,
      valorEscopo: cli.totais_escopo?.VALOR_TOTAL || 0,
    },
  };
}

const RED_CSS = `
:root {
  --accent: #dc2626;
  --accent-bright: #ef4444;
  --accent-light: #fca5a5;
  --accent-dark: #991b1b;
  --accent-glow: rgba(220, 38, 38, 0.45);
  --shine: linear-gradient(135deg, rgba(255,255,255,.55) 0%, rgba(255,255,255,0) 48%);
}
body.theme-light {
  --page-bg: #ffffff;
  --page-gradient: none;
  --orb-1: rgba(254, 202, 202, 0.35);
  --orb-2: rgba(254, 226, 226, 0.25);
  --toolbar-bg: rgba(255, 255, 255, 0.95);
  --toolbar-border: rgba(252, 165, 165, 0.6);
  --toolbar-text: #b91c1c;
  --slide-bg: #ffffff;
  --slide-shadow: none;
  --card-bg: #ffffff;
  --card-border: rgba(252, 165, 165, 0.75);
  --card-glow: 0 8px 28px rgba(185, 28, 28, 0.1);
  --text: #991b1b;
  --text-muted: #b91c1c;
  --dots-bg: rgba(255,255,255,.92);
  --dots-idle: #fecaca;
  --header-bg: rgba(255,255,255,.95);
  --header-text: #991b1b;
  --header-border: rgba(252, 165, 165, 0.6);
  --table-head-bg: linear-gradient(180deg, #fef2f2 0%, #fee2e2 100%);
  --table-head-text: #991b1b;
  --table-hover: rgba(254, 242, 242, 0.9);
  --grid-line: rgba(220, 38, 38, 0.04);
}
body.theme-dark {
  --page-bg: #0a0606;
  --page-gradient: linear-gradient(155deg, #0c0808 0%, #1a0a0a 42%, #120606 100%);
  --orb-1: rgba(220, 38, 38, 0.22);
  --orb-2: rgba(127, 29, 29, 0.32);
  --toolbar-bg: rgba(18, 10, 10, 0.92);
  --toolbar-border: rgba(127, 29, 29, 0.5);
  --toolbar-text: #fecaca;
  --slide-bg: #100808;
  --slide-shadow: 0 32px 90px rgba(0,0,0,.55), 0 0 0 1px rgba(127, 29, 29, 0.45), 0 0 48px rgba(220,38,38,.12);
  --cover-bg: linear-gradient(145deg, #0f0808 0%, #1f0c0c 52%, #0a0505 100%);
  --card-bg: linear-gradient(155deg, rgba(55,18,18,.94) 0%, rgba(30,10,10,.96) 100%);
  --card-border: rgba(185, 28, 28, 0.45);
  --card-glow: 0 12px 40px rgba(0,0,0,.45), 0 0 24px rgba(220,38,38,.12);
  --text: #fef2f2;
  --text-muted: #fca5a5;
  --kpi-value: #ffffff;
  --kpi-label: #fca5a5;
  --dots-bg: rgba(12,8,8,.94);
  --dots-idle: #5c2020;
  --header-bg: rgba(18,10,10,.92);
  --header-text: #fef2f2;
  --header-border: rgba(127, 29, 29, 0.55);
  --table-head-bg: linear-gradient(180deg, #4a1515 0%, #2a1010 100%);
  --table-head-text: #fecaca;
  --table-hover: rgba(55, 20, 20, 0.85);
  --grid-line: rgba(255, 255, 255, 0.04);
  --shine: linear-gradient(135deg, rgba(255,255,255,.12) 0%, rgba(255,255,255,0) 48%);
}
body.theme-light {
  --cover-bg: #ffffff;
  --kpi-value: var(--accent-dark);
  --kpi-label: var(--text-muted);
}
*{box-sizing:border-box;margin:0;padding:0}
html,body{height:100%;overflow:hidden}
body{
  font-family:"Inter",system-ui,sans-serif;
  background:var(--page-bg);
  background-image:var(--page-gradient);
  color:var(--text);
  transition:background .4s,color .3s;
  position:relative;
}
body::before{
  content:"";
  position:fixed;inset:0;pointer-events:none;z-index:0;
  background:
    radial-gradient(ellipse 55% 42% at 8% 12%, var(--orb-1), transparent 68%),
    radial-gradient(ellipse 48% 38% at 92% 88%, var(--orb-2), transparent 70%),
    radial-gradient(circle 280px at 50% -5%, rgba(252,165,165,.18), transparent 70%);
}
body::after{
  content:"";
  position:fixed;inset:0;pointer-events:none;z-index:0;
  background-image:
    linear-gradient(var(--grid-line) 1px, transparent 1px),
    linear-gradient(90deg, var(--grid-line) 1px, transparent 1px);
  background-size:56px 56px;
  mask-image:radial-gradient(ellipse 85% 75% at 50% 45%, black 20%, transparent 100%);
}
.deck{position:relative;z-index:1;height:100vh;display:flex;flex-direction:column}
.app-header{
  flex-shrink:0;display:flex;align-items:center;justify-content:center;gap:12px;
  padding:18px 28px;
  background:var(--header-bg);
  backdrop-filter:blur(16px) saturate(1.2);
  -webkit-backdrop-filter:blur(16px) saturate(1.2);
  color:var(--header-text);
  border-bottom:1px solid var(--header-border);
  box-shadow:0 8px 32px rgba(127,29,29,.08), inset 0 1px 0 rgba(255,255,255,.35);
  z-index:30;transition:background .3s;
  position:relative;overflow:hidden;
}
.app-header::after{
  content:"";position:absolute;left:0;right:0;bottom:0;height:3px;
  background:linear-gradient(90deg, transparent, var(--accent) 20%, var(--accent-bright) 50%, var(--accent) 80%, transparent);
  box-shadow:0 0 20px var(--accent-glow);
}
.app-header h1{
  font-family:"Poppins",sans-serif;font-size:1.15rem;font-weight:800;letter-spacing:-.03em;
  background:linear-gradient(120deg, var(--text) 0%, var(--accent-dark) 100%);
  -webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;
}
body.theme-dark .app-header h1{
  background:linear-gradient(120deg, #fff 0%, var(--accent-light) 100%);
  -webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;
}
.app-header i{
  color:var(--accent);font-size:1.1rem;
  filter:drop-shadow(0 0 10px var(--accent-glow));
}
.toolbar{
  flex-shrink:0;display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:10px;
  padding:12px 20px;
  background:var(--toolbar-bg);
  backdrop-filter:blur(14px);
  border-bottom:1px solid var(--toolbar-border);
  transition:background .3s;
  box-shadow:0 4px 24px rgba(15,23,42,.04);
}
.btn{
  padding:9px 18px;border:none;border-radius:10px;font:inherit;font-weight:600;font-size:13px;
  cursor:pointer;transition:transform .2s, box-shadow .25s, filter .2s;
}
.btn-primary{
  background:linear-gradient(135deg, var(--accent-dark) 0%, var(--accent) 45%, var(--accent-bright) 100%);
  color:#fff;
  box-shadow:0 6px 24px var(--accent-glow), inset 0 1px 0 rgba(255,255,255,.25);
}
.btn-primary:hover{
  transform:translateY(-2px);
  box-shadow:0 10px 32px var(--accent-glow), inset 0 1px 0 rgba(255,255,255,.35);
  filter:brightness(1.06);
}
.btn-ghost{
  background:rgba(255,255,255,.12);
  color:var(--toolbar-text);
  border:1px solid var(--toolbar-border);
  backdrop-filter:blur(8px);
}
.btn-ghost:hover{
  background:rgba(254,202,202,.25);
  border-color:var(--accent-light);
  box-shadow:0 0 16px rgba(220,38,38,.12);
}
body.theme-dark .btn-ghost{
  background:rgba(55,20,20,.55);
  color:var(--toolbar-text);
}
body.theme-dark .btn-ghost:hover{
  background:rgba(127,29,29,.55);
  border-color:var(--accent-light);
  color:#fff;
}
.btn-theme.active{
  color:var(--accent);
  border-color:var(--accent);
  background:linear-gradient(135deg, rgba(254,202,202,.35), rgba(255,255,255,.5));
  box-shadow:0 0 14px var(--accent-glow);
}
body.theme-dark .btn-theme.active{
  color:#fff;
  border-color:var(--accent-bright);
  background:linear-gradient(135deg, rgba(185,28,28,.65), rgba(127,29,29,.85));
}
.slide-counter{
  color:var(--toolbar-text);font-size:12px;font-weight:700;min-width:56px;text-align:center;
  padding:6px 12px;border-radius:999px;
  background:rgba(255,255,255,.15);border:1px solid var(--toolbar-border);
}
.viewport{flex:1;min-height:0;position:relative;overflow:hidden}
.slide{
  position:absolute;inset:0;width:100%;height:100%;display:flex;flex-direction:column;
  background:var(--slide-bg);
  opacity:0;visibility:hidden;pointer-events:none;z-index:0;
  transition:opacity .4s ease, transform .45s ease, background .3s;
  transform:scale(.985);
  isolation:isolate;
  overflow:hidden;
}
.slide.active{
  opacity:1;visibility:visible;pointer-events:auto;z-index:2;
  transform:scale(1);
}
.slide-inner{
  flex:1;min-height:0;display:flex;flex-direction:column;
  padding:32px 44px 200px;overflow:auto;position:relative;z-index:1;
}
.slide-cover{
  background:var(--cover-bg)!important;
  color:var(--text)!important;
  position:relative;overflow:hidden;
}
.slide-cover::before{display:none}
.slide-cover .slide-inner{
  justify-content:center;align-items:stretch;text-align:left;
  max-width:820px;margin:0 auto;width:100%;
}
body.theme-light .slide-cover .cover-sub{color:var(--accent)}
body.theme-dark .slide-cover .cover-sub{color:#fca5a5}
body.theme-dark .slide-cover .cover-meta{color:#f87171}
.slide-cover .cover-line{
  width:56px;height:5px;border-radius:999px;margin-bottom:28px;
  background:linear-gradient(90deg, var(--accent-dark), var(--accent-bright));
  box-shadow:0 0 16px rgba(220,38,38,.25);
}
body.theme-dark .slide-cover .cover-line{
  background:linear-gradient(90deg, var(--accent), var(--accent-bright));
  box-shadow:0 0 20px var(--accent-glow);
}
.cover-brand-logo{
  display:block;height:clamp(52px,9vw,80px);width:auto;
  max-width:min(360px,78vw);object-fit:contain;object-position:left;
  margin-bottom:20px;
}
.app-header-brand{display:flex;align-items:center;justify-content:center;gap:0}
.app-header-brand img{
  height:clamp(36px,5vw,48px);width:auto;max-width:min(280px,72vw);
  object-fit:contain;
}
.slide-cover .cover-sub{
  font-size:1.12rem;font-weight:500;
  margin-bottom:32px;line-height:1.55;
}
.slide-cover .cover-meta{font-size:.92rem;line-height:2.1;color:var(--text-muted)}
.slide-cover .cover-meta i{color:var(--accent);width:18px;margin-right:8px}
body.theme-dark .slide-cover .cover-meta i{color:var(--accent-bright)}
.slide-head{
  flex-shrink:0;margin-bottom:18px;padding-bottom:14px;
  border-bottom:1px solid var(--card-border);
  position:relative;
}
.slide-head::after{
  content:"";position:absolute;left:0;bottom:-1px;width:120px;height:2px;border-radius:2px;
  background:linear-gradient(90deg, var(--accent), transparent);
  box-shadow:0 0 12px var(--accent-glow);
}
.slide-title{
  font-family:"Poppins",sans-serif;font-size:clamp(1.2rem,2vw,1.55rem);font-weight:800;
  color:var(--text);display:flex;align-items:center;gap:10px;letter-spacing:-.02em;
}
.slide-title i{
  color:var(--accent);font-size:1.15rem;
  filter:drop-shadow(0 0 10px var(--accent-glow));
}
.slide-desc{color:var(--text-muted);font-size:13px;margin-top:8px}
.slide-body{flex:1;min-height:0;display:flex;flex-direction:column}
.kpi-grid{
  flex:1;display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(2,1fr);
  gap:18px;min-height:200px;
}
.kpi-card{
  background:var(--card-bg);border-radius:16px;padding:22px 24px;
  display:flex;flex-direction:column;justify-content:center;
  border:1px solid var(--card-border);
  box-shadow:var(--card-glow);
  transition:transform .25s, box-shadow .3s;
  position:relative;overflow:hidden;
}
.kpi-card::before{
  content:"";position:absolute;inset:0;border-radius:inherit;padding:1px;
  background:linear-gradient(145deg, rgba(252,165,165,.65), transparent 42%, rgba(220,38,38,.2));
  -webkit-mask:linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask:linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite:xor;mask-composite:exclude;pointer-events:none;
}
body.theme-dark .kpi-card::before{
  background:linear-gradient(145deg, rgba(248,113,113,.5), transparent 42%, rgba(127,29,29,.35));
}
.kpi-card::after{
  content:"";position:absolute;top:0;left:0;right:0;height:42%;
  background:var(--shine);pointer-events:none;opacity:.55;
}
.kpi-card:hover{
  transform:translateY(-4px);
  box-shadow:var(--card-glow), 0 16px 48px rgba(220,38,38,.14);
}
.kpi-card .icon{
  width:44px;height:44px;border-radius:12px;
  background:linear-gradient(145deg, rgba(254,202,202,.45), rgba(255,255,255,.15));
  border:1px solid var(--card-border);
  color:var(--accent);display:flex;align-items:center;justify-content:center;
  font-size:17px;margin-bottom:14px;
  box-shadow:0 4px 16px rgba(220,38,38,.12), inset 0 1px 0 rgba(255,255,255,.4);
  position:relative;z-index:1;
}
body.theme-dark .kpi-card .icon{
  background:linear-gradient(145deg, var(--accent-dark) 0%, var(--accent) 55%, var(--accent-bright) 100%);
  color:#fff;border-color:rgba(248,113,113,.35);
  box-shadow:0 6px 20px rgba(220,38,38,.35), inset 0 1px 0 rgba(255,255,255,.2);
}
.kpi-card .label{
  font-size:10px;font-weight:700;text-transform:uppercase;color:var(--kpi-label,var(--text-muted));
  letter-spacing:.08em;position:relative;z-index:1;
}
.kpi-card .value{
  font-family:"Poppins",sans-serif;font-size:clamp(1.55rem,3vw,2.35rem);font-weight:800;
  color:var(--kpi-value,var(--text));line-height:1;margin-top:8px;position:relative;z-index:1;
}
.kpi-card .value.accent{color:var(--kpi-value,var(--accent-dark))}
body.theme-light .kpi-card .value.accent{color:var(--accent-dark)}
body.theme-dark .slide-title{color:#fef2f2}
body.theme-dark .slide-title i{color:var(--accent-bright)}
body.theme-dark .slide-desc{color:#fca5a5}
.chart-box{
  flex:1;min-height:0;display:flex;flex-direction:column;
  background:var(--card-bg);border-radius:16px;padding:20px 24px;
  border:1px solid var(--card-border);
  box-shadow:var(--card-glow);
  position:relative;overflow:hidden;
}
.chart-box::before{
  content:"";position:absolute;top:0;left:0;right:0;height:3px;
  background:linear-gradient(90deg, var(--accent), var(--accent-bright), transparent);
  opacity:.75;
}
.chart-box h3{
  font-size:11px;font-weight:700;color:var(--text-muted);margin-bottom:14px;
  text-transform:uppercase;letter-spacing:.07em;
}
.chart-wrap{flex:1;min-height:240px;position:relative;width:100%;z-index:1}
.chart-wrap canvas{display:block;width:100%!important;height:100%!important}
.chart-row{flex:1;min-height:0;display:grid;grid-template-columns:1fr 1fr;gap:18px}
.table-wrap{
  flex:1;min-height:0;overflow:auto;border-radius:16px;
  border:1px solid var(--card-border);
  box-shadow:var(--card-glow);
  background:var(--card-bg);
}
.data-table{width:100%;border-collapse:collapse;font-size:14px}
.data-table thead{background:var(--table-head-bg);color:var(--table-head-text);position:sticky;top:0}
.data-table th,.data-table td{padding:13px 16px;text-align:left;color:var(--text);border-bottom:1px solid var(--card-border)}
.data-table tbody tr:hover{background:var(--table-hover)}
.data-table .hl{font-weight:800;color:var(--accent)}
.stat-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-top:18px}
.stat-card{
  background:var(--card-bg);border-radius:16px;padding:26px;text-align:center;
  border:1px solid var(--card-border);box-shadow:var(--card-glow);
  transition:transform .2s, box-shadow .25s;
}
.stat-card:hover{transform:translateY(-3px);box-shadow:var(--card-glow), 0 12px 36px rgba(220,38,38,.12)}
.stat-card .num{
  font-family:"Poppins",sans-serif;font-size:1.9rem;font-weight:800;color:var(--text);
}
.stat-card .num.accent{color:var(--accent-dark)}
.stat-card p{font-size:12px;color:var(--text-muted);margin-top:8px;font-weight:500}
.bullets{margin:12px 0 16px 22px;line-height:1.95;color:var(--text-muted);font-size:15px}
.bullets strong{color:var(--text)}
.thanks{justify-content:center;align-items:center;text-align:center}
.thanks h2{
  font-family:"Poppins",sans-serif;font-size:2.35rem;font-weight:800;color:var(--text);
  background:linear-gradient(120deg, var(--text), var(--accent));
  -webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;
}
.cta-btn{
  margin-top:20px;padding:14px 32px;
  background:linear-gradient(135deg, var(--accent-dark), var(--accent-bright));
  color:#fff;font-weight:700;border-radius:12px;border:none;cursor:pointer;font-size:14px;
  box-shadow:0 8px 28px var(--accent-glow), inset 0 1px 0 rgba(255,255,255,.3);
  transition:transform .2s, box-shadow .25s;
}
.cta-btn:hover{
  transform:translateY(-2px) scale(1.02);
  box-shadow:0 12px 36px var(--accent-glow);
}
.dots{
  position:fixed;bottom:14px;left:50%;transform:translateX(-50%);
  display:flex;gap:10px;z-index:200;padding:10px 18px;
  background:var(--dots-bg);
  backdrop-filter:blur(14px);
  border-radius:999px;
  border:1px solid var(--card-border);
  box-shadow:0 8px 32px rgba(127,29,29,.12), 0 0 24px rgba(220,38,38,.08);
}
.dot{
  width:9px;height:9px;border-radius:50%;background:var(--dots-idle);border:none;
  cursor:pointer;padding:0;transition:all .25s;
}
.dot.active,.dot:hover{
  background:linear-gradient(135deg, var(--accent), var(--accent-bright));
  transform:scale(1.25);
  box-shadow:0 0 14px var(--accent-glow);
}
@media(max-width:900px){
  .kpi-grid{grid-template-columns:repeat(2,1fr)}
  .chart-row{grid-template-columns:1fr}
  .slide-inner{padding:22px 18px}
}
@media print{.toolbar,.dots{display:none}.slide{position:relative!important;opacity:1!important;visibility:visible!important;page-break-after:always;min-height:90vh;transform:none!important}}
`;

function kpiCard(icon, label, value, rawNum, accentValue = true) {
  const classes = ["value"];
  if (accentValue) classes.push("accent");
  if (rawNum != null) classes.push("counter");
  const attr =
    rawNum != null
      ? `class="${classes.join(" ")}" data-target="${rawNum}"`
      : `class="${classes.join(" ")}"`;
  return `<div class="kpi-card"><div class="icon"><i class="fa-solid ${icon}"></i></div><span class="label">${escapeHtml(label)}</span><div ${attr}>${escapeHtml(value)}</div></div>`;
}

function slideWrap(content, extraClass = "") {
  return `<section class="slide ${extraClass}"><div class="slide-inner">${content}</div></section>`;
}

function slideHead(title, desc = "") {
  return `<div class="slide-head"><h2 class="slide-title">${title}</h2>${desc ? `<p class="slide-desc">${desc}</p>` : ""}</div>`;
}

const HERO_LOGO_FILE = "LogoMetade.png";
const BRAND_LOGO_FILE = "Logo.png";
const DECK_STYLE_VERSION = "2026-05-27-white";
const PAGE_TITLE = "Arklok — Relatório executivo";

function cssUrlLiteral(src) {
  return String(src ?? "").replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function buildLogoWatermarkCss(logoSrc) {
  const url = cssUrlLiteral(logoSrc || HERO_LOGO_FILE);
  return `
:root{--slide-logo:url('${url}')}
.slide::after{
  content:"";position:absolute;left:-2%;bottom:-4%;
  width:min(560px,58vw);height:min(340px,42vh);
  min-width:320px;min-height:200px;
  background:var(--slide-logo) left bottom/contain no-repeat;
  opacity:1;pointer-events:none;z-index:0;
}
.slide-cover::after{
  left:-3%;bottom:-5%;
  width:min(640px,62vw);height:min(400px,48vh);
  opacity:1;
}
.slide:not(.slide-cover)::before{
  content:"";position:absolute;top:0;left:0;right:0;height:4px;z-index:2;
  background:linear-gradient(90deg, var(--accent-dark), var(--accent), var(--accent-bright));
}
`;
}

async function loadPublicImageDataUrl(filename) {
  try {
    const url = `${process.env.PUBLIC_URL || ""}/${filename}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export function loadHeroLogoDataUrl() {
  return loadPublicImageDataUrl(HERO_LOGO_FILE);
}

export function loadBrandLogoDataUrl() {
  return loadPublicImageDataUrl(BRAND_LOGO_FILE);
}

export function buildDeckHtml(snapshot, options = {}) {
  const { config } = snapshot;
  const d = extractPresentationData(snapshot);
  const pageTitle = escapeHtml(PAGE_TITLE);
  const logoSrc = options.logoSrc || HERO_LOGO_FILE;
  const brandLogoSrc = options.brandLogoSrc || BRAND_LOGO_FILE;
  const brandLogoSrcAttr = escapeHtml(String(brandLogoSrc));
  const chartJson = JSON.stringify({
    barLabels: d.barLabels,
    barValues: d.barValues,
    lineLabels: d.lineLabels,
    lineValues: d.lineValues,
    comboNf: d.comboNf,
    pieData: d.pieData,
    donutData: d.donutData,
    reds: REDS,
  });

  const tableHtml = d.tableRows.length
    ? d.tableRows
        .map(
          (r) =>
            `<tr><td>${escapeHtml(r.m)}</td><td>${formatBRL(r.impl)}</td><td>${formatBRL(r.sust)}</td><td>${formatBRL(r.imp)}</td><td class="hl">${formatBRL(r.tot)}</td></tr>`,
        )
        .join("")
    : '<tr><td colspan="5">Sem dados — carregue arquivos na secção Dados</td></tr>';

  const ranking = (snapshot.clientes?.ranking || []).slice(0, 8);
  const rsKey = snapshot.clientes?.rsKey || "RAZÃO SOCIAL";
  const rankRows = ranking
    .map(
      (row, i) =>
        `<tr><td>${i + 1}</td><td>${escapeHtml(row[rsKey] || "—")}</td><td>${formatBRL(row.VALOR_TOTAL)}</td><td>${formatInt(row.QTD_NF)}</td></tr>`,
    )
    .join("");

  const introSlide = config.introNote?.trim()
    ? slideWrap(`${slideHead('<i class="fa-solid fa-comment"></i> Contexto')}${nl2br(config.introNote)}`)
    : "";

  const closeSlide = config.closingNote?.trim()
    ? slideWrap(`${slideHead('<i class="fa-solid fa-flag-checkered"></i> Conclusões')}${nl2br(config.closingNote)}`)
    : "";

  const fatSlide =
    config.includeFaturamento && snapshot.faturamento
      ? slideWrap(
          `${slideHead('<i class="fa-solid fa-file-invoice-dollar"></i> Faturamento', 'Indicadores de notas fiscais')}
          <div class="slide-body"><div class="kpi-grid" style="grid-template-columns:repeat(4,1fr);grid-template-rows:1fr">
            ${kpiCard("fa-sack-dollar", "Valor total", formatBRL(snapshot.faturamento.totais?.VALOR_TOTAL), null)}
            ${kpiCard("fa-check", "NF geradas", formatInt(snapshot.faturamento.totais?.QTD_GERADAS), snapshot.faturamento.totais?.QTD_GERADAS)}
            ${kpiCard("fa-hourglass", "Aguardando", formatInt(snapshot.faturamento.totais?.QTD_AGUARDANDO), snapshot.faturamento.totais?.QTD_AGUARDANDO)}
            ${kpiCard("fa-percent", "% geradas", formatPct(d.kpis.pctGeradas), d.kpis.pctGeradas)}
          </div></div>`,
        )
      : "";

  const cliSlide =
    config.includeClientes && snapshot.clientes
      ? slideWrap(
          `${slideHead('<i class="fa-solid fa-users"></i> Top clientes', 'Ranking por faturamento')}
          <div class="slide-body table-wrap">
            <table class="data-table"><thead><tr><th>#</th><th>Cliente</th><th>Valor</th><th>NF</th></tr></thead>
            <tbody>${rankRows || '<tr><td colspan="4">Sem dados</td></tr>'}</tbody></table>
          </div>`,
        )
      : "";

  const coverSlide = `<section class="slide slide-cover active"><div class="slide-inner">
    <div class="cover-copy">
      <div class="cover-line"></div>
      <img class="cover-brand-logo" src="${brandLogoSrcAttr}" alt="Arklok" />
      <p class="cover-sub">${escapeHtml(config.subtitle || "Resumo executivo dos indicadores operacionais")}</p>
    </div>
    <p class="cover-meta">
      <span><i class="fa-solid fa-building"></i>${escapeHtml(config.company || "—")}</span><br/>
      <span><i class="fa-solid fa-user"></i>${escapeHtml(config.author || "Operações")}</span><br/>
      <span><i class="fa-solid fa-calendar"></i>${escapeHtml(snapshot.generatedAtLabel)}</span>
    </p>
  </div></section>`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${pageTitle}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Poppins:wght@700;800&display=swap" rel="stylesheet"/>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"/>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"><\/script>
<script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2.2.0/dist/chartjs-plugin-datalabels.min.js"><\/script>
<style>${RED_CSS}${buildLogoWatermarkCss(logoSrc)}</style>
<!-- ControleExped deck ${DECK_STYLE_VERSION} -->
</head>
<body class="theme-light">
<div class="deck">
<header class="app-header"><div class="app-header-brand"><img src="${brandLogoSrcAttr}" alt="Arklok" /></div></header>
<nav class="toolbar">
<button type="button" class="btn btn-ghost" id="btnPrev"><i class="fa-solid fa-chevron-left"></i> Anterior</button>
<span class="slide-counter" id="counter">1 / 1</span>
<button type="button" class="btn btn-primary" id="btnNext">Próximo <i class="fa-solid fa-chevron-right"></i></button>
<button type="button" class="btn btn-ghost btn-theme active" id="btnLight" title="Modo claro"><i class="fa-solid fa-sun"></i></button>
<button type="button" class="btn btn-ghost btn-theme" id="btnDark" title="Modo escuro"><i class="fa-solid fa-moon"></i></button>
<button type="button" class="btn btn-ghost" id="btnFs" title="Tela cheia"><i class="fa-solid fa-expand"></i></button>
</nav>
<main class="viewport" id="viewport">
${coverSlide}
${introSlide}
${slideWrap(`${slideHead('<i class="fa-solid fa-gauge-high"></i> KPIs principais', 'Dados reais do ControleExped')}
<div class="slide-body"><div class="kpi-grid">
${kpiCard("fa-sack-dollar", "Valor expedido", formatBRL(d.kpis.valor), Math.round(d.kpis.valor))}
${kpiCard("fa-file-invoice", "Notas fiscais", formatInt(d.kpis.nf), d.kpis.nf)}
${kpiCard("fa-hourglass", "Aguardando fat.", formatInt(d.kpis.aguardando), d.kpis.aguardando)}
${kpiCard("fa-percent", "% NF geradas", formatPct(d.kpis.pctGeradas), d.kpis.pctGeradas)}
${config.includeClientes ? kpiCard("fa-crown", "Share líder", d.kpis.clientesShare != null ? formatPct(d.kpis.clientesShare) : "—", d.kpis.clientesShare) : kpiCard("fa-truck", "Operações", "3", 3)}
${config.includeClientes ? kpiCard("fa-users", "No ranking", formatInt(d.kpis.rankingLen), d.kpis.rankingLen) : kpiCard("fa-calendar", "Períodos", formatInt(d.lineLabels.length), d.lineLabels.length)}
</div></div>`)}
${slideWrap(`${slideHead('<i class="fa-solid fa-chart-column"></i> Por operação', 'Valor expedido em mil R$')}
<div class="slide-body"><div class="chart-box"><h3>Comparativo entre operações</h3><div class="chart-wrap"><canvas id="chartBar"></canvas></div></div></div>`)}
${slideWrap(`${slideHead('<i class="fa-solid fa-chart-line"></i> Tendência mensal', 'Evolução do faturamento')}
<div class="slide-body"><div class="chart-box"><h3>Valor por mês (mil R$)</h3><div class="chart-wrap"><canvas id="chartLine"></canvas></div></div></div>`)}
${slideWrap(`${slideHead('<i class="fa-solid fa-chart-pie"></i> Distribuição', 'Participação e status de faturamento')}
<div class="slide-body chart-row">
<div class="chart-box"><h3>% por operação</h3><div class="chart-wrap"><canvas id="chartPie"></canvas></div></div>
<div class="chart-box"><h3>NF gerada × aguardando</h3><div class="chart-wrap"><canvas id="chartDonut"></canvas></div></div>
</div>`)}
${slideWrap(`${slideHead('<i class="fa-solid fa-table"></i> Detalhamento mensal')}
<div class="slide-body table-wrap"><table class="data-table">
<thead><tr><th>Mês</th><th>Implantação</th><th>Sustentação</th><th>Impressoras</th><th>Total</th></tr></thead>
<tbody>${tableHtml}</tbody></table></div>`)}
${slideWrap(`${slideHead('<i class="fa-solid fa-layer-group"></i> NF × Valor', 'Volume de notas e valor faturado')}
<div class="slide-body"><div class="chart-box"><h3>Combinado — barras (NF) e linha (R$ mil)</h3><div class="chart-wrap"><canvas id="chartCombo"></canvas></div></div></div>`)}
${fatSlide}
${cliSlide}
${slideWrap(`${slideHead('<i class="fa-solid fa-star"></i> Resumo executivo')}
<div class="slide-body">
<ul class="bullets">
<li>Valor total expedido: <strong>${formatBRL(d.kpis.valor)}</strong></li>
<li>Volume de NF: <strong>${formatInt(d.kpis.nf)}</strong></li>
<li>Taxa de NF geradas: <strong>${formatPct(d.kpis.pctGeradas)}</strong></li>
${d.kpis.clientesShare != null ? `<li>Concentração do líder: <strong>${formatPct(d.kpis.clientesShare)}</strong></li>` : ""}
</ul>
<div class="stat-cards">
<div class="stat-card"><div class="num accent">${formatBRL(d.kpis.valor)}</div><p>Valor total</p></div>
<div class="stat-card"><div class="num">${formatInt(d.kpis.nf)}</div><p>Notas fiscais</p></div>
<div class="stat-card"><div class="num accent">${formatPct(d.kpis.pctGeradas)}</div><p>% geradas</p></div>
</div></div>`)}
${closeSlide}
<section class="slide"><div class="slide-inner" style="justify-content:center"><div class="thanks">
<h2>Obrigado!</h2>
<p style="color:var(--text-muted);margin-top:12px">${escapeHtml(config.footer || "ControleExped v1.2")}</p>
<button type="button" class="cta-btn" onclick="goTo(0)"><i class="fa-solid fa-rotate-left"></i> Reiniciar</button>
</div></div></section>
</main>
<div class="dots" id="dots"></div>
</div>
<script>
window.CHART_DATA=${chartJson};
(function(){
try{if(typeof ChartDataLabels!=='undefined')Chart.register(ChartDataLabels);}catch(e){}
var slides=Array.prototype.slice.call(document.querySelectorAll('.slide'));
var total=slides.length;
var idx=0;
var charts={};
var chartTick='#9b0c18';
function tickColor(){return document.body.classList.contains('theme-dark')?'#fca5a5':'#b91c1c';}
function gridColor(){return document.body.classList.contains('theme-dark')?'rgba(255,255,255,.06)':'rgba(185,28,28,.08)';}
function accentColor(){return'#E63946';}
function barGrowAnimations(stagger,duration){
  stagger=stagger==null?70:stagger;duration=duration==null?900:duration;
  return{
    animation:{duration:duration,easing:'easeOutQuart'},
    animations:{
      y:{
        type:'number',easing:'easeOutQuart',duration:duration,
        from:function(ctx){
          if(ctx.type!=='data')return undefined;
          var scaleId=ctx.dataset.yAxisID||'y';
          var scale=ctx.chart.scales[scaleId];
          return scale?scale.getPixelForValue(0):undefined;
        },
        delay:function(ctx){return ctx.type==='data'?ctx.dataIndex*stagger:0;}
      },
      height:{
        type:'number',easing:'easeOutQuart',duration:duration,from:0,
        delay:function(ctx){return ctx.type==='data'?ctx.dataIndex*stagger:0;}
      }
    }
  };
}
function baseOpts(){
  var tc=tickColor();
  return{
    responsive:true,
    maintainAspectRatio:false,
    layout:{padding:{top:28}},
    animation:{duration:720,easing:'easeOutQuart'},
    plugins:{legend:{labels:{color:tc,font:{size:12,weight:'600'}}}},
    scales:{
      x:{ticks:{color:tc},grid:{color:gridColor()}},
      y:{ticks:{display:false},grid:{color:gridColor()},beginAtZero:true}
    }
  };
}
function pieOpts(){
  return{
    responsive:true,
    maintainAspectRatio:false,
    animation:{duration:600,easing:'easeOutQuart',animateRotate:true,animateScale:true},
    plugins:{legend:{position:'bottom',labels:{color:tickColor()}}}
  };
}
function withDataLabels(opts,kind){
  opts=opts||{};
  opts.plugins=opts.plugins||{};
  var dl={display:true,font:{weight:'700',size:11}};
  if(kind==='bar'){
    dl.anchor='end';dl.align='top';dl.offset=4;dl.color=tickColor();
    dl.formatter=function(v){return v==null||v===''?'':String(v);};
  }else if(kind==='line'){
    dl.anchor='end';dl.align='top';dl.offset=4;dl.color=tickColor();
    dl.formatter=function(v){return v==null||v===''?'':String(v);};
  }else if(kind==='combo'){
    dl.anchor='end';dl.align='top';dl.offset=4;
    dl.color=function(ctx){return ctx.dataset.type==='line'?'#991b1b':tickColor();};
    dl.formatter=function(v,ctx){
      if(v==null||v==='')return '';
      if(ctx.dataset.type==='line')return Number(v).toLocaleString('pt-BR')+' mil';
      return Number(v).toLocaleString('pt-BR');
    };
  }else if(kind==='pie'||kind==='doughnut'){
    dl.anchor='center';dl.align='center';dl.color='#ffffff';
    dl.formatter=function(v,ctx){
      var arr=ctx.dataset.data;var s=0;for(var i=0;i<arr.length;i++)s+=Number(arr[i]||0);
      if(!s)return '';
      var n=Number(v||0);
      var p=Math.round(100*n/s);
      if(p<5)return '';
      return p+'%\\n'+n.toLocaleString('pt-BR');
    };
  }
  opts.plugins.datalabels=dl;
  return opts;
}
function destroyChart(id){
  if(charts[id]){try{charts[id].destroy();}catch(e){} delete charts[id];}
}
function buildDots(){
  var el=document.getElementById('dots');
  if(!el)return;
  el.innerHTML='';
  for(var i=0;i<total;i++){
    var b=document.createElement('button');
    b.type='button';
    b.className='dot'+(i===0?' active':'');
    b.setAttribute('aria-label','Slide '+(i+1));
    (function(j){b.addEventListener('click',function(){goTo(j);});})(i);
    el.appendChild(b);
  }
}
function resizeCharts(){Object.keys(charts).forEach(function(k){try{if(charts[k])charts[k].resize();}catch(e){}});}
function makeChart(id,config){
  var el=document.getElementById(id);
  if(!el)return;
  destroyChart(id);
  try{charts[id]=new Chart(el,config);}catch(e){console.warn('Chart '+id,e);}
}
function initChartsInSlide(slide){
  if(typeof Chart==='undefined')return;
  ['chartBar','chartLine','chartPie','chartDonut','chartCombo'].forEach(destroyChart);
  var D=window.CHART_DATA;
  var R=D.reds;
  var o=baseOpts();
  var pieO=pieOpts();
  Chart.defaults.font.family="'Inter',sans-serif";
  Chart.defaults.color=tickColor();
  if(slide.querySelector('#chartBar')){
    makeChart('chartBar',{type:'bar',data:{labels:D.barLabels,datasets:[{label:'Mil R$',data:D.barValues,backgroundColor:R,borderRadius:10}]},options:withDataLabels(Object.assign({},o,barGrowAnimations(),{plugins:{legend:{display:false}}}),'bar')});
  }
  if(slide.querySelector('#chartLine')){
    makeChart('chartLine',{type:'line',data:{labels:D.lineLabels,datasets:[{label:'Mil R$',data:D.lineValues,borderColor:accentColor(),backgroundColor:'rgba(230,57,70,.08)',fill:true,tension:.4,borderWidth:2,pointRadius:4,pointBackgroundColor:accentColor()}]},options:withDataLabels(Object.assign({},o,{plugins:{legend:{display:false}}}),'line')});
  }
  if(slide.querySelector('#chartPie')){
    makeChart('chartPie',{type:'pie',data:{labels:D.barLabels,datasets:[{data:D.pieData,backgroundColor:R,borderWidth:2,borderColor:document.body.classList.contains('theme-dark')?'#121212':'#fff'}]},options:withDataLabels(pieO,'pie')});
  }
  if(slide.querySelector('#chartDonut')){
    makeChart('chartDonut',{type:'doughnut',data:{labels:['NF Gerada','Aguardando'],datasets:[{data:D.donutData,backgroundColor:[R[0],R[5]],borderWidth:0}]},options:withDataLabels(Object.assign({},pieO,{cutout:'62%'}),'doughnut')});
  }
  if(slide.querySelector('#chartCombo')){
    var co=Object.assign({},o,barGrowAnimations());
    co.plugins=co.plugins||{};
    co.plugins.legend={display:true,position:'bottom',labels:{color:tickColor(),font:{size:12,weight:'600'}}};
    co.scales.y1={position:'right',beginAtZero:true,grid:{drawOnChartArea:false},ticks:{display:false}};
    makeChart('chartCombo',{type:'bar',data:{labels:D.lineLabels,datasets:[{type:'bar',label:'Qtd. NF',data:D.comboNf,backgroundColor:'rgba(193,18,31,.8)',borderRadius:6,yAxisID:'y'},{type:'line',label:'Valor (mil R$)',data:D.lineValues,borderColor:R[0],borderWidth:2,tension:.35,yAxisID:'y1',pointRadius:4,pointBackgroundColor:R[0]}]},options:withDataLabels(co,'combo')});
  }
  setTimeout(resizeCharts,100);
}
function setTheme(mode){
  document.body.classList.remove('theme-light','theme-dark');
  document.body.classList.add(mode==='dark'?'theme-dark':'theme-light');
  document.getElementById('btnLight').classList.toggle('active',mode!=='dark');
  document.getElementById('btnDark').classList.toggle('active',mode==='dark');
  try{localStorage.setItem('controleexped-theme',mode);}catch(e){}
  var active=slides[idx];
  if(active)initChartsInSlide(active);
  else resizeCharts();
}
window.goTo=function(i){
  if(!total)return;
  idx=Math.max(0,Math.min(i,total-1));
  slides.forEach(function(s,j){s.classList.toggle('active',j===idx);});
  var dots=document.querySelectorAll('.dot');
  dots.forEach(function(d,j){d.classList.toggle('active',j===idx);});
  var counter=document.getElementById('counter');
  if(counter)counter.textContent=(idx+1)+' / '+total;
  slides.forEach(function(s,j){
    s.querySelectorAll('.counter').forEach(function(el){
      if(j!==idx) delete el.dataset.animated;
    });
  });
  var active=slides[idx];
  if(active){
    initChartsInSlide(active);
    animateCounters(active);
  }
};
function animateCounters(slide){
  if(!slide)return;
  slide.querySelectorAll('.counter').forEach(function(el){
    if(el.dataset.animated==='1')return;
    el.dataset.animated='1';
    var target=parseFloat(el.dataset.target)||0;
    var start=performance.now();
    var dur=1200;
    function step(now){
      var t=Math.min((now-start)/dur,1);
      var v=Math.round(target*(1-Math.pow(1-t,3)));
      el.textContent=v.toLocaleString('pt-BR');
      if(t<1)requestAnimationFrame(step);
      else el.textContent=target.toLocaleString('pt-BR');
    }
    requestAnimationFrame(step);
  });
}
document.getElementById('btnPrev').addEventListener('click',function(){goTo(idx-1);});
document.getElementById('btnNext').addEventListener('click',function(){goTo(idx+1);});
document.getElementById('btnLight').addEventListener('click',function(){setTheme('light');});
document.getElementById('btnDark').addEventListener('click',function(){setTheme('dark');});
document.getElementById('btnFs').addEventListener('click',function(){
  if(!document.fullscreenElement)document.documentElement.requestFullscreen();
  else document.exitFullscreen();
});
document.addEventListener('keydown',function(e){
  if(e.key==='ArrowRight'||e.key===' '){e.preventDefault();goTo(idx+1);}
  if(e.key==='ArrowLeft'){e.preventDefault();goTo(idx-1);}
});
window.addEventListener('resize',resizeCharts);
try{
  var saved=localStorage.getItem('controleexped-theme');
  if(saved==='dark')setTheme('dark');
}catch(e){}
buildDots();
goTo(0);
})();
<\/script>
</body>
</html>`;
}

export function downloadHtmlFile(filename, html) {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function openHtmlPreview(html) {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener,noreferrer");
}

export function computeExpedicaoBlock(payload, mode, selectedMonth, selectedYear) {
  const mensal = payload.mensal || [];
  const monthlyByMonth = Object.values(
    mensal.reduce((acc, row) => {
      const key = row.MES_ANO;
      if (!key) return acc;
      if (!acc[key]) acc[key] = { MES_ANO: key, VALOR_TOTAL: 0, QTD_NF: 0 };
      acc[key].VALOR_TOTAL += Number(row.VALOR_TOTAL || 0);
      acc[key].QTD_NF += Number(row.QTD_NF || 0);
      return acc;
    }, {}),
  ).sort((a, b) => a.MES_ANO.localeCompare(b.MES_ANO));

  let chartData = monthlyByMonth;
  let periodoLabel = "Todos os meses";
  if (mode === "mensal" && selectedMonth) {
    chartData = monthlyByMonth.filter((r) => r.MES_ANO === selectedMonth);
    periodoLabel = `Mês ${selectedMonth}`;
  } else if (mode === "anual" && selectedYear) {
    const yearNum = Number(selectedYear);
    chartData = Object.values(
      mensal
        .filter((r) => Number(r.ANO) === yearNum)
        .reduce((acc, row) => {
          const m = Number(row.MES);
          if (!acc[m]) {
            acc[m] = { MES: m, MES_LABEL: MONTH_LABELS[m] || String(m), VALOR_TOTAL: 0, QTD_NF: 0 };
          }
          acc[m].VALOR_TOTAL += Number(row.VALOR_TOTAL || 0);
          acc[m].QTD_NF += Number(row.QTD_NF || 0);
          return acc;
        }, {}),
    ).sort((a, b) => a.MES - b.MES);
    periodoLabel = `Ano ${selectedYear}`;
  }

  const totals = chartData.reduce(
    (acc, row) => {
      acc.valor += Number(row.VALOR_TOTAL || 0);
      acc.nf += Number(row.QTD_NF || 0);
      return acc;
    },
    { valor: 0, nf: 0 },
  );

  let crescimento = null;
  if (mode === "mensal" && selectedMonth) {
    const i = monthlyByMonth.findIndex((r) => r.MES_ANO === selectedMonth);
    if (i > 0) {
      const atual = Number(monthlyByMonth[i].VALOR_TOTAL || 0);
      const anterior = Number(monthlyByMonth[i - 1].VALOR_TOTAL || 0);
      if (anterior) crescimento = ((atual - anterior) / anterior) * 100;
    }
  }

  return { mode, periodoLabel, mensal: monthlyByMonth, totais: totals, crescimento };
}

export function buildExportSnapshot({
  config,
  dataMap,
  expedicaoContext,
  faturamentoData,
  clientesData,
  clienteTipo,
}) {
  const { mode, selectedMonth, selectedYear } = expedicaoContext;
  const tipoLabels = { todos: "Todos", implantacao: "Implantação", sustentacao: "Sustentação", impressoras: "Impressoras" };
  const fatFilterLabels = { todos: "Todos", implantacao: "Implantação", sustentacao: "Sustentação" };

  const expedicao = {};
  ["implantacao", "sustentacao", "impressoras"].forEach((key) => {
    expedicao[key] = computeExpedicaoBlock(dataMap[key] || {}, mode, selectedMonth, selectedYear);
  });

  return {
    generatedAt: new Date().toISOString(),
    generatedAtLabel: new Date().toLocaleString("pt-BR"),
    config,
    expedicao,
    faturamento: faturamentoData
      ? { ...faturamentoData, filtroLabel: fatFilterLabels[faturamentoData.filtro_local] || "Todos", periodoAno: new Date().getFullYear() }
      : null,
    clientes: clientesData
      ? { ...clientesData, rsKey: "RAZÃO SOCIAL", tipoLabel: tipoLabels[clienteTipo] || "Todos" }
      : null,
  };
}
