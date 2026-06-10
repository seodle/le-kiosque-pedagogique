import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  useGetTicket, useGetTicketMessages, useSendMessage,
  useClaimTicket, useResolveTicket, useCloseTicketWebex
} from "@workspace/api-client-react";
import { getToken, decodeToken } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Send, ArrowLeft, CheckCircle, Video, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

function statusLabel(status: string) {
  const map: Record<string, { label: string; color: string }> = {
    escalated: { label: "Escaladé", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300" },
    claimed_n2: { label: "Pris en charge (N2)", color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300" },
    resolved_n2: { label: "Résolu N2", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" },
    closed_webex: { label: "Clôturé Webex", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" },
  };
  return map[status] ?? { label: status, color: "bg-muted text-muted-foreground" };
}

export default function N2Ticket() {
  const [, setLocation] = useLocation();
  const params = useParams<{ id: string }>();
  const ticketId = Number(params.id);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [webexLink, setWebexLink] = useState("");
  const [webexOpen, setWebexOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const token = getToken();
  const payload = token ? decodeToken(token) : null;

  useEffect(() => {
    if (!token || !payload || payload.role !== "n2") setLocation("/connexion");
  }, []);

  const { data: ticket, isLoading: ticketLoading } = useGetTicket(
    ticketId,
    { query: { enabled: !!ticketId, refetchInterval: 15000 } as any }
  );
  const { data: messages, isLoading: messagesLoading } = useGetTicketMessages(
    ticketId,
    { query: { enabled: !!ticketId, refetchInterval: 5000 } as any }
  );
  const { mutate: claimTicket, isPending: claiming } = useClaimTicket();
  const { mutate: resolveN2, isPending: resolving } = useResolveTicket();
  const { mutate: closeWebex, isPending: closingWebex } = useCloseTicketWebex();
  const { mutate: sendMessage, isPending: sending } = useSendMessage();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: [`/api/tickets/${ticketId}`] });
    queryClient.invalidateQueries({ queryKey: ["/api/intervener/pool"] });
    queryClient.invalidateQueries({ queryKey: ["/api/intervener/assigned"] });
  }

  function handleClaim() {
    claimTicket({ id: ticketId }, {
      onSuccess: () => { toast({ title: "Ticket pris en charge" }); invalidate(); },
      onError: () => toast({ title: "Erreur", variant: "destructive" }),
    });
  }

  function handleResolve() {
    resolveN2({ id: ticketId }, {
      onSuccess: () => { toast({ title: "Ticket résolu" }); invalidate(); },
      onError: () => toast({ title: "Erreur", variant: "destructive" }),
    });
  }

  function handleCloseWebex() {
    if (!webexLink.trim()) return;
    closeWebex({ id: ticketId, data: { webexLink: webexLink.trim() } }, {
      onSuccess: () => {
        toast({ title: "Ticket clôturé avec lien Webex" });
        setWebexOpen(false);
        invalidate();
      },
      onError: () => toast({ title: "Erreur", variant: "destructive" }),
    });
  }

  function handleSend() {
    if (!message.trim()) return;
    sendMessage({ data: { ticketId, content: message.trim() } }, {
      onSuccess: () => setMessage(""),
      onError: () => toast({ title: "Erreur d'envoi", variant: "destructive" }),
    });
  }

  const isEscalated = ticket?.status === "escalated";
  const isMyTicket = ticket?.status === "claimed_n2";
  const isResolved = ticket && ["resolved_n2", "closed_webex"].includes(ticket.status);

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto py-6 space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/n2">
            <Button variant="ghost" size="sm" className="gap-1">
              <ArrowLeft className="h-4 w-4" />Retour
            </Button>
          </Link>
          <div className="flex-1">
            {ticketLoading ? <Skeleton className="h-7 w-48" /> : (
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl font-bold">Ticket #{ticketId}</h1>
                {ticket && (() => {
                  const { label, color } = statusLabel(ticket.status);
                  return <span className={cn("px-2.5 py-1 rounded-full text-xs font-medium", color)}>{label}</span>;
                })()}
              </div>
            )}
            {ticket && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {ticket.school?.name} · {ticket.discipline?.name}
                {ticket.transversalDomain && ` · Domaine: ${ticket.transversalDomain.name}`}
              </p>
            )}
          </div>
        </div>

        {ticket?.description && (
          <Card className="border-2 bg-muted/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground font-medium uppercase tracking-wide">Description initiale</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed">{ticket.description}</p>
            </CardContent>
          </Card>
        )}

        {(isEscalated || isMyTicket) && (
          <div className="flex gap-2 flex-wrap">
            {isEscalated && (
              <Button onClick={handleClaim} disabled={claiming} className="gap-2">
                {claiming ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Prendre en charge
              </Button>
            )}
            {isMyTicket && (
              <>
                <Button onClick={handleResolve} disabled={resolving} className="gap-2 bg-green-600 hover:bg-green-700">
                  {resolving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                  Résoudre
                </Button>
                <Dialog open={webexOpen} onOpenChange={setWebexOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="gap-2">
                      <Video className="h-4 w-4" />
                      Clôturer avec Webex
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Clôturer avec un lien Webex</DialogTitle>
                      <DialogDescription>
                        Renseignez le lien de la réunion Webex planifiée pour cet enseignant.
                      </DialogDescription>
                    </DialogHeader>
                    <Input
                      placeholder="https://academie.webex.com/meet/…"
                      value={webexLink}
                      onChange={(e) => setWebexLink(e.target.value)}
                    />
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setWebexOpen(false)}>Annuler</Button>
                      <Button onClick={handleCloseWebex} disabled={closingWebex || !webexLink.trim()}>
                        {closingWebex ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Valider
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </>
            )}
          </div>
        )}

        <Card className="border-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Échanges</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
              {messagesLoading && <Skeleton className="h-16 w-full" />}
              {messages?.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">Aucun échange. Commencez la discussion.</p>
              )}
              {messages?.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "rounded-lg px-4 py-3 max-w-[85%]",
                    msg.senderType === "teacher"
                      ? "mr-auto bg-muted"
                      : "ml-auto bg-primary text-primary-foreground"
                  )}
                >
                  <p className="text-xs font-medium mb-1 opacity-70">
                    {msg.senderType === "teacher" ? "Enseignant" : "Spécialiste N2"}
                  </p>
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                  <p className={cn("text-xs mt-1.5", msg.senderType === "teacher" ? "text-muted-foreground" : "text-primary-foreground/70")}>
                    {new Date(msg.createdAt).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {!isResolved && (
              <div className="flex gap-2 pt-2 border-t">
                <Textarea
                  placeholder="Votre réponse…"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="resize-none min-h-[80px]"
                  onKeyDown={(e) => { if (e.key === "Enter" && e.ctrlKey) handleSend(); }}
                />
                <Button onClick={handleSend} disabled={!message.trim() || sending} className="self-end shrink-0">
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            )}
            {isResolved && (
              <p className="text-sm text-center text-muted-foreground pt-2 border-t">Ce ticket est clôturé.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
