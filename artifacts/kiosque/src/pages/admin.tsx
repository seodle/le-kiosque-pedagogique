import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useListUsers, useCreateUser, useUpdateUser,
  useCreateSchool, useCreateDiscipline, useListSchools, useListDisciplines
} from "@workspace/api-client-react";
import { getToken, decodeToken } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Users, Building2, BookOpen, Plus, Check, X, Shield } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

const ROLES = ["n1", "n2", "rd", "pg", "admin"];

export default function Admin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const token = getToken();
  const payload = token ? decodeToken(token) : null;

  useEffect(() => {
    if (!token || !payload || payload.role !== "admin") setLocation("/connexion");
  }, []);

  const { data: users, isLoading: usersLoading } = useListUsers();
  const { data: schools } = useListSchools();
  const { data: disciplines } = useListDisciplines();

  const { mutate: createUser, isPending: creatingUser } = useCreateUser();
  const { mutate: updateUser } = useUpdateUser();
  const { mutate: createSchool, isPending: creatingSchool } = useCreateSchool();
  const { mutate: createDiscipline, isPending: creatingDiscipline } = useCreateDiscipline();

  const [newUser, setNewUser] = useState({ email: "", password: "", role: "n1", schoolId: "", disciplineId: "" });
  const [newSchool, setNewSchool] = useState({ name: "", city: "" });
  const [newDiscipline, setNewDiscipline] = useState({ name: "" });

  function handleCreateUser() {
    if (!newUser.email || !newUser.password) return;
    createUser({
      data: {
        email: newUser.email,
        password: newUser.password,
        role: newUser.role,
        schoolId: newUser.schoolId ? Number(newUser.schoolId) : undefined,
        disciplineId: newUser.disciplineId ? Number(newUser.disciplineId) : undefined,
      }
    }, {
      onSuccess: () => {
        toast({ title: "Agent créé", description: newUser.email });
        setNewUser({ email: "", password: "", role: "n1", schoolId: "", disciplineId: "" });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      },
      onError: () => toast({ title: "Erreur", description: "Impossible de créer l'agent.", variant: "destructive" }),
    });
  }

  function handleToggleActive(id: number, active: boolean) {
    updateUser({ id, data: { active: !active } }, {
      onSuccess: () => {
        toast({ title: active ? "Agent désactivé" : "Agent activé" });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      },
      onError: () => toast({ title: "Erreur", variant: "destructive" }),
    });
  }

  function handleCreateSchool() {
    if (!newSchool.name) return;
    createSchool({ data: { name: newSchool.name, city: newSchool.city || undefined } }, {
      onSuccess: () => {
        toast({ title: "Établissement ajouté", description: newSchool.name });
        setNewSchool({ name: "", city: "" });
        queryClient.invalidateQueries({ queryKey: ["/api/reference/schools"] });
      },
      onError: () => toast({ title: "Erreur", variant: "destructive" }),
    });
  }

  function handleCreateDiscipline() {
    if (!newDiscipline.name) return;
    createDiscipline({ data: { name: newDiscipline.name } }, {
      onSuccess: () => {
        toast({ title: "Discipline ajoutée", description: newDiscipline.name });
        setNewDiscipline({ name: "" });
        queryClient.invalidateQueries({ queryKey: ["/api/reference/disciplines"] });
      },
      onError: () => toast({ title: "Erreur", variant: "destructive" }),
    });
  }

  const roleColor: Record<string, string> = {
    admin: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    n1: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    n2: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
    rd: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    pg: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  };

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto py-6 space-y-8">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-lg">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Administration</h1>
            <p className="text-muted-foreground text-sm">Gestion des agents, établissements et disciplines</p>
          </div>
        </div>

        <Card className="border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Agents ({users?.length ?? 0})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2">
              <Input placeholder="Email" value={newUser.email} onChange={e => setNewUser(u => ({ ...u, email: e.target.value }))} />
              <Input placeholder="Mot de passe" type="password" value={newUser.password} onChange={e => setNewUser(u => ({ ...u, password: e.target.value }))} />
              <Select value={newUser.role} onValueChange={v => setNewUser(u => ({ ...u, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ROLES.map(r => <SelectItem key={r} value={r}>{r.toUpperCase()}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={newUser.schoolId} onValueChange={v => setNewUser(u => ({ ...u, schoolId: v }))}>
                <SelectTrigger><SelectValue placeholder="Établissement (opt.)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Aucun</SelectItem>
                  {schools?.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button onClick={handleCreateUser} disabled={creatingUser} className="gap-1 w-full">
                <Plus className="h-4 w-4" />Ajouter
              </Button>
            </div>

            {usersLoading && <Skeleton className="h-32" />}
            {!usersLoading && (
              <div className="divide-y">
                {users?.map((u) => (
                  <div key={u.id} className="flex items-center justify-between py-3 gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className={`shrink-0 px-2 py-0.5 rounded text-xs font-bold uppercase ${roleColor[u.role] ?? "bg-muted text-muted-foreground"}`}>{u.role}</span>
                      <span className="text-sm font-medium truncate">{u.email}</span>
                      {u.school && <span className="text-xs text-muted-foreground hidden sm:block truncate">{u.school.name}</span>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={u.active ? "default" : "secondary"} className="text-xs">
                        {u.active ? "Actif" : "Inactif"}
                      </Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2"
                        onClick={() => handleToggleActive(u.id, u.active ?? true)}
                      >
                        {u.active ? <X className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="border">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Établissements ({schools?.length ?? 0})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input placeholder="Nom de l'établissement" value={newSchool.name} onChange={e => setNewSchool(s => ({ ...s, name: e.target.value }))} />
                <Input placeholder="Ville" value={newSchool.city} onChange={e => setNewSchool(s => ({ ...s, city: e.target.value }))} className="w-28" />
                <Button onClick={handleCreateSchool} disabled={creatingSchool || !newSchool.name} size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="divide-y max-h-48 overflow-y-auto">
                {schools?.map(s => (
                  <div key={s.id} className="py-2 flex justify-between text-sm">
                    <span className="font-medium">{s.name}</span>
                    <span className="text-muted-foreground">{s.city}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Disciplines ({disciplines?.length ?? 0})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input placeholder="Nom de la discipline" value={newDiscipline.name} onChange={e => setNewDiscipline({ name: e.target.value })} />
                <Button onClick={handleCreateDiscipline} disabled={creatingDiscipline || !newDiscipline.name} size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="divide-y max-h-48 overflow-y-auto">
                {disciplines?.map(d => (
                  <div key={d.id} className="py-2 text-sm font-medium">{d.name}</div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
