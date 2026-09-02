import type { OperatorAction, OperatorResult } from "../core/ports/operator-actions.js";

export interface VoiceToolCall {
  readonly name: string;
  readonly arguments: Readonly<Record<string, unknown>>;
}

export interface VoiceToolDefinition {
  readonly type: "function";
  readonly function: {
    readonly name: string;
    readonly description: string;
    readonly parameters: Readonly<Record<string, unknown>>;
  };
}

const emptyParameters = { type: "object", additionalProperties: false, properties: {} } as const;
const portParameters = {
  type: "object", additionalProperties: false,
  properties: { port: { type: "integer", minimum: 1, maximum: 65_535 } },
} as const;

export const VOICE_TOOL_DEFINITIONS: readonly VoiceToolDefinition[] = [
  { type: "function", function: { name: "rsvp.server.start", description: "Start the local RSVP reader server.", parameters: portParameters } },
  { type: "function", function: { name: "rsvp.server.stop", description: "Stop the local RSVP reader server.", parameters: emptyParameters } },
  { type: "function", function: { name: "rsvp.server.restart", description: "Restart the local RSVP reader server.", parameters: portParameters } },
  { type: "function", function: { name: "rsvp.server.status", description: "Report whether the local RSVP reader server is running.", parameters: emptyParameters } },
  {
    type: "function",
    function: {
      name: "rsvp.load_text", description: "Load a local text file into the RSVP reader.",
      parameters: {
        type: "object", additionalProperties: false, required: ["path"],
        properties: { path: { type: "string", minLength: 1 } },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "rsvp.set_speed", description: "Set reading speed in words per minute.",
      parameters: {
        type: "object", additionalProperties: false, required: ["wpm"],
        properties: { wpm: { type: "integer", minimum: 60, maximum: 1_200 } },
      },
    },
  },
  { type: "function", function: { name: "rsvp.play", description: "Start reading.", parameters: emptyParameters } },
  { type: "function", function: { name: "rsvp.pause", description: "Pause reading.", parameters: emptyParameters } },
  { type: "function", function: { name: "rsvp.stop", description: "Stop reading and reset to the first word.", parameters: emptyParameters } },
  { type: "function", function: { name: "rsvp.status", description: "Report reading status.", parameters: emptyParameters } },
];

const requireOnly = (call: VoiceToolCall, allowed: readonly string[]): void => {
  const unexpected = Object.keys(call.arguments).find((key) => !allowed.includes(key));
  if (unexpected) throw new Error(`${call.name} does not accept arguments named ${unexpected}.`);
};

const optionalPort = (call: VoiceToolCall): number | undefined => {
  requireOnly(call, ["port"]);
  if (call.arguments.port === undefined) return undefined;
  const port = call.arguments.port;
  if (!Number.isInteger(port) || typeof port !== "number" || port < 1 || port > 65_535) {
    throw new Error("port must be an integer between 1 and 65535.");
  }
  return port;
};

const requiredPath = (call: VoiceToolCall): string => {
  requireOnly(call, ["path"]);
  const path = call.arguments.path;
  if (typeof path !== "string" || path.trim().length === 0) throw new Error("path must be a non-empty string.");
  return path;
};

const requiredWpm = (call: VoiceToolCall): number => {
  requireOnly(call, ["wpm"]);
  const wpm = call.arguments.wpm;
  if (!Number.isInteger(wpm) || typeof wpm !== "number" || wpm < 60 || wpm > 1_200) {
    throw new Error("wpm must be an integer between 60 and 1200.");
  }
  return wpm;
};

const noArguments = (call: VoiceToolCall): void => requireOnly(call, []);

export const toOperatorAction = (call: VoiceToolCall): OperatorAction => {
  switch (call.name) {
    case "rsvp.server.start": return { action: "server-start", port: optionalPort(call) ?? 4317 };
    case "rsvp.server.stop": noArguments(call); return { action: "server-stop" };
    case "rsvp.server.restart": {
      const port = optionalPort(call);
      return port === undefined ? { action: "server-restart" } : { action: "server-restart", port };
    }
    case "rsvp.server.status": noArguments(call); return { action: "server-status" };
    case "rsvp.load_text": return { action: "load", path: requiredPath(call) };
    case "rsvp.set_speed": return { action: "speed", wpm: requiredWpm(call) };
    case "rsvp.play": noArguments(call); return { action: "play" };
    case "rsvp.pause": noArguments(call); return { action: "pause" };
    case "rsvp.stop": noArguments(call); return { action: "stop" };
    case "rsvp.status": noArguments(call); return { action: "status" };
    default: throw new Error(`unsupported voice tool: ${call.name}.`);
  }
};

export const invokeVoiceToolCall = async (
  call: VoiceToolCall,
  execute: (action: OperatorAction) => Promise<OperatorResult>,
): Promise<OperatorResult> => execute(toOperatorAction(call));
