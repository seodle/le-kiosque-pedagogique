/** Formate un pourcentage déjà exprimé sur l'échelle 0–100 (tel que renvoyé par l'API). */
export function formatPercent(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `${value.toFixed(1)}%`;
}

const MINUTES_PER_DAY = 24 * 60;

/** Formate un délai exprimé en minutes (API) en jours pour l'affichage. */
export function formatDelayDays(minutes: number | null | undefined): string {
  if (minutes == null || Number.isNaN(minutes)) return "—";
  const days = minutes / MINUTES_PER_DAY;
  const text = days < 1
    ? days.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : days.toLocaleString("fr-FR", { maximumFractionDigits: 1 });
  return `${text} ${days >= 2 ? "jours" : "jour"}`;
}
