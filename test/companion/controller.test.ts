import assert from "node:assert/strict";
import { describe, it } from "node:test";

const loadCompanion = async () => import("../../src/companion/controller.js").catch(() => undefined);

describe("paired companion controller", () => {
  it("moves to the next prepared chunk, resets it, and stops", async () => {
    const module = await loadCompanion();
    assert.ok(module, "companion controller should exist");
    if (!module) return;

    const effects: unknown[] = [];
    const companion = module.createCompanionController([
      { name: "chapter-1", text: "first words" },
      { name: "chapter-2", text: "second words" },
    ], {
      setText: async (chunk: unknown) => { effects.push({ type: "set-text", chunk }); },
      play: async () => { effects.push({ type: "play" }); },
      pause: async () => { effects.push({ type: "pause" }); },
      stop: async () => { effects.push({ type: "stop" }); },
    });

    const result = await companion.invoke({ name: "rsvp.companion.next", arguments: {} });

    assert.deepEqual(result, { kind: "executed", operation: "next" });
    assert.deepEqual(companion.snapshot(), { index: 1, chunk: { name: "chapter-2", text: "second words" } });
    assert.deepEqual(effects, [
      { type: "set-text", chunk: { name: "chapter-2", text: "second words" } },
      { type: "stop" },
    ]);
  });

  it("keeps reader and selection unchanged for rejected and boundary calls", async () => {
    const module = await loadCompanion();
    assert.ok(module, "companion controller should exist");
    if (!module) return;

    const effects: unknown[] = [];
    const companion = module.createCompanionController([{ name: "only", text: "one chunk" }], {
      setText: async (chunk: unknown) => { effects.push({ type: "set-text", chunk }); },
      play: async () => { effects.push({ type: "play" }); },
      pause: async () => { effects.push({ type: "pause" }); },
      stop: async () => { effects.push({ type: "stop" }); },
    });

    assert.deepEqual(await companion.invoke({ name: "rsvp.companion.back", arguments: {} }), { kind: "noop", reason: "boundary" });
    assert.deepEqual(await companion.invoke({ name: "rsvp.play", arguments: {} }), { kind: "rejected", reason: "unsupported tool" });
    assert.deepEqual(await companion.invoke({ name: "rsvp.companion.play", arguments: { now: true } }), { kind: "rejected", reason: "arguments must be empty" });
    assert.deepEqual(companion.snapshot(), { index: 0, chunk: { name: "only", text: "one chunk" } });
    assert.deepEqual(effects, []);
  });

  it("does not commit a chunk change if the reader fails to stop", async () => {
    const module = await loadCompanion();
    assert.ok(module, "companion controller should exist");
    if (!module) return;

    const companion = module.createCompanionController([
      { name: "chapter-1", text: "first words" },
      { name: "chapter-2", text: "second words" },
    ], {
      setText: async () => undefined,
      play: async () => undefined,
      pause: async () => undefined,
      stop: async () => { throw new Error("reader unavailable"); },
    });

    await assert.rejects(() => companion.invoke({ name: "rsvp.companion.next", arguments: {} }), /reader unavailable/);
    assert.deepEqual(companion.snapshot(), { index: 0, chunk: { name: "chapter-1", text: "first words" } });
  });
});
