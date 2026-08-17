"use client";

import { useRef, useState } from "react";
import { upload } from "@vercel/blob/client";

export default function ImageUploadButton({ onUploaded, label = "📤 Importer depuis mon téléphone" }: { onUploaded: (url: string) => void; label?: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "error">("idle");

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatus("uploading");
    try {
      // Upload direct depuis le navigateur vers Vercel Blob : le fichier
      // ne passe jamais par nos propres serveurs, seul un jeton
      // d'autorisation transite par /api/upload (voir ce fichier).
      const blob = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/upload",
      });
      onUploaded(blob.url);
      setStatus("idle");
    } catch (err) {
      console.error(err);
      setStatus("error");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <span>
      <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={status === "uploading"}
        style={{ padding: "6px 12px", fontSize: "0.85em", border: "1px solid #ddd", borderRadius: 6, background: "#fff", cursor: "pointer" }}
      >
        {status === "uploading" ? "Envoi en cours..." : label}
      </button>
      {status === "error" && <span style={{ color: "#e63946", fontSize: "0.8em", marginLeft: 8 }}>Échec de l&apos;envoi.</span>}
    </span>
  );
}
