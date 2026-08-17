import { NextRequest, NextResponse } from "next/server";
import { requireAdminTenantId } from "@/lib/admin-tenant";
import { callGeminiVision, stripCodeFences, BRAND_GUIDELINES } from "@/lib/ai";

// Par défaut, Vercel coupe une route API après 10s (plan gratuit) — la
// génération IA (surtout avec nouvelle tentative en cas de surcharge)
// peut prendre plus longtemps. On autorise jusqu'à 60s ici.
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    await requireAdminTenantId();
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { imageBase64, mediaType, imageUrl } = await req.json();
  if (!imageBase64 || !mediaType) {
    return NextResponse.json({ error: "missing_image" }, { status: 400 });
  }

  // Note importante : un modèle de texte comme Gemini ne peut pas créer
  // de nouvelles photos — seulement écrire du HTML. On lui fournit donc
  // l'URL réelle de la photo déjà uploadée (imageUrl), pour qu'il puisse
  // au moins la réutiliser dans le contenu généré, plutôt que de ne
  // montrer aucune image ou d'inventer une URL qui ne fonctionnerait pas.
  const prompt = `Voici la photo d'un produit à vendre. Analyse-la et génère :
1. Un titre de produit accrocheur en français (max 6 mots), avec éventuellement un ™ à la fin.
2. Une description de page produit complète en HTML, structurée en plusieurs sections (par exemple : Problèmes rencontrés, Solution/bénéfices, Témoignages clients, Comment l'utiliser). N'inclus PAS de section "Hero" avec le titre/prix — celle-ci existe déjà séparément sur la page. Utilise des titres <h2>/<h3>, des paragraphes, éventuellement des listes.
${
  imageUrl
    ? `3. Insère au moins une fois cette photo dans la description, à l'endroit le plus pertinent (par exemple avant la section bénéfices), avec cette balise exacte : <img src="${imageUrl}" alt="[titre du produit]" style="width:100%;border-radius:12px;margin:16px 0;" />. N'utilise AUCUNE autre URL d'image que celle-ci — tu n'as accès à aucune autre photo réelle.`
    : ""
}

Réponds UNIQUEMENT avec un objet JSON valide, sans aucun texte autour, au format exact :
{"name": "...", "description": "...html..."}`;

  try {
    const raw = await callGeminiVision({
      system: BRAND_GUIDELINES,
      prompt,
      imageBase64,
      mediaType,
    });

    const cleaned = stripCodeFences(raw);
    const parsed = JSON.parse(cleaned);
    if (!parsed.name || !parsed.description) throw new Error("Réponse incomplète de l'IA.");

    return NextResponse.json({ name: parsed.name, description: parsed.description });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
