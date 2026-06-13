export const TICKET_STATUS_LABELS: Record<string, string> = {
  new: "Nouvelle",
  assigned_n1: "Prise en charge F2",
  escalated: "Remontée vers F1",
  assigned_n2: "Prise en charge F1",
  closed_n1: "Traitée par F2",
  closed_resolved: "Traitée par F1",
  closed_webex: "Visio programmée",
};

export function getTicketStatusLabel(status: string): string {
  return TICKET_STATUS_LABELS[status] ?? status.replace(/_/g, " ");
}

/** Statuts pour lesquels la messagerie est fermée définitivement. */
const CHAT_CLOSED_STATUSES = new Set(["closed_n1", "closed_resolved"]);

export function isChatClosed(status: string): boolean {
  return CHAT_CLOSED_STATUSES.has(status);
}

export function formatVisioDateTime(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
