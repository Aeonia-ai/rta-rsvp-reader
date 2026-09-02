import assert from "node:assert/strict";
import { it } from "node:test";
import { createMemoryBrowserOperationObservers } from "../../src/browser/adapters/memory-operation-observers.js";
import { createBrowserClockAdapter } from "../../src/browser/adapters/browser-clock.js";
import { createBrowserHttpAdapter } from "../../src/browser/adapters/browser-http.js";
import { createBrowserIdAdapter } from "../../src/browser/adapters/browser-identifiers.js";
import { createBrowserSessionAdapter } from "../../src/browser/adapters/browser-session.js";
import { createWebRuntime } from "../../src/frontends/web/runtime/browser-runtime.js";

const session = { actor: { kind: "human" as const, id: "test", via: "session storage" }, correlationId: "test-correlation" };
it("decodes session storage through its explicit adapter", async () => {
  const adapter = createBrowserSessionAdapter("rta.session", { getItem: () => JSON.stringify(session) });
  assert.deepEqual(await adapter.bootstrap(), session);
});
it("delegates queries through the configured fetch adapter", async () => {
  const requests: Request[] = [];
  const adapter = createBrowserHttpAdapter("https://api.example.test", { fetch: async (request) => { requests.push(request); return Response.json({ status: "up" }); } });
  assert.deepEqual(await adapter["query"]({ operation: "main.check-status", input: {}, actor: session.actor, correlationId: session.correlationId }, new AbortController().signal), { status: "up" });
  assert.equal(requests[0]?.url, "https://api.example.test/operations/main.check-status?input=%7B%7D");
});
it("uses deterministic clock and identifier hosts", () => {
  assert.equal(createBrowserClockAdapter({ now: () => 0 }).now().toISOString(), "1970-01-01T00:00:00.000Z");
  const ids = createBrowserIdAdapter({}); assert.equal(ids.createIdempotencyKey(), "browser-command-1");
});
it("accepts complete adapter overrides in the application config", async () => {
  const runtime = createWebRuntime({ apiBaseUrl: "/ignored", sessionStorageKey: "ignored", routerBasePath: "/", adapters: {
    sessions: { bootstrap: async () => session }, transport: { dispatch: async <Input, Output>() => ({ kind: "success" as const, output: undefined as Output, version: 1 }), query: async <Input, Output>() => undefined as Output }, router: { navigate: async () => undefined }, identifiers: { createIdempotencyKey: () => "test" }, clock: { now: () => new Date(0) }, observers: createMemoryBrowserOperationObservers(),
  } });
  assert.deepEqual(await runtime.bootstrap(), session);
});
