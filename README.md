# Commande Store — formulaire de commande + notifications

Formulaire de commande COD (paiement à la livraison) avec notification
navigateur en temps réel dès qu'un client commande, et un tableau de bord
pour voir/contacter les clients.

## Ce que ça fait

- `/commande` → le formulaire que voit le client
- `/admin` → ton tableau de bord (protégé par un mot de passe), avec un
  bouton pour activer les notifications sur ton téléphone/ordinateur
- Dès qu'une commande est envoyée, une notification s'affiche sur tous les
  appareils où tu as cliqué "Activer les notifications"

## Déploiement (10-15 minutes, aucune ligne de commande nécessaire)

### 1. Mets le code sur GitHub
- Crée un compte sur https://github.com si tu n'en as pas
- Crée un nouveau repository (par ex. "commande-store")
- Upload tous les fichiers de ce dossier dedans (bouton "Add file" →
  "Upload files" sur GitHub, tu peux glisser-déposer tout le dossier)

### 2. Connecte-le à Vercel
- Va sur https://vercel.com et connecte-toi avec ton compte GitHub
- Clique "Add New" → "Project"
- Choisis le repository "commande-store"
- Clique "Deploy" (il va échouer une première fois, c'est normal — il
  manque encore la base de données et les variables, on continue)

### 3. Ajoute le stockage (base de données)
- Dans ton projet Vercel, va dans l'onglet **Storage**
- Clique "Create Database" → choisis **KV** (Redis)
- Donne-lui un nom, clique "Create", puis "Connect" à ton projet
- Vercel ajoute automatiquement les variables KV_REST_API_URL etc.

### 4. Ajoute les variables d'environnement
- Toujours dans ton projet Vercel → **Settings** → **Environment Variables**
- Copie-colle ces 4 variables (déjà prêtes, ne change rien) :

```
VAPID_PUBLIC_KEY=BFSKSfxkS5sHKh0I8jSdp38wMwsXtoZHDeCCtUCudJNkxOpQ99bD8Z3GCXtn2HqOijvzjp5xA85JHw8RZa77kUU
VAPID_PRIVATE_KEY=8p5R6rcdELI0cwCEIpNd56dsCPmj_rnwJB_ZiNSRZ-A
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BFSKSfxkS5sHKh0I8jSdp38wMwsXtoZHDeCCtUCudJNkxOpQ99bD8Z3GCXtn2HqOijvzjp5xA85JHw8RZa77kUU
ADMIN_SECRET=choisis-un-mot-de-passe-a-toi
```

- Clique "Save" pour chacune

### 5. Redéploie
- Va dans l'onglet **Deployments** → clique les "..." sur le dernier
  déploiement → **Redeploy**

### 6. Active les notifications
- Ouvre `https://ton-projet.vercel.app/admin` sur **le téléphone ou
  l'ordinateur avec lequel tu veux recevoir les notifications**
- Entre le mot de passe que tu as choisi (ADMIN_SECRET)
- Clique "🔔 Activer les notifications sur cet appareil"
- Autorise les notifications quand le navigateur te le demande
- Répète cette étape sur chaque appareil où tu veux être notifié

### 7. Teste
- Ouvre `/commande` dans un autre onglet (ou depuis ton téléphone), remplis
  le formulaire et clique "Je Commande"
- Une notification doit apparaître sur l'appareil où tu as activé les
  notifications à l'étape 6
- Va sur `/admin` pour voir les infos du client et le contacter (bouton
  Appeler ou WhatsApp)

## Modifier le produit / prix

Ouvre `lib/config.ts` et change le nom, le prix et l'ancien prix. Pour
vendre plusieurs produits, duplique `app/commande` (ex: `app/commande-2`)
avec sa propre config.

## Important — notifications navigateur

Les notifications push ne fonctionnent que si :
- Tu gardes le site ouvert au moins une fois par appareil pour t'abonner
  (étape 6)
- Ton téléphone est un Android (Chrome) — sur iPhone, il faut ajouter le
  site à l'écran d'accueil ("Ajouter à l'écran d'accueil" dans Safari)
  pour que les notifications fonctionnent, c'est une limite d'Apple, pas
  du site.
