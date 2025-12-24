import { z } from "zod";
import { McpServer } from "skybridge/server";
import { searchIRVE } from "./lib/irve";

const server = new McpServer(
  {
    name: "datagouv",
    version: "1.0.0",
  },
  { capabilities: {} }
).registerWidget(
  "irve-map",
  {
    description: "Carte interactive des bornes de recharge électrique",
  },
  {
    description:
      "Affiche les bornes de recharge pour véhicules électriques (IRVE) autour d'une ville française. Utilise ce tool quand l'utilisateur demande où trouver des bornes de recharge, des stations de recharge électrique, ou des points de charge pour véhicule électrique.",
    inputSchema: {
      ville: z.string().describe("Nom de la ville française (ex: Lyon, Paris, Bordeaux)"),
      rayon_km: z
        .number()
        .min(1)
        .max(50)
        .default(10)
        .optional()
        .describe("Rayon de recherche en kilomètres (défaut: 10)"),
    },
  },
  async ({ ville, rayon_km = 10 }) => {
    try {
      const result = await searchIRVE(ville, rayon_km);

      if (result.count === 0) {
        return {
          content: [
            {
              type: "text",
              text: `Aucune borne de recharge trouvée autour de ${ville} dans un rayon de ${rayon_km} km. Essayez d'augmenter le rayon de recherche.`,
            },
          ],
          structuredContent: { ...result, ville, rayon_km },
          isError: false,
        };
      }

      return {
        content: [
          {
            type: "text",
            text: `${result.count} bornes de recharge trouvées autour de ${ville} (rayon ${rayon_km} km). La carte interactive affiche leur emplacement. Cliquez sur un marqueur pour voir les détails de la borne (nom, adresse, opérateur, puissance).`,
          },
        ],
        structuredContent: { ...result, ville, rayon_km },
        isError: false,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erreur inconnue";
      return {
        content: [{ type: "text", text: `Erreur: ${message}` }],
        isError: true,
      };
    }
  }
);

export default server;
export type AppType = typeof server;
