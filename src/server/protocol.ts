import type { DisplayFrame, ReadingSnapshot } from "../core/reading-session.js";

type SimpleCommand = "play" | "pause" | "stop" | "status";

export type ControlMessage =
  | { readonly type: "command"; readonly requestId: string; readonly command: SimpleCommand }
  | { readonly type: "command"; readonly requestId: string; readonly command: "set-speed"; readonly wpm: number }
  | { readonly type: "command"; readonly requestId: string; readonly command: "set-text"; readonly name: string; readonly text: string };

export type ServerMessage =
  | { readonly type: "ack"; readonly requestId: string; readonly command: ControlMessage["command"]; readonly state: ReadingSnapshot }
  | { readonly type: "state"; readonly state: ReadingSnapshot }
  | { readonly type: "frame"; readonly frame: DisplayFrame; readonly periodMs: number }
  | { readonly type: "clear" }
  | { readonly type: "error"; readonly requestId?: string; readonly code: string; readonly message: string };

const record = (value: unknown): Record<string, unknown> => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("message must be an object.");
  return value as Record<string, unknown>;
};

export const parseControlMessage = (raw: string): ControlMessage => {
  let decoded: unknown;
  try { decoded = JSON.parse(raw); } catch { throw new Error("message must be valid JSON."); }
  const input = record(decoded);
  if (input.type !== "command" || typeof input.requestId !== "string" || input.requestId.length === 0) {
    throw new Error("message requires type=command and a requestId.");
  }
  if (input.command === "play" || input.command === "pause" || input.command === "stop" || input.command === "status") {
    return { type: "command", requestId: input.requestId, command: input.command };
  }
  if (input.command === "set-speed") {
    if (!Number.isInteger(input.wpm) || (input.wpm as number) < 60 || (input.wpm as number) > 1200) {
      throw new Error("WPM must be an integer between 60 and 1200.");
    }
    return { type: "command", requestId: input.requestId, command: "set-speed", wpm: input.wpm as number };
  }
  if (input.command === "set-text") {
    if (typeof input.name !== "string" || input.name.trim() === "" || typeof input.text !== "string" || input.text.trim() === "") {
      throw new Error("set-text requires non-empty name and text fields.");
    }
    if (input.text.length > 1_048_576) throw new Error("text must not exceed 1 MiB.");
    return { type: "command", requestId: input.requestId, command: "set-text", name: input.name, text: input.text };
  }
  throw new Error("unsupported command.");
};

export const encodeServerMessage = (message: ServerMessage): string => JSON.stringify(message);
