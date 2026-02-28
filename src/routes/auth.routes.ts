import { Router } from "express";
import {prisma} from "../database";
import { createAuthToken, isNonEmptyString } from "../utils/tools";
import bcrypt from "bcryptjs";

const router = Router();
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post("/sign-up", async (req, res) => {
    try {
        const body = Object(req.body) as { email?: unknown; username?: unknown; password?: unknown };
        const { email, username, password } = body;

        if (!isNonEmptyString(email) || !isNonEmptyString(username) || !isNonEmptyString(password)) {
            res.status(400).json({ error: "Missing or invalid data" });
            return;
        }

        if (!EMAIL_PATTERN.test(email)) {
            res.status(400).json({ error: "Invalid email" });
            return;
        }

        const existingEmail = await prisma.user.findUnique({ where: { email } });
        if (existingEmail) {
            res.status(409).json({ error: "Email already in use" });
            return;
        }

        const existingUsername = await prisma.user.findUnique({ where: { username } });
        if (existingUsername) {
            res.status(409).json({ error: "Username already in use" });
            return;
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: {
                email,
                username,
                password: hashedPassword,
            },
        });

        const token = createAuthToken(user.id, user.email);
        const { password: _password, ...safeUser } = user;

        res.status(201).json({ token, user: safeUser });
    } catch (error) {
        console.error("Sign-up failed:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

router.post("/sign-in", async (req, res) => {
    try {
        const body = Object(req.body) as { email?: unknown; password?: unknown };
        const { email, password } = body;

        if (!isNonEmptyString(email) || !isNonEmptyString(password)) {
            res.status(400).json({ error: "Missing or invalid data" });
            return;
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            res.status(401).json({ error: "Invalid credentials" });
            return;
        }

        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            res.status(401).json({ error: "Invalid credentials" });
            return;
        }

        const token = createAuthToken(user.id, user.email);
        const { password: _password, ...safeUser } = user;

        res.status(200).json({ token, user: safeUser });
    } catch (error) {
        console.error("Sign-in failed:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

export default router;