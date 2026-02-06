import { Router } from "express";
import { prisma } from "../database";

const router = Router();

router.get("/cards", async (_req, res) => {
    try {
        const cards = await prisma.card.findMany({
            orderBy: { pokedexNumber: "asc" },
        });

        res.status(200).json(cards);
    } catch (error) {
        console.error("Cards fetch failed:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

export default router;