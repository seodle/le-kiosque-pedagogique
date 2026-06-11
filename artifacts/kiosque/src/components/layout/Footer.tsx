export function Footer() {
  return (
    <footer className="border-t bg-white">
      <div className="container mx-auto flex flex-col items-center gap-3 px-4 py-6 text-center text-sm text-muted-foreground sm:flex-row sm:justify-between sm:text-left">
        <img
          src={`${import.meta.env.BASE_URL}logo-geneve.png`}
          alt="Armoiries de la République et canton de Genève"
          className="h-14 w-auto object-contain"
        />
        <p className="max-w-xl">
          Ce kiosque est créé par le{" "}
          <span className="font-medium text-foreground">
            Service enseignement et évaluation de la Direction générale de
            l'enseignement obligatoire
          </span>
        </p>
      </div>
    </footer>
  );
}
