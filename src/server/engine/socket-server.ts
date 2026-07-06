import { Server as IoServer, type Socket } from "socket.io";
import type { Server as HttpServer } from "node:http";
import { jwtVerify } from "jose";
import { SESSION_COOKIE_NAME, getAuthSecret } from "@/lib/auth-config";

export type AppSocket = Socket & { userId?: string; username?: string };

let io: IoServer | null = null;

/**
 * Attach Socket.io to the given HTTP server. Idempotent.
 *
 * ponytail: single-process mode. For multi-instance deployments, swap the
 * default in-memory adapter for @socket.io/redis-adapter (Fase 13).
 */
export function attachSocketServer(server: HttpServer): IoServer {
  if (io) return io;

  io = new IoServer(server, {
    cors: { origin: process.env.NEXT_PUBLIC_APP_URL ?? "*", credentials: true },
    path: "/api/socketio",
  });

  io.use(async (socket: AppSocket, next) => {
    try {
      const cookieHeader = socket.handshake.headers.cookie;
      if (!cookieHeader) return next(new Error("unauthorized"));

      const cookies = Object.fromEntries(
        cookieHeader.split(";").map((c) => {
          const [k, ...v] = c.trim().split("=");
          return [k, v.join("=")];
        }),
      );
      const token = cookies[SESSION_COOKIE_NAME];
      if (!token) return next(new Error("unauthorized"));

      const { payload } = await jwtVerify(token, getAuthSecret());
      if (typeof payload.sub !== "string") return next(new Error("unauthorized"));
      socket.userId = payload.sub;
      socket.username = (payload.username as string | undefined) ?? undefined;
      next();
    } catch {
      next(new Error("unauthorized"));
    }
  });

  io.on("connection", (socket: AppSocket) => {
    if (socket.userId) socket.join(`user:${socket.userId}`);
    socket.on("disconnect", () => {
      /* room cleanup is automatic */
    });
  });

  return io;
}

export function getIO(): IoServer | null {
  return io;
}

/** Send a notification payload to a single user's room. */
export function notifyUser(userId: string, payload: { title: string; message: string; at?: string }): void {
  io?.to(`user:${userId}`).emit("notification:new", { ...payload, at: payload.at ?? new Date().toISOString() });
}
