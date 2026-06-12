/** Formate un pourcentage déjà exprimé sur l'échelle 0–100 (tel que renvoyé par l'API). */
export function formatPercent(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `${value.toFixed(1)}%`;
}
