import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { makeMemoryEvidenceSink } from "@siderealmollusk/rta";
import { Effect } from "effect";
import { MemoryReadingSession, resetMemoryReadingSession } from "../../src/adapters/memory-reading-session.js";
import { ReadingSession } from "../../src/core/reading-session.js";
import { ReadingSessionPayload } from "../../src/core/reading-session-payload.js";

describe("MemoryReadingSession", () => {
  it("round-trips an immutable reading session", async () => {
    resetMemoryReadingSession();
    const evidence = makeMemoryEvidenceSink();
    const expected = ReadingSession.empty().setText({ name: "sample", text: "one two" });
    await Effect.runPromise(Effect.provide(
      MemoryReadingSession.implementation.write(ReadingSessionPayload.unsafeMake(expected.serialize())),
      evidence.layer,
    ));
    const observed = await Effect.runPromise(Effect.provide(MemoryReadingSession.implementation.read(), evidence.layer));
    assert.deepEqual(observed.snapshot(), expected.snapshot());
  });

  it("resets to a new empty session", async () => {
    resetMemoryReadingSession(450);
    const evidence = makeMemoryEvidenceSink();
    const observed = await Effect.runPromise(Effect.provide(MemoryReadingSession.implementation.read(), evidence.layer));
    assert.deepEqual(observed.snapshot(), { phase: "empty", index: 0, total: 0, wpm: 450 });
  });
});
