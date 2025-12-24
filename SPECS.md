# App ChatGPT data.gouv — Spécifications v4

> **Reboot complet** — Cette version abandonne les approches précédentes (MCP SDK brut, monorepo custom) pour repartir de zéro avec Skybridge et un périmètre fonctionnel restreint.

---

## 1. Contexte et objectifs

### 1.1 Pourquoi ce reboot ?

Les tentatives précédentes ont échoué à produire un POC fonctionnel :
- **v1 (MCP SDK brut)** : problèmes de connexion ngrok/ChatGPT, sessions MCP non gérées
- **v2 (Monorepo custom)** : connecteur ChatGPT jamais créé malgré un serveur MCP fonctionnel

**Leçon apprise** : trop de temps sur la plomberie technique, pas assez sur le résultat final.

### 1.2 Objectif du POC

**Aligner les parties prenantes DINUM** en montrant concrètement à quoi ressemblerait une app ChatGPT data.gouv :
- UI propre et professionnelle dans ChatGPT
- Visualisations qui s'affichent directement (pas de clics supplémentaires)
- Expérience fluide : prompt → visualisation en une étape

### 1.3 Référence visuelle

La vidéo LinkedIn de **Valentin Beggi** (Alpic) montre exactement le niveau de polish attendu : carte interactive des bornes IRVE avec popup au clic, affichée directement dans ChatGPT.

---

## 2. Périmètre fonctionnel

### 2.1 Quatre cas d'usage, quatre datasets

| # | Dataset | Visualisation | Prompt type | Données |
|---|---------|---------------|-------------|---------|
| 1 | **IRVE** (bornes recharge) | Carte interactive | "Bornes de recharge autour de Lyon" | ~500k points géolocalisés |
| 2 | **DVF** (valeurs foncières) | Chiffres clés | "Prix du m² dans le 11ème à Paris" | Transactions immobilières |
| 3 | **Pharmacies grippe** | Carte interactive | "Où me faire vacciner contre la grippe ?" | ~20k pharmacies géolocalisées |
| 4 | **Vaccination grippe** | Line chart temporel | "Où en est la campagne de vaccination grippe ?" | Séries temporelles IQVIA |

### 2.2 Ce qui est INCLUS

- 4 widgets React (2 cartes, 1 chiffres clés, 1 line chart)
- Design soigné (cohérent, typographie, couleurs data.gouv)
- Affichage direct des visualisations (pas de clic "Voir plus")
- Source et lien vers data.gouv.fr sur chaque widget
- Mobile-friendly (responsive)

### 2.3 Ce qui est EXCLU (v2+)

- Recherche libre multi-datasets
- Filtres dynamiques
- Export PNG/CSV
- Authentification
- Autres visualisations (bar chart, pie chart, heatmap)
- Mode fullscreen
- Soumission au store OpenAI

---

## 3. Datasets et APIs

### 3.1 Dataset 1 : IRVE (Bornes de recharge)

