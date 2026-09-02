export type CompanionToolName =
  | "rsvp.companion.play"
  | "rsvp.companion.pause"
  | "rsvp.companion.next"
  | "rsvp.companion.back";

export interface CompanionToolCall {
  readonly name: string;
  readonly arguments: Readonly<Record<string, unknown>>;
}

export interface CompanionToolDefinition {
  readonly type: "function";
  readonly function: {
    readonly name: CompanionToolName;
    readonly description: string;
    readonly parameters: Readonly<Record<string, unknown>>;
  };
}

export interface PreparedChunk {
  readonly name: string;
  readonly text: string;
}

export interface CompanionSnapshot {
  readonly index: number;
  readonly chunk: PreparedChunk;
}

export type CompanionResult =
  | { readonly kind: "executed"; readonly operation: "play" | "pause" | "next" | "back" }
  | { readonly kind: "noop"; readonly reason: "boundary" }
  | { readonly kind: "rejected"; readonly reason: "unsupported tool" | "arguments must be empty" };

const emptyParameters = { type: "object", additionalProperties: false, properties: {} } as const;

export const COMPANION_TOOL_DEFINITIONS: readonly CompanionToolDefinition[] = [
  { type: "function", function: { name: "rsvp.companion.play", description: "Resume the current reading chunk.", parameters: emptyParameters } },
  { type: "function", function: { name: "rsvp.companion.pause", description: "Pause on the current word.", parameters: emptyParameters } },
  { type: "function", function: { name: "rsvp.companion.next", description: "Load the next prepared chunk and stop at its first word.", parameters: emptyParameters } },
  { type: "function", function: { name: "rsvp.companion.back", description: "Load the preceding prepared chunk and stop at its first word.", parameters: emptyParameters } },
];
