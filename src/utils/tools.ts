import {env} from "../env";
import jwt from "jsonwebtoken";

const TOKEN_EXPIRES_IN = "7d";


export function isNonEmptyString(value: unknown): value is string {
    return typeof value === "string" && value.trim().length > 0;
}

export function createAuthToken(userId: number, email: string): string {
    return jwt.sign({ userId, email }, env.JWT_SECRET, { expiresIn: TOKEN_EXPIRES_IN });
}