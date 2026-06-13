import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetPool, useGetMyAssignedTickets } from "@workspace/api-client-react";
import { getToken, decodeToken } from "@/lib/auth";
import { Inbox, ClipboardList, ArrowRight, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { TicketPoolCard } from "@/components/tickets/TicketPoolCard";

function statusBadge(status: string) {
  const map: Record<string, string> = {
    new: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
    assigned_n1: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    closed_n1: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    escalated: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
    assigned_n2: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
    closed_webex: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  };
  const labels: Record<string, string> = {
    new: "Nouveau", assigned_n1: "En cours", closed_n1: "Résolu", escalated: "Remontée F1",
    assigned_n2: "En cours F1", closed_webex: "Visio programmée",
  };
  return { cls: map[status] ?? "bg-muted text-muted-foreground", label: labels[status] ?? status };
}

export default function F2() {
  const [, setLocation] = useLocation();
  const token = getToken();
  const payload = token ? decodeToken(token) : null;

  useEffect(() => {
    if (!token || !payload || payload.role !== "f2") setLocation("/connexion");
  }, []);

  const { data: pool, isLoading: poolLoading } = useGetPool({ query: { refetchInterval: 15000 } as any });
  const { data: assigned, isLoading: assignedLoading } = useGetMyAssignedTickets(undefined, { query: { refetchInterval: 15000 } as any });
  const { data: resolved, isLoading: resolvedLoading } = useGetMyAssignedTickets({ resolved: true }, { query: { refetchInterval: 15000 } as any });

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto py-6 space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Personne ressource établissement</h1>
          <p className="text-muted-foreground text-sm mt-1">File d'attente de votre établissement</p>
        </div>

        <section>
          <div className="flex items-center gap-2 mb-4">
            <Inbox className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Demandes en attente</h2>
            {pool && <Badge variant="secondary">{pool.length}</Badge>}
          </div>
          {poolLoading && <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-24 w-full" />)}</div>}
          {!poolLoading && pool?.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center text-muted-foreground">
                <Inbox className="h-8 w-8 mx-auto mb-3 opacity-40" />
                <p>Aucune demande en attente pour vous</p>
              </CardContent>
            </Card>
          )}
          <div className="space-y-3">
            {pool?.map((t) => {
              const { cls, label } = statusBadge(t.status);
              return (
                <TicketPoolCard
                  key={t.id}
                  ticket={t}
                  ticketHref={`/f2/ticket/${t.id}`}
                  statusClassName={cls}
                  statusLabel={label}
                />
              );
            })}
          </div>
        </section>

        <section>
          <div className="flex items-center gap-2 mb-4">
            <ClipboardList className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Mes demandes en cours</h2>
            {assigned && <Badge variant="secondary">{assigned.length}</Badge>}
          </div>
          {assignedLoading && <Skeleton className="h-24 w-full" />}
          {!assignedLoading && assigned?.length === 0 && (
            <p className="text-sm text-muted-foreground">Aucune demande assignée en ce moment.</p>
          )}
          <div className="space-y-3">
            {assigned?.map((t) => {
              const { cls, label } = statusBadge(t.status);
              return (
                <Card key={t.id} className="border hover:border-primary/50 transition-colors">
                  <CardContent className="py-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold">Demande n° {t.id}</p>
                      <p className="text-sm text-muted-foreground">{t.school?.name} · {t.discipline?.name}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={cn("px-2.5 py-1 rounded-full text-xs font-medium", cls)}>{label}</span>
                      <Link href={`/f2/ticket/${t.id}`}>
                        <Button size="sm" variant="outline" className="gap-1">Voir <ArrowRight className="h-3.5 w-3.5" /></Button>
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
            <CheckCircle2 className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Mes demandes traitées</h2>
            {resolved && <Badge variant="secondary">{resolved.length}</Badge>}
          </div>
          {resolvedLoading && <Skeleton className="h-24 w-full" />}
          {!resolvedLoading && resolved?.length === 0 && (
            <p className="text-sm text-muted-foreground">Aucune demande traitée pour le moment.</p>
          )}
          <div className="space-y-3">
            {resolved?.map((t) => {
              const { cls, label } = statusBadge(t.status);
              return (
                <Card key={t.id} className="border hover:border-primary/50 transition-colors">
                  <CardContent className="py-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold">Demande n° {t.id}</p>
                      <p className="text-sm text-muted-foreground">{t.school?.name} · {t.discipline?.name}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={cn("px-2.5 py-1 rounded-full text-xs font-medium", cls)}>{label}</span>
                      <Link href={`/f2/ticket/${t.id}`}>
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
