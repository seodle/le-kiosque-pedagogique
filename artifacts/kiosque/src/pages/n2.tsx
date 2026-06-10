import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetPool, useGetMyAssignedTickets } from "@workspace/api-client-react";
import { getToken, decodeToken } from "@/lib/auth";
import { Inbox, ClipboardList, ArrowRight, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

function statusBadge(status: string) {
  const map: Record<string, string> = {
    escalated: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
    claimed_n2: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
    resolved_n2: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    closed_webex: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  };
  const labels: Record<string, string> = {
    escalated: "Escaladé", claimed_n2: "En cours N2", resolved_n2: "Résolu", closed_webex: "Clos Webex",
  };
  return { cls: map[status] ?? "bg-muted text-muted-foreground", label: labels[status] ?? status };
}

export default function N2() {
  const [, setLocation] = useLocation();
  const token = getToken();
  const payload = token ? decodeToken(token) : null;

  useEffect(() => {
    if (!token || !payload || payload.role !== "n2") setLocation("/connexion");
  }, []);

  const { data: pool, isLoading: poolLoading } = useGetPool({ query: { refetchInterval: 15000 } as any });
  const { data: assigned, isLoading: assignedLoading } = useGetMyAssignedTickets({ query: { refetchInterval: 15000 } as any });

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto py-6 space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Tableau N2</h1>
          <p className="text-muted-foreground text-sm mt-1">Tickets escaladés dans vos domaines d'expertise</p>
        </div>

        <section>
          <div className="flex items-center gap-2 mb-4">
            <Inbox className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Tickets escaladés disponibles</h2>
            {pool && <Badge variant="secondary">{pool.length}</Badge>}
          </div>
          {poolLoading && <div className="space-y-3">{[1,2].map(i => <Skeleton key={i} className="h-24 w-full" />)}</div>}
          {!poolLoading && pool?.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center text-muted-foreground">
                <Inbox className="h-8 w-8 mx-auto mb-3 opacity-40" />
                <p>Aucun ticket escaladé dans vos domaines</p>
              </CardContent>
            </Card>
          )}
          <div className="space-y-3">
            {pool?.map((t) => {
              const { cls, label } = statusBadge(t.status);
              return (
                <Card key={t.id} className="border hover:border-primary/50 transition-colors">
                  <CardContent className="py-4 flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <p className="font-semibold">Ticket #{t.id}</p>
                      <p className="text-sm text-muted-foreground">
                        {t.school?.name} · {t.discipline?.name}
                        {t.transversalDomain && ` · ${t.transversalDomain.name}`}
                      </p>
                      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {new Date(t.createdAt).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={cn("px-2.5 py-1 rounded-full text-xs font-medium", cls)}>{label}</span>
                      <Link href={`/n2/ticket/${t.id}`}>
                        <Button size="sm" className="gap-1">Traiter <ArrowRight className="h-3.5 w-3.5" /></Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        <section>
          <div className="flex items-center gap-2 mb-4">
            <ClipboardList className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Mes tickets en cours</h2>
            {assigned && <Badge variant="secondary">{assigned.length}</Badge>}
          </div>
          {assignedLoading && <Skeleton className="h-24 w-full" />}
          {!assignedLoading && assigned?.length === 0 && (
            <p className="text-sm text-muted-foreground">Aucun ticket assigné en ce moment.</p>
          )}
          <div className="space-y-3">
            {assigned?.map((t) => {
              const { cls, label } = statusBadge(t.status);
              return (
                <Card key={t.id} className="border hover:border-primary/50 transition-colors">
                  <CardContent className="py-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold">Ticket #{t.id}</p>
                      <p className="text-sm text-muted-foreground">
                        {t.school?.name} · {t.discipline?.name}
                        {t.transversalDomain && ` · ${t.transversalDomain.name}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={cn("px-2.5 py-1 rounded-full text-xs font-medium", cls)}>{label}</span>
                      <Link href={`/n2/ticket/${t.id}`}>
                        <Button size="sm" variant="outline" className="gap-1">Voir <ArrowRight className="h-3.5 w-3.5" /></Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
