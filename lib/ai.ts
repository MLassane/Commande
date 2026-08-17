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

// Nouvelle tentative automatique en cas d'erreur temporaire du fournisseur
// (503 = serveur surchargé, 429 = trop de requêtes) — ces erreurs se
// résolvent presque toujours d'elles-mêmes après une courte pause. On ne
// retente PAS les autres erreurs (ex: 400/401/404), qui ne changeront pas
// en réessayant.
//
// Chaque tentative est aussi bornée dans le temps (AbortController) : si
// le fournisseur ne répond jamais (au lieu de répondre par une vraie
// erreur), on abandonne après TIMEOUT_MS plutôt que de rester bloqué
// indéfiniment — c'est ce qui causait des générations "qui tournent"
// sans jamais aboutir ni afficher d'erreur.
const TIMEOUT_MS = 25_000; // 25s par tentative

async function fetchWithRetry(url: string, init: RequestInit, maxAttempts = 3): Promise<Response> {
  let lastRes: Response | null = null;
  let lastErr: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, { ...init, signal: controller.signal });
      clearTimeout(timer);
      if (res.ok || (res.status !== 503 && res.status !== 429)) return res;
      lastRes = res;
    } catch (err) {
      clearTimeout(timer);
      // AbortError = on a dépassé TIMEOUT_MS sans réponse : on traite ça
      // comme une erreur temporaire, au même titre qu'un 503, et on
      // retente si des tentatives restent.
      lastErr = err as Error;
    }
    if (attempt < maxAttempts) {
      const delayMs = 800 * attempt; // 800ms, puis 1600ms
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  if (lastRes) return lastRes;
  throw new Error(lastErr?.name === "AbortError" ? "Le service met trop de temps à répondre (délai dépassé)." : lastErr?.message || "Erreur réseau inconnue.");
}

// --- Gemini (analyse d'image) ---
export async function callGeminiVision(params: { system: string; prompt: string; imageBase64: string; mediaType: string }): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY manquante — ajoute-la dans les variables d'environnement Vercel (clé sur aistudio.google.com/apikey).");
  }

  // "gemini-flash-latest" est un alias fourni par Google qui pointe
  // toujours vers son modèle Flash stable le plus récent — évite de
  // devoir mettre à jour ce nom à chaque fois que Google retire un
  // ancien modèle (comme "gemini-2.5-flash" précédemment).
  const res = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`, {
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
    if (res.status === 503) {
      throw new Error("Le service Gemini est surchargé en ce moment. Réessaie dans quelques instants.");
    }
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

  const res = await fetchWithRetry("https://api.groq.com/openai/v1/chat/completions", {
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
    if (res.status === 503) {
      throw new Error("Le service Groq est surchargé en ce moment. Réessaie dans quelques instants.");
    }
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
