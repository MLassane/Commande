import { SignIn } from "@clerk/nextjs";

// Page de connexion affichée automatiquement par le middleware quand un
// visiteur non connecté tente d'accéder à /admin ou à une route API
// protégée. Le composant <SignIn /> gère tout le flux (email/mot de
// passe, réinitialisation, etc.) — rien à coder soi-même.
export default function SignInPage() {
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
      <SignIn />
    </div>
  );
}
