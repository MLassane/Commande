import Link from "next/link";
import { PRODUCT } from "@/lib/config";

export default function Home() {
  return (
    <div style={S.body}>
      {/* HERO */}
      <section style={S.hero}>
        <h1 style={S.h1}>{PRODUCT.name}</h1>
        <p style={S.tagline}>Le masseur bien-être 3-en-1 pour une détente profonde, à la maison, quand vous voulez</p>
        <div style={S.priceBox}>
          <span style={S.old}>{PRODUCT.oldPrice.toLocaleString("fr-FR")} {PRODUCT.currency}</span>
          <span style={S.new}>{PRODUCT.price.toLocaleString("fr-FR")} {PRODUCT.currency}</span>
        </div>
        <Link href="/commande" style={S.cta}>Je commande maintenant →</Link>
        <p style={S.heroNote}>✅ Paiement à la livraison &nbsp;|&nbsp; 🚚 Livraison rapide</p>
      </section>

      {/* PROBLÈMES */}
      <section style={S.section}>
        <h2 style={S.h2}>Vous reconnaissez-vous ?</h2>
        <ul style={S.problemList}>
          <li style={S.problemItem}>😩 Journées fatigantes, tensions dans le dos, les épaules, les jambes… et aucun outil efficace à la maison</li>
          <li style={S.problemItem}>💸 Les séances de massage professionnel coûtent cher et ne sont pas toujours disponibles</li>
          <li style={S.problemItem}>🔌 Les appareils de massage classiques sont bruyants et peu discrets</li>
          <li style={S.problemItem}>😔 Vous cherchez un moment rien qu'à vous pour vous détendre</li>
        </ul>
      </section>

      {/* SOLUTION */}
      <section style={S.section}>
        <h2 style={S.h2}>La solution : {PRODUCT.name}</h2>
        <p style={S.centerText}>
          Un masseur corporel en silicone doux, pensé pour les zones sensibles et tendues du corps. Compact, silencieux et 100% rechargeable.
        </p>
        <div style={S.grid}>
          {[
            ["🌸", "Silicone médical doux", "Contact agréable sur la peau"],
            ["⚡", "Multi-intensités", "Plusieurs modes de vibration réglables"],
            ["💧", "100% étanche", "Utilisable sous la douche"],
            ["🔋", "Rechargeable USB", "Autonomie longue durée"],
            ["🤫", "Ultra silencieux", "Discrétion totale garantie"],
            ["📦", "Emballage discret", "Livré sans mention du contenu"],
          ].map(([icon, title, text]) => (
            <div style={S.card} key={title}>
              <div style={{ fontSize: "2em", marginBottom: 10 }}>{icon}</div>
              <b>{title}</b>
              <br />
              {text}
            </div>
          ))}
        </div>
      </section>

      {/* AVANTAGES */}
      <section style={{ ...S.section, background: "#f9f9f9" }}>
        <h2 style={S.h2}>Pourquoi elles l&apos;adorent</h2>
        <ul style={{ maxWidth: 600, margin: "0 auto", fontSize: "1.05em", lineHeight: 1.8 }}>
          <li>✔️ Design ergonomique pour atteindre facilement les zones tendues</li>
          <li>✔️ Tête large pour un massage relaxant du dos, de la nuque et des jambes</li>
          <li>✔️ Format compact et léger, facile à ranger et à transporter</li>
          <li>✔️ Finition élégante</li>
          <li>✔️ Idéal après une longue journée</li>
        </ul>
      </section>

      {/* TÉMOIGNAGES */}
      <section style={S.section}>
        <h2 style={S.h2}>Elles en parlent</h2>
        <div style={S.grid}>
          {[
            ["A", "#e63946", "Aïcha, Niamey", "★★★★★", "Discret, silencieux et vraiment efficace pour décontracter le dos après le travail."],
            ["F", "#6b3fa0", "Fatou, Abidjan", "★★★★★", "Livraison rapide et emballage très discret comme promis."],
            ["K", "#2a9d8f", "Khadija, Dakar", "★★★★☆", "Facile à recharger, plusieurs intensités, parfait pour mes soirées détente."],
          ].map(([initial, color, name, stars, text]) => (
            <div style={S.testimonial} key={name}>
              <span style={{ ...S.avatar, background: color }}>{initial}</span>
              <b>{name}</b>
              <div style={{ color: "#f5a623", margin: "6px 0" }}>{stars}</div>
              <p>{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA FINAL */}
      <section style={S.finalCta}>
        <h2 style={{ color: "#fff" }}>Offre spéciale — {PRODUCT.name}</h2>
        <p>Votre moment détente à petit prix, livré chez vous en toute discrétion</p>
        <div style={S.priceBox}>
          <span style={S.old}>{PRODUCT.oldPrice.toLocaleString("fr-FR")} {PRODUCT.currency}</span>
          <span style={S.new}>{PRODUCT.price.toLocaleString("fr-FR")} {PRODUCT.currency}</span>
        </div>
        <Link href="/commande" style={{ ...S.cta, marginTop: 20 }}>Je commande maintenant →</Link>
      </section>

      <footer style={S.footer}>{PRODUCT.name} — Paiement à la livraison</footer>
    </div>
  );
}

const S: { [k: string]: React.CSSProperties } = {
  body: { fontFamily: "Arial, sans-serif", color: "#2b2b2b" },
  hero: { background: "linear-gradient(135deg,#6b3fa0,#9b5de5)", color: "#fff", textAlign: "center", padding: "60px 20px", borderRadius: "0 0 30px 30px" },
  h1: { fontSize: "2.2em", marginBottom: 10 },
  tagline: { fontSize: "1.1em", opacity: 0.95, marginBottom: 25 },
  priceBox: { display: "inline-block", background: "#fff", color: "#6b3fa0", borderRadius: 14, padding: "15px 30px", fontWeight: "bold" },
  old: { textDecoration: "line-through", color: "#999", fontSize: "0.9em", marginRight: 10 },
  new: { fontSize: "1.5em", color: "#e63946" },
  cta: { display: "inline-block", marginTop: 25, background: "#e63946", color: "#fff", padding: "16px 40px", borderRadius: 40, fontSize: "1.1em", fontWeight: "bold", textDecoration: "none" },
  heroNote: { marginTop: 15, fontSize: "0.9em" },
  section: { padding: "50px 20px", maxWidth: 900, margin: "0 auto" },
  h2: { textAlign: "center", fontSize: "1.7em", color: "#6b3fa0", marginBottom: 30 },
  centerText: { textAlign: "center", maxWidth: 650, margin: "0 auto 10px", fontSize: "1.05em" },
  problemList: { listStyle: "none", padding: 0, maxWidth: 600, margin: "0 auto" },
  problemItem: { background: "#faf5ff", borderLeft: "4px solid #e63946", padding: "14px 18px", marginBottom: 12, borderRadius: 8, fontSize: "1.05em" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 20, marginTop: 20 },
  card: { background: "#f6f0fb", borderRadius: 16, padding: 22, textAlign: "center" },
  testimonial: { background: "#fff", border: "1px solid #eee", borderRadius: 14, padding: 18, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" },
  avatar: { width: 42, height: 42, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: "bold", marginRight: 10 },
  finalCta: { background: "#6b3fa0", padding: 40, textAlign: "center", color: "#fff", borderRadius: 20, maxWidth: 900, margin: "0 auto 40px" },
  footer: { textAlign: "center", padding: 30, color: "#999", fontSize: "0.85em" },
};
