/** Arredonda valores monetários para evitar flutuação (ex.: 1234.5679999999) no Windows/Electron. */
export function roundMoney(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

export function formatBRL(value) {
  const n = roundMoney(value);
  return n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatPct(value) {
  if (value == null || Number.isNaN(Number(value))) return "—";
  return `${Number(value).toFixed(1)}%`;
}

export function formatInt(value) {
  return Math.round(Number(value || 0)).toLocaleString("pt-BR");
}

export function formatBRLCompact(value) {
  const n = roundMoney(value);
  if (n >= 1_000_000) return `R$ ${(n / 1_000_000).toFixed(1)} mi`;
  if (n >= 1_000) return `R$ ${(n / 1_000).toFixed(1)} mil`;
  return `R$ ${Math.round(n).toLocaleString("pt-BR")}`;
}

export function formatIntCompact(value) {
  const n = Math.round(Number(value || 0));
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} mi`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)} mil`;
  return n.toLocaleString("pt-BR");
}
