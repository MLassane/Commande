import { SignUp } from "@clerk/nextjs";

// Page d'inscription — c'est ici qu'un futur marchand externe créera son
// compte pour obtenir son propre espace (catalogue + commandes séparés,
// voir lib/tenant.ts). Pour l'instant, personne n'y est dirigé
// automatiquement (pas de lien "créer un compte" visible publiquement) :
// elle sert pour l'instant à toi-même ou pour tester avant l'onboarding.
export default function SignUpPage() {
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
      <SignUp />
    </div>
  );
}
