// Convertit du texte simple (tapé sans aucune balise) en HTML propre :
// échappe les caractères spéciaux, transforme les lignes vides en
// séparation de paragraphes, et les sauts de ligne simples en <br>.
// C'est ce qui est stocké au final dans product.description, qui est
// toujours affiché comme du HTML sur la page produit publique (voir
// app/produit/[handle]/page.tsx, dangerouslySetInnerHTML) — donc même en
// mode "Texte simple", on doit produire du HTML valide pour que les
// sauts de ligne s'affichent correctement.
export function textToHtml(text: string): string {
  const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${escape(p).replace(/\n/g, "<br>")}</p>`);
  return paragraphs.join("\n");
}

// Heuristique simple pour deviner si un contenu existant a été écrit en
// HTML (contient au moins une vraie balise) — sert à pré-sélectionner le
// bon mode ("Texte simple" ou "HTML") quand on ouvre un produit existant.
export function looksLikeHtml(content: string): boolean {
  return /<[a-z][\s\S]*>/i.test(content);
}
