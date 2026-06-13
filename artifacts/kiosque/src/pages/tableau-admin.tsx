import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGetDashboardPg, useGetDashboardRd, useListDisciplines, useListRdTickets, useListSchools } from "@workspace/api-client-react";
import { getToken, decodeToken } from "@/lib/auth";
import { AlertTriangle, BarChart3, Building2, Clock, Ticket, TrendingUp, Trophy } from "lucide-react";
import { TicketsBrowseSection } from "@/components/tickets/TicketsBrowseSection";
import { formatDelayDays, formatPercent } from "@/lib/format";

function buildFilterLabel(schoolName?: string, disciplineName?: string): string {
  if (schoolName && disciplineName) return `Croisement : ${schoolName} × ${disciplineName}`;
  if (schoolName) return `Établissement : ${schoolName}`;
  if (disciplineName) return `Discipline : ${disciplineName}`;
  return "Vue agrégée — tous établissements et disciplines";
}

export default function TableauAdmin() {
  const [, setLocation] = useLocation();
  const token = getToken();
  const payload = token ? decodeToken(token) : null;
  const [disciplineFilter, setDisciplineFilter] = useState<string>("all");
  const [schoolFilter, setSchoolFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    if (!token || !payload || payload.role !== "admin") setLocation("/admin/connexion");
  }, []);

  const scopeParams = {
    ...(disciplineFilter !== "all" ? { disciplineId: Number(disciplineFilter) } : {}),
    ...(schoolFilter !== "all" ? { schoolId: Number(schoolFilter) } : {}),
  };
  const ticketListParams = {
    ...scopeParams,
    ...(statusFilter !== "all" ? { status: statusFilter } : {}),
  };
  const hasFilters = disciplineFilter !== "all" || schoolFilter !== "all";

  const { data: disciplines } = useListDisciplines();
  const { data: schools } = useListSchools();
  const selectedDiscipline = disciplines?.find((d) => d.id.toString() === disciplineFilter);
  const selectedSchool = schools?.find((s) => s.id.toString() === schoolFilter);

  const { data: rd, isLoading: rdLoading, isError: rdError } = useGetDashboardRd(hasFilters ? scopeParams : undefined, {
    query: { enabled: !!token, refetchInterval: 60000 } as any,
  });
  const { data: pg, isLoading: pgLoading, isError: pgError } = useGetDashboardPg(hasFilters ? scopeParams : undefined, {
    query: { enabled: !!token, refetchInterval: 60000 } as any,
  });
  const { data: tickets, isLoading: ticketsLoading } = useListRdTickets(ticketListParams, {
    query: { enabled: !!token, refetchInterval: 60000 } as any,
  });

  const isLoading = rdLoading || pgLoading;
  const hasData = Boolean(rd || pg);
  const showLoadError = !isLoading && !hasData && (rdError || pgError);

  const totalResolved = rd
    ? (rd.resolutionByLevel.f2 ?? 0) + (rd.resolutionByLevel.f1 ?? 0) + (rd.resolutionByLevel.webex ?? 0)
    : null;

  const monthlyTrend = pg?.monthlyTrend ?? [];
  const disciplineRankings = (pg?.disciplineRankings ?? []).filter((d) => d.totalTickets > 0);
  const schoolRankings = (pg?.schoolRankings ?? []).filter((s) => s.totalTickets > 0);
  const showSchoolTable = schoolFilter === "all";
  const showDisciplineTable = disciplineFilter === "all";

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto py-6 space-y-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-lg">
              <BarChart3 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Tableau de bord — Administration</h1>
              <p className="text-muted-foreground text-sm">
                {buildFilterLabel(
                  selectedSchool?.name ?? (rd?.schoolName ?? pg?.schoolName ?? undefined),
                  selectedDiscipline?.name ?? (rd?.disciplineName ?? pg?.disciplineName ?? undefined),
                )}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={schoolFilter} onValueChange={setSchoolFilter}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Établissement…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les établissements</SelectItem>
                {schools?.map((s) => (
                  <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={disciplineFilter} onValueChange={setDisciplineFilter}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Discipline…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les disciplines</SelectItem>
                {disciplines?.map((d) => (
                  <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading && <div className="space-y-4"><Skeleton className="h-28" /><Skeleton className="h-64" /></div>}

        {showLoadError && (
          <Card className="border border-destructive/50">
            <CardContent className="pt-6">
              <p className="text-sm text-destructive">
                Impossible de charger les données du tableau de bord. Vérifiez que l&apos;API est démarrée et reconnectez-vous si besoin.
              </p>
            </CardContent>
          </Card>
        )}

        {hasData && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="border">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground font-medium">Demandes totales</p>
                      <p className="text-3xl font-bold mt-1">{rd?.totalTickets ?? pg?.totalTickets ?? "—"}</p>
                    </div>
                    <div className="bg-primary/10 p-3 rounded-lg text-primary"><Ticket className="h-6 w-6" /></div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground font-medium">Demandes ouvertes</p>
                      <p className="text-3xl font-bold mt-1">{rd?.openTickets ?? "—"}</p>
                    </div>
                    <div className="bg-primary/10 p-3 rounded-lg text-primary"><AlertTriangle className="h-6 w-6" /></div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground font-medium">Délai moyen</p>
                      <p className="text-3xl font-bold mt-1">
                        {formatDelayDays(rd?.avgPickupMinutes)}
                      </p>
                    </div>
                    <div className="bg-primary/10 p-3 rounded-lg text-primary"><Clock className="h-6 w-6" /></div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground font-medium">Résolus</p>
                      <p className="text-3xl font-bold mt-1">{totalResolved ?? "—"}</p>
                    </div>
                    <div className="bg-primary/10 p-3 rounded-lg text-primary"><TrendingUp className="h-6 w-6" /></div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {rd && (
                <Card className="border">
                  <CardHeader>
                    <CardTitle className="text-base">Résolutions par niveau</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {[
                      { label: "F2 (personne ressource établissement)", value: rd.resolutionByLevel.f2 ?? 0, color: "bg-blue-500" },
                      { label: "F1 (personne ressource externe)", value: rd.resolutionByLevel.f1 ?? 0, color: "bg-purple-500" },
                      { label: "Visio (entretien)", value: rd.resolutionByLevel.webex ?? 0, color: "bg-green-500" },
                    ].map(({ label, value, color }) => {
                      const max = Math.max(rd.resolutionByLevel.f2 ?? 0, rd.resolutionByLevel.f1 ?? 0, rd.resolutionByLevel.webex ?? 0, 1);
                      return (
                        <div key={label}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-muted-foreground">{label}</span>
                            <span className="font-semibold">{value}</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div className={`h-full ${color} rounded-full`} style={{ width: `${(value / max) * 100}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              )}

              {pg && (
                <Card className="border">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Tendance mensuelle
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {monthlyTrend.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">Pas encore de données</p>
                    )}
                    {monthlyTrend.slice(-6).map((m) => {
                      const maxCount = Math.max(...monthlyTrend.map((x) => x.count), 1);
                      return (
                        <div key={m.month}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-muted-foreground">{m.month}</span>
                            <span className="font-semibold">{m.count}</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${(m.count / maxCount) * 100}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              )}
            </div>

            {pg && showSchoolTable && (
              <Card className="border">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Classement par établissement
                    {disciplineFilter !== "all" && selectedDiscipline && (
                      <span className="text-sm font-normal text-muted-foreground">
                        — {selectedDiscipline.name}
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 pr-4 font-medium text-muted-foreground">#</th>
                          <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Établissement</th>
                          <th className="text-right py-2 pr-4 font-medium text-muted-foreground">Demandes</th>
                          <th className="text-right py-2 pr-4 font-medium text-muted-foreground">Taux de résolution</th>
                          <th className="text-right py-2 pr-4 font-medium text-muted-foreground">Taux de remontée F1</th>
                          <th className="text-right py-2 font-medium text-muted-foreground">Délai moy.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {schoolRankings.map((s, i) => (
                          <tr key={s.schoolId} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                            <td className="py-3 pr-4 font-bold text-muted-foreground">{i + 1}</td>
                            <td className="py-3 pr-4 font-medium">{s.schoolName}</td>
                            <td className="py-3 pr-4 text-right">{s.totalTickets}</td>
                            <td className="py-3 pr-4 text-right">{formatPercent(s.resolutionRate ?? 0)}</td>
                            <td className="py-3 pr-4 text-right">{formatPercent(s.escalationRate ?? 0)}</td>
                            <td className="py-3 text-right">{formatDelayDays(s.avgMinutes)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {schoolRankings.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-8">Aucune donnée disponible</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {pg && showDisciplineTable && (
              <Card className="border">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Trophy className="h-4 w-4" />
                    Classement par discipline
                    {schoolFilter !== "all" && selectedSchool && (
                      <span className="text-sm font-normal text-muted-foreground">
                        — {selectedSchool.name}
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 pr-4 font-medium text-muted-foreground">#</th>
                          <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Discipline</th>
                          <th className="text-right py-2 pr-4 font-medium text-muted-foreground">Demandes</th>
                          <th className="text-right py-2 pr-4 font-medium text-muted-foreground">Taux de résolution</th>
                          <th className="text-right py-2 pr-4 font-medium text-muted-foreground">Taux de remontée F1</th>
                          <th className="text-right py-2 font-medium text-muted-foreground">Délai moy.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {disciplineRankings.map((d, i) => (
                          <tr key={d.disciplineId} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                            <td className="py-3 pr-4 font-bold text-muted-foreground">{i + 1}</td>
                            <td className="py-3 pr-4 font-medium">{d.disciplineName}</td>
                            <td className="py-3 pr-4 text-right">{d.totalTickets}</td>
                            <td className="py-3 pr-4 text-right">{formatPercent(d.resolutionRate ?? 0)}</td>
                            <td className="py-3 pr-4 text-right">{formatPercent(d.escalationRate ?? 0)}</td>
                            <td className="py-3 text-right">{formatDelayDays(d.avgMinutes)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {disciplineRankings.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-8">Aucune donnée disponible</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        <Card className="border">
          <CardContent className="pt-6">
            <TicketsBrowseSection
              title="Demandes"
              description="Descriptions anonymes. Les filtres en haut de page s'appliquent aussi à cette liste."
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              tickets={tickets}
              ticketsLoading={ticketsLoading}
              showSchool
              showDiscipline
              emptyMessage="Aucune demande ne correspond aux filtres sélectionnés."
            />
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
