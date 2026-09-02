import type { OperatorAction, OperatorResult } from "../core/ports/operator-actions.js";
import { performOperatorAction } from "../cli/operator.js";
import type { CompanionReaderPort } from "../companion/reader-port.js";

export const createLocalCompanionReader = (
  execute: (action: OperatorAction) => Promise<OperatorResult> = performOperatorAction,
): CompanionReaderPort => ({
  setText: async ({ name, text }) => { await execute({ action: "set-text", name, text }); },
  play: async () => { await execute({ action: "play" }); },
  pause: async () => { await execute({ action: "pause" }); },
  stop: async () => { await execute({ action: "stop" }); },
});
