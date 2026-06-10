import { Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { BookOpen, LogOut } from "lucide-react";

export function Navbar() {
  const { role, logout } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg text-primary tracking-tight">
            <BookOpen className="h-6 w-6" />
            <span>Le Kiosque Pédagogique</span>
          </Link>
        </div>
        
        <div className="flex items-center gap-4">
          {role ? (
            <>
              <div className="text-sm text-muted-foreground hidden sm:block">
                Connecté en tant que <span className="font-medium uppercase">{role}</span>
              </div>
              <Button variant="outline" size="sm" onClick={logout} className="gap-2">
                <LogOut className="h-4 w-4" />
                Déconnexion
              </Button>
            </>
          ) : (
            <Link href="/connexion">
              <Button variant="ghost" size="sm">Espace Agent</Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
