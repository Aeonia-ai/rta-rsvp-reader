import type { CompanionReaderPort } from "./reader-port.js";
import type { CompanionResult, CompanionSnapshot, CompanionToolCall, PreparedChunk } from "./contracts.js";

export interface CompanionController {
  readonly invoke: (call: CompanionToolCall) => Promise<CompanionResult>;
  readonly snapshot: () => CompanionSnapshot;
}

const validChunk = (chunk: PreparedChunk): boolean => chunk.name.trim().length > 0 && chunk.text.trim().length > 0;

export const createCompanionController = (
  chunks: readonly PreparedChunk[],
  reader: CompanionReaderPort,
): CompanionController => {
  if (chunks.length === 0 || chunks.some((chunk) => !validChunk(chunk))) {
    throw new Error("companion requires non-empty prepared chunks.");
  }

  let index = 0;
  const snapshot = (): CompanionSnapshot => ({ index, chunk: chunks[index] });
  const move = async (operation: "next" | "back", target: number): Promise<CompanionResult> => {
    if (target < 0 || target >= chunks.length) return { kind: "noop", reason: "boundary" };
    await reader.setText(chunks[target]);
    await reader.stop();
    index = target;
    return { kind: "executed", operation };
  };

  return {
    snapshot,
    invoke: async (call): Promise<CompanionResult> => {
      if (Object.keys(call.arguments).length > 0) return { kind: "rejected", reason: "arguments must be empty" };
      switch (call.name) {
        case "rsvp.companion.play": await reader.play(); return { kind: "executed", operation: "play" };
        case "rsvp.companion.pause": await reader.pause(); return { kind: "executed", operation: "pause" };
        case "rsvp.companion.next": return move("next", index + 1);
        case "rsvp.companion.back": return move("back", index - 1);
        default: return { kind: "rejected", reason: "unsupported tool" };
      }
    },
  };
};
