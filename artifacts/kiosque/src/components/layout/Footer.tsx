import { Link } from "wouter";

export function Footer() {
  return (
    <footer className="border-t bg-white">
      <div className="container mx-auto flex flex-col items-center gap-3 px-4 py-6 text-center text-sm text-muted-foreground sm:flex-row sm:justify-between sm:text-left">
        <a href="https://evalution-asso.ch/" target="_blank" rel="noopener noreferrer">
          <img
            src={`${import.meta.env.BASE_URL}logo-evalution.png`}
            alt="evꜵlution"
            className="h-14 w-auto object-contain"
          />
        </a>
        <div className="max-w-xl space-y-2">
          <p>
            Une solution{" "}
            <a
              href="https://evalution-asso.ch/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-foreground underline hover:no-underline"
            >
              evꜵlution
            </a>
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
