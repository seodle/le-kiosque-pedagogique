import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetMyTicket, useGetTicketMessages } from "@workspace/api-client-react";
import { useSendTicketMessage } from "@/hooks/use-send-ticket-message";
import { getToken, decodeToken } from "@/lib/auth";
import { Send, MessageSquare, Clock, CheckCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { VisioNotice } from "@/components/tickets/VisioNotice";
import { ChatMessage } from "@/components/tickets/ChatMessage";
import { isChatClosed } from "@/lib/ticket-status";

export default function MonTicket() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const token = getToken();
  const payload = token ? decodeToken(token) : null;
  const ticketId: number | undefined = payload?.ticketId;

  useEffect(() => {
    if (!token || !payload || payload.type !== "teacher") {
      setLocation("/reconnexion");
    }
  }, []);

  const { data: ticket, isLoading: ticketLoading } = useGetMyTicket({
    query: { enabled: !!ticketId } as any
  });
  const { data: messagesData, isLoading: messagesLoading } = useGetTicketMessages(
    ticketId!,
    { query: { enabled: !!ticketId, refetchInterval: 3000 } as any }
  );
  const { send, isPending: sending } = useSendTicketMessage(ticketId!);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messagesData]);

  function handleSend() {
    if (!message.trim() || !ticketId) return;
    send(message, {
      onSuccess: () => setMessage(""),
      onError: () => toast({ title: "Erreur", description: "Impossible d'envoyer le message.", variant: "destructive" }),
    });
  }

  if (!ticketId) return null;

  const isVisioScheduled = ticket?.status === "closed_webex";
  const isFullyClosed = ticket && isChatClosed(ticket.status);
  const chatClosed = ticket ? isChatClosed(ticket.status) : true;

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Ma demande</h1>
            {ticket && <p className="text-muted-foreground text-sm mt-1">Demande n° {ticket.id} · {ticket.school?.name} · {ticket.discipline?.name}</p>}
          </div>
          {ticket && (
            <span className="inline-flex items-center gap-1.5">
              {isFullyClosed ? <CheckCircle className="h-3.5 w-3.5 text-muted-foreground" /> : <Clock className="h-3.5 w-3.5 text-muted-foreground" />}
              <StatusBadge status={ticket.status} className="text-sm" />
            </span>
          )}
        </div>

        {ticketLoading && <Skeleton className="h-20 w-full" />}

        {ticket?.description && (
          <Card className="border-2 bg-muted/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground font-medium uppercase tracking-wide">Votre description initiale</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed">{ticket.description}</p>
            </CardContent>
          </Card>
        )}

        {ticket?.webexLink && (
          <VisioNotice link={ticket.webexLink} scheduledAt={ticket.webexScheduledAt} />
        )}

        <Card className="border-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="h-4 w-4" />
              Échanges
            </CardTitle>
            {isVisioScheduled && (
              <p className="text-sm text-muted-foreground font-normal">
                Vous pouvez continuer à échanger jusqu&apos;à la session visio.
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
              {messagesLoading && <Skeleton className="h-16 w-full" />}
              {messagesData?.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Aucun message pour l'instant. Un intervenant vous répondra bientôt.
                </p>
              )}
              {messagesData?.map((msg) => (
                <ChatMessage
                  key={msg.id}
                  content={msg.content}
                  createdAt={msg.createdAt}
                  senderType={msg.senderType}
                  messageType={msg.messageType}
                  staffLabel="Personne ressource"
                  perspective="teacher"
                />
              ))}
              <div ref={messagesEndRef} />
            </div>

            {!chatClosed && (
              <div className="flex gap-2 pt-2 border-t">
                <Textarea
                  placeholder="Votre message…"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="resize-none min-h-[80px]"
                  onKeyDown={(e) => { if (e.key === "Enter" && e.ctrlKey) handleSend(); }}
                />
                <Button
                  onClick={handleSend}
                  disabled={!message.trim() || sending}
                  className="self-end shrink-0"
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            )}
            {chatClosed && (
              <p className="text-sm text-center text-muted-foreground pt-2 border-t">
                Cette demande est clôturée. Merci d&apos;avoir utilisé le Kiosque Pédagogique.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
