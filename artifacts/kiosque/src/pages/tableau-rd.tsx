import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ApiError, useGetDashboardRd, useListRdTickets } from "@workspace/api-client-react";
import { getToken, decodeToken } from "@/lib/auth";
import { BarChart3, Clock, Ticket, TrendingUp, AlertTriangle, BookOpen, Building2, MessageSquareText, Trophy } from "lucide-react";
import { getTicketStatusLabel, TICKET_STATUS_LABELS } from "@/lib/ticket-status";
import { TicketBrowseCard } from "@/components/tickets/TicketBrowseCard";
import { formatDelayDays, formatPercent } from "@/lib/format";

function ticketsLoadErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 403) {
      return "Impossible de charger les demandes : votre compte doit être rattaché à un établissement et une discipline.";
    }
    if (error.status === 404) {
      return "Impossible de charger les demandes : le service API doit être redémarré pour prendre en compte les dernières mises à jour.";
    }
  }
  return "Impossible de charger les demandes. Vérifiez que l'API est démarrée, puis réessayez.";
}

function TicketsBrowseSection({
  isRd,
  statusFilter,
  onStatusFilterChange,
  tickets,
  ticketsLoading,
  ticketsErrorMessage,
}: {
  isRd: boolean;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  tickets?: { id: number }[];
  ticketsLoading: boolean;
  ticketsErrorMessage?: string;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <MessageSquareText className="h-5 w-5 text-primary" />
          <div>
            <h2 className="text-lg font-semibold">Parcourir les demandes</h2>
            <p className="text-sm text-muted-foreground">
              {isRd
                ? "Questions posées par les enseignants de votre établissement et de votre discipline — utiles pour préparer vos échanges avec la présidence de groupe."
                : "Questions posées dans votre établissement, toutes disciplines confondues."}
            </p>
          </div>
        </div>
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

      {ticketsErrorMessage && (
        <p className="text-sm text-destructive border border-destructive/30 rounded-lg px-4 py-3">
          {ticketsErrorMessage}
        </p>
      )}

      {ticketsLoading && <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}</div>}

      {!ticketsLoading && !ticketsErrorMessage && tickets?.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8 border rounded-lg">
          Aucune demande pour le moment dans votre périmètre.
        </p>
      )}

      <div className="space-y-3">
        {tickets?.map((t) => (
          <TicketBrowseCard
            key={t.id}
            ticket={t as Parameters<typeof TicketBrowseCard>[0]["ticket"]}
            showSchool={!isRd}
            showDiscipline={!isRd}
          />
        ))}
      </div>
    </section>
  );
}

