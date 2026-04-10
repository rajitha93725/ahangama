import "dotenv/config";
import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server } from "socket.io";
import type { ServerToClientEvents, ClientToServerEvents } from "./src/types/socket";

const dev = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT || "3000");

const app = next({ dev, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: {
      origin: process.env.NEXTAUTH_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
    },
    path: "/api/socketio",
  });

  // Make io globally available for API routes
  (global as { io?: typeof io }).io = io;

  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on("booking:join", (bookingId: string) => {
      socket.join(`booking:${bookingId}`);
    });

    socket.on("booking:leave", (bookingId: string) => {
      socket.leave(`booking:${bookingId}`);
    });

    socket.on("user:join", (userId: string) => {
      socket.join(`user:${userId}`);
    });

    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  httpServer.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
});
