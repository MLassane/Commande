import { NextRequest, NextResponse } from "next/server";
import { requireAdminTenantId } from "@/lib/admin-tenant";
import { callGroqText, stripCodeFences, BRAND_GUIDELINES } from "@/lib/ai";

// Voir commentaire dans generate-from-image/route.ts.
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    await requireAdminTenantId();
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { instruction, contextHtml } = await req.json();
  if (!instruction || !instruction.trim()) {
    return NextResponse.json({ error: "missing_instruction" }, { status: 400 });
  }

  // On limite le contexte envoyé (le reste de la page déjà écrite) pour
  // rester raisonnable en taille — seuls les ~4000 premiers caractères
  // sont utiles pour donner le ton/style au modèle.
  const context = (contextHtml || "").slice(0, 4000);

  const prompt = `${context ? `Voici le contenu déjà présent dans la page produit (pour le contexte/style) :\n${context}\n\n` : ""}Génère UNIQUEMENT le fragment HTML pour la nouvelle section suivante, à insérer dans la page : "${instruction}"

Réponds uniquement avec le HTML du fragment (un ou plusieurs éléments comme <div>, <h2>, <p>...), sans markdown, sans commentaire, sans balise <html>/<body>.`;

  try {
    const raw = await callGroqText({
      system: BRAND_GUIDELINES,
      prompt,
      maxTokens: 1500,
    });
    const html = stripCodeFences(raw);
    return NextResponse.json({ html });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
