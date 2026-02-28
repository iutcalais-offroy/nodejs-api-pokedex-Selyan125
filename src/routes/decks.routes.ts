import { Request, Response, Router } from "express";
import { prisma } from "../database";
import { authenticate } from "../middleware/auth.middleware";

const router = Router()

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

router.post("/decks", authenticate, async (req: Request, res: Response) => {
    try {
        const { name, cards } = req.body ?? {};
        const userId = req.user!.userId;

        if (!name || typeof name !== "string" || name.trim() === "") {
            res.status(400).json({ error: "Missing or invalid name" });
            return;
        }

        if (!Array.isArray(cards)) {
            res.status(400).json({ error: "Cards must be an array" });
            return;
        }

        if (cards.length !== 10) {
            res.status(400).json({ error: "Deck must contain exactly 10 cards !" });
            return;
        }

        if (!cards.every((id) => typeof id === "number")) {
            res.status(400).json({ error: "Card IDs must be numbers" });
            return;
        }

        const validCards = await prisma.card.findMany({
            where: { id: { in: cards } },
        });

        if (validCards.length !== cards.length) {
            res.status(400).json({ error: "One or more card IDs are invalid" });
            return;
        }

        const deck = await prisma.deck.create({
            data: {
                name: name.trim(),
                userId,
                cards: {
                    create: cards.map((cardId) => ({ cardId })),
                },
            },
            include: {
                cards: {
                    include: { card: true },
                },
            },
        });

        res.status(201).json(deck);
    } catch (error) {
        console.error("Deck creation failed:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

router.get("/decks/mine", authenticate, async (req: Request, res: Response) => {
    try {
        const userId = req.user!.userId;

        const decks = await prisma.deck.findMany({
            where: { userId },
            include: {
                cards: {
                    include: { card: true },
                },
            },
        });

        res.status(200).json(decks);
    } catch (error) {
        console.error("Decks fetch failed:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

router.get("/decks/:id", authenticate, async (req: Request, res: Response) => {
    try {
        const userId = req.user!.userId;
        const deckId = parseInt(req.params.id, 10);

        if (isNaN(deckId)) {
            res.status(404).json({ error: "Deck not found" });
            return;
        }

        const deck = await prisma.deck.findUnique({
            where: { id: deckId },
            include: {
                cards: {
                    include: { card: true },
                },
            },
        });

        if (!deck) {
            res.status(404).json({ error: "Deck not found" });
            return;
        }

        if (deck.userId !== userId) {
            res.status(403).json({ error: "Forbidden" });
            return;
        }

        res.status(200).json(deck);
    } catch (error) {
        console.error("Deck fetch failed:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

router.patch("/decks/:id", authenticate, async (req: Request, res: Response) => {
    try {
        const userId = req.user!.userId;
        const deckId = parseInt(req.params.id, 10);
        const { name, cards } = req.body ?? {};

        if (isNaN(deckId)) {
            res.status(404).json({ error: "Deck not found" });
            return;
        }

        const deck = await prisma.deck.findUnique({
            where: { id: deckId },
        });

        if (!deck) {
            res.status(404).json({ error: "Deck not found" });
            return;
        }

        if (deck.userId !== userId) {
            res.status(403).json({ error: "Forbidden" });
            return;
        }

        const updateData: { name?: string } = {};
        if (name !== undefined) {
            if (typeof name !== "string" || name.trim() === "") {
                res.status(400).json({ error: "Invalid name" });
                return;
            }
            updateData.name = name.trim();
        }

        if (cards !== undefined) {
            if (!Array.isArray(cards)) {
                res.status(400).json({ error: "Cards must be an array" });
                return;
            }

            if (cards.length !== 10) {
                res.status(400).json({ error: "Deck must contain exactly 10 cards" });
                return;
            }

            if (!cards.every((id) => typeof id === "number")) {
                res.status(400).json({ error: "All card IDs must be numbers" });
                return;
            }

            const validCards = await prisma.card.findMany({
                where: { id: { in: cards } },
            });

            if (validCards.length !== cards.length) {
                res.status(400).json({ error: "One or more card IDs are invalid" });
                return;
            }

            await prisma.deckCard.deleteMany({
                where: { deckId },
            });

            await prisma.deckCard.createMany({
                data: cards.map((cardId) => ({
                    deckId,
                    cardId,
                })),
            });
        }

        const updatedDeck = await prisma.deck.update({
            where: { id: deckId },
            data: updateData,
            include: {
                cards: {
                    include: { card: true },
                },
            },
        });

        res.status(200).json(updatedDeck);
    } catch (error) {
        console.error("Deck update failed:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

router.delete("/decks/:id", authenticate, async (req: Request, res: Response) => {
    try {
        const userId = req.user!.userId;
        const deckId = parseInt(req.params.id, 10);

        if (isNaN(deckId)) {
            res.status(404).json({ error: "Deck not found" });
            return;
        }

        const deck = await prisma.deck.findUnique({
            where: { id: deckId },
        });

        if (!deck) {
            res.status(404).json({ error: "Deck not found" });
            return;
        }

        if (deck.userId !== userId) {
            res.status(403).json({ error: "Forbidden" });
            return;
        }

        await prisma.deckCard.deleteMany({
            where: { deckId },
        });

        await prisma.deck.delete({
            where: { id: deckId },
        });

        res.status(200).json({ message: "Deck deleted successfully" });
    } catch (error) {
        console.error("Deck deletion failed:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

export default router
