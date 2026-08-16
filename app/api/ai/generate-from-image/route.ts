import { NextRequest, NextResponse } from "next/server";
import { requireAdminTenantId } from "@/lib/admin-tenant";
import { callGeminiVision, stripCodeFences, BRAND_GUIDELINES } from "@/lib/ai";

export async function POST(req: NextRequest) {
  try {
    await requireAdminTenantId();
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { imageBase64, mediaType } = await req.json();
  if (!imageBase64 || !mediaType) {
    return NextResponse.json({ error: "missing_image" }, { status: 400 });
  }

  const prompt = `Voici la photo d'un produit à vendre. Analyse-la et génère :
1. Un titre de produit accrocheur en français (max 6 mots), avec éventuellement un ™ à la fin.
2. Une description de page produit complète en HTML, structurée en plusieurs sections (par exemple : Problèmes rencontrés, Solution/bénéfices, Avant/Après ou preuve, Témoignages clients, Comment l'utiliser). N'inclus PAS de section "Hero" avec le titre/prix — celle-ci existe déjà séparément sur la page. Utilise des titres <h2>/<h3>, des paragraphes, éventuellement des listes.

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
