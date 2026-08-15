// Formate une date ISO en texte relatif lisible : "Aujourd'hui à 9h10",
// "Hier à 9h10", "Avant-hier à 9h10", puis "Il y a N jours à ...", et enfin
// une vraie date pour tout ce qui est plus vieux qu'une semaine.
export function formatRelativeDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();

  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((startOfDay(now).getTime() - startOfDay(date).getTime()) / 86400000);

  const time = date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }).replace(":", "h");

  if (diffDays === 0) return `Aujourd'hui à ${time}`;
  if (diffDays === 1) return `Hier à ${time}`;
  if (diffDays === 2) return `Avant-hier à ${time}`;
  if (diffDays > 2 && diffDays < 7) return `Il y a ${diffDays} jours à ${time}`;

  return `${date.toLocaleDateString("fr-FR")} à ${time}`;
}
