import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createReaderServer } from "../../src/server/reader-server.js";
import { performOperatorAction } from "../../src/cli/operator.js";

const loadAdapter = async () => import("../../src/adapters/local-companion-reader.js").catch(() => undefined);
const loadController = async () => import("../../src/companion/controller.js").catch(() => undefined);

describe("local companion reader", () => {
  it("maps companion reader effects to existing operator actions", async () => {
    const adapter = await loadAdapter();
    assert.ok(adapter, "local companion reader adapter should exist");
    if (!adapter) return;

    const seen: unknown[] = [];
    const reader = adapter.createLocalCompanionReader(async (action: unknown) => {
      seen.push(action);
      return { message: "ok" };
    });
    await reader.setText({ name: "chapter-2", text: "second words" });
    await reader.stop();
    await reader.play();
    await reader.pause();

    assert.deepEqual(seen, [
      { action: "set-text", name: "chapter-2", text: "second words" },
      { action: "stop" },
      { action: "play" },
      { action: "pause" },
    ]);
  });

  it("loads a neighboring chunk through the live reader and leaves it stopped at word zero", async () => {
    const adapter = await loadAdapter();
    const controllerModule = await loadController();
    assert.ok(adapter, "local companion reader adapter should exist");
    assert.ok(controllerModule, "companion controller should exist");
    if (!adapter || !controllerModule) return;

    const server = createReaderServer();
    const address = await server.listen(0);
    const priorUrl = process.env.RSVP_READER_URL;
    process.env.RSVP_READER_URL = `ws://127.0.0.1:${address.port}/ws?role=control`;
    try {
      const companion = controllerModule.createCompanionController([
        { name: "chapter-1", text: "first words" },
        { name: "chapter-2", text: "second words" },
      ], adapter.createLocalCompanionReader());

      assert.deepEqual(await companion.invoke({ name: "rsvp.companion.next", arguments: {} }), {
        kind: "executed", operation: "next",
      });
      const status = await performOperatorAction({ action: "status" });
      assert.deepEqual(status.data, {
        phase: "ready", documentName: "chapter-2", index: 0, total: 2, wpm: 300,
      });
    } finally {
      if (priorUrl === undefined) delete process.env.RSVP_READER_URL;
      else process.env.RSVP_READER_URL = priorUrl;
      await server.close();
    }
  });
});
