import { io, Socket } from "socket.io-client";
import { API_BASE_URL } from "./api";

const SOCKET_URL = API_BASE_URL.replace(/\/api\/?$/, "");

let socket: Socket | null = null;

export const connectSocket = (token: string): Socket => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      auth: { token },
      autoConnect: true,
      transports: ["websocket", "polling"],
    });

    socket.on("connect", () => {
      console.log("🔌 Connected to WebSocket server:", socket?.id);
    });

    socket.on("disconnect", (reason) => {
      console.log("🔌 Disconnected from WebSocket server:", reason);
    });
  } else if (!socket.connected) {
    socket.auth = { token };
    socket.connect();
  }

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const getSocket = (): Socket | null => socket;
