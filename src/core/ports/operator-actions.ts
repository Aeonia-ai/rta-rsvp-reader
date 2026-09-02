import type { Effect } from "effect";
import { Main } from "../context.js";

export type OperatorAction =
  | { readonly action: "server-start" | "server-foreground"; readonly port: number }
  | { readonly action: "server-stop" | "server-status" }
  | { readonly action: "server-restart"; readonly port?: number }
  | { readonly action: "load"; readonly path: string }
  | { readonly action: "set-text"; readonly name: string; readonly text: string }
  | { readonly action: "speed"; readonly wpm: number }
  | { readonly action: "voice-call"; readonly call: { readonly name: string; readonly arguments: Readonly<Record<string, unknown>> } }
  | { readonly action: "play" | "pause" | "stop" | "status" };

export interface OperatorResult {
  readonly message: string;
  readonly data?: unknown;
}

export interface OperatorActionsPortContract { readonly execute: (input: OperatorAction) => Effect.Effect<OperatorResult, Error>; }
export const OperatorActionsPort = Main.port<"OperatorActionsPort", OperatorActionsPortContract>({
  name: "OperatorActionsPort",
  description: "Performs localhost control, file loading, and server lifecycle effects.",
  actions: ["execute"],
});