export default function TableauRd() {
  const [, setLocation] = useLocation();
  const token = getToken();
  const payload = token ? decodeToken(token) : null;
  const role = payload?.role;
  const isRd = role === "rd";
  const isDirection = role === "direction";

  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    if (!token || !payload || !["rd", "direction"].includes(payload.role)) setLocation("/admin/connexion");
  }, []);

  const listParams = statusFilter !== "all" ? { status: statusFilter } : {};

  const { data: dashboard, isLoading } = useGetDashboardRd(undefined, {
    query: { enabled: !!token, refetchInterval: 60000 } as any,
  });
  const canBrowseTickets = isRd;
  const { data: tickets, isLoading: ticketsLoading, isError: ticketsIsError, error: ticketsError } = useListRdTickets(listParams, {
    query: { enabled: !!token && canBrowseTickets, refetchInterval: 60000 } as any,
  });
  const ticketsErrorMessage = ticketsIsError ? ticketsLoadErrorMessage(ticketsError) : undefined;

  function statCard(title: string, value: string | number | null, icon: React.ReactNode, subtitle?: string) {
    return (
      <Card className="border">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium">{title}</p>
              <p className="text-3xl font-bold mt-1">{value ?? "—"}</p>
              {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
            </div>
            <div className="bg-primary/10 p-3 rounded-lg text-primary">{icon}</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalResolved = dashboard
    ? (dashboard.resolutionByLevel.f2 ?? 0) + (dashboard.resolutionByLevel.f3 ?? 0) + (dashboard.resolutionByLevel.webex ?? 0)
    : null;

  const scopeLabel = isRd && dashboard?.schoolName && dashboard?.disciplineName
    ? {
        icon: BookOpen,
        text: `Données limitées à ${dashboard.schoolName} — discipline ${dashboard.disciplineName}`,
      }
    : dashboard?.schoolName
      ? { icon: Building2, text: `Données limitées à l'établissement : ${dashboard.schoolName}` }
      : dashboard?.disciplineName
        ? { icon: BookOpen, text: `Données limitées à la discipline : ${dashboard.disciplineName}` }
        : null;

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto py-6 space-y-8">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-lg">
            <BarChart3 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">
              {role === "direction"
                ? "Tableau de bord — Direction"
                : "Tableau de bord — Responsable de discipline"}
            </h1>
            <p className="text-muted-foreground text-sm">
              {role === "direction"
                ? "Vue agrégée des demandes de votre établissement"
                : "Suivi des demandes de votre établissement et de votre discipline"}
            </p>
          </div>
        </div>

        {isLoading && <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-28" />)}</div>}

        {dashboard && scopeLabel && (() => {
          const ScopeIcon = scopeLabel.icon;
          return (
            <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
              <ScopeIcon className="h-4 w-4 shrink-0 text-primary" />
              <span>{scopeLabel.text}</span>
            </div>
          );
        })()}

        {dashboard && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {statCard("Demandes totales", dashboard.totalTickets, <Ticket className="h-6 w-6" />)}
            {statCard("Demandes ouvertes", dashboard.openTickets ?? 0, <AlertTriangle className="h-6 w-6" />, "actuellement")}
            {statCard("Délai moyen", formatDelayDays(dashboard.avgPickupMinutes), <Clock className="h-6 w-6" />, "avant prise en charge")}
            {statCard("Résolus", totalResolved, <TrendingUp className="h-6 w-6" />)}
          </div>
        )}

        {canBrowseTickets && (
          <TicketsBrowseSection
            isRd={isRd}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            tickets={tickets}
            ticketsLoading={ticketsLoading}
            ticketsErrorMessage={ticketsErrorMessage}
          />
        )}

        {dashboard && (
          <>
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="border">
                <CardHeader>
                  <CardTitle className="text-base">Résolutions par niveau</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { label: "F2 (personne ressource établissement)", value: dashboard.resolutionByLevel.f2 ?? 0, color: "bg-blue-500" },
                    { label: "F3 (personne ressource externe)", value: dashboard.resolutionByLevel.f3 ?? 0, color: "bg-purple-500" },
                    { label: "Visio (entretien)", value: dashboard.resolutionByLevel.webex ?? 0, color: "bg-green-500" },
                  ].map(({ label, value, color }) => {
                    const max = Math.max(dashboard.resolutionByLevel.f2 ?? 0, dashboard.resolutionByLevel.f3 ?? 0, dashboard.resolutionByLevel.webex ?? 0, 1);
                    return (
                      <div key={label}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-muted-foreground">{label}</span>
                          <span className="font-semibold">{value}</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${(value / max) * 100}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>

            {isDirection && (
              <Card className="border">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Trophy className="h-4 w-4" />
                    Statistiques par discipline
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(!dashboard.disciplineRankings || dashboard.disciplineRankings.length === 0) && (
                    <p className="text-sm text-muted-foreground text-center py-8">Aucune donnée par discipline pour le moment.</p>
                  )}
                  {dashboard.disciplineRankings && dashboard.disciplineRankings.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Discipline</th>
                            <th className="text-right py-2 pr-4 font-medium text-muted-foreground">Demandes</th>
                            <th className="text-right py-2 pr-4 font-medium text-muted-foreground">Taux de résolution</th>
                            <th className="text-right py-2 pr-4 font-medium text-muted-foreground">Taux de remontée F3</th>
                            <th className="text-right py-2 font-medium text-muted-foreground">Délai moy.</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dashboard.disciplineRankings.map((d) => (
                            <tr key={d.disciplineId} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                              <td className="py-3 pr-4 font-medium">{d.disciplineName}</td>
                              <td className="py-3 pr-4 text-right">{d.totalTickets}</td>
                              <td className="py-3 pr-4 text-right">{formatPercent(d.resolutionRate)}</td>
                              <td className="py-3 pr-4 text-right">{formatPercent(d.escalationRate)}</td>
                              <td className="py-3 text-right">{formatDelayDays(d.avgMinutes)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {!isDirection && dashboard.ticketsByStatus && dashboard.ticketsByStatus.length > 0 && (
              <Card className="border">
                <CardHeader>
                  <CardTitle className="text-base">Répartition par statut</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-3">
                    {dashboard.ticketsByStatus.map((s) => (
                      <div key={s.status} className="flex items-center gap-2 bg-muted rounded-lg px-4 py-2">
                        <span className="text-sm text-muted-foreground">{getTicketStatusLabel(s.status)}</span>
                        <span className="font-bold text-lg">{s.count}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
