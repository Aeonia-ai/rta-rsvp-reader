import { basename, resolve } from "node:path";
import { readFile } from "node:fs/promises";
import type { OperatorAction, OperatorResult } from "../core/ports/operator-actions.js";
import { sendControl } from "./control-client.js";
import { findProjectRoot } from "./project-root.js";
import { runForeground, serverStatus, startServer, stopServer } from "./server-lifecycle.js";
import { invokeVoiceToolCall } from "./voice-tool-call.js";

export const performOperatorAction = async (input: OperatorAction): Promise<OperatorResult> => {
  const root = findProjectRoot();
  const controlUrl = async (): Promise<string> => {
    if (process.env.RSVP_READER_URL) return process.env.RSVP_READER_URL;
    const running = await serverStatus(root);
    return `ws://127.0.0.1:${running.port ?? 4317}/ws?role=control`;
  };
  switch (input.action) {
    case "voice-call":
      return invokeVoiceToolCall(input.call, performOperatorAction);
    case "server-start": {
      const record = await startServer(root, input.port);
      return { message: `reader server started on http://127.0.0.1:${record.port}`, data: record };
    }
    case "server-foreground":
      await runForeground(input.port);
      return { message: "reader server stopped" };
    case "server-stop":
      return { message: await stopServer(root) ? "reader server stopped" : "reader server is not running" };
    case "server-restart": {
      const previous = await serverStatus(root);
      await stopServer(root);
      const record = await startServer(root, input.port ?? previous.port ?? 4317);
      return { message: `reader server restarted on http://127.0.0.1:${record.port}`, data: record };
    }
    case "server-status": {
      const status = await serverStatus(root);
      return { message: status.running ? `reader server is running on port ${status.port}` : "reader server is stopped", data: status };
    }
    case "load": {
      const path = resolve(process.cwd(), input.path);
      const text = await readFile(path, "utf8");
      const response = await sendControl({ command: "set-text", name: basename(path), text }, await controlUrl());
      return { message: `loaded ${basename(path)} (${response.state.total} words)`, data: response.state };
    }
    case "speed": {
      const response = await sendControl({ command: "set-speed", wpm: input.wpm }, await controlUrl());
      return { message: `speed set to ${response.state.wpm} WPM`, data: response.state };
    }
    case "play": case "pause": case "stop": case "status": {
      const response = await sendControl({ command: input.action }, await controlUrl());
      return { message: `${response.state.phase}: ${response.state.index}/${response.state.total} at ${response.state.wpm} WPM`, data: response.state };
    }
  }
};
