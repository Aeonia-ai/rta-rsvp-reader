import type { OperatorAction } from "../core/ports/operator-actions.js";

export const USAGE = `Usage:
  rsvp server start [--port 4317]
  rsvp server stop | restart | status
  rsvp server foreground [--port 4317]
  rsvp load <text-file>
  rsvp speed <60-1200>
  rsvp play | pause | stop | status`;
export const VERSION = "0.1.0";

const portOption = (args: readonly string[]): number => {
  const index = args.indexOf("--port");
  if (index < 0) return 4317;
  const port = Number(args[index + 1]);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) throw new Error("port must be an integer between 1 and 65535.");
  return port;
};

export const parseArguments = (args: readonly string[]): OperatorAction => {
  const [command, value] = args;
  if (command === "server" && (value === "start" || value === "foreground")) {
    return { action: `server-${value}`, port: portOption(args) } as OperatorAction;
  }
  if (command === "server" && (value === "stop" || value === "restart" || value === "status") && args.length === 2) {
    return { action: `server-${value}` } as OperatorAction;
  }
  if (command === "load" && typeof value === "string" && args.length === 2) return { action: "load", path: value };
  if (command === "speed" && args.length === 2) {
    const wpm = Number(value);
    if (!Number.isInteger(wpm)) throw new Error("WPM must be an integer.");
    if (wpm < 60 || wpm > 1200) throw new Error("WPM must be between 60 and 1200.");
    return { action: "speed", wpm };
  }
  if ((command === "play" || command === "pause" || command === "stop" || command === "status") && args.length === 1) {
    return { action: command };
  }
  throw new Error(USAGE);
};
