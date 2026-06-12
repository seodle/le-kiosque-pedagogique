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
import { Label } from "@/components/ui/label";
import { VisioNotice } from "@/components/tickets/VisioNotice";
import { ChatMessage } from "@/components/tickets/ChatMessage";
import { ReassignTicketDialog } from "@/components/tickets/ReassignTicketDialog";
import { isChatClosed } from "@/lib/ticket-status";

function statusLabel(status: string) {
  const map: Record<string, { label: string; color: string }> = {
    escalated: { label: "Remontée", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300" },
    assigned_n2: { label: "Pris en charge (F3)", color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300" },
    closed_resolved: { label: "Résolu F3", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" },
    closed_webex: { label: "Visio programmée", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
  };
  return map[status] ?? { label: status, color: "bg-muted text-muted-foreground" };
}

export default function F3Ticket() {
  const [, setLocation] = useLocation();
  const params = useParams<{ id: string }>();
  const ticketId = Number(params.id);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [webexLink, setWebexLink] = useState("");
  const [visioScheduledAt, setVisioScheduledAt] = useState("");
  const [webexOpen, setWebexOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const token = getToken();
  const payload = token ? decodeToken(token) : null;

  useEffect(() => {
    if (!token || !payload || payload.role !== "f3") setLocation("/connexion");
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
    queryClient.invalidateQueries({ queryKey: ["/api/intervener/my-tickets"] });
  }

  function handleClaim() {
    claimTicket({ id: ticketId }, {
      onSuccess: () => { toast({ title: "Demande prise en charge" }); invalidate(); },
      onError: () => toast({ title: "Erreur", variant: "destructive" }),
    });
  }

  function handleResolve() {
    resolveN2({ id: ticketId }, {
      onSuccess: () => { toast({ title: "Demande traitée" }); invalidate(); },
      onError: () => toast({ title: "Erreur", variant: "destructive" }),
    });
  }

  function handleCloseWebex() {
    if (!webexLink.trim() || !visioScheduledAt) return;
    const scheduledAt = new Date(visioScheduledAt);
    if (Number.isNaN(scheduledAt.getTime())) {
      toast({ title: "Date invalide", variant: "destructive" });
      return;
    }
    closeWebex({
      id: ticketId,
      data: { webexLink: webexLink.trim(), scheduledAt: scheduledAt.toISOString() },
    }, {
      onSuccess: () => {
        toast({ title: "Session visio programmée" });
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

  const userId = payload?.userId as number | undefined;
  const isEscalated = ticket?.status === "escalated";
  const isMyTicket = ticket?.status === "assigned_n2";
  const isVisioScheduled = ticket?.status === "closed_webex";
  const canReassign = ticket
    && userId
    && ticket.assignedN2Id === userId
    && ["assigned_n2", "closed_webex"].includes(ticket.status);
  const chatClosed = ticket ? isChatClosed(ticket.status) : true;
  const showChat = ticket && (isMyTicket || isVisioScheduled) && !chatClosed;

  function handleReassigned() {
    toast({ title: "Demande transférée" });
    invalidate();
    setLocation("/f3");
  }

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto py-6 space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/f3">
            <Button variant="ghost" size="sm" className="gap-1">
              <ArrowLeft className="h-4 w-4" />Retour
            </Button>
          </Link>
          <div className="flex-1">
            {ticketLoading ? <Skeleton className="h-7 w-48" /> : (
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl font-bold">Demande n° {ticketId}</h1>
                {ticket && (() => {
                  const { label, color } = statusLabel(ticket.status);
                  return <span className={cn("px-2.5 py-1 rounded-full text-xs font-medium", color)}>{label}</span>;
                })()}
              </div>
            )}
            {ticket && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {ticket.school?.name} · {ticket.discipline?.name}
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

        {isEscalated && (
          <p className="text-sm text-muted-foreground bg-muted/50 border rounded-lg px-4 py-3">
            Lisez la demande ci-dessus. Si vous êtes en capacité de répondre, prenez-la en charge.
          </p>
        )}

        {(isEscalated || isMyTicket || canReassign) && (
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
                      Programmer une visio
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Programmer une session visio</DialogTitle>
                      <DialogDescription>
                        Indiquez la date, l&apos;heure et le lien. L&apos;enseignant et la personne ressource établissement en seront informés.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="visio-date">Date et heure de la session</Label>
                        <Input
                          id="visio-date"
                          type="datetime-local"
                          value={visioScheduledAt}
                          onChange={(e) => setVisioScheduledAt(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="visio-link">Lien visio</Label>
                        <Input
                          id="visio-link"
                          placeholder="https://…/lien-visio"
                          value={webexLink}
                          onChange={(e) => setWebexLink(e.target.value)}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setWebexOpen(false)}>Annuler</Button>
                      <Button onClick={handleCloseWebex} disabled={closingWebex || !webexLink.trim() || !visioScheduledAt}>
                        {closingWebex ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Valider
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <ReassignTicketDialog
                  ticketId={ticketId}
                  level="n2"
                  roleLabel="F3"
                  onSuccess={handleReassigned}
                />
              </>
            )}
            {canReassign && !isMyTicket && (
              <ReassignTicketDialog
                ticketId={ticketId}
                level="n2"
                roleLabel="F3"
                onSuccess={handleReassigned}
              />
            )}
          </div>
        )}

        {ticket?.webexLink && (
          <VisioNotice link={ticket.webexLink} scheduledAt={ticket.webexScheduledAt} />
        )}

        {showChat && (
        <Card className="border-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Échanges</CardTitle>
            {isVisioScheduled && (
              <p className="text-sm text-muted-foreground font-normal">
                La messagerie reste ouverte jusqu&apos;à la session visio.
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
              {messagesLoading && <Skeleton className="h-16 w-full" />}
              {messages?.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">Aucun échange. Commencez la discussion.</p>
              )}
              {messages?.map((msg) => (
                <ChatMessage
                  key={msg.id}
                  content={msg.content}
                  createdAt={msg.createdAt}
                  senderType={msg.senderType}
                  messageType={msg.messageType}
                  staffLabel="Personne ressource externe"
                />
              ))}
              <div ref={messagesEndRef} />
            </div>

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
          </CardContent>
        </Card>
        )}
      </div>
    </AppLayout>
  );
}
