import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { requireAdminTenantId } from "@/lib/admin-tenant";

// Cette route ne reçoit jamais le fichier lui-même : elle délivre un
// jeton temporaire que le navigateur utilise ensuite pour envoyer le
// fichier DIRECTEMENT à Vercel Blob (upload dit "côté client"). C'est la
// méthode recommandée par Vercel, qui évite de faire transiter de gros
// fichiers par nos routes API (limitées en taille de requête).
export async function POST(request: Request): Promise<NextResponse> {
  // Vérifie qu'un marchand est bien connecté avant de délivrer le moindre
  // jeton d'upload — sans ça, n'importe qui pourrait uploader des
  // fichiers sur notre espace de stockage.
  try {
    await requireAdminTenantId();
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => ({
        // N'autorise que des images, jusqu'à 10 Mo — suffisant pour des
        // photos produit, et ça évite qu'un fichier énorme ou d'un autre
        // type soit uploadé par erreur.
        allowedContentTypes: ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"],
        maximumSizeInBytes: 10 * 1024 * 1024,
        addRandomSuffix: true,
      }),
    });
    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
