import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { resetMemoryReadingSession } from "../../src/adapters/memory-reading-session.js";
import { applicationEvidence, createRuntime } from "../../src/runtime/application.js";

describe("RTA reading application", () => {
  beforeEach(() => resetMemoryReadingSession());

  it("dispatches the complete reading lifecycle through registered messages", async () => {
    const runtime = createRuntime("local");
    assert.deepEqual(await runtime.dispatch({ type: "set-text", input: { name: "sample", text: "one two" } }), {
      phase: "ready", documentName: "sample", index: 0, total: 2, wpm: 300,
    });
    assert.equal((await runtime.dispatch({ type: "set-speed", input: { wpm: 600 } }) as { wpm: number }).wpm, 600);
    assert.equal((await runtime.dispatch({ type: "play", input: {} }) as { phase: string }).phase, "playing");
    assert.equal((await runtime.dispatch({ type: "advance", input: {} }) as { index: number }).index, 1);
    assert.equal((await runtime.dispatch({ type: "pause", input: {} }) as { phase: string }).phase, "paused");
    assert.equal((await runtime.dispatch({ type: "stop", input: {} }) as { index: number }).index, 0);
    assert.equal((await runtime.dispatch({ type: "status", input: {} }) as { total: number }).total, 2);
  });

  it("records evidence without leaking loaded document text", async () => {
    const runtime = createRuntime("local");
    await runtime.dispatch({ type: "set-text", input: { name: "private", text: "NEVER_RECORD_THIS_TEXT" } });
    const serialized = JSON.stringify(applicationEvidence());
    assert.doesNotMatch(serialized, /NEVER_RECORD_THIS_TEXT/);
  });
});
