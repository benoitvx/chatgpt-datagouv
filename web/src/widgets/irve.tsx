import "@/index.css";
import "leaflet/dist/leaflet.css";

import { mountWidget } from "skybridge/web";
import { useToolInfo } from "../helpers";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";

// Fix for default marker icons in Leaflet with bundlers
const DefaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

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
  count: number;
  ville: string;
  rayon_km: number;
}

function IRVEWidget() {
  const toolInfo = useToolInfo<"irve-map">();
  const data = toolInfo.output as unknown as IRVEData | null;

  if (!data) {
    return (
      <div className="flex justify-center items-center h-[400px] bg-gray-50">
        <div className="text-gray-500">Chargement des bornes...</div>
      </div>
    );
  }

  const { bornes, center, ville, count } = data;

  return (
    <div className="font-sans bg-white rounded-lg overflow-hidden shadow-sm">
      {/* Header */}
      <div className="p-4 border-b bg-white">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <span className="text-xl">&#x1F50C;</span>
          Bornes de recharge autour de {ville}
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          {count} bornes trouvées
        </p>
      </div>

      {/* Map */}
      <div className="h-[400px]">
        <MapContainer
          center={[center.lat, center.lon]}
          zoom={12}
          className="h-full w-full"
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MarkerClusterGroup chunkedLoading>
            {bornes.map((borne, i) => (
              <Marker key={i} position={[borne.lat, borne.lon]}>
                <Popup>
                  <div className="text-sm min-w-[200px]">
                    <p className="font-semibold text-gray-900">{borne.nom_station}</p>
                    <p className="text-gray-600 mt-1">{borne.adresse_station}</p>
                    <div className="mt-2 pt-2 border-t border-gray-100">
                      <p className="text-gray-500">
                        <span className="font-medium">Opérateur:</span> {borne.nom_operateur}
                      </p>
                      {borne.puissance_nominale > 0 && (
                        <p className="text-gray-500">
                          <span className="font-medium">Puissance:</span> {borne.puissance_nominale} kW
                        </p>
                      )}
                    </div>
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
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          Base nationale IRVE — data.gouv.fr
        </a>
      </div>
    </div>
  );
}

export default IRVEWidget;

mountWidget(<IRVEWidget />);
