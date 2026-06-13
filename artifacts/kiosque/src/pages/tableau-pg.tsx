import { useEffect } from "react";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetDashboardPg } from "@workspace/api-client-react";
import { getToken, decodeToken } from "@/lib/auth";
import { BarChart3, BookOpen, Building2, Ticket, TrendingUp, Trophy } from "lucide-react";
import { formatDelayDays, formatPercent } from "@/lib/format";

export default function TableauPg() {
  const [, setLocation] = useLocation();
  const token = getToken();
  const payload = token ? decodeToken(token) : null;

  useEffect(() => {
    if (!token || !payload || payload.role !== "pg") setLocation("/admin/connexion");
  }, []);

  const { data: dashboard, isLoading } = useGetDashboardPg(undefined, {
    query: { enabled: !!token, refetchInterval: 60000 } as any,
  });

  const activeSchools = dashboard?.schoolRankings.filter((s) => s.totalTickets > 0).length ?? 0;

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto py-6 space-y-8">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-lg">
            <BarChart3 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Tableau de bord — Présidence de groupe</h1>
            <p className="text-muted-foreground text-sm">Vue stratégique et pilotage</p>
          </div>
        </div>

        {isLoading && <div className="space-y-4"><Skeleton className="h-28" /><Skeleton className="h-64" /></div>}

        {dashboard?.disciplineName && (
          <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
            <BookOpen className="h-4 w-4 shrink-0 text-primary" />
            <span>Statistiques limitées à la discipline : {dashboard.disciplineName}</span>
          </div>
        )}

        {dashboard && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <Card className="border">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground font-medium">Demandes totales</p>
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
                      <p className="text-3xl font-bold mt-1">{activeSchools}</p>
                    </div>
                    <div className="bg-primary/10 p-3 rounded-lg text-primary"><Building2 className="h-6 w-6" /></div>
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
                      const maxCount = Math.max(...dashboard.monthlyTrend.map((x) => x.count), 1);
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
                        <th className="text-right py-2 pr-4 font-medium text-muted-foreground">Demandes</th>
                        <th className="text-right py-2 pr-4 font-medium text-muted-foreground">Taux de résolution</th>
                        <th className="text-right py-2 pr-4 font-medium text-muted-foreground">Taux de remontée F1</th>
                        <th className="text-right py-2 font-medium text-muted-foreground">Délai moy.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboard.schoolRankings
                        .filter((s) => s.totalTickets > 0)
                        .map((s, i) => (
                        <tr key={s.schoolId} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                          <td className="py-3 pr-4 font-bold text-muted-foreground">{i + 1}</td>
                          <td className="py-3 pr-4 font-medium">{s.schoolName}</td>
                          <td className="py-3 pr-4 text-right">{s.totalTickets}</td>
                          <td className="py-3 pr-4 text-right">{formatPercent(s.resolutionRate)}</td>
                          <td className="py-3 pr-4 text-right">{formatPercent(s.escalationRate)}</td>
                          <td className="py-3 text-right">{formatDelayDays(s.avgMinutes)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {dashboard.schoolRankings.filter((s) => s.totalTickets > 0).length === 0 && (
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
