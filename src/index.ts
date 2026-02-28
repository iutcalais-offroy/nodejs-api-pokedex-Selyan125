import {createServer} from "http";
import {env} from "./env";
import express from "express";
import cors from "cors";
import { Server } from "socket.io";
import jwt, { JwtPayload } from "jsonwebtoken";
import authRoutes from "./routes/auth.routes";
import decksRoutes from "./routes/decks.routes";

type SocketUser = {
    userId: number;
    email: string;
};
import swaggerUi from "swagger-ui-express";
import authRoutes from "./routes/auth.routes";
import decksRoutes from "./routes/decks.routes";
import { openApiDocument } from "./docs";
// Create Express app
export const app = express()
const PORT = process.env.PORT || 3000

// Middlewares
app.use(
  cors({
    origin: true, // Autorise toutes les origines
    credentials: true,
  }),
)

app.use(express.json())

// Serve static files (Socket.io test client)
app.use(express.static('public'))

// Auth routes
app.use('/api/auth', authRoutes)

app.use('/api', decksRoutes)

// Swagger/OpenAPI
app.get("/api-docs.json", (_req, res) => {
    res.json(openApiDocument);
});

app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(openApiDocument, {
        swaggerOptions: {
            persistAuthorization: true,
        },
    }),
);

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'TCG Backend Server is running' })
})

// Start server only if this file is run directly (not imported for tests)
if (require.main === module) {
    // Create HTTP server
    const httpServer = createServer(app);
    const io = new Server<any, any, any, { user?: SocketUser }>(httpServer, {
        cors: {
            origin: true,
            credentials: true,
        },
    });

    io.use((socket, next) => {
        const token = socket.handshake.auth?.token;

        if (!token || typeof token !== "string") {
            next(new Error("Authentication token is required"));
            return;
        }

        try {
            const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
            const userId = payload.userId as number | undefined;
            const email = payload.email as string | undefined;

            if (typeof userId !== "number" || typeof email !== "string") {
                next(new Error("Invalid authentication token"));
                return;
            }

            socket.data.user = { userId, email };
            next();
        } catch (_error) {
            next(new Error("Invalid authentication token"));
        }
    });

    io.on("connection", (socket) => {
        const user = socket.data.user;
        if (!user) {
            socket.disconnect(true);
            return;
        }

        socket.emit("socket:authenticated", {
            message: "Socket authenticated",
            user,
        });
    });


    // Start server
    try {
        httpServer.listen(env.PORT, () => {
            console.log(`\n🚀 Server is running on http://localhost:${env.PORT}`);
            console.log(`🧪 Socket.io Test Client available at http://localhost:${env.PORT}`);
        });
    } catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
}
