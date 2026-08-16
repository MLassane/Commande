// Deux fournisseurs d'IA gratuits, chacun pour sa spécialité :
// - Gemini (Google) pour l'analyse de photo, car son tier gratuit gère
//   très bien les images (~1500 requêtes/jour gratuites).
// - Groq pour la génération de texte/HTML, car il héberge des modèles
//   open source (Llama) gratuitement, très rapide.
// Clés à configurer dans Vercel : GEMINI_API_KEY et GROQ_API_KEY.

// Conventions de marque, reprises du flux de travail habituel : sert de
// contexte à chaque génération pour rester cohérent avec le style déjà
// utilisé sur les pages produit existantes.
export const BRAND_GUIDELINES = `
Tu écris du contenu marketing en français pour des pages produit e-commerce
vendues au Niger, en Côte d'Ivoire, au Sénégal et au Mali (paiement à la
livraison, prix en FCFA). Règles à respecter strictement :
- Utilise le framework AIDA ou PAS (Problème-Agitation-Solution).
- Prix toujours en FCFA. Mentionne "paiement à la livraison" comme signal de confiance.
- Si tu écris des témoignages clients, localise-les dans des villes ouest-africaines
  (Niamey, Abidjan, Dakar, Bamako, Maradi, Zinder) avec des prénoms/noms plausibles pour la région.
- Adoucis toute allégation de santé/efficacité non prouvée (évite les promesses médicales fermes).
- Palette de couleurs à utiliser en CSS inline : violet #6b3fa0 (accents, titres), rouge #e63946 (boutons, prix).
- Le HTML généré doit utiliser des styles CSS INLINE uniquement (pas de balise <style> ni de classes
  externes), car il est injecté directement dans une page sans feuille de style garantie.
- N'inclus jamais de <html>, <head> ou <body> — uniquement le fragment de contenu.
`.trim();

// --- Gemini (analyse d'image) ---
export async function callGeminiVision(params: { system: string; prompt: string; imageBase64: string; mediaType: string }): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY manquante — ajoute-la dans les variables d'environnement Vercel (clé sur aistudio.google.com/apikey).");
  }

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: params.system }] },
      contents: [
        {
          parts: [{ text: params.prompt }, { inline_data: { mime_type: params.mediaType, data: params.imageBase64 } }],
        },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Erreur API Gemini (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Réponse Gemini sans contenu texte.");
  return text as string;
}

// --- Groq (génération de texte/HTML) ---
export async function callGroqText(params: { system: string; prompt: string; maxTokens?: number }): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY manquante — ajoute-la dans les variables d'environnement Vercel (clé sur console.groq.com/keys).");
  }

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      max_tokens: params.maxTokens || 1500,
      messages: [
        { role: "system", content: params.system },
        { role: "user", content: params.prompt },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Erreur API Groq (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error("Réponse Groq sans contenu texte.");
  return text as string;
}

// Nettoie une réponse qui pourrait être encadrée de balises markdown
// ```json ... ``` ou ```html ... ``` avant de la parser/utiliser.
export function stripCodeFences(text: string): string {
  return text.replace(/^```[a-z]*\n?/i, "").replace(/```\s*$/, "").trim();
}
