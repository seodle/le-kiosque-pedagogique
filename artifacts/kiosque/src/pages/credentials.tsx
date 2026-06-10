import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { KeyRound, Copy, CheckCheck, ArrowRight, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Credentials {
  ticketNumber: number;
  password: string;
}

export default function Credentials() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [credentials, setCredentials] = useState<Credentials | null>(null);
  const [copiedTicket, setCopiedTicket] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem("ticket_credentials");
    if (!raw) {
      setLocation("/");
      return;
    }
    setCredentials(JSON.parse(raw));
    sessionStorage.removeItem("ticket_credentials");
  }, [setLocation]);

  function copyText(text: string, which: "ticket" | "password") {
    navigator.clipboard.writeText(text).then(() => {
      if (which === "ticket") {
        setCopiedTicket(true);
        setTimeout(() => setCopiedTicket(false), 2000);
      } else {
        setCopiedPassword(true);
        setTimeout(() => setCopiedPassword(false), 2000);
      }
      toast({ title: "Copié !", description: "Conservez ces informations précieusement." });
    });
  }

  if (!credentials) return null;

  return (
    <AppLayout>
      <div className="max-w-lg mx-auto py-12 space-y-6">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
            <KeyRound className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-2xl font-bold">Votre ticket a été créé !</h1>
          <p className="text-muted-foreground">
            Notez soigneusement ces identifiants — ils sont <strong>la seule façon</strong> d'accéder à votre demande.
          </p>
        </div>

        <Card className="border-2 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="pt-4 pb-4 flex gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800 dark:text-amber-200">
              Ces identifiants ne vous seront plus montrés après cette page.
              Conservez-les dans un endroit sûr.
            </p>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Vos identifiants de connexion</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Numéro de ticket</p>
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="text-2xl font-mono px-4 py-2">
                  {credentials.ticketNumber}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyText(credentials.ticketNumber.toString(), "ticket")}
                  className="gap-2"
                >
                  {copiedTicket ? <CheckCheck className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  {copiedTicket ? "Copié" : "Copier"}
                </Button>
              </div>
            </div>

            <div className="border-t pt-4 space-y-2">
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Mot de passe</p>
              <div className="flex items-center gap-3">
                <code className="text-xl font-mono bg-muted px-4 py-2 rounded-md tracking-widest font-bold">
                  {credentials.password}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyText(credentials.password, "password")}
                  className="gap-2"
                >
                  {copiedPassword ? <CheckCheck className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  {copiedPassword ? "Copié" : "Copier"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Link href="/mon-ticket">
          <Button className="w-full gap-2" size="lg">
            Accéder à mon ticket
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </AppLayout>
  );
}
