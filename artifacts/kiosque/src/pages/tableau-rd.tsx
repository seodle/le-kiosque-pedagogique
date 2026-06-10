import { useEffect } from "react";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetDashboardRd } from "@workspace/api-client-react";
import { getToken, decodeToken } from "@/lib/auth";
import { BarChart3, Clock, Ticket, TrendingUp, AlertTriangle } from "lucide-react";

export default function TableauRd() {
  const [, setLocation] = useLocation();
  const token = getToken();
  const payload = token ? decodeToken(token) : null;

  useEffect(() => {
    if (!token || !payload || payload.role !== "rd") setLocation("/connexion");
  }, []);

  const { data: dashboard, isLoading } = useGetDashboardRd({ query: { refetchInterval: 60000 } as any });

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
    ? (dashboard.resolutionByLevel.n1 ?? 0) + (dashboard.resolutionByLevel.n2 ?? 0) + (dashboard.resolutionByLevel.webex ?? 0)
    : null;

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto py-6 space-y-8">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-lg">
            <BarChart3 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Tableau de bord RD</h1>
            <p className="text-muted-foreground text-sm">Vue opérationnelle du kiosque</p>
          </div>
        </div>

        {isLoading && <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-28" />)}</div>}

        {dashboard && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {statCard("Tickets totaux", dashboard.totalTickets, <Ticket className="h-6 w-6" />)}
              {statCard("Tickets ouverts", dashboard.openTickets ?? 0, <AlertTriangle className="h-6 w-6" />, "actuellement")}
              {statCard("Délai moyen", dashboard.avgPickupMinutes !== null ? `${Math.round(dashboard.avgPickupMinutes)} min` : "—", <Clock className="h-6 w-6" />, "avant prise en charge")}
              {statCard("Résolus", totalResolved, <TrendingUp className="h-6 w-6" />)}
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <Card className="border">
                <CardHeader>
                  <CardTitle className="text-base">Résolutions par niveau</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { label: "N1 (conseiller pédagogique)", value: dashboard.resolutionByLevel.n1 ?? 0, color: "bg-blue-500" },
                    { label: "N2 (spécialiste domaine)", value: dashboard.resolutionByLevel.n2 ?? 0, color: "bg-purple-500" },
                    { label: "Webex (entretien)", value: dashboard.resolutionByLevel.webex ?? 0, color: "bg-green-500" },
                  ].map(({ label, value, color }) => {
                    const max = Math.max(dashboard.resolutionByLevel.n1 ?? 0, dashboard.resolutionByLevel.n2 ?? 0, dashboard.resolutionByLevel.webex ?? 0, 1);
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

              <Card className="border">
                <CardHeader>
                  <CardTitle className="text-base">Escalades par domaine</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {dashboard.escalationsByDomain.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">Aucune escalade enregistrée</p>
                  )}
                  {dashboard.escalationsByDomain.map((d) => {
                    const maxCount = Math.max(...dashboard.escalationsByDomain.map(x => x.count), 1);
                    return (
                      <div key={d.domain}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-muted-foreground">{d.domain}</span>
                          <span className="font-semibold">{d.count}</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-amber-500 rounded-full" style={{ width: `${(d.count / maxCount) * 100}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>

            {dashboard.ticketsByStatus && dashboard.ticketsByStatus.length > 0 && (
              <Card className="border">
                <CardHeader>
                  <CardTitle className="text-base">Répartition par statut</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-3">
                    {dashboard.ticketsByStatus.map((s) => (
                      <div key={s.status} className="flex items-center gap-2 bg-muted rounded-lg px-4 py-2">
                        <span className="text-sm text-muted-foreground capitalize">{s.status.replace(/_/g, " ")}</span>
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
