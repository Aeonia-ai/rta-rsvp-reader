import type { ReadingSnapshot } from "../../core/reading-session.js";
import type { ControlMessage, ServerMessage } from "../../server/protocol.js";

type CommandInput = ControlMessage extends infer Message
  ? Message extends ControlMessage ? Omit<Message, "type" | "requestId"> : never
  : never;

export const sendBrowserControl = (input: CommandInput, socketUrl = `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws?role=control`): Promise<ReadingSnapshot> =>
  new Promise((resolve, reject) => {
    const socket = new WebSocket(socketUrl);
    const requestId = crypto.randomUUID();
    const timeout = setTimeout(() => { socket.close(); reject(new Error("reader did not respond")); }, 3_000);
    const finish = (error?: Error, state?: ReadingSnapshot): void => {
      clearTimeout(timeout);
      socket.close();
      if (error) reject(error); else if (state) resolve(state);
    };
    socket.addEventListener("error", () => finish(new Error("reader is unavailable")), { once: true });
    socket.addEventListener("open", () => socket.send(JSON.stringify({ type: "command", requestId, ...input })));
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(String(event.data)) as ServerMessage;
      if (message.type === "error") finish(new Error(message.message));
      if (message.type === "ack" && message.requestId === requestId) finish(undefined, message.state);
    });
  });
