import { Link } from "wouter";

export function Footer() {
  return (
    <footer className="border-t bg-white">
      <div className="container mx-auto flex flex-col items-center gap-3 px-4 py-6 text-center text-sm text-muted-foreground sm:flex-row sm:justify-between sm:text-left">
        <img
          src={`${import.meta.env.BASE_URL}logo-geneve.png`}
          alt="Armoiries de la République et canton de Genève"
          className="h-14 w-auto object-contain"
        />
        <div className="max-w-xl space-y-2">
          <p>
            Ce kiosque est mis à disposition par le{" "}
            <span className="font-medium text-foreground">
              Service enseignement et évaluation de la Direction générale de
              l'enseignement obligatoire
            </span>
          </p>
          <p>
            <Link href="/admin/connexion" className="text-xs underline hover:text-foreground">
              Accès administration
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
