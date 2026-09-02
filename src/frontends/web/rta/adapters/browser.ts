import type { DisplayFrame } from "../../../../core/reading-session.js";

export type DisplayEvent = { readonly type: "frame"; readonly frame: DisplayFrame } | { readonly type: "clear" };

export interface DisplaySocketAdapter { readonly close: () => void }

export const decodeDisplayEvent = (raw: string): DisplayEvent | undefined => {
  const value = JSON.parse(raw) as { readonly type?: unknown; readonly frame?: unknown };
  if (value.type === "clear") return { type: "clear" };
  if (value.type === "frame" && typeof value.frame === "object" && value.frame !== null) {
    return { type: "frame", frame: value.frame as DisplayFrame };
  }
  return undefined;
};

export const createDisplaySocketAdapter = (
  receive: (event: DisplayEvent) => void,
  socketUrl = `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws?role=display`,
): DisplaySocketAdapter => {
  let socket: WebSocket | undefined;
  let reconnect: ReturnType<typeof setTimeout> | undefined;
  let closed = false;
  const connect = (): void => {
    socket = new WebSocket(socketUrl);
    socket.addEventListener("message", (event) => {
      try {
        const decoded = decodeDisplayEvent(String(event.data));
        if (decoded) receive(decoded);
      } catch { /* Ignore malformed server data and retain the last safe frame. */ }
    });
    socket.addEventListener("close", () => {
      if (!closed) reconnect = setTimeout(connect, 750);
    });
  };
  connect();
  return { close: () => {
    closed = true;
    if (reconnect) clearTimeout(reconnect);
    socket?.close();
  } };
};
