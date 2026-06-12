export const STAFF_ROLES = ["f2", "f3", "rd", "pg", "direction", "admin"] as const;

/** Rôles qui se connectent via /admin/connexion (hors F2/F3). */
export const OVERSIGHT_ROLES = ["admin", "rd", "pg", "direction"] as const;

export function isOversightRole(role: string): boolean {
  return (OVERSIGHT_ROLES as readonly string[]).includes(role);
}

export function dashboardPathForRole(role: string): string | undefined {
  switch (role) {
    case "f2": return "/f2";
    case "f3": return "/f3";
    case "rd":
    case "direction": return "/tableau-rd";
    case "pg": return "/tableau-pg";
    case "admin": return "/tableau-admin";
    default: return undefined;
  }
}

export function loginPathForRole(role: string): string {
  return isOversightRole(role) ? "/admin/connexion" : "/connexion";
}

export const ROLE_LABELS: Record<string, string> = {
  f2: "Personne ressource établissement (F2)",
  f3: "Personne ressource externe (F3)",
  rd: "Responsable de discipline (RD)",
  pg: "Présidence de groupe (PG)",
  direction: "Direction",
  admin: "Administrateur",
};

export const ROLE_COLORS: Record<string, string> = {
  admin: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  f2: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  f3: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  rd: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  pg: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  direction: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300",
};
