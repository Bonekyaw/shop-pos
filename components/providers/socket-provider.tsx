"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { getSocket, disconnectSocket, type PosSocket } from "@/lib/socket-client";
import { SERVER_EVENT_CHANNEL, type ServerEventPayload } from "@shared/socket-events";
import { toast } from "sonner";

type SocketContextValue = {
  socket: PosSocket | null;
  isConnected: boolean;
};

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  isConnected: false,
});

export function useSocket() {
  return useContext(SocketContext);
}

export function SocketProvider({
  token,
  children,
}: {
  token: string | undefined;
  children: ReactNode;
}) {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<PosSocket | null>(null);

  useEffect(() => {
    if (!token) return;

    const socket = getSocket(token);
    socketRef.current = socket;

    function onConnect() {
      setIsConnected(true);
      // Subscribe to kitchen events for admin
      socket.emit("subscribe:kitchen");
    }

    function onDisconnect() {
      setIsConnected(false);
    }

    function onEvent(payload: ServerEventPayload) {
      switch (payload.type) {
        case "ORDER_CREATED":
          toast.info("New Order", {
            description: `Order created${payload.tableId ? ` for table` : " (parcel)"}`,
          });
          // Audio alert
          try {
            const audio = new Audio("/sounds/new-order.mp3");
            audio.volume = 0.5;
            audio.play().catch(() => {});
          } catch {}
          break;
        case "PAYMENT_REQUESTED":
          toast.warning("Payment Request", {
            description: `Order ${payload.orderId.slice(0, 8)}… needs payment confirmation`,
            duration: 10000,
          });
          break;
        case "ORDER_READY":
          toast.success("Order Ready", {
            description: `Order ${payload.orderId.slice(0, 8)}… is ready for pickup`,
          });
          break;
      }
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on(SERVER_EVENT_CHANNEL, onEvent);
    socket.connect();

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off(SERVER_EVENT_CHANNEL, onEvent);
      disconnectSocket();
    };
  }, [token]);

  return (
    <SocketContext.Provider
      value={{ socket: socketRef.current, isConnected }}
    >
      {children}
    </SocketContext.Provider>
  );
}
