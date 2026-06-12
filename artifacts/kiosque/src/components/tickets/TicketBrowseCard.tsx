import type { TicketSummary } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Building2, Calendar } from "lucide-react";

type TicketBrowseCardProps = {
  ticket: TicketSummary;
  showSchool?: boolean;
  showDiscipline?: boolean;
};

export function TicketBrowseCard({ ticket, showSchool = true, showDiscipline = false }: TicketBrowseCardProps) {
  return (
    <Card className="border hover:border-primary/30 transition-colors">
      <CardContent className="pt-4 pb-4 space-y-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="space-y-1">
            <p className="font-semibold text-sm">Demande n° {ticket.id}</p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {showSchool && ticket.school?.name && (
                <span className="inline-flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  {ticket.school.name}
                </span>
              )}
              {showDiscipline && ticket.discipline?.name && (
                <span>{ticket.discipline.name}</span>
              )}
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(ticket.createdAt).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </div>
          </div>
          <StatusBadge status={ticket.status} />
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
          {ticket.description ?? "—"}
        </p>
      </CardContent>
    </Card>
  );
}
