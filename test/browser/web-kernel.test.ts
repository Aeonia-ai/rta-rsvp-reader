import assert from "node:assert/strict";
import { it } from "node:test";
import { createMemoryBrowserRouterPort, createMemoryBrowserSessionPort, type BrowserClockPort } from "@siderealmollusk/rta/browser-runtime";
import { createMemoryBrowserOperationObservers } from "../../src/browser/adapters/memory-operation-observers.js";
import { createWebKernel } from "../../src/browser/kernel.js";

it("assembles a browser kernel with injected lifecycle observers", async () => {
  const runtime = createWebKernel({
    sessions: createMemoryBrowserSessionPort({ actor: { kind: "human", id: "test", via: "test" }, correlationId: "test-correlation" }),
    transport: { dispatch: async <Input, Output>() => ({ kind: "success" as const, output: undefined as Output, version: 1 }), query: async <Input, Output>() => undefined as Output },
    router: createMemoryBrowserRouterPort(),
    identifiers: { createIdempotencyKey: () => "test-key" },
    clock: { now: () => new Date("2026-08-20T00:00:00.000Z") } satisfies BrowserClockPort,
    observers: createMemoryBrowserOperationObservers(),
  });
  assert.equal((await runtime.bootstrap()).actor.id, "test");
});
