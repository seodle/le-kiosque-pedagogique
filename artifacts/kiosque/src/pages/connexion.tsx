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
import { isOversightRole } from "@/lib/roles";
import { AppLayout } from "@/components/layout/AppLayout";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  username: usernameSchema,
  password: z.string().min(1, "Mot de passe requis"),
});

export default function Connexion() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { username: "", password: "" },
  });

  const { mutate: doLogin, isPending } = useStaffLogin();

  function onSubmit(values: z.infer<typeof formSchema>) {
    doLogin({ data: values }, {
      onSuccess: (data) => {
        const payload = decodeToken(data.token);
        if (payload?.role && isOversightRole(payload.role)) {
          toast({
            title: "Espace dédié",
            description: "RD, PG, direction et admin se connectent via l'espace administration.",
            variant: "destructive",
          });
          return;
        }
        login(data.token);
      },
      onError: () => {
        toast({
          title: "Erreur de connexion",
          description: "Vérifiez vos identifiants et réessayez.",
          variant: "destructive"
        });
      }
    });
  }

  return (
    <AppLayout>
      <div className="flex items-center justify-center min-h-[70vh]">
        <Card className="w-full max-w-md shadow-sm border-2">
          <CardHeader className="space-y-2 text-center pb-6">
            <CardTitle className="text-2xl">Espace Personnes Ressources</CardTitle>
            <CardDescription>
              Connexion réservée aux personnes ressources F1 et F2.
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
              <Link href="/admin/connexion" className="underline hover:text-foreground">
                Administration, RD, PG ou direction
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
