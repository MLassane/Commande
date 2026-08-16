"use client";

import { useRef, useState } from "react";

function fileToBase64(file: File): Promise<{ data: string; mediaType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string; // "data:image/jpeg;base64,AAAA..."
      const [, base64] = result.split(",");
      resolve({ data: base64, mediaType: file.type || "image/jpeg" });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function AIImageGenerate({ onGenerated }: { onGenerated: (result: { name: string; description: string }) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatus("loading");
    setErrorMsg("");
    try {
      const { data, mediaType } = await fileToBase64(file);
      const res = await fetch("/api/ai/generate-from-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: data, mediaType }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erreur inconnue");
      onGenerated({ name: json.name, description: json.description });
      setStatus("idle");
    } catch (err) {
      setErrorMsg((err as Error).message);
      setStatus("error");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div style={{ border: "1px dashed #6b3fa0", borderRadius: 10, padding: 14, marginBottom: 16, background: "#faf7fd" }}>
      <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={status === "loading"}
        style={{ background: "#6b3fa0", color: "#fff", border: "none", padding: "10px 18px", borderRadius: 8, fontWeight: "bold", cursor: "pointer" }}
      >
        {status === "loading" ? "✨ Génération en cours..." : "✨ Générer avec l'IA à partir d'une photo"}
      </button>
      <p style={{ fontSize: "0.8em", color: "#666", margin: "8px 0 0" }}>
        Envoie une photo du produit : l&apos;IA propose un titre et une description complète (remplace le contenu actuel).
      </p>
      {status === "error" && <p style={{ color: "#e63946", fontSize: "0.85em" }}>{errorMsg}</p>}
    </div>
  );
}
