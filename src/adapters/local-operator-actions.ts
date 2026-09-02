import { Effect } from "effect";
import { Main } from "../core/context.js";
import { OperatorActionsPort } from "../core/ports/operator-actions.js";
import { performOperatorAction } from "../cli/operator.js";
export const LocalOperatorActions = Main.adapter({
  name: "LocalOperatorActions",
  description: "Implements local file, WebSocket, and process operations for the CLI.",
  port: OperatorActionsPort,
  runtimes: ["local"],
  implementation: { execute: (input) => Effect.tryPromise({ try: () => performOperatorAction(input), catch: (error) => error instanceof Error ? error : new Error(String(error)) }) },
});
