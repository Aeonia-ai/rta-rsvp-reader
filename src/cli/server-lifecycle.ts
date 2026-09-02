import { closeSync, existsSync, mkdirSync, openSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { execFileSync, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";

interface ServerRecord { readonly pid: number; readonly port: number; readonly startedAt: string }

const pause = (milliseconds: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, milliseconds));
const paths = (root: string) => ({
  directory: join(root, "runtime"),
  pid: join(root, "runtime", "rsvp-reader.json"),
  log: join(root, "runtime", "rsvp-reader.log"),
  server: join(root, "dist", "server", "entrypoints", "server.js"),
});

const readRecord = (root: string): ServerRecord | undefined => {
  try { return JSON.parse(readFileSync(paths(root).pid, "utf8")) as ServerRecord; } catch { return undefined; }
};

const healthy = async (port: number, instanceId?: string): Promise<boolean> => {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/health`, { signal: AbortSignal.timeout(500) });
    return response.ok && (!instanceId || response.headers.get("x-rsvp-instance") === instanceId);
  } catch { return false; }
};

const waitForHealth = async (port: number, expected: boolean, instanceId?: string): Promise<boolean> => {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (await healthy(port, instanceId) === expected) return true;
    await pause(100);
  }
  return false;
};

export const serverStatus = async (root: string): Promise<{ readonly running: boolean; readonly pid?: number; readonly port?: number }> => {
  const record = readRecord(root);
  if (!record) return { running: false };
  return await healthy(record.port) ? { running: true, pid: record.pid, port: record.port } : { running: false, pid: record.pid, port: record.port };
};

export const startServer = async (root: string, port: number): Promise<ServerRecord> => {
  const current = await serverStatus(root);
  if (current.running) throw new Error(`reader server is already running on port ${current.port}.`);
  const target = paths(root);
  try { unlinkSync(target.pid); } catch { /* stale record already absent */ }
  if (await healthy(port)) throw new Error(`port is already in use by an unmanaged HTTP server: ${port}.`);
  if (!existsSync(target.server)) throw new Error("server build is missing; run npm run build first.");
  mkdirSync(target.directory, { recursive: true });
  const log = openSync(target.log, "a");
  const instanceId = randomUUID();
  const child = spawn(process.execPath, [target.server, "--port", String(port)], {
    cwd: root, detached: true, stdio: ["ignore", log, log], env: { ...process.env, RSVP_READER_INSTANCE: instanceId },
  });
  closeSync(log);
  child.unref();
  if (!child.pid) throw new Error("reader server failed to start.");
  const record = { pid: child.pid, port, startedAt: new Date().toISOString() };
  if (!await waitForHealth(port, true, instanceId)) {
    try { process.kill(child.pid, "SIGTERM"); } catch { /* already exited */ }
    throw new Error(`reader server failed its health check; inspect ${target.log}`);
  }
  writeFileSync(target.pid, `${JSON.stringify(record)}\n`, { mode: 0o600 });
  return record;
};

export const stopServer = async (root: string): Promise<boolean> => {
  const record = readRecord(root);
  if (!record) return false;
  const target = paths(root);
  if (!await healthy(record.port)) {
    try { unlinkSync(target.pid); } catch { /* already absent */ }
    return false;
  }
  let command = "";
  try { command = execFileSync("ps", ["-p", String(record.pid), "-o", "command="], { encoding: "utf8" }); } catch { /* stale pid */ }
  if (!command || !command.includes(target.server)) throw new Error("refusing to stop a process that is not this reader server.");
  try { process.kill(record.pid, "SIGTERM"); } catch { /* stale pid */ }
  await waitForHealth(record.port, false);
  try { unlinkSync(target.pid); } catch { /* already absent */ }
  return true;
};

export const runForeground = async (port: number): Promise<void> => {
  const { createReaderServer } = await import("../server/reader-server.js");
  const server = createReaderServer();
  await server.listen(port);
  await new Promise<void>((resolve) => {
    const close = (): void => { void server.close().then(resolve); };
    process.once("SIGINT", close);
    process.once("SIGTERM", close);
  });
};