**Source** : [Base nationale IRVE](https://www.data.gouv.fr/fr/datasets/fichier-consolide-des-bornes-de-recharge-pour-vehicules-electriques/)

**Producteur** : Etalab (consolidation quotidienne)

**Format** : CSV, ~125 Mo, ~500k lignes

**Champs clés** :
| Champ | Type | Description |
|-------|------|-------------|
| `nom_station` | string | Nom de la station |
| `adresse_station` | string | Adresse complète |
| `consolidated_longitude` | float | Longitude WGS84 |
| `consolidated_latitude` | float | Latitude WGS84 |
| `nom_operateur` | string | Opérateur du réseau |
| `puissance_nominale` | float | Puissance en kW |
| `prise_type_*` | boolean | Types de prises disponibles |

**API** : API Tabular data.gouv.fr
```
GET https://tabular-api.data.gouv.fr/api/resources/{resource_id}/data/
?page_size=100
&consolidated_latitude__gte={lat_min}
&consolidated_latitude__lte={lat_max}
&consolidated_longitude__gte={lon_min}
&consolidated_longitude__lte={lon_max}
```

**resource_id** : À récupérer dynamiquement via l'API datasets (ressource "Consolidation v2.3.1")

### 3.2 Dataset 2 : DVF (Demandes de Valeurs Foncières)

**Source** : [DVF géolocalisées](https://www.data.gouv.fr/fr/datasets/demandes-de-valeurs-foncieres-geolocalisees/)

**Producteur** : Etalab (données DGFiP enrichies)

**⚠️ API cquest indisponible** : L'API https://api.cquest.org/dvf est "sans garantie de disponibilité" et semble actuellement down.

**Alternative recommandée** : API Tabular data.gouv.fr

```
GET https://tabular-api.data.gouv.fr/api/resources/{resource_id}/data/
?page_size=100
&code_postal__exact=75011
&type_local__exact=Appartement
```

**resource_id** : À récupérer via l'API datasets (fichier par année, ex: `full.csv` 2024)

**Champs clés pour le calcul** :
| Champ | Type | Description |
|-------|------|-------------|
| `valeur_fonciere` | float | Prix de vente en € |
| `surface_reelle_bati` | float | Surface en m² |
| `date_mutation` | date | Date de la vente |
| `code_postal` | string | Code postal |
| `type_local` | string | Appartement/Maison |

**Calcul prix/m²** : `valeur_fonciere / surface_reelle_bati` (filtrer outliers < 1000€/m² et > 30000€/m²)

**Note** : Les fichiers DVF sont volumineux (~300 Mo/an). Pour le POC, on peut :
1. Utiliser l'API Tabular avec filtres (si indexé)
2. Ou pré-calculer des stats par arrondissement et les stocker en JSON statique

### 3.3 Dataset 3 : Pharmacies vaccination grippe

**Source** : [Lieux de vaccination grippe (pharmacies)](https://www.data.gouv.fr/fr/datasets/lieux-de-vaccination-contre-la-grippe-pharmacies-sante-fr/)

**Producteur** : Ministère de la Santé / Santé.fr

**Format** : CSV, ~20k lignes

**Champs clés** :
| Champ | Type | Description |
|-------|------|-------------|
| `nom` | string | Nom de la pharmacie |
| `adresse` | string | Adresse |
| `code_postal` | string | Code postal |
| `commune` | string | Ville |
| `longitude` | float | Longitude |
| `latitude` | float | Latitude |

**API** : API Tabular data.gouv.fr avec filtres géographiques

### 3.4 Dataset 4 : Vaccination grippe (statistiques)

**Source** : [Vaccination Grippe 2025-2026](https://www.data.gouv.fr/fr/datasets/vaccination-grippe-2025-2026/)

**Producteur** : IQVIA

**Fichiers** :
- `doses-actes.csv` : données quotidiennes (date, doses, actes, groupe d'âge)
- `campagne.csv` : synthèse campagne (cumul, comparaison N-1)
- `couverture.csv` : couverture régionale

**Champs clés (doses-actes)** :
| Champ | Type | Description |
|-------|------|-------------|
| `date` | date | Date du jour |
| `doses` | int | Nombre de doses dispensées |
| `actes` | int | Nombre d'actes de vaccination |
| `groupe` | string | "65+" ou "<65" |

**API** : Téléchargement direct du fichier JSON/CSV (fichier ~50 Ko, rechargé à chaque requête)

---

## 4. Architecture technique

### 4.1 Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────────┐
│                     ChatGPT (host)                              │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Widget React (iframe sandbox Skybridge)                  │  │
│  │  - Carte Leaflet (IRVE, Pharmacies)                       │  │
│  │  - Chiffres clés (DVF)                                    │  │
│  │  - Line chart Chart.js (Vaccination)                      │  │
│  └───────────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTPS (MCP JSON-RPC)
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│         Serveur MCP (Skybridge) — Fly.io                        │
│  - 4 widgets enregistrés via registerWidget()                   │
│  - Type safety end-to-end avec generateHelpers                  │
│  - Endpoint: /mcp                                               │
└──────────┬──────────────┬──────────────┬──────────────┬─────────┘
           │              │              │              │
           ▼              ▼              ▼              ▼
      API Tabular    API DVF       API Tabular    Fichier JSON
      (IRVE)         (cquest)      (Pharmacies)   (Vaccination)
```

### 4.2 Stack technique

| Composant | Technologie | Justification |
|-----------|-------------|---------------|
| **Framework** | Skybridge | Template validé, émulateur local, HMR |
| Runtime | Node.js 22+ | LTS, support ESM natif |
| Langage | TypeScript | Type safety, DX |
| Build | Vite + plugin Skybridge | HMR, build rapide |
| Package manager | pnpm | Requis par Skybridge |
| **Cartes** | Leaflet + react-leaflet | Open source, léger, clusters |
| **Charts** | Chart.js 4.x + react-chartjs-2 | Simple, léger (~60 Ko) |
| **Hébergement** | Fly.io | HTTPS natif, région Paris (cdg) |
| **Dev local** | Skybridge DevTools | Émulateur ChatGPT, pas de tunnel |

### 4.3 Structure du projet

```
chatgpt-datagouv/
├── server/
│   ├── src/
│   │   ├── index.ts              # McpServer + 4 registerWidget
│   │   └── lib/
│   │       ├── irve.ts           # Client API IRVE
│   │       ├── dvf.ts            # Client API DVF
│   │       ├── pharmacies.ts     # Client API Pharmacies grippe
│   │       └── vaccination.ts    # Client données vaccination
│   ├── package.json
│   └── tsconfig.json
├── web/
│   ├── src/
│   │   ├── skybridge.ts          # generateHelpers<AppType>
│   │   ├── components/
│   │   │   ├── Map.tsx           # Composant carte réutilisable
│   │   │   ├── KeyFigures.tsx    # Composant chiffres clés
│   │   │   └── LineChart.tsx     # Composant line chart
│   │   └── widgets/
│   │       ├── irve.tsx          # Widget carte IRVE
│   │       ├── dvf.tsx           # Widget chiffres DVF
│   │       ├── pharmacies.tsx    # Widget carte pharmacies
│   │       └── vaccination.tsx   # Widget line chart vaccination
│   ├── package.json
│   └── vite.config.ts
├── fly.toml
├── package.json                  # pnpm workspaces
└── README.md
```

---

## 5. Spécifications serveur MCP

### 5.1 Structure avec method chaining

```typescript
// server/src/index.ts
import { McpServer } from "skybridge/server";
import { z } from "zod";
import { searchIRVE } from "./lib/irve";
import { getPrixM2 } from "./lib/dvf";
import { searchPharmacies } from "./lib/pharmacies";
import { getVaccinationStats } from "./lib/vaccination";

const server = new McpServer({ name: "datagouv", version: "1.0.0" }, {})
  
  // Widget 1: Bornes IRVE
  .registerWidget(
    "irve-map",
    {},
    {
      description: "Affiche les bornes de recharge électrique autour d'une ville",
      inputSchema: {
        ville: z.string().describe("Nom de la ville (ex: Lyon, Paris, Bordeaux)"),
        rayon_km: z.number().min(1).max(50).default(10).optional(),
      },
    },
    async ({ ville, rayon_km = 10 }) => {
      const { bornes, center, count } = await searchIRVE(ville, rayon_km);
      return {
        content: [{ type: "text", text: `${count} bornes trouvées autour de ${ville}` }],
        structuredContent: { bornes, center, ville, rayon_km },
      };
    }
  )
  
  // Widget 2: Prix DVF
  .registerWidget(
    "dvf-prix",
    {},
    {
      description: "Calcule le prix moyen au m² dans un arrondissement de Paris",
      inputSchema: {
        arrondissement: z.number().min(1).max(20).describe("Numéro d'arrondissement (1-20)"),
        type_bien: z.enum(["Appartement", "Maison"]).default("Appartement").optional(),
      },
    },
    async ({ arrondissement, type_bien = "Appartement" }) => {
      const stats = await getPrixM2(arrondissement, type_bien);
      return {
        content: [{ type: "text", text: `Prix moyen: ${stats.prix_moyen}€/m² dans le ${arrondissement}e` }],
        structuredContent: { ...stats, arrondissement, type_bien },
      };
    }
  )
  
  // Widget 3: Pharmacies grippe
  .registerWidget(
    "pharmacies-grippe",
    {},
    {
      description: "Affiche les pharmacies proposant la vaccination grippe autour d'une ville",
      inputSchema: {
        ville: z.string().describe("Nom de la ville"),
        rayon_km: z.number().min(1).max(30).default(5).optional(),
      },
    },
    async ({ ville, rayon_km = 5 }) => {
      const { pharmacies, center, count } = await searchPharmacies(ville, rayon_km);
      return {
        content: [{ type: "text", text: `${count} pharmacies vaccination grippe autour de ${ville}` }],
        structuredContent: { pharmacies, center, ville },
      };
    }
  )
  
  // Widget 4: Stats vaccination
  .registerWidget(
    "vaccination-stats",
    {},
    {
      description: "Affiche l'évolution de la campagne de vaccination grippe 2025-2026",
      inputSchema: {
        groupe: z.enum(["tous", "65+", "<65"]).default("tous").optional(),
      },
    },
    async ({ groupe = "tous" }) => {
      const stats = await getVaccinationStats(groupe);
      return {
        content: [{ type: "text", text: `Campagne grippe 2025-2026: ${stats.total_doses.toLocaleString()} doses` }],
        structuredContent: stats,
      };
    }
  );

export type AppType = typeof server;
```

### 5.2 Client API IRVE

```typescript
// server/src/lib/irve.ts
import { geocodeVille, getBoundingBox } from "./geo";

const TABULAR_API = "https://tabular-api.data.gouv.fr/api";
const IRVE_RESOURCE_ID = "xxx"; // À récupérer dynamiquement ou hardcoder

interface Borne {
  nom_station: string;
  adresse_station: string;
  lat: number;
  lon: number;
  nom_operateur: string;
  puissance_nominale: number;
}

export async function searchIRVE(ville: string, rayonKm: number) {
  // 1. Géocoder la ville
  const center = await geocodeVille(ville);
  
  // 2. Calculer la bounding box
  const bbox = getBoundingBox(center.lat, center.lon, rayonKm);
  
  // 3. Requêter l'API Tabular avec filtres géographiques
  const url = new URL(`${TABULAR_API}/resources/${IRVE_RESOURCE_ID}/data/`);
  url.searchParams.set("page_size", "200");
  url.searchParams.set("consolidated_latitude__gte", String(bbox.latMin));
  url.searchParams.set("consolidated_latitude__lte", String(bbox.latMax));
  url.searchParams.set("consolidated_longitude__gte", String(bbox.lonMin));
  url.searchParams.set("consolidated_longitude__lte", String(bbox.lonMax));
  
  const res = await fetch(url.toString());
  const json = await res.json();
  
  const bornes: Borne[] = json.data.map((row: any) => ({
    nom_station: row.nom_station,
    adresse_station: row.adresse_station,
    lat: row.consolidated_latitude,
    lon: row.consolidated_longitude,
    nom_operateur: row.nom_operateur,
    puissance_nominale: row.puissance_nominale,
  }));
  
  return { bornes, center, count: bornes.length };
}
```

### 5.3 Client API DVF

```typescript
// server/src/lib/dvf.ts
const DVF_API = "https://api.cquest.org/dvf";

interface DVFStats {
  prix_moyen: number;
  prix_median: number;
  nb_ventes: number;
  prix_min: number;
  prix_max: number;
  evolution_1an: number | null;
}

export async function getPrixM2(arrondissement: number, typeBien: string): Promise<DVFStats> {
  const codePostal = `750${arrondissement.toString().padStart(2, "0")}`;
  
  const url = new URL(DVF_API);
  url.searchParams.set("code_postal", codePostal);
  url.searchParams.set("nature_mutation", "Vente");
  url.searchParams.set("type_local", typeBien);
  
  const res = await fetch(url.toString());
  const ventes = await res.json();
  
  // Filtrer et calculer prix/m²
  const prixM2 = ventes
    .filter((v: any) => v.valeur_fonciere && v.surface_reelle_bati > 0)
    .map((v: any) => v.valeur_fonciere / v.surface_reelle_bati)
    .filter((p: number) => p > 1000 && p < 30000); // Exclure outliers
  
  if (prixM2.length === 0) {
    return { prix_moyen: 0, prix_median: 0, nb_ventes: 0, prix_min: 0, prix_max: 0, evolution_1an: null };
  }
  
  const sorted = [...prixM2].sort((a, b) => a - b);
  const sum = prixM2.reduce((a: number, b: number) => a + b, 0);
  
  return {
    prix_moyen: Math.round(sum / prixM2.length),
    prix_median: Math.round(sorted[Math.floor(sorted.length / 2)]),
    nb_ventes: prixM2.length,
    prix_min: Math.round(sorted[0]),
    prix_max: Math.round(sorted[sorted.length - 1]),
    evolution_1an: null, // À implémenter si données dispo
  };
}
```

### 5.4 Client données vaccination

```typescript
// server/src/lib/vaccination.ts
const VACCINATION_DATA_URL = "https://www.data.gouv.fr/fr/datasets/r/xxx"; // URL fichier JSON

interface DayData {
  date: string;
  doses: number;
  actes: number;
}

interface VaccinationStats {
  series: DayData[];
  total_doses: number;
  total_actes: number;
  derniere_maj: string;
  comparaison_n1: {
    doses_n: number;
    doses_n1: number;
    evolution_pct: number;
  } | null;
}

export async function getVaccinationStats(groupe: string): Promise<VaccinationStats> {
  const res = await fetch(VACCINATION_DATA_URL);
  const data = await res.json();
  
  // Filtrer par groupe si nécessaire
  let filtered = data;
  if (groupe !== "tous") {
    filtered = data.filter((d: any) => d.groupe === groupe);
  }
  
  // Agréger par date
  const byDate = new Map<string, { doses: number; actes: number }>();
  for (const row of filtered) {
    const existing = byDate.get(row.date) || { doses: 0, actes: 0 };
    byDate.set(row.date, {
      doses: existing.doses + row.doses,
      actes: existing.actes + row.actes,
    });
  }
  
  const series: DayData[] = Array.from(byDate.entries())
    .map(([date, values]) => ({ date, ...values }))
    .sort((a, b) => a.date.localeCompare(b.date));
  
  const total_doses = series.reduce((sum, d) => sum + d.doses, 0);
  const total_actes = series.reduce((sum, d) => sum + d.actes, 0);
  
  return {
    series,
    total_doses,
    total_actes,
    derniere_maj: series[series.length - 1]?.date || "",
    comparaison_n1: null, // À implémenter avec fichier campagne.csv
  };
}
```

---

## 6. Spécifications widgets React

### 6.1 Setup type safety

```typescript
// web/src/skybridge.ts
import type { AppType } from "../../server/src/index";
import { generateHelpers } from "skybridge/web";

export const { useCallTool, useToolInfo } = generateHelpers<AppType>();
```

### 6.2 Widget carte IRVE

```tsx
// web/src/widgets/irve.tsx
import { mountWidget } from "skybridge/web";
import { useToolInfo } from "../skybridge";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import "leaflet/dist/leaflet.css";

interface Borne {
  nom_station: string;
  adresse_station: string;
  lat: number;
  lon: number;
  nom_operateur: string;
  puissance_nominale: number;
}

interface IRVEData {
  bornes: Borne[];
  center: { lat: number; lon: number };
  ville: string;
  rayon_km: number;
}

function IRVEWidget() {
  const { output, isSuccess } = useToolInfo<{ structuredContent: IRVEData }>();

  if (!isSuccess) {
    return (
      <div className="p-4 text-center text-gray-500">
        Chargement des bornes...
      </div>
    );
  }

  const { bornes, center, ville } = output.structuredContent;

  return (
    <div className="font-sans">
      {/* Header */}
      <div className="p-4 border-b bg-white">
        <h2 className="text-lg font-semibold text-gray-900">
          🔌 Bornes de recharge autour de {ville}
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          {bornes.length} bornes trouvées
        </p>
      </div>

      {/* Map */}
      <div className="h-[400px]">
        <MapContainer
          center={[center.lat, center.lon]}
          zoom={12}
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://osm.org">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MarkerClusterGroup>
            {bornes.map((borne, i) => (
              <Marker key={i} position={[borne.lat, borne.lon]}>
                <Popup>
                  <div className="text-sm">
                    <p className="font-semibold">{borne.nom_station}</p>
                    <p className="text-gray-600">{borne.adresse_station}</p>
                    <p className="text-gray-500 mt-1">
                      {borne.nom_operateur} • {borne.puissance_nominale} kW
                    </p>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MarkerClusterGroup>
        </MapContainer>
      </div>

      {/* Footer */}
      <div className="p-3 bg-gray-50 border-t text-xs text-gray-500">
        Source:{" "}
        <a
          href="https://www.data.gouv.fr/fr/datasets/fichier-consolide-des-bornes-de-recharge-pour-vehicules-electriques/"
          target="_blank"
          rel="noopener"
          className="text-blue-600 hover:underline"
        >
          Base nationale IRVE — data.gouv.fr
        </a>
      </div>
    </div>
  );
}

mountWidget(<IRVEWidget />);
```

### 6.3 Widget chiffres clés DVF

```tsx
// web/src/widgets/dvf.tsx
import { mountWidget } from "skybridge/web";
import { useToolInfo } from "../skybridge";

interface DVFData {
  prix_moyen: number;
  prix_median: number;
  nb_ventes: number;
  prix_min: number;
  prix_max: number;
  arrondissement: number;
  type_bien: string;
}

function DVFWidget() {
  const { output, isSuccess } = useToolInfo<{ structuredContent: DVFData }>();

  if (!isSuccess) {
    return (
      <div className="p-4 text-center text-gray-500">
        Calcul des prix...
      </div>
    );
  }

  const data = output.structuredContent;
  const ordinal = data.arrondissement === 1 ? "er" : "ème";

  return (
    <div className="font-sans bg-white">
      {/* Header */}
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold text-gray-900">
          🏠 Prix immobilier — Paris {data.arrondissement}<sup>{ordinal}</sup>
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          {data.type_bien}s • {data.nb_ventes} ventes analysées
        </p>
      </div>

      {/* Key figures */}
      <div className="grid grid-cols-2 gap-4 p-4">
        <div className="text-center p-4 bg-blue-50 rounded-lg">
          <p className="text-3xl font-bold text-blue-700">
            {data.prix_moyen.toLocaleString("fr-FR")} €
          </p>
          <p className="text-sm text-gray-600 mt-1">Prix moyen / m²</p>
        </div>
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <p className="text-3xl font-bold text-gray-700">
            {data.prix_median.toLocaleString("fr-FR")} €
          </p>
          <p className="text-sm text-gray-600 mt-1">Prix médian / m²</p>
        </div>
      </div>

      {/* Range */}
      <div className="px-4 pb-4">
        <div className="flex justify-between text-sm text-gray-500">
          <span>Min: {data.prix_min.toLocaleString("fr-FR")} €/m²</span>
          <span>Max: {data.prix_max.toLocaleString("fr-FR")} €/m²</span>
        </div>
        <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-green-400 via-yellow-400 to-red-400"
            style={{ width: "100%" }}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 bg-gray-50 border-t text-xs text-gray-500">
        Source:{" "}
        <a
          href="https://www.data.gouv.fr/fr/datasets/demandes-de-valeurs-foncieres-geolocalisees/"
          target="_blank"
          rel="noopener"
          className="text-blue-600 hover:underline"
        >
          DVF géolocalisées — data.gouv.fr
        </a>
      </div>
    </div>
  );
}

mountWidget(<DVFWidget />);
```

### 6.4 Widget line chart vaccination

```tsx
// web/src/widgets/vaccination.tsx
import { mountWidget } from "skybridge/web";
import { useToolInfo } from "../skybridge";
import { Line } from "react-chartjs-2";
import {
  Chart,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

Chart.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface VaccinationData {
  series: Array<{ date: string; doses: number; actes: number }>;
  total_doses: number;
  total_actes: number;
  derniere_maj: string;
}

function VaccinationWidget() {
  const { output, isSuccess } = useToolInfo<{ structuredContent: VaccinationData }>();

  if (!isSuccess) {
    return (
      <div className="p-4 text-center text-gray-500">
        Chargement des données...
      </div>
    );
  }

  const { series, total_doses, derniere_maj } = output.structuredContent;

  // Formater les dates pour l'affichage (ex: "15 nov")
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  };

  const chartData = {
    labels: series.map((d) => formatDate(d.date)),
    datasets: [
      {
        label: "Doses quotidiennes",
        data: series.map((d) => d.doses),
        borderColor: "#3b82f6",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        fill: true,
        tension: 0.3,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: any) => `${ctx.raw.toLocaleString("fr-FR")} doses`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value: number) => value.toLocaleString("fr-FR"),
        },
      },
    },
  };

  return (
    <div className="font-sans bg-white">
      {/* Header */}
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold text-gray-900">
          💉 Campagne vaccination grippe 2025-2026
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Mise à jour : {formatDate(derniere_maj)}
        </p>
      </div>

      {/* Key figure */}
      <div className="p-4 text-center">
        <p className="text-4xl font-bold text-blue-600">
          {total_doses.toLocaleString("fr-FR")}
        </p>
        <p className="text-sm text-gray-600">doses administrées en pharmacie</p>
      </div>

      {/* Chart */}
      <div className="px-4 pb-4 h-[200px]">
        <Line data={chartData} options={chartOptions} />
      </div>

      {/* Footer */}
      <div className="p-3 bg-gray-50 border-t text-xs text-gray-500">
        Source:{" "}
        <a
          href="https://www.data.gouv.fr/fr/datasets/vaccination-grippe-2025-2026/"
          target="_blank"
          rel="noopener"
          className="text-blue-600 hover:underline"
        >
          IQVIA via data.gouv.fr
        </a>
      </div>
    </div>
  );
}

mountWidget(<VaccinationWidget />);
```

---

## 7. Design et UX

### 7.1 Principes

1. **Affichage direct** : la visualisation apparaît immédiatement, pas de clic "Voir plus"
2. **Information hierarchy** : titre → chiffre clé → visualisation → source
3. **Cohérence** : même structure header/content/footer pour tous les widgets
4. **Mobile-first** : hauteur contrôlée, scroll si nécessaire

### 7.2 Palette de couleurs

| Usage | Couleur | Hex |
|-------|---------|-----|
| Primary (liens, accents) | Bleu data.gouv | `#3b82f6` |
| Text primary | Gris foncé | `#111827` |
| Text secondary | Gris moyen | `#6b7280` |
| Background | Blanc | `#ffffff` |
| Background subtle | Gris clair | `#f9fafb` |
| Border | Gris border | `#e5e7eb` |

### 7.3 Typographie

- **Font family** : System UI (`-apple-system, BlinkMacSystemFont, "Segoe UI", ...`)
- **Titre widget** : 18px, semibold
- **Sous-titre** : 14px, regular, gris
- **Chiffre clé** : 30-40px, bold
- **Source** : 12px, gris

### 7.4 Dimensions widgets

| Widget | Hauteur | Notes |
|--------|---------|-------|
| Carte (IRVE, Pharmacies) | 500px | Header 60px + Map 400px + Footer 40px |
| Chiffres clés (DVF) | 280px | Compact, pas de scroll |
| Line chart (Vaccination) | 400px | Header + chiffre + chart + footer |

---

## 8. Développement et déploiement

### 8.0 Répartition des outils

On utilise chaque outil pour ses points forts :

| Outil | Usage | Pourquoi |
|-------|-------|----------|
| **Claude.ai** | Specs, planification, préparation prompts | Vision globale, réflexion stratégique, itération rapide sur les specs |
| **Claude Code** | Écriture du code, debugging, tests | Accès filesystem, exécution, context projet complet |

**Workflow type** :
1. **Claude.ai** : définir le scope d'une tâche, identifier les edge cases, rédiger le prompt détaillé
2. **Claude Code** : implémenter, tester, itérer
3. **Claude.ai** : review, planifier la suite

**Prompts préparés pour Claude Code** : chaque widget aura un prompt dédié dans la section 13.

### 8.1 Setup initial

```bash
# 1. Créer depuis le template Skybridge
npx create-skybridge-app chatgpt-datagouv
cd chatgpt-datagouv

# 2. Installer les dépendances additionnelles
cd web
pnpm add leaflet react-leaflet react-leaflet-cluster
pnpm add chart.js react-chartjs-2
pnpm add -D @types/leaflet
cd ..

# 3. Lancer le dev server
pnpm dev
```

### 8.2 Développement local

```bash
# Terminal 1 : Server MCP
cd server && pnpm dev

# Terminal 2 : Widgets avec HMR
cd web && pnpm dev
```

L'émulateur Skybridge s'ouvre automatiquement → tester sans tunnel ni ChatGPT réel.

### 8.3 Déploiement

#### Option A : Railway (recommandé pour POC)

```bash
# 1. Installer Railway CLI
npm install -g @railway/cli

# 2. Se connecter
railway login

# 3. Initialiser et déployer
railway init
railway up

# URL finale : https://chatgpt-datagouv.up.railway.app
```

**Avantages** : Free tier 500h/mois, HTTPS natif, simple
**Limite** : Pas de choix de région (US par défaut)

#### Option B : Render

```bash
# Via l'interface web render.com
# 1. Connecter le repo GitHub
# 2. Créer un "Web Service"
# 3. Build command: pnpm build
# 4. Start command: pnpm start
```

**Avantages** : Gratuit, auto-deploy sur push
**Limite** : Cold start ~30s après inactivité

#### Option C : Fly.io (si CB disponible)

```bash
fly auth login
fly launch --name chatgpt-datagouv --region cdg
fly deploy
```

**Avantages** : Région Paris, très rapide
**Coût** : ~5€/mois après trial

### 8.4 Configuration ChatGPT

1. ChatGPT → Settings → Apps & Connectors → Developer Mode
2. Créer une app :
   - **Nom** : `data.gouv.fr`
   - **URL** : `https://chatgpt-datagouv.fly.dev/mcp`
   - **Auth** : None
3. Tester avec : `@data.gouv.fr bornes de recharge autour de Lyon`

---

## 9. Critères d'acceptance

### 9.1 Sprint 1 : IRVE (POC v0.1)

| # | Critère | Test |
|---|---------|------|
| 1 | Dev server démarre | `pnpm dev` sans erreur |
| 2 | Émulateur fonctionne | Widget visible dans Skybridge DevTools |
| 3 | Carte s'affiche | Markers visibles sur fond OpenStreetMap |
| 4 | Clusters fonctionnent | Zoom out → markers groupés |
| 5 | Popups fonctionnent | Clic marker → infos borne |
| 6 | Deploy OK | URL Railway accessible |
| 7 | **ChatGPT fonctionne** | Widget s'affiche dans ChatGPT réel |
| 8 | **Prompt valide** | "bornes autour de Lyon" → carte avec bornes |

### 9.2 Sprint 2 : Pharmacies (POC v0.2)

| # | Critère | Test |
|---|---------|------|
| 1 | Widget pharmacies OK | Carte avec markers pharmacies |
| 2 | **Prompt valide** | "vacciner grippe Bordeaux" → carte pharmacies |

### 9.3 Sprint 3 : Vaccination (POC v0.3)

| # | Critère | Test |
|---|---------|------|
| 1 | Line chart s'affiche | Courbe avec données temporelles |
| 2 | Chiffre total visible | Total doses en gros |
| 3 | **Prompt valide** | "campagne vaccination grippe" → chart + stats |

### 9.4 Sprint 4 : DVF (POC v1.0)

| # | Critère | Test |
|---|---------|------|
| 1 | Chiffres clés OK | Prix moyen/médian affichés |
| 2 | **Prompt valide** | "prix m² 11ème Paris" → widget chiffres |
| 3 | **4 widgets OK** | Tous fonctionnels dans ChatGPT |

### 9.5 Validation UX (tous sprints)

| # | Critère | Validation |
|---|---------|------------|
| 1 | Visualisation directe | Pas de clic "Voir plus" |
| 2 | Source visible | Lien data.gouv sur chaque widget |
| 3 | Mobile OK | Responsive, pas de scroll horizontal |
| 4 | Design cohérent | Même structure header/content/footer |

---

## 10. Planning — Approche itérative

### 10.1 Philosophie

**Livrer vite, tester en réel, itérer.** Chaque dataset = 1 cycle complet jusqu'à validation dans ChatGPT.

```
┌─────────────────────────────────────────────────────────────┐
│  Dataset N                                                  │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐ │
│  │  Build   │ → │  Deploy  │ → │  Test    │ → │  Itérer  │ │
│  │  widget  │   │  Railway │   │  ChatGPT │   │  si bug  │ │
│  └──────────┘   └──────────┘   └──────────┘   └──────────┘ │
│                                                     │       │
│                              ✅ Validé ? ───────────┘       │
│                                    │                        │
│                                    ▼                        │
│                              Dataset N+1                    │
└─────────────────────────────────────────────────────────────┘
```

### 10.2 Ordre des datasets

| Ordre | Dataset | Justification |
|-------|---------|---------------|
| **1** | **IRVE** | Même use case que démo Alpic (preuve que ça marche), carte = wow factor |
| 2 | Pharmacies grippe | Très similaire à IRVE (carte), capitalise sur le code |
| 3 | Vaccination | Plus simple (fichier JSON, line chart), pas de géoloc |
| 4 | DVF | Plus risqué (API incertaine), on le garde pour la fin |

### 10.3 Sprint 1 : IRVE (POC v0.1)

**Objectif** : Premier widget fonctionnel dans ChatGPT réel

| Étape | Tâches | Critère de succès |
|-------|--------|-------------------|
| **1.1 Setup** | Créer projet Skybridge, structure, dépendances | `pnpm dev` démarre |
| **1.2 Serveur** | Implémenter `irve` widget + client API Tabular + geocoding | Émulateur affiche des données |
| **1.3 Widget** | Carte Leaflet avec clusters, popups | Carte interactive dans émulateur |
| **1.4 Deploy** | Déployer sur Railway | URL publique accessible |
| **1.5 Test réel** | Créer app dans ChatGPT Developer Mode | Widget s'affiche dans ChatGPT |
| **1.6 Itérer** | Corriger les bugs, ajuster l'UX | Prompt "bornes autour de Lyon" → carte OK |

**Livrable** : https://chatgpt-datagouv.up.railway.app + app ChatGPT fonctionnelle

**Durée estimée** : 2-3 jours

### 10.4 Sprint 2 : Pharmacies grippe (POC v0.2)

**Objectif** : Deuxième carte, valider la réutilisation du code

| Étape | Tâches |
|-------|--------|
| **2.1** | Implémenter client API pharmacies (copier/adapter IRVE) |
| **2.2** | Créer widget pharmacies (copier/adapter IRVE) |
| **2.3** | Deploy + test ChatGPT |
| **2.4** | Itérer si bugs |

**Durée estimée** : 1-2 jours

### 10.5 Sprint 3 : Vaccination (POC v0.3)

**Objectif** : Premier line chart, données temporelles

| Étape | Tâches |
|-------|--------|
| **3.1** | Télécharger et inspecter le fichier vaccination |
| **3.2** | Implémenter client + widget Chart.js |
| **3.3** | Deploy + test ChatGPT |
| **3.4** | Itérer si bugs |

**Durée estimée** : 1-2 jours

### 10.6 Sprint 4 : DVF (POC v1.0)

**Objectif** : Widget chiffres clés, compléter le POC

| Étape | Tâches |
|-------|--------|
| **4.1** | Tester API Tabular DVF ou préparer JSON statique |
| **4.2** | Implémenter client + widget chiffres clés |
| **4.3** | Deploy + test ChatGPT |
| **4.4** | Itérer + polish final |

**Durée estimée** : 1-2 jours

### 10.7 Timeline globale

```
Semaine 1                          Semaine 2
┌────────────────────────────────┐    ┌────────────────────────────┐
│ Sprint 1: IRVE (2-3j)      │    │ Sprint 3: Vaccination (1-2j)│
│ Sprint 2: Pharmacies (1-2j)│    │ Sprint 4: DVF (1-2j)       │
│                            │    │ Buffer / Polish            │
└────────────────────────────┘    └────────────────────────────┘
                                                    │
                                                    ▼
                                           POC v1.0 complet
                                           Prêt pour démo DINUM
```

**Durée totale** : 6-9 jours (à 50% du temps)

---

## 11. Risques et mitigations

| Risque | Probabilité | Impact | Mitigation |
|--------|-------------|--------|------------|
| API Tabular lente/down | Moyenne | Haut | Cache côté serveur, fallback message |
| Micro-API DVF indisponible | Faible | Moyen | Fallback API data.gouv directe |
| Leaflet perf avec 500k points | Moyenne | Moyen | Clustering agressif, limite 200 points |
| ChatGPT ne crée pas le connecteur | Faible | Bloquant | Template Skybridge validé, support Alpic |
| Données vaccination obsolètes | Faible | Faible | Afficher date dernière MAJ |

---

## 12. Ressources

### Documentation

- [Skybridge](https://www.skybridge.tech/) — Framework ChatGPT Apps
- [OpenAI Apps SDK](https://developers.openai.com/apps-sdk/) — Guidelines officielles
- [API data.gouv.fr](https://doc.data.gouv.fr/api/) — Documentation API
- [API Tabular](https://tabular-api.data.gouv.fr/apidocs/) — Query CSV/Parquet

### Datasets

- [Base nationale IRVE](https://www.data.gouv.fr/fr/datasets/fichier-consolide-des-bornes-de-recharge-pour-vehicules-electriques/)
- [DVF géolocalisées](https://www.data.gouv.fr/fr/datasets/demandes-de-valeurs-foncieres-geolocalisees/)
- [Pharmacies vaccination grippe](https://www.data.gouv.fr/fr/datasets/lieux-de-vaccination-contre-la-grippe-pharmacies-sante-fr/)
- [Vaccination grippe 2025-2026](https://www.data.gouv.fr/fr/datasets/vaccination-grippe-2025-2026/)

### Repo

- **GitHub** : https://github.com/benoitvx/chatgpt-datagouv (à créer)
- **Production** : https://chatgpt-datagouv.fly.dev (après deploy)

---

## 13. Prompts pour Claude Code

### 13.1 Sprint 1 : IRVE — Prompt complet

```
# Contexte

Je démarre le POC "App ChatGPT data.gouv" avec Skybridge.
Objectif : créer une app ChatGPT qui affiche les bornes de recharge IRVE sur une carte.

Les specs complètes sont dans le fichier projet (si disponible) ou ci-dessous.

# Approche

On fait UN dataset à la fois. Sprint 1 = IRVE uniquement.
On veut un cycle complet : build → deploy → test ChatGPT → itérer.

# Tâches Sprint 1

## Étape 1.1 : Setup projet

1. Créer le projet Skybridge :
   - Utiliser le template officiel ou créer manuellement
   - Structure : server/ et web/
   - Package manager : pnpm

2. Installer les dépendances :
   - server : skybridge, zod
   - web : skybridge, react, leaflet, react-leaflet, react-leaflet-cluster
   - web devDeps : @types/leaflet, vite, typescript

3. Configurer la structure :
   - server/src/index.ts (McpServer vide)
   - server/src/lib/geo.ts (helpers geocoding)
   - server/src/lib/irve.ts (client API)
   - web/src/skybridge.ts (generateHelpers)
   - web/src/widgets/irve.tsx (widget carte)
   - web/vite.config.ts (plugin skybridge)

4. Vérifier que `pnpm dev` démarre sans erreur

## Étape 1.2 : Serveur MCP

1. Implémenter server/src/lib/geo.ts :
   ```typescript
   // Geocoder une ville via Nominatim
   async function geocodeVille(ville: string): Promise<{lat: number, lon: number}>
   
   // Calculer bounding box autour d'un point
   function getBoundingBox(lat: number, lon: number, rayonKm: number): {latMin, latMax, lonMin, lonMax}
   ```

2. Récupérer le resource_id IRVE :
   - Appeler https://www.data.gouv.fr/api/1/datasets/fichier-consolide-des-bornes-de-recharge-pour-vehicules-electriques/
   - Trouver la ressource "Consolidation" au format CSV
   - Stocker l'ID (ou le récupérer dynamiquement)

3. Implémenter server/src/lib/irve.ts :
   ```typescript
   interface Borne {
     nom_station: string;
     adresse_station: string;
     lat: number;
     lon: number;
     nom_operateur: string;
     puissance_nominale: number;
   }
   
   async function searchIRVE(ville: string, rayonKm: number): Promise<{
     bornes: Borne[];
     center: {lat: number, lon: number};
     count: number;
   }>
   ```
   
   - Géocoder la ville
   - Calculer bounding box
   - Query API Tabular : https://tabular-api.data.gouv.fr/api/resources/{id}/data/
   - Filtres : consolidated_latitude__gte, __lte, consolidated_longitude__gte, __lte
   - Limit : 200 bornes max

4. Enregistrer le widget dans server/src/index.ts :
   ```typescript
   const server = new McpServer({ name: "datagouv", version: "1.0.0" }, {})
     .registerWidget("irve-map", {}, {
       description: "Affiche les bornes de recharge électrique autour d'une ville",
       inputSchema: {
         ville: z.string().describe("Nom de la ville"),
         rayon_km: z.number().min(1).max(50).default(10).optional(),
       },
     }, async ({ ville, rayon_km = 10 }) => {
       const result = await searchIRVE(ville, rayon_km);
       return {
         content: [{ type: "text", text: `${result.count} bornes trouvées` }],
         structuredContent: result,
       };
     });
   
   export type AppType = typeof server;
   ```

## Étape 1.3 : Widget React

1. Setup type safety dans web/src/skybridge.ts :
   ```typescript
   import type { AppType } from "../../server/src/index";
   import { generateHelpers } from "skybridge/web";
   export const { useCallTool, useToolInfo } = generateHelpers<AppType>();
   ```

2. Implémenter web/src/widgets/irve.tsx :
   - Utiliser useToolInfo pour récupérer les données
   - MapContainer + TileLayer OpenStreetMap
   - MarkerClusterGroup pour les clusters
   - Marker + Popup pour chaque borne
   - Header avec titre + count
   - Footer avec lien source data.gouv.fr

3. Tester dans l'émulateur Skybridge :
   - Le widget doit s'afficher
   - La carte doit être interactive
   - Les popups doivent fonctionner

## Étape 1.4 : Déploiement Railway

1. Préparer le build :
   - Vérifier que `pnpm build` fonctionne
   - Créer un script start si nécessaire

2. Déployer :
   ```bash
   npm install -g @railway/cli
   railway login
   railway init
   railway up
   ```

3. Récupérer l'URL publique et vérifier que /mcp répond

## Étape 1.5 : Test ChatGPT réel

1. Aller dans ChatGPT → Settings → Apps & Connectors → Developer Mode
2. Créer une app :
   - Nom : data.gouv.fr
   - URL : https://[app].up.railway.app/mcp
   - Auth : None
3. Tester avec : "@data.gouv.fr bornes de recharge autour de Lyon"
4. Noter les bugs/problèmes

## Étape 1.6 : Itération

Si bugs :
- Analyser les logs Railway
- Corriger et redéployer
- Re-tester

Quand ça marche :
- Sprint 1 terminé ✅
- Passer au Sprint 2 (Pharmacies)

# Edge cases à gérer

- Ville non trouvée par Nominatim → message d'erreur clair
- Aucune borne dans le rayon → "Aucune borne trouvée, essayez un rayon plus grand"
- API Tabular timeout → retry 1x puis message d'erreur
- API Tabular ne supporte pas filtres géo → télécharger les données et filtrer côté serveur

# Critères de succès Sprint 1

- [ ] `pnpm dev` démarre sans erreur
- [ ] Widget visible dans émulateur Skybridge
- [ ] Carte affiche des markers clustérisés
- [ ] Popup affiche infos borne au clic
- [ ] URL Railway accessible
- [ ] App créée dans ChatGPT Developer Mode
- [ ] Prompt "bornes autour de Lyon" affiche la carte dans ChatGPT
```

### 13.2 Sprint 2 : Pharmacies — Prompt

```
# Contexte

Sprint 1 (IRVE) terminé et validé.
Sprint 2 : ajouter le widget Pharmacies vaccination grippe.

# Tâches

1. Récupérer le resource_id du dataset "Lieux de vaccination grippe pharmacies"
   - URL : https://www.data.gouv.fr/fr/datasets/lieux-de-vaccination-contre-la-grippe-pharmacies-sante-fr/

2. Implémenter server/src/lib/pharmacies.ts :
   - Copier/adapter irve.ts
   - Champs : nom, adresse, code_postal, commune, latitude, longitude

3. Ajouter le widget dans server/src/index.ts :
   - Nom : "pharmacies-grippe"
   - Input : ville, rayon_km (défaut 5)

4. Implémenter web/src/widgets/pharmacies.tsx :
   - Copier/adapter irve.tsx
   - Changer le titre, l'icône (💉), le lien source

5. Deploy Railway + test ChatGPT

6. Itérer si bugs

# Critères de succès

- [ ] Prompt "où me faire vacciner contre la grippe à Bordeaux" → carte pharmacies
```

### 13.3 Sprint 3 : Vaccination — Prompt

```
# Contexte

Sprints 1-2 terminés. Sprint 3 : widget line chart vaccination.

# Tâches

1. Télécharger et inspecter le fichier du dataset Vaccination Grippe 2025-2026
   - Identifier la structure (colonnes, format date)
   - Fichier : doses-actes.csv ou .json

2. Implémenter server/src/lib/vaccination.ts :
   - Télécharger le fichier à chaque requête (ou cache 1h)
   - Parser et agréger par date
   - Retourner : series[], total_doses, derniere_maj

3. Ajouter le widget dans server/src/index.ts :
   - Nom : "vaccination-stats"
   - Input : groupe (tous/65+/<65) optionnel

4. Implémenter web/src/widgets/vaccination.tsx :
   - Installer chart.js et react-chartjs-2
   - Line chart avec évolution quotidienne
   - Chiffre clé : total doses
   - Footer source

5. Deploy + test ChatGPT

# Critères de succès

- [ ] Prompt "où en est la campagne vaccination grippe" → line chart + total
```

### 13.4 Sprint 4 : DVF — Prompt

```
# Contexte

Sprints 1-3 terminés. Sprint 4 : widget DVF (dernier, plus risqué).

# Tâches

1. Tester l'API Tabular sur le dataset DVF géolocalisées :
   - Le fichier est-il indexé ?
   - Les filtres code_postal fonctionnent-ils ?
   
   Si NON : préparer un fichier JSON statique avec stats pré-calculées par arrondissement

2. Implémenter server/src/lib/dvf.ts :
   - getPrixM2(arrondissement, typeBien)
   - Calcul : valeur_fonciere / surface_reelle_bati
   - Filtrer outliers < 1000€ et > 30000€/m²
   - Retourner : prix_moyen, prix_median, prix_min, prix_max, nb_ventes

3. Ajouter le widget dans server/src/index.ts :
   - Nom : "dvf-prix"
   - Input : arrondissement (1-20), type_bien (Appartement/Maison)

4. Implémenter web/src/widgets/dvf.tsx :
   - 2 cards : prix moyen + prix médian
   - Range bar min/max
   - Footer source

5. Deploy + test ChatGPT

6. Polish final sur les 4 widgets

# Critères de succès

- [ ] Prompt "prix du m² dans le 11ème à Paris" → chiffres clés
- [ ] POC v1.0 complet avec 4 widgets fonctionnels
```

---

## 14. Points en suspens

### 14.1 Points clarifiés ✅

| # | Point | Résolution |
|---|-------|------------|
| 1 | **Hébergement** | Railway (free tier) pour le POC, migration possible vers Fly.io/infra DINUM après validation |
| 2 | **API DVF** | API cquest down → utiliser API Tabular data.gouv ou pré-calculer stats en JSON statique |
| 3 | **Workflow dev** | Claude.ai pour specs/planification, Claude Code pour implémentation |

### 14.2 À vérifier en J1 (avec Claude Code)

| # | Point | Action | Bloquant ? |
|---|-------|--------|------------|
| 1 | **Resource IDs Tabular** | Récupérer les IDs actuels des 4 datasets via API data.gouv | Oui |
| 2 | **Format vaccination** | Télécharger et inspecter le fichier doses-actes.json | Oui |
| 3 | **Filtres géo Tabular** | Vérifier si l'API supporte les filtres `__gte` / `__lte` sur lat/lon | Oui |
| 4 | **Template Skybridge** | Tester que `npx create-skybridge-app` fonctionne | Oui |
| 5 | **Geocoding** | Tester Nominatim, prévoir fallback si rate limit | Non (fallback possible) |

### 14.3 Décisions prises

| # | Décision | Choix | Justification |
|---|----------|-------|---------------|
| 1 | **Nom app ChatGPT** | `data.gouv.fr` | Officiel, reconnaissable |
| 2 | **Limite bornes IRVE** | 200 max | Équilibre perf/utilité |
| 3 | **Période DVF** | 2 dernières années | Volume de données suffisant |
| 4 | **Plateforme déploiement** | Railway | Free tier, simple, suffisant pour POC |

### 14.4 Risques résiduels

| Risque | Probabilité | Impact | Plan B |
|--------|-------------|--------|--------|
| API Tabular ne supporte pas filtres géo | Moyenne | Haut | Télécharger subset, filtrer côté serveur |
| Template Skybridge bugué | Faible | Bloquant | Contacter Alpic, ou fork du template |
| ChatGPT Developer Mode bugué | Possible | Bloquant | Documenter, escalader à OpenAI |
| DVF trop volumineux pour API | Moyenne | Moyen | Pré-calculer stats par arrondissement |

---

## Changelog

| Version | Date | Changements |
|---------|------|-------------|
| v4.0 | 2024-12-24 | Reboot complet : Skybridge, 4 datasets curatés, specs UI détaillées |
| v3.0 | 2024-12-xx | Tentative monorepo MCP SDK (abandonnée) |
| v2.0 | 2024-12-xx | Première approche MCP brut (abandonnée) |
