import WebSocket from "ws";
import type { ControlMessage, ServerMessage } from "../server/protocol.js";

type CommandInput = ControlMessage extends infer Message
  ? Message extends ControlMessage ? Omit<Message, "type" | "requestId"> : never
  : never;

export const sendControl = (
  input: CommandInput,
  url = process.env.RSVP_READER_URL ?? "ws://127.0.0.1:4317/ws?role=control",
): Promise<Extract<ServerMessage, { type: "ack" }>> => new Promise((resolve, reject) => {
  const socket = new WebSocket(url);
  const requestId = crypto.randomUUID();
  const timeout = setTimeout(() => {
    socket.terminate();
    reject(new Error(`reader server did not respond at ${url}`));
  }, 3_000);
  const finish = (error?: Error, message?: Extract<ServerMessage, { type: "ack" }>): void => {
    clearTimeout(timeout);
    socket.close();
    if (error) reject(error);
    else if (message) resolve(message);
  };
  socket.once("error", () => finish(new Error(`reader server is unavailable at ${url}`)));
  socket.once("open", () => socket.send(JSON.stringify({ type: "command", requestId, ...input })));
  socket.on("message", (raw) => {
    const message = JSON.parse(raw.toString()) as ServerMessage;
    if (message.type === "error") finish(new Error(message.message));
    if (message.type === "ack" && message.requestId === requestId) finish(undefined, message);
  });
});
