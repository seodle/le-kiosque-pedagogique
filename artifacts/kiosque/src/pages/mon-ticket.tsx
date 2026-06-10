import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetMyTicket, useGetTicketMessages, useSendMessage } from "@workspace/api-client-react";
import { getToken, decodeToken } from "@/lib/auth";
import { Send, MessageSquare, Clock, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

function statusLabel(status: string) {
  switch (status) {
    case "new": return { label: "En attente", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300" };
    case "claimed_n1": return { label: "Pris en charge", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" };
    case "escalated": return { label: "Escaladé", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300" };
    case "claimed_n2": return { label: "En cours N2", color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300" };
    case "resolved_n1": return { label: "Résolu", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" };
    case "resolved_n2": return { label: "Résolu", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" };
    case "closed_webex": return { label: "Clôturé (Webex)", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" };
    default: return { label: status, color: "bg-muted text-muted-foreground" };
  }
}

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
    { query: { enabled: !!ticketId, refetchInterval: 5000 } as any }
  );
  const { mutate: sendMessage, isPending: sending } = useSendMessage();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messagesData]);

  function handleSend() {
    if (!message.trim() || !ticketId) return;
    sendMessage(
      { data: { ticketId, content: message.trim() } },
      {
        onSuccess: () => setMessage(""),
        onError: () => toast({ title: "Erreur", description: "Impossible d'envoyer le message.", variant: "destructive" }),
      }
    );
  }

  if (!ticketId) return null;

  const { label, color } = ticket ? statusLabel(ticket.status) : { label: "", color: "" };
  const isResolved = ticket && ["resolved_n1", "resolved_n2", "closed_webex"].includes(ticket.status);

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Mon ticket</h1>
            {ticket && <p className="text-muted-foreground text-sm mt-1">#{ticket.id} · {ticket.school?.name} · {ticket.discipline?.name}</p>}
          </div>
          {ticket && (
            <span className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium", color)}>
              {isResolved ? <CheckCircle className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
              {label}
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
          <Card className="border-2 border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20">
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 shrink-0" />
              <div>
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200">Réunion Webex programmée</p>
                <a href={ticket.webexLink} target="_blank" rel="noopener noreferrer"
                  className="text-sm text-blue-600 underline break-all">{ticket.webexLink}</a>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="h-4 w-4" />
              Échanges
            </CardTitle>
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
                <div
                  key={msg.id}
                  className={cn(
                    "rounded-lg px-4 py-3 max-w-[85%]",
                    msg.senderType === "teacher"
                      ? "ml-auto bg-primary text-primary-foreground"
                      : "mr-auto bg-muted"
                  )}
                >
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                  <p className={cn("text-xs mt-1.5", msg.senderType === "teacher" ? "text-primary-foreground/70" : "text-muted-foreground")}>
                    {new Date(msg.createdAt).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {!isResolved && (
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
            {isResolved && (
              <p className="text-sm text-center text-muted-foreground pt-2 border-t">
                Ce ticket est clôturé. Merci d'avoir utilisé le Kiosque Pédagogique.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
