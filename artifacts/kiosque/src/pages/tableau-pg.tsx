import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGetDashboardPg, useListDisciplines } from "@workspace/api-client-react";
import { getToken, decodeToken } from "@/lib/auth";
import { BarChart3, Building2, Ticket, TrendingUp, Trophy } from "lucide-react";

export default function TableauPg() {
  const [, setLocation] = useLocation();
  const token = getToken();
  const payload = token ? decodeToken(token) : null;
  const [disciplineFilter, setDisciplineFilter] = useState<string>("all");

  useEffect(() => {
    if (!token || !payload || payload.role !== "pg") setLocation("/connexion");
  }, []);

  const { data: disciplines } = useListDisciplines();
  const { data: dashboard, isLoading } = useGetDashboardPg(
    disciplineFilter !== "all" ? { disciplineId: Number(disciplineFilter) } : {},
    { query: { refetchInterval: 60000 } as any }
  );

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto py-6 space-y-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-lg">
              <BarChart3 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Tableau de bord PG</h1>
              <p className="text-muted-foreground text-sm">Vue stratégique et pilotage</p>
            </div>
          </div>
          <Select value={disciplineFilter} onValueChange={setDisciplineFilter}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Filtrer par discipline…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les disciplines</SelectItem>
              {disciplines?.map((d) => (
                <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading && <div className="space-y-4"><Skeleton className="h-28" /><Skeleton className="h-64" /></div>}

        {dashboard && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Card className="border">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground font-medium">Tickets totaux</p>
                      <p className="text-3xl font-bold mt-1">{dashboard.totalTickets}</p>
                    </div>
                    <div className="bg-primary/10 p-3 rounded-lg text-primary"><Ticket className="h-6 w-6" /></div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground font-medium">Établissements actifs</p>
                      <p className="text-3xl font-bold mt-1">{dashboard.schoolRankings.length}</p>
                    </div>
                    <div className="bg-primary/10 p-3 rounded-lg text-primary"><Building2 className="h-6 w-6" /></div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground font-medium">Domaine dominant</p>
                      <p className="text-xl font-bold mt-1 truncate">{dashboard.topDomains[0]?.domain ?? "—"}</p>
                    </div>
                    <div className="bg-primary/10 p-3 rounded-lg text-primary"><TrendingUp className="h-6 w-6" /></div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <Card className="border">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Tendance mensuelle
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {dashboard.monthlyTrend.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">Pas encore de données</p>
                  )}
                  <div className="space-y-2">
                    {dashboard.monthlyTrend.slice(-6).map((m) => {
                      const maxCount = Math.max(...dashboard.monthlyTrend.map(x => x.count), 1);
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
                  </div>
                </CardContent>
              </Card>

              <Card className="border">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Domaines transversaux
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {dashboard.topDomains.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">Aucune donnée</p>
                  )}
                  {dashboard.topDomains.map((d) => {
                    const max = Math.max(...dashboard.topDomains.map(x => x.count), 1);
                    return (
                      <div key={d.domain}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-muted-foreground">{d.domain}</span>
                          <span className="font-semibold">{d.count}</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-amber-500 rounded-full" style={{ width: `${(d.count / max) * 100}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>

            <Card className="border">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Trophy className="h-4 w-4" />
                  Classement des établissements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 pr-4 font-medium text-muted-foreground">#</th>
                        <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Établissement</th>
                        <th className="text-right py-2 pr-4 font-medium text-muted-foreground">Tickets</th>
                        <th className="text-right py-2 pr-4 font-medium text-muted-foreground">Taux escalade</th>
                        <th className="text-right py-2 pr-4 font-medium text-muted-foreground">Délai moy.</th>
                        <th className="text-left py-2 font-medium text-muted-foreground">Domaine dominant</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboard.schoolRankings.map((s, i) => (
                        <tr key={s.schoolId} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                          <td className="py-3 pr-4 font-bold text-muted-foreground">{i + 1}</td>
                          <td className="py-3 pr-4 font-medium">{s.schoolName}</td>
                          <td className="py-3 pr-4 text-right">{s.totalTickets}</td>
                          <td className="py-3 pr-4 text-right">{(s.escalationRate * 100).toFixed(0)}%</td>
                          <td className="py-3 pr-4 text-right">{s.avgMinutes !== null ? `${Math.round(s.avgMinutes)} min` : "—"}</td>
                          <td className="py-3 text-muted-foreground">{s.dominantDomain ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {dashboard.schoolRankings.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">Aucune donnée disponible</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
}
