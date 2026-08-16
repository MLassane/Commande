"use client";

import { useState } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextStyle from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import ImageUploadButton from "@/components/ImageUploadButton";

// Palette reprise de Shopify : 7 couleurs vives + 6 niveaux de gris/blanc,
// utilisée à la fois pour la couleur du texte et celle du fond.
const SWATCHES = ["#e63946", "#f4841c", "#f4d20c", "#7ed321", "#29abe2", "#3a3aff", "#d633ff", "#000000", "#333333", "#666666", "#999999", "#cccccc", "#ffffff"];

const HEADING_OPTIONS: { label: string; level?: 1 | 2 | 3 | 4 | 5 | 6; type: "paragraph" | "heading" | "blockquote" }[] = [
  { label: "Paragraphe", type: "paragraph" },
  { label: "Titre 1", type: "heading", level: 1 },
  { label: "Titre 2", type: "heading", level: 2 },
  { label: "Titre 3", type: "heading", level: 3 },
  { label: "Titre 4", type: "heading", level: 4 },
  { label: "Titre 5", type: "heading", level: 5 },
  { label: "Titre 6", type: "heading", level: 6 },
  { label: "Bloc de citation", type: "blockquote" },
];

function ToolbarButton({ onClick, active, children, title }: { onClick: () => void; active?: boolean; children: React.ReactNode; title?: string }) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => e.preventDefault()} // évite de faire perdre le focus/la sélection de l'éditeur
      onClick={onClick}
      style={{
        border: "none",
        background: active ? "#e9defa" : "transparent",
        color: active ? "#6b3fa0" : "#333",
        borderRadius: 6,
        padding: "6px 9px",
        cursor: "pointer",
        fontSize: "0.95em",
        fontWeight: active ? "bold" : "normal",
      }}
    >
      {children}
    </button>
  );
}

function ColorPicker({ editor, mode, onClose }: { editor: Editor; mode: "text" | "background"; onClose: () => void }) {
  const [custom, setCustom] = useState("#000000");

  function apply(color: string) {
    if (mode === "text") editor.chain().focus().setColor(color).run();
    else editor.chain().focus().toggleHighlight({ color }).run();
    onClose();
  }

  return (
    <div style={{ position: "absolute", zIndex: 20, background: "#fff", border: "1px solid #ddd", borderRadius: 10, padding: 12, boxShadow: "0 6px 20px rgba(0,0,0,0.12)", width: 220 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 6, marginBottom: 10 }}>
        {SWATCHES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => apply(c)}
            title={c}
            style={{ width: 24, height: 24, borderRadius: 6, background: c, border: "1px solid #ddd", cursor: "pointer" }}
          />
        ))}
      </div>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <input type="color" value={custom} onChange={(e) => setCustom(e.target.value)} style={{ width: 32, height: 32, border: "none", padding: 0, cursor: "pointer" }} />
        <input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          style={{ flex: 1, padding: 6, border: "1px solid #ddd", borderRadius: 6, fontSize: "0.85em" }}
        />
        <button type="button" onClick={() => apply(custom)} style={{ background: "#6b3fa0", color: "#fff", border: "none", borderRadius: 6, padding: "6px 10px", cursor: "pointer", fontSize: "0.85em" }}>
          OK
        </button>
      </div>
      {mode === "text" && (
        <button
          type="button"
          onClick={() => {
            editor.chain().focus().unsetColor().run();
            onClose();
          }}
          style={{ marginTop: 8, background: "none", border: "none", color: "#666", fontSize: "0.8em", cursor: "pointer", padding: 0 }}
        >
          Réinitialiser la couleur
        </button>
      )}
    </div>
  );
}

