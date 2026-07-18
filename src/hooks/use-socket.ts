"use client";

import { useEffect, useState } from "react";
import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;

/**
 * Singleton Socket.io client with auto-reconnect.
 *
 * ponytail: connect lazily on first hook use. Path matches server's `/api/socketio`.
 * No auth token passed here — server reads session cookie automatically.
 */
export function useSocket() {
  // Lazy init from the singleton so the first render reflects the live
  // connection state — no synchronous setState needed in the effect body.
  const [connected, setConnected] = useState(() => socket?.connected ?? false);

  useEffect(() => {
    if (!socket) {
      const url = process.env.NEXT_PUBLIC_SOCKET_URL ?? "";
      socket = io(url, {
        path: "/api/socketio",
        withCredentials: true,
        transports: ["websocket"],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
      });
    }
    const onConn = () => setConnected(true);
    const onDisc = () => setConnected(false);
    const sync = () => setConnected(socket?.connected ?? false);
    socket.on("connect", onConn);
    socket.on("disconnect", onDisc);
    // Defer the initial sync so it isn't a synchronous setState in the effect
    // body (React 19 rule); a microtask is enough to land the current state.
    queueMicrotask(sync);

    return () => {
      socket?.off("connect", onConn);
      socket?.off("disconnect", onDisc);
    };
  }, []);

  return { socket, connected };
}
