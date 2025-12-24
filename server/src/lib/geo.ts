/**
 * Geocoding utilities using Nominatim API
 */

interface GeoPoint {
  lat: number;
  lon: number;
}

interface BoundingBox {
  latMin: number;
  latMax: number;
  lonMin: number;
  lonMax: number;
}

/**
 * Geocode a city name to coordinates using Nominatim
 */
export async function geocodeVille(ville: string): Promise<GeoPoint> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", ville);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "fr");

  const res = await fetch(url.toString(), {
    headers: {
      "User-Agent": "DataGouvChatGPT/1.0 (contact@data.gouv.fr)",
    },
  });

  if (!res.ok) {
    throw new Error(`Geocoding failed: ${res.statusText}`);
  }

  const data = await res.json();

  if (!data || data.length === 0) {
    throw new Error(`Ville non trouvée: ${ville}`);
  }

  return {
    lat: parseFloat(data[0].lat),
    lon: parseFloat(data[0].lon),
  };
}

/**
 * Calculate bounding box around a point given a radius in km
 */
export function getBoundingBox(lat: number, lon: number, rayonKm: number): BoundingBox {
  // Approximate degrees per km
  const latDelta = rayonKm / 111; // 1 degree lat ~ 111 km
  const lonDelta = rayonKm / (111 * Math.cos((lat * Math.PI) / 180)); // Adjust for latitude

  return {
    latMin: lat - latDelta,
    latMax: lat + latDelta,
    lonMin: lon - lonDelta,
    lonMax: lon + lonDelta,
  };
}
