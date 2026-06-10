import { useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AppLayout } from "@/components/layout/AppLayout";
import { useCreateTicket, useListSchools, useListDisciplines } from "@workspace/api-client-react";
import { Loader2, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { setToken } from "@/lib/auth";

const formSchema = z.object({
  schoolId: z.coerce.number().min(1, "Choisissez un établissement"),
  disciplineId: z.coerce.number().min(1, "Choisissez une discipline"),
  description: z.string().min(20, "Décrivez votre situation en au moins 20 caractères").max(2000),
});

export default function NouveauTicket() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: schools, isLoading: schoolsLoading } = useListSchools();
  const { data: disciplines, isLoading: disciplinesLoading } = useListDisciplines();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { schoolId: 0, disciplineId: 0, description: "" },
  });

  const { mutate: createTicket, isPending } = useCreateTicket();

  function onSubmit(values: z.infer<typeof formSchema>) {
    createTicket({ data: values }, {
      onSuccess: (data) => {
        setToken(data.token);
        sessionStorage.setItem("ticket_credentials", JSON.stringify({
          ticketNumber: data.ticketNumber,
          password: data.password,
        }));
        setLocation("/credentials");
      },
      onError: () => {
        toast({
          title: "Erreur",
          description: "Impossible de créer le ticket. Réessayez.",
          variant: "destructive",
        });
      }
    });
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto py-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-lg">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Nouvelle demande d'accompagnement</h1>
            <p className="text-muted-foreground text-sm">Votre demande est totalement anonyme</p>
          </div>
        </div>

        <Card className="border-2">
          <CardHeader>
            <CardTitle>Décrivez votre situation</CardTitle>
            <CardDescription>
              Aucune information permettant de vous identifier ne sera collectée.
              Un numéro de ticket et un mot de passe vous seront remis à la fin.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="schoolId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Établissement</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value?.toString()}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Choisir un établissement…" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {schoolsLoading && <SelectItem value="0" disabled>Chargement…</SelectItem>}
                          {schools?.map((s) => (
                            <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="disciplineId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Discipline</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value?.toString()}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Choisir une discipline…" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {disciplinesLoading && <SelectItem value="0" disabled>Chargement…</SelectItem>}
                          {disciplines?.map((d) => (
                            <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Décrivez votre situation</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Expliquez la situation que vous rencontrez, le contexte pédagogique, ce que vous avez déjà essayé…"
                          className="min-h-[160px] resize-y"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" size="lg" disabled={isPending}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Envoyer ma demande
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
