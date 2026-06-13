import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquarePlus, KeyRound, HeartHandshake } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";

export default function Home() {
  return (
    <AppLayout>
      <div className="flex flex-col items-center justify-center min-h-[70vh] max-w-3xl mx-auto text-center space-y-12">
        <div className="space-y-6">
          <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-full mb-4">
            <HeartHandshake className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">
            Entraide pédagogique pour le pilote de la réforme du cycle d'orientation
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Un espace d'écoute et d'accompagnement dédié aux enseignantes et enseignants qui mettent en oeuvre les leviers pédagogiques du pilote de la réforme du CO. 
            Posez vos questions en toute sérénité et de façon anonyme, des personnes ressources vous répondent.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 w-full max-w-2xl">
          <Card className="border-2 hover:border-primary/50 transition-colors shadow-sm">
            <CardHeader>
              <div className="bg-blue-50 dark:bg-blue-900/20 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <MessageSquarePlus className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <CardTitle>Nouvelle demande</CardTitle>
              <CardDescription className="text-base mt-2">
                Soumettez une nouvelle demande de façon anonyme.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/nouveau-ticket">
                <Button className="w-full" size="lg">Créer une demande</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-primary/50 transition-colors shadow-sm">
            <CardHeader>
              <div className="bg-emerald-50 dark:bg-emerald-900/20 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <KeyRound className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <CardTitle>Suivre une demande</CardTitle>
              <CardDescription className="text-base mt-2">
                Vous avez déjà vos identifiants ? Connectez-vous pour lire les réponses.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/reconnexion">
                <Button variant="outline" className="w-full" size="lg">Se reconnecter</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
