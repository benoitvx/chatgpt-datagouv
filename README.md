# ChatGPT App data.gouv.fr

Application ChatGPT pour visualiser les donnees ouvertes de data.gouv.fr avec des widgets interactifs.

## Widgets disponibles

### Sprint 1 : IRVE (Bornes de recharge)
- Carte interactive des bornes de recharge pour vehicules electriques
- Recherche par ville avec rayon personnalisable
- Clustering pour les zones denses
- Popups avec details (nom, adresse, operateur, puissance)

## Developpement

### Prerequisites

- Node.js 22+ (voir `.nvmrc`)
- pnpm (`npm install -g pnpm`)
- Ngrok (pour les tests locaux avec ChatGPT)

### Installation

```bash
pnpm install
```

### Developpement local

```bash
pnpm dev
```

Le serveur demarre sur le port 3000 avec :
- Endpoint MCP sur `/mcp`
- Widgets React avec HMR

### Test avec ChatGPT

1. Exposer le serveur local avec ngrok :
```bash
ngrok http 3000
```

2. Dans ChatGPT :
   - Settings → Connectors → Developer mode (activer)
   - Settings → Connectors → Create
   - URL : `https://[votre-id].ngrok-free.app/mcp`

3. Tester avec : `@data.gouv.fr bornes de recharge autour de Lyon`

## Build et Production

```bash
# Build
pnpm build

# Demarrer en production
pnpm start
```

## Structure du projet

```
chatgpt-datagouv/
├── server/
│   ├── src/
│   │   ├── index.ts          # Point d'entree Express
│   │   ├── server.ts         # McpServer avec widgets
│   │   └── lib/
│   │       ├── geo.ts        # Geocoding Nominatim
│   │       └── irve.ts       # Client API IRVE
│   └── package.json
├── web/
│   ├── src/
│   │   ├── helpers.ts        # generateHelpers Skybridge
│   │   └── widgets/
│   │       └── irve.tsx      # Widget carte Leaflet
│   └── package.json
├── package.json
└── SPECS.md
```

## Deploiement

### Railway (recommande pour POC)

```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

### Configuration ChatGPT (Production)

1. ChatGPT → Settings → Apps & Connectors → Developer Mode
2. Creer une app :
   - Nom : `data.gouv.fr`
   - URL : `https://[votre-url-railway]/mcp`
   - Auth : None

## Sources de donnees

- [Base nationale IRVE](https://www.data.gouv.fr/fr/datasets/fichier-consolide-des-bornes-de-recharge-pour-vehicules-electriques/) - 200k+ bornes de recharge

## Technologies

- **Framework** : [Skybridge](https://www.skybridge.tech/)
- **Runtime** : Node.js 22+
- **Frontend** : React 19 + Vite
- **Cartes** : Leaflet + react-leaflet + react-leaflet-cluster
- **Styling** : Tailwind CSS v4

## Licence

MIT

---

Base sur le template [Alpic Apps SDK](https://github.com/alpic-ai/apps-sdk-template).
