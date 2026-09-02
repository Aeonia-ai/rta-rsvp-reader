import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ReadingSession } from "../../src/core/reading-session.js";

describe("ReadingSession", () => {
  it("loads text into a ready session at the first token", () => {
    const ready = ReadingSession.empty().setText({ name: "sample", text: "one two" });
    assert.deepEqual(ready.snapshot(), {
      phase: "ready",
      documentName: "sample",
      index: 0,
      total: 2,
      wpm: 300,
    });
    assert.deepEqual(ready.frame(), {
      index: 0,
      total: 2,
      token: "one",
      before: "o",
      focus: "n",
      after: "e",
    });
  });

  it("advances immutably and completes after the final token", () => {
    const playing = ReadingSession.empty().setText({ name: "sample", text: "one two" }).play();
    const second = playing.advance();
    const complete = second.advance();
    assert.equal(playing.snapshot().index, 0);
    assert.equal(second.snapshot().index, 1);
    assert.equal(complete.snapshot().phase, "complete");
    assert.equal(complete.frame(), undefined);
  });

  it("pauses without moving and resumes from the same token", () => {
    const paused = ReadingSession.empty().setText({ name: "sample", text: "one two" }).play().advance().pause();
    assert.equal(paused.snapshot().phase, "paused");
    assert.equal(paused.snapshot().index, 1);
    assert.equal(paused.play().snapshot().index, 1);
  });

  it("stop resets the cursor while retaining text and speed", () => {
    const stopped = ReadingSession.empty().setText({ name: "sample", text: "one two" }).setSpeed(600).play().advance().stop();
    assert.deepEqual(stopped.snapshot(), {
      phase: "ready",
      documentName: "sample",
      index: 0,
      total: 2,
      wpm: 600,
    });
  });

  it("uses an exact constant period independent of punctuation", () => {
    const words = ReadingSession.empty().setText({ name: "sample", text: "one, two." }).setSpeed(600).play();
    assert.equal(words.periodMs(), 100);
    assert.equal(words.advance().periodMs(), 100);
  });

  it("rejects empty text, out-of-range speed, and invalid transitions", () => {
    assert.throws(() => ReadingSession.empty().setText({ name: "empty", text: " \n " }), /text must contain/);
    assert.throws(() => ReadingSession.empty().setSpeed(59), /WPM must be/);
    assert.throws(() => ReadingSession.empty().setSpeed(1201), /WPM must be/);
    assert.throws(() => ReadingSession.empty().play(), /cannot play/);
    assert.throws(() => ReadingSession.empty().pause(), /cannot pause/);
  });
});