export default function RichTextEditor({ value, onChange }: { value: string; onChange: (html: string) => void }) {
  const [showHeadingMenu, setShowHeadingMenu] = useState(false);
  const [showColorMenu, setShowColorMenu] = useState(false);
  const [colorTab, setColorTab] = useState<"text" | "background">("text");
  const [showAlignMenu, setShowAlignMenu] = useState(false);
  const [showTableMenu, setShowTableMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showImageMenu, setShowImageMenu] = useState(false);
  const [showAiMenu, setShowAiMenu] = useState(false);
  const [aiInstruction, setAiInstruction] = useState("");
  const [aiStatus, setAiStatus] = useState<"idle" | "loading" | "error">("idle");
  const [aiError, setAiError] = useState("");

  const editor = useEditor({
    // Évite un décalage d'hydratation Next.js : le contenu ne se rend
    // qu'une fois côté client (l'éditeur ne doit pas tourner côté serveur).
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3, 4, 5, 6] } }),
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Link.configure({ openOnClick: false, autolink: true }),
      Image,
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: { style: "padding: 12px; min-height: 220px; outline: none;" },
    },
  });

  if (!editor) return null;

  function closeAllMenus() {
    setShowHeadingMenu(false);
    setShowColorMenu(false);
    setShowAlignMenu(false);
    setShowTableMenu(false);
    setShowMoreMenu(false);
    setShowImageMenu(false);
    setShowAiMenu(false);
  }

  function currentHeadingLabel(): string {
    for (const opt of HEADING_OPTIONS) {
      if (opt.type === "paragraph" && editor.isActive("paragraph")) return opt.label;
      if (opt.type === "heading" && editor.isActive("heading", { level: opt.level })) return opt.label;
      if (opt.type === "blockquote" && editor.isActive("blockquote")) return opt.label;
    }
    return "Paragraphe";
  }

  function applyHeading(opt: (typeof HEADING_OPTIONS)[number]) {
    const chain = editor.chain().focus();
    if (opt.type === "paragraph") chain.setParagraph().run();
    else if (opt.type === "heading" && opt.level) chain.setHeading({ level: opt.level }).run();
    else if (opt.type === "blockquote") chain.toggleBlockquote().run();
    setShowHeadingMenu(false);
  }

  async function handleAiGenerate() {
    if (!aiInstruction.trim()) return;
    setAiStatus("loading");
    setAiError("");
    try {
      const res = await fetch("/api/ai/generate-section", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction: aiInstruction, contextHtml: editor.getHTML() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erreur inconnue");
      // Insère le fragment généré à l'endroit où était le curseur.
      editor.chain().focus().insertContent(json.html).run();
      setAiInstruction("");
      setShowAiMenu(false);
      setAiStatus("idle");
    } catch (err) {
      setAiError((err as Error).message);
      setAiStatus("error");
    }
  }

  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 8, marginBottom: 12 }}>
      {/* --- Barre d'outils --- */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 2, padding: 6, borderBottom: "1px solid #eee", background: "#fafafa", position: "relative" }}>
        {/* Titre / Paragraphe */}
        <div style={{ position: "relative" }}>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              closeAllMenus();
              setShowHeadingMenu((v) => !v);
            }}
            style={{ border: "1px solid #ddd", background: "#fff", borderRadius: 6, padding: "6px 10px", cursor: "pointer", fontSize: "0.85em" }}
          >
            {currentHeadingLabel()} ▾
          </button>
          {showHeadingMenu && (
            <div style={{ position: "absolute", zIndex: 20, top: "100%", left: 0, background: "#fff", border: "1px solid #ddd", borderRadius: 8, boxShadow: "0 6px 20px rgba(0,0,0,0.12)", minWidth: 160 }}>
              {HEADING_OPTIONS.map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => applyHeading(opt)}
                  style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 12px", border: "none", background: "none", cursor: "pointer" }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <ToolbarButton title="Gras" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
          <b>G</b>
        </ToolbarButton>
        <ToolbarButton title="Italique" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <i>I</i>
        </ToolbarButton>
        <ToolbarButton title="Souligné" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <u>S</u>
        </ToolbarButton>

        {/* Couleur texte / fond */}
        <div style={{ position: "relative" }}>
          <ToolbarButton
            title="Couleur"
            onClick={() => {
              closeAllMenus();
              setShowColorMenu((v) => !v);
            }}
          >
            A▾
          </ToolbarButton>
          {showColorMenu && (
            <div style={{ position: "absolute", top: "100%", left: 0 }}>
              <div style={{ display: "flex", gap: 2, background: "#fff", border: "1px solid #ddd", borderBottom: "none", borderRadius: "8px 8px 0 0", padding: 4, position: "relative", zIndex: 21, width: 220, boxSizing: "border-box" }}>
                <button
                  type="button"
                  onClick={() => setColorTab("text")}
                  style={{ flex: 1, padding: 6, border: "none", background: colorTab === "text" ? "#f0f0f0" : "transparent", borderRadius: 6, cursor: "pointer", fontSize: "0.8em", fontWeight: colorTab === "text" ? "bold" : "normal" }}
                >
                  Texte
                </button>
                <button
                  type="button"
                  onClick={() => setColorTab("background")}
                  style={{ flex: 1, padding: 6, border: "none", background: colorTab === "background" ? "#f0f0f0" : "transparent", borderRadius: 6, cursor: "pointer", fontSize: "0.8em", fontWeight: colorTab === "background" ? "bold" : "normal" }}
                >
                  Arrière-plan
                </button>
              </div>
              <ColorPicker editor={editor} mode={colorTab} onClose={() => setShowColorMenu(false)} />
            </div>
          )}
        </div>

        {/* Alignement */}
        <div style={{ position: "relative" }}>
          <ToolbarButton
            title="Alignement"
            onClick={() => {
              closeAllMenus();
              setShowAlignMenu((v) => !v);
            }}
          >
            ≡▾
          </ToolbarButton>
          {showAlignMenu && (
            <div style={{ position: "absolute", zIndex: 20, top: "100%", left: 0, background: "#fff", border: "1px solid #ddd", borderRadius: 8, boxShadow: "0 6px 20px rgba(0,0,0,0.12)" }}>
              {[
                { label: "⬅ Gauche", value: "left" },
                { label: "↔ Centré", value: "center" },
                { label: "➡ Droite", value: "right" },
              ].map((a) => (
                <button
                  key={a.value}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    editor.chain().focus().setTextAlign(a.value).run();
                    setShowAlignMenu(false);
                  }}
                  style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 14px", border: "none", background: "none", cursor: "pointer", whiteSpace: "nowrap" }}
                >
                  {a.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Lien */}
        <ToolbarButton
          title="Insérer un lien"
          active={editor.isActive("link")}
          onClick={() => {
            const url = window.prompt("URL du lien :", editor.getAttributes("link").href || "https://");
            if (url === null) return;
            if (url === "") editor.chain().focus().unsetLink().run();
            else editor.chain().focus().setLink({ href: url }).run();
          }}
        >
          🔗
        </ToolbarButton>

        {/* Image */}
        <div style={{ position: "relative" }}>
          <ToolbarButton
            title="Insérer une image"
            onClick={() => {
              closeAllMenus();
              setShowImageMenu((v) => !v);
            }}
          >
            🖼️
          </ToolbarButton>
          {showImageMenu && (
            <div style={{ position: "absolute", zIndex: 20, top: "100%", left: 0, background: "#fff", border: "1px solid #ddd", borderRadius: 8, boxShadow: "0 6px 20px rgba(0,0,0,0.12)", padding: 10, minWidth: 220 }}>
              <ImageUploadButton
                label="📤 Importer depuis mon téléphone"
                onUploaded={(url) => {
                  editor.chain().focus().setImage({ src: url }).run();
                  setShowImageMenu(false);
                }}
              />
              <div style={{ margin: "10px 0", borderTop: "1px solid #eee" }} />
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  const url = window.prompt("URL de l'image :");
                  if (url) editor.chain().focus().setImage({ src: url }).run();
                  setShowImageMenu(false);
                }}
                style={{ width: "100%", padding: "6px 12px", fontSize: "0.85em", border: "1px solid #ddd", borderRadius: 6, background: "#fff", cursor: "pointer" }}
              >
                🔗 Depuis une URL
              </button>
            </div>
          )}
        </div>

        {/* Tableau */}
        <div style={{ position: "relative" }}>
          <ToolbarButton
            title="Tableau"
            onClick={() => {
              closeAllMenus();
              setShowTableMenu((v) => !v);
            }}
          >
            ⊞▾
          </ToolbarButton>
          {showTableMenu && (
            <div style={{ position: "absolute", zIndex: 20, top: "100%", left: 0, background: "#fff", border: "1px solid #ddd", borderRadius: 8, boxShadow: "0 6px 20px rgba(0,0,0,0.12)", minWidth: 220 }}>
              {[
                { label: "Insérer un tableau", action: () => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
                { label: "Insérer une rangée au-dessus", action: () => editor.chain().focus().addRowBefore().run() },
                { label: "Insérer une ligne en dessous", action: () => editor.chain().focus().addRowAfter().run() },
                { label: "Insérer une colonne avant", action: () => editor.chain().focus().addColumnBefore().run() },
                { label: "Insérer une colonne après", action: () => editor.chain().focus().addColumnAfter().run() },
                { label: "Supprimer la ligne", action: () => editor.chain().focus().deleteRow().run() },
                { label: "Supprimer la colonne", action: () => editor.chain().focus().deleteColumn().run() },
                { label: "Supprimer le tableau", action: () => editor.chain().focus().deleteTable().run() },
              ].map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    item.action();
                    setShowTableMenu(false);
                  }}
                  style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 14px", border: "none", background: "none", cursor: "pointer", whiteSpace: "nowrap" }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Plus (listes, indentation, effacer la mise en forme) */}
        <div style={{ position: "relative" }}>
          <ToolbarButton
            title="Plus d'options"
            onClick={() => {
              closeAllMenus();
              setShowMoreMenu((v) => !v);
            }}
          >
            •••
          </ToolbarButton>
          {showMoreMenu && (
            <div style={{ position: "absolute", zIndex: 20, top: "100%", left: 0, background: "#fff", border: "1px solid #ddd", borderRadius: 8, boxShadow: "0 6px 20px rgba(0,0,0,0.12)", display: "flex", padding: 6, gap: 2 }}>
              <ToolbarButton title="Liste à puces" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
                • ≡
              </ToolbarButton>
              <ToolbarButton title="Liste numérotée" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
                1. ≡
              </ToolbarButton>
              <ToolbarButton title="Diminuer le retrait" onClick={() => editor.chain().focus().liftListItem("listItem").run()}>
                ⇤
              </ToolbarButton>
              <ToolbarButton title="Augmenter le retrait" onClick={() => editor.chain().focus().sinkListItem("listItem").run()}>
                ⇥
              </ToolbarButton>
              <ToolbarButton
                title="Effacer la mise en forme"
                onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
              >
                🚫
              </ToolbarButton>
            </div>
          )}
        </div>

        {/* Ajouter une section avec l'IA */}
        <div style={{ position: "relative" }}>
          <ToolbarButton
            title="Ajouter une section avec l'IA"
            onClick={() => {
              closeAllMenus();
              setShowAiMenu((v) => !v);
            }}
          >
            ✨ IA
          </ToolbarButton>
          {showAiMenu && (
            <div
              onClick={(e) => e.stopPropagation()}
              style={{ position: "absolute", zIndex: 20, top: "100%", left: 0, background: "#fff", border: "1px solid #ddd", borderRadius: 8, boxShadow: "0 6px 20px rgba(0,0,0,0.12)", padding: 12, width: 280 }}
            >
              <p style={{ fontSize: "0.85em", color: "#666", margin: "0 0 6px" }}>
                Décris la section à ajouter (ex : &quot;section témoignages avec 3 avis clients&quot;)
              </p>
              <textarea
                value={aiInstruction}
                onChange={(e) => setAiInstruction(e.target.value)}
                rows={3}
                placeholder="Ajoute une section Avant/Après..."
                style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 6, marginBottom: 8, boxSizing: "border-box", fontSize: "0.9em" }}
              />
              <button
                type="button"
                onClick={handleAiGenerate}
                disabled={aiStatus === "loading" || !aiInstruction.trim()}
                style={{ width: "100%", background: "#6b3fa0", color: "#fff", border: "none", padding: "8px 12px", borderRadius: 6, fontWeight: "bold", cursor: "pointer" }}
              >
                {aiStatus === "loading" ? "Génération..." : "✨ Générer et insérer"}
              </button>
              {aiStatus === "error" && <p style={{ color: "#e63946", fontSize: "0.8em", marginTop: 6 }}>{aiError}</p>}
            </div>
          )}
        </div>
      </div>

      {/* --- Zone d'édition --- */}
      <div onClick={closeAllMenus}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
