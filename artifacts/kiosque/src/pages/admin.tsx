import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ApiError,
  useListUsers, useCreateUser, useUpdateUser, useDeleteUser,
  useCreateSchool, useCreateDiscipline, useListSchools, useListDisciplines,
} from "@workspace/api-client-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { usernameSchema } from "@/lib/username";
import { getToken, decodeToken } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Users, Building2, BookOpen, Plus, Check, X, Shield, KeyRound, Pencil, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { STAFF_ROLES, ROLE_LABELS, ROLE_COLORS } from "@/lib/roles";

const ROLES = STAFF_ROLES;
const NONE = "__none__";

type NewUserForm = {
  username: string;
  password: string;
  role: string;
  schoolId: string;
  disciplineId: string;
};

const emptyUserForm = (): NewUserForm => ({
  username: "",
  password: "",
  role: "f2",
  schoolId: NONE,
  disciplineId: NONE,
});

export default function Admin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const token = getToken();
  const payload = token ? decodeToken(token) : null;

  useEffect(() => {
    if (!token || !payload || payload.role !== "admin") setLocation("/admin/connexion");
  }, [token, payload, setLocation]);

  const { data: users, isLoading: usersLoading } = useListUsers();
  const { data: schools } = useListSchools();
  const { data: disciplines } = useListDisciplines();
  const { mutate: createUser, isPending: creatingUser } = useCreateUser();
  const { mutate: updateUser, isPending: updatingUser } = useUpdateUser();
  const { mutate: deleteUser, isPending: deletingUser } = useDeleteUser();
  const { mutate: createSchool, isPending: creatingSchool } = useCreateSchool();
  const { mutate: createDiscipline, isPending: creatingDiscipline } = useCreateDiscipline();

  const [newUser, setNewUser] = useState<NewUserForm>(emptyUserForm);
  const [newSchool, setNewSchool] = useState({ name: "", city: "" });
  const [newDiscipline, setNewDiscipline] = useState({ name: "" });
  const [resetPasswordFor, setResetPasswordFor] = useState<number | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [renameUserId, setRenameUserId] = useState<number | null>(null);
  const [renameUsername, setRenameUsername] = useState("");
  const [deleteUserId, setDeleteUserId] = useState<number | null>(null);
  const currentUserId = payload?.userId as number | undefined;

  function handleCreateUser() {
    if (!newUser.username || !newUser.password) {
      toast({ title: "Champs requis", description: "Pseudo et mot de passe sont obligatoires.", variant: "destructive" });
      return;
    }
    createUser({
      data: {
        username: newUser.username,
        password: newUser.password,
        role: newUser.role,
        schoolId: newUser.schoolId !== NONE ? Number(newUser.schoolId) : undefined,
        disciplineId: newUser.disciplineId !== NONE ? Number(newUser.disciplineId) : undefined,
      },
    }, {
      onSuccess: () => {
        toast({ title: "Compte créé", description: newUser.username });
        setNewUser(emptyUserForm());
        queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      },
      onError: () => toast({ title: "Erreur", description: "Impossible de créer le compte.", variant: "destructive" }),
    });
  }

  function handleToggleActive(id: number, active: boolean) {
    updateUser({ id, data: { active: !active } }, {
      onSuccess: () => {
        toast({ title: active ? "Compte désactivé" : "Compte réactivé" });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      },
      onError: () => toast({ title: "Erreur", variant: "destructive" }),
    });
  }

  function handleResetPassword(id: number) {
    if (!newPassword) return;
    updateUser({ id, data: { password: newPassword } }, {
      onSuccess: () => {
        toast({ title: "Mot de passe mis à jour" });
        setResetPasswordFor(null);
        setNewPassword("");
      },
      onError: () => toast({ title: "Erreur", description: "Impossible de modifier le mot de passe.", variant: "destructive" }),
    });
  }

  function handleRenameUser(id: number) {
    const parsed = usernameSchema.safeParse(renameUsername.trim());
    if (!parsed.success) {
      toast({ title: "Pseudo invalide", description: parsed.error.issues[0]?.message, variant: "destructive" });
      return;
    }
    updateUser({ id, data: { username: parsed.data } }, {
      onSuccess: () => {
        toast({ title: "Pseudo mis à jour", description: parsed.data });
        setRenameUserId(null);
        setRenameUsername("");
        queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      },
      onError: (err: unknown) => {
        toast({
          title: "Erreur",
          description: err instanceof ApiError && err.status === 409
            ? "Ce pseudo est déjà utilisé."
            : "Impossible de renommer le compte.",
          variant: "destructive",
        });
      },
    });
  }

  function handleDeleteUser(id: number) {
    deleteUser({ id }, {
      onSuccess: () => {
        toast({ title: "Compte supprimé" });
        setDeleteUserId(null);
        queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      },
      onError: (err) => {
        toast({
          title: "Erreur",
          description: err instanceof ApiError ? err.message : "Impossible de supprimer le compte.",
          variant: "destructive",
        });
        setDeleteUserId(null);
      },
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

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto py-6 space-y-8">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-lg">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Administration</h1>
            <p className="text-muted-foreground text-sm">
              Gestion des identifiants des personnes ressources, établissements et disciplines
            </p>
          </div>
        </div>

        <Card className="border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Personnes ressources ({users?.length ?? 0})
            </CardTitle>
            <CardDescription>
              Créez les pseudos et mots de passe de connexion pour les personnes ressources et responsables.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
              <p className="text-sm font-medium">Nouveau compte</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="new-username">Pseudo</Label>
                  <Input
                    id="new-username"
                    value={newUser.username}
                    onChange={(e) => setNewUser((u) => ({ ...u, username: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="new-password">Mot de passe</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser((u) => ({ ...u, password: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Rôle</Label>
                  <Select
                    value={newUser.role}
                    onValueChange={(v) => setNewUser((u) => ({ ...u, role: v }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => (
                        <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Établissement</Label>
                  <Select value={newUser.schoolId} onValueChange={(v) => setNewUser((u) => ({ ...u, schoolId: v }))}>
                    <SelectTrigger><SelectValue placeholder="Optionnel" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Aucun</SelectItem>
                      {schools?.map((s) => (
                        <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Discipline</Label>
                  <Select value={newUser.disciplineId} onValueChange={(v) => setNewUser((u) => ({ ...u, disciplineId: v }))}>
                    <SelectTrigger><SelectValue placeholder="Optionnel" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Aucune</SelectItem>
                      {disciplines?.map((d) => (
                        <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button onClick={handleCreateUser} disabled={creatingUser} className="gap-1">
                <Plus className="h-4 w-4" />
                Créer le compte
              </Button>
            </div>

            {usersLoading && <Skeleton className="h-32" />}
            {!usersLoading && (
              <div className="divide-y">
                {users?.map((u) => (
                  <div key={u.id} className="py-3 space-y-2">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className={`shrink-0 px-2 py-0.5 rounded text-xs font-bold ${ROLE_COLORS[u.role] ?? "bg-muted text-muted-foreground"}`}>
                          {ROLE_LABELS[u.role] ?? u.role}
                        </span>
                        {renameUserId === u.id ? (
                          <Input
                            value={renameUsername}
                            onChange={(e) => setRenameUsername(e.target.value)}
                            className="h-8 max-w-[200px]"
                            autoFocus
                          />
                        ) : (
                          <span className="text-sm font-medium truncate">{u.username}</span>
                        )}
                        {u.school && (
                          <span className="text-xs text-muted-foreground hidden md:block truncate">{u.school.name}</span>
                        )}
                        {u.discipline && (
                          <span className="text-xs text-muted-foreground hidden lg:block truncate">{u.discipline.name}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant={u.active ? "default" : "secondary"} className="text-xs">
                          {u.active ? "Actif" : "Inactif"}
                        </Badge>
                        {renameUserId === u.id ? (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2"
                              title="Enregistrer le pseudo"
                              onClick={() => handleRenameUser(u.id)}
                              disabled={updatingUser}
                            >
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2"
                              title="Annuler"
                              onClick={() => {
                                setRenameUserId(null);
                                setRenameUsername("");
                              }}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2"
                            title="Renommer"
                            onClick={() => {
                              setRenameUserId(u.id);
                              setRenameUsername(u.username);
                              setResetPasswordFor(null);
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2"
                          title="Réinitialiser le mot de passe"
                          onClick={() => {
                            setResetPasswordFor(resetPasswordFor === u.id ? null : u.id);
                            setNewPassword("");
                            setRenameUserId(null);
                          }}
                        >
                          <KeyRound className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2"
                          title={u.active ? "Désactiver" : "Réactiver"}
                          onClick={() => handleToggleActive(u.id, u.active ?? true)}
                        >
                          {u.active ? <X className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-destructive hover:text-destructive"
                          title={currentUserId === u.id ? "Vous ne pouvez pas supprimer votre propre compte" : "Supprimer"}
                          disabled={currentUserId === u.id}
                          onClick={() => setDeleteUserId(u.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    {resetPasswordFor === u.id && (
                      <div className="flex gap-2 pl-1">
                        <Input
                          type="password"
                          placeholder="Nouveau mot de passe"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="max-w-xs"
                        />
                        <Button size="sm" onClick={() => handleResetPassword(u.id)} disabled={updatingUser || !newPassword}>
                          Enregistrer
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
                {!users?.length && (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    Aucun compte. Créez le premier compte personne ressource ci-dessus.
                  </p>
                )}
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
                <Input placeholder="Nom de l'établissement" value={newSchool.name} onChange={(e) => setNewSchool((s) => ({ ...s, name: e.target.value }))} />
                <Input placeholder="Ville" value={newSchool.city} onChange={(e) => setNewSchool((s) => ({ ...s, city: e.target.value }))} className="w-28" />
                <Button onClick={handleCreateSchool} disabled={creatingSchool || !newSchool.name} size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="divide-y max-h-48 overflow-y-auto">
                {schools?.map((s) => (
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
                <Input placeholder="Nom de la discipline" value={newDiscipline.name} onChange={(e) => setNewDiscipline({ name: e.target.value })} />
                <Button onClick={handleCreateDiscipline} disabled={creatingDiscipline || !newDiscipline.name} size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="divide-y max-h-48 overflow-y-auto">
                {disciplines?.map((d) => (
                  <div key={d.id} className="py-2 text-sm font-medium">{d.name}</div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <AlertDialog open={deleteUserId !== null} onOpenChange={(open) => !open && setDeleteUserId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer ce compte ?</AlertDialogTitle>
              <AlertDialogDescription>
                Le compte{" "}
                <span className="font-medium text-foreground">
                  {users?.find((u) => u.id === deleteUserId)?.username}
                </span>{" "}
                sera définitivement supprimé. Cette action est irréversible.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={deletingUser}
                onClick={() => deleteUserId !== null && handleDeleteUser(deleteUserId)}
              >
                Supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
}
