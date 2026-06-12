import { useState } from "react";
import { useLocation } from "wouter";
import type { TicketSummary } from "@workspace/api-client-react";
import { useClaimTicket, useGetTicket } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Clock, Eye, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type TicketPoolCardProps = {
  ticket: TicketSummary;
  ticketHref: string;
  statusClassName: string;
  statusLabel: string;
};

export function TicketPoolCard({ ticket, ticketHref, statusClassName, statusLabel }: TicketPoolCardProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [previewOpen, setPreviewOpen] = useState(false);
  const { mutate: claimTicket, isPending: claiming } = useClaimTicket();

  const needsDetail = previewOpen && !ticket.description;
  const { data: ticketDetail, isLoading: detailLoading } = useGetTicket(
    ticket.id,
    { query: { enabled: needsDetail } as any },
  );

  const description = ticket.description ?? ticketDetail?.description ?? null;

  function handleClaim() {
    claimTicket({ id: ticket.id }, {
      onSuccess: () => {
        toast({ title: "Demande prise en charge" });
        queryClient.invalidateQueries({ queryKey: ["/api/intervener/pool"] });
        queryClient.invalidateQueries({ queryKey: ["/api/intervener/my-tickets"] });
        queryClient.invalidateQueries({ queryKey: [`/api/tickets/${ticket.id}`] });
        setPreviewOpen(false);
        setLocation(ticketHref);
      },
      onError: () => {
        toast({
          title: "Erreur",
          description: "Impossible de prendre en charge cette demande.",
          variant: "destructive",
        });
      },
    });
  }

  return (
    <>
      <Card className="border hover:border-primary/50 transition-colors">
        <CardContent className="py-4 flex items-center justify-between gap-4">
          <div className="min-w-0 space-y-1">
            <p className="font-semibold">Demande n° {ticket.id}</p>
            <p className="text-sm text-muted-foreground">
              {ticket.school?.name} · {ticket.discipline?.name}
            </p>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3 shrink-0" />
              {new Date(ticket.createdAt).toLocaleString("fr-FR", {
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span className={cn("px-2.5 py-1 rounded-full text-xs font-medium", statusClassName)}>
              {statusLabel}
            </span>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setPreviewOpen(true)}>
              <Eye className="h-3.5 w-3.5" />
              Voir la demande
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Demande n° {ticket.id}</DialogTitle>
            <DialogDescription>
              {ticket.school?.name} · {ticket.discipline?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border bg-muted/40 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
              Demande de l'enseignant·e
            </p>
            {detailLoading && !description && <Skeleton className="h-16 w-full" />}
            {!detailLoading && (
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {description ?? "Aucune description fournie."}
              </p>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            Créé le{" "}
            {new Date(ticket.createdAt).toLocaleString("fr-FR", {
              day: "2-digit",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
              Retour
            </Button>
            <Button onClick={handleClaim} disabled={claiming}>
              {claiming ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Prendre en charge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
