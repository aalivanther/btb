const DEFAULT_USD_MXN = 18.5;

function resolveRate(): number {
  const raw = process.env.NEXT_PUBLIC_USD_MXN;
  if (raw !== undefined) {
    const parsed = Number.parseFloat(raw);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return DEFAULT_USD_MXN;
}

export function usdToMxnAmount(usdText: string): number | null {
  const usd = Number.parseFloat(usdText);
  if (!Number.isFinite(usd) || usd < 0) {
    return null;
  }
  return Math.round(usd * resolveRate());
}

export function formatMxnApprox(usdText: string): string {
  const mxn = usdToMxnAmount(usdText);
  if (mxn === null) {
    return "";
  }
  return `≈ $${mxn.toLocaleString("es-MX")} MXN`;
}
