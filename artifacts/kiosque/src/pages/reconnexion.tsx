import { useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { useLoginTicket } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { AppLayout } from "@/components/layout/AppLayout";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  ticketNumber: z.coerce.number().min(1, "Numéro de demande invalide"),
  password: z.string().min(1, "Mot de passe requis"),
});

export default function Reconnexion() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { ticketNumber: "" as any, password: "" },
  });

  const { mutate: doLogin, isPending } = useLoginTicket();

  function onSubmit(values: z.infer<typeof formSchema>) {
    doLogin({ data: values }, {
      onSuccess: (data) => {
        login(data.token, "/mon-ticket");
      },
      onError: () => {
        toast({
          title: "Accès refusé",
          description: "Numéro de demande ou mot de passe incorrect.",
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
            <CardTitle className="text-2xl">Suivre une demande</CardTitle>
            <CardDescription>
              Saisissez les identifiants qui vous ont été fournis lors de la création de votre demande.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="ticketNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Numéro de demande</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="Ex: 84" {...field} />
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
                        <PasswordInput placeholder="Ex: ROBOT-84-VERT" autoComplete="current-password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isPending}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Accéder à ma demande
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
