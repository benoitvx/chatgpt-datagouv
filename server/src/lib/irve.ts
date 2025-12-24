/**
 * Client API for IRVE (Bornes de recharge) data from data.gouv.fr
 */
import { geocodeVille } from "./geo.js";

const TABULAR_API = "https://tabular-api.data.gouv.fr/api";
// Resource ID for the consolidated IRVE CSV (v2.3.1)
const IRVE_RESOURCE_ID = "eb76d20a-8501-400e-b336-d85724de5435";

export interface Borne {
  nom_station: string;
  adresse_station: string;
  lat: number;
  lon: number;
  nom_operateur: string;
  puissance_nominale: number;
}

interface IRVEResult {
  bornes: Borne[];
  center: { lat: number; lon: number };
  count: number;
}

/**
 * Calculate distance between two points in km using Haversine formula
 */
function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Search for IRVE charging stations around a city
 */
export async function searchIRVE(ville: string, rayonKm: number): Promise<IRVEResult> {
  // 1. Geocode the city to get center coordinates
  const center = await geocodeVille(ville);

  // 2. Query the Tabular API with address filter
  // Note: The API doesn't support geo filters, so we search by city name in address
  const apiUrl = `${TABULAR_API}/resources/${IRVE_RESOURCE_ID}/data/?page_size=200&adresse_station__contains=${encodeURIComponent(ville)}`;

  const res = await fetch(apiUrl);

  if (!res.ok) {
    throw new Error(`API IRVE error: ${res.statusText}`);
  }

  const json = await res.json();

  // 3. Transform and filter the data by distance
  const allBornes: Borne[] = (json.data || [])
    .filter(
      (row: Record<string, unknown>) =>
        row.consolidated_latitude != null &&
        row.consolidated_longitude != null &&
        typeof row.consolidated_latitude === "number" &&
        typeof row.consolidated_longitude === "number"
    )
    .map((row: Record<string, unknown>) => ({
      nom_station: String(row.nom_station || "Station inconnue"),
      adresse_station: String(row.adresse_station || ""),
      lat: Number(row.consolidated_latitude),
      lon: Number(row.consolidated_longitude),
      nom_operateur: String(row.nom_operateur || "Opérateur inconnu"),
      puissance_nominale: Number(row.puissance_nominale) || 0,
    }));

  // Filter by distance from center
  const bornes = allBornes.filter(
    (borne) =>
      haversineDistance(center.lat, center.lon, borne.lat, borne.lon) <= rayonKm
  );

  // Limit to 200 results for performance
  const limitedBornes = bornes.slice(0, 200);

  return {
    bornes: limitedBornes,
    center,
    count: limitedBornes.length,
  };
}
