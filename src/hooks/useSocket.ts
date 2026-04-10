"use client";

import { useEffect } from "react";
import { getSocket } from "@/lib/socket";
import type { ServerToClientEvents } from "@/types/socket";

export function useSocket(userId?: string) {
  useEffect(() => {
    if (!userId) return;
    const socket = getSocket();
    if (!socket.connected) socket.connect();
    socket.emit("user:join", userId);
    return () => {
      // socket.emit("user:leave", userId); // no leave event defined, just disconnect
    };
  }, [userId]);
}

export function useBookingSocket(
  bookingId: string | undefined,
  handlers: Partial<{
    [K in keyof ServerToClientEvents]: ServerToClientEvents[K];
  }>
) {
  useEffect(() => {
    if (!bookingId) return;
    const socket = getSocket();
    if (!socket.connected) socket.connect();
    socket.emit("booking:join", bookingId);

    if (handlers["offer:new"]) socket.on("offer:new", handlers["offer:new"]);
    if (handlers["booking:status"]) socket.on("booking:status", handlers["booking:status"]);

    return () => {
      socket.emit("booking:leave", bookingId);
      socket.off("offer:new");
      socket.off("booking:status");
    };
  }, [bookingId]);
}
