# n8n-nodes-2nodoc

Node communautaire n8n pour [2nodoc](https://2nodoc.com), plateforme SaaS de facturation électronique (Solution Compatible RFE, France/Belgique). Permet de créer, lister, mettre à jour des factures et des clients, de gérer le cycle de vie e-invoicing (RFE/SuperPDP), et de télécharger les PDF/Factur-X, directement depuis vos workflows n8n.

> Statut : v0.1 — MVP. Périmètre couvert : Factures, Clients, E-Invoices (RFE). À venir : Produits, Utilisateurs d'équipe, facture d'achat depuis OCR.

## Installation

Dans une instance n8n self-hosted :

1. **Settings → Community Nodes → Install**
2. Entrer `n8n-nodes-2nodoc`

Ou en local pour le développement :

```bash
npm install
npm run build
npm link
# puis, dans le dossier ~/.n8n/nodes (ou N8N_CUSTOM_EXTENSIONS) :
npm link n8n-nodes-2nodoc
```

## Identifiants (Credentials)

Créez un credential **2nodoc API** avec :

- **API Token** : jeton généré depuis le tableau de bord 2nodoc (Paramètres → API), envoyé en `Authorization: Bearer <token>`.
- **Base URL** : `https://api.2nodoc.com` par défaut.

## Ressources et opérations couvertes

### Facture (`/api/public/invoices`)
Créer, Récupérer, Lister, Mettre à jour, Supprimer, Changer le statut, Convertir devis → facture, Envoyer par email, Historique d'envoi, Télécharger PDF, Télécharger Factur-X.

### Client (`/api/public/clients`)
Créer, Récupérer, Lister, Mettre à jour, Supprimer.

### E-Invoice / RFE (`/api/public/einvoices`)
Statut de connexion, Société connectée, Récupérer, Lister (reçues/émises), Accepter, Refuser, Ouvrir un litige, Initier le paiement.

Chaque opération de création/mise à jour expose un champ **Champs additionnels (JSON)** pour transmettre des champs non encore modélisés explicitement dans le node, sans attendre une nouvelle version.

## Développement

```bash
npm install
npm run build   # compile TypeScript + copie les icônes dans dist/
npm run lint     # règles eslint-plugin-n8n-nodes-base
```

Pour tester localement dans n8n : `npm link`, puis `npm link n8n-nodes-2nodoc` depuis le dossier de nodes custom de votre instance n8n (variable d'environnement `N8N_CUSTOM_EXTENSIONS`), puis redémarrer n8n.

## Publication

```bash
npm run build
npm publish --access public
```

À partir du 1er mai 2026, la vérification n8n (badge « vérifié ») exige une publication via GitHub Actions avec provenance npm — voir `docs.n8n.io` pour la configuration du workflow.

## Licence

MIT — © Byte4flow Limited
