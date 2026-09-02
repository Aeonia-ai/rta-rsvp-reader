import assert from "node:assert/strict";
import { createServer } from "node:http";
import { lstat, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";
import { startServer } from "../../src/cli/server-lifecycle.js";

describe("server lifecycle", () => {
  const occupied = createServer((_request, response) => {
    response.writeHead(200).end("ok");
  });
  let port = 0;

  before(async () => {
    await new Promise<void>((resolve) => occupied.listen(0, "127.0.0.1", resolve));
    const address = occupied.address();
    assert.ok(address && typeof address === "object");
    port = address.port;
  });

  after(async () => {
    await new Promise<void>((resolve, reject) => occupied.close((error) => error ? reject(error) : resolve()));
  });

  it("refuses to claim an already-occupied port as a newly started daemon", async () => {
    const root = await mkdtemp(join(tmpdir(), "rsvp-lifecycle-"));
    const serverPath = join(root, "dist/server/entrypoints/server.js");

    try {
      await mkdir(join(root, "dist/server/entrypoints"), { recursive: true });
      await writeFile(serverPath, "");

      await assert.rejects(startServer(root, port), /port is already in use/);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("does not publish a PID record before its spawned instance is verified", async () => {
    const root = await mkdtemp(join(tmpdir(), "rsvp-lifecycle-owner-"));
    const serverPath = join(root, "dist/server/entrypoints/server.js");
    const probe = createServer();
    await new Promise<void>((resolve) => probe.listen(0, "127.0.0.1", resolve));
    const address = probe.address();
    assert.ok(address && typeof address === "object");
    const availablePort = address.port;
    await new Promise<void>((resolve, reject) => probe.close((error) => error ? reject(error) : resolve()));

    try {
      await mkdir(join(root, "dist/server/entrypoints"), { recursive: true });
      await writeFile(serverPath, `
const http = require("node:http");
const index = process.argv.indexOf("--port");
const port = Number(process.argv[index + 1]);
const server = http.createServer((_request, response) => response.writeHead(200).end("ok"));
server.listen(port, "127.0.0.1");
process.on("SIGTERM", () => server.close(() => process.exit(0)));
`);

      await assert.rejects(startServer(root, availablePort), /failed its health check/);
      await assert.rejects(lstat(join(root, "runtime/rsvp-reader.json")), { code: "ENOENT" });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
