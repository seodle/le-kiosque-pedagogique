import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { usernameSchema } from "@/lib/username";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { useStaffLogin } from "@workspace/api-client-react";
import { decodeToken, useAuth } from "@/lib/auth";
import { dashboardPathForRole, isOversightRole } from "@/lib/roles";
import { AppLayout } from "@/components/layout/AppLayout";
import { Loader2, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  username: usernameSchema,
  password: z.string().min(1, "Mot de passe requis"),
});

export default function AdminConnexion() {
  const [, setLocation] = useLocation();
  const { role, login } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (role && isOversightRole(role)) {
      const redirect = dashboardPathForRole(role);
      if (redirect) setLocation(redirect);
    }
  }, [role, setLocation]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { username: "", password: "" },
  });

  const { mutate: doLogin, isPending } = useStaffLogin();

  function onSubmit(values: z.infer<typeof formSchema>) {
    doLogin({ data: values }, {
      onSuccess: (data) => {
        const payload = decodeToken(data.token);
        const role = payload?.role;
        if (!role || !isOversightRole(role)) {
          toast({
            title: "Accès refusé",
            description: "Ce compte est réservé aux personnes ressources F2/F3. Utilisez l'espace personnes ressources.",
            variant: "destructive",
          });
          return;
        }
        const redirect = dashboardPathForRole(role);
        login(data.token, redirect);
      },
      onError: () => {
        toast({
          title: "Erreur de connexion",
          description: "Vérifiez vos identifiants et réessayez.",
          variant: "destructive",
        });
      },
    });
  }

  return (
    <AppLayout>
      <div className="flex items-center justify-center min-h-[70vh]">
        <Card className="w-full max-w-md shadow-sm border-2">
          <CardHeader className="space-y-2 text-center pb-6">
            <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Administration et pilotage</CardTitle>
            <CardDescription>
              Connexion réservée aux administrateurs, responsables de discipline, directions et présidence de groupe.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pseudo</FormLabel>
                      <FormControl>
                        <Input autoComplete="username" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mot de passe</FormLabel>
                      <FormControl>
                        <PasswordInput autoComplete="current-password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isPending}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Se connecter
                </Button>
              </form>
            </Form>
            <p className="mt-6 text-center text-sm text-muted-foreground">
              <Link href="/" className="underline hover:text-foreground">
                Retour à l'accueil
              </Link>
              {" · "}
              <Link href="/connexion" className="underline hover:text-foreground">
                Espace personnes ressources (F2/F3)
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
