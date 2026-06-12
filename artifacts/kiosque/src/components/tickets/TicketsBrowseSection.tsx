import type { ReactNode } from "react";
import type { TicketSummary } from "@workspace/api-client-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquareText } from "lucide-react";
import { getTicketStatusLabel, TICKET_STATUS_LABELS } from "@/lib/ticket-status";
import { TicketBrowseCard } from "@/components/tickets/TicketBrowseCard";

type TicketsBrowseSectionProps = {
  title?: string;
  description?: string;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  tickets?: TicketSummary[];
  ticketsLoading: boolean;
  ticketsErrorMessage?: string;
  showSchool?: boolean;
  showDiscipline?: boolean;
  emptyMessage?: string;
  extraFilters?: ReactNode;
};

export function TicketsBrowseSection({
  title = "Parcourir les demandes",
  description,
  statusFilter,
  onStatusFilterChange,
  tickets,
  ticketsLoading,
  ticketsErrorMessage,
  showSchool = true,
  showDiscipline = false,
  emptyMessage = "Aucune demande pour le moment dans votre périmètre.",
  extraFilters,
}: TicketsBrowseSectionProps) {
  return (
    <section className="space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <MessageSquareText className="h-5 w-5 text-primary shrink-0" />
          <div>
            <h2 className="text-lg font-semibold">{title}</h2>
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {extraFilters}
          <Select value={statusFilter} onValueChange={onStatusFilterChange}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Statut…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              {Object.keys(TICKET_STATUS_LABELS).map((status) => (
                <SelectItem key={status} value={status}>{getTicketStatusLabel(status)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {ticketsErrorMessage && (
        <p className="text-sm text-destructive border border-destructive/30 rounded-lg px-4 py-3">
          {ticketsErrorMessage}
        </p>
      )}

      {ticketsLoading && (
        <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}</div>
      )}

      {!ticketsLoading && !ticketsErrorMessage && tickets?.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8 border rounded-lg">
          {emptyMessage}
        </p>
      )}

      {!ticketsLoading && !ticketsErrorMessage && tickets && tickets.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {tickets.length} demande{tickets.length > 1 ? "s" : ""} affichée{tickets.length > 1 ? "s" : ""}
        </p>
      )}

      <div className="space-y-3 max-h-[36rem] overflow-y-auto pr-1">
        {tickets?.map((t) => (
          <TicketBrowseCard
            key={t.id}
            ticket={t}
            showSchool={showSchool}
            showDiscipline={showDiscipline}
            clampDescription
          />
        ))}
      </div>
    </section>
  );
}
