import { Request, Response, Router } from "express";
import { prisma } from "../database";

const router = Router();

/**
 * Récupère la liste complète des cartes triées par numéro (Pokédex)
 *
 * @param {Request} _req Requête HTTP entrante (aucun paramètre attendu)
 * @param {Response} res Réponse HTTP contenant la liste des cartes
 * @returns {Promise<void>} Retourne une réponse JSON avec:
 * - `200` et la liste des cartes
 * - `500` une erreur interne  
 * @throws {Error} leve une erreur provenant de Prisma lors de la lecture des cartes
 */
async function getCardsHandler(_req: Request, res: Response): Promise<void> {
    try {
        const cards = await prisma.card.findMany({
            orderBy: { pokedexNumber: "asc" },
        });

        res.status(200).json(cards);
    } catch (error) {
        console.error("Cards fetch failed:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

router.get("/cards", getCardsHandler);

export default router;