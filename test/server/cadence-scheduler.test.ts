import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DeadlineCadenceScheduler } from "../../src/server/cadence-scheduler.js";

describe("DeadlineCadenceScheduler", () => {
  it("derives every deadline from one epoch instead of callback completion", async () => {
    let now = 1_000;
    const delays: number[] = [];
    const callbacks: Array<() => void> = [];
    const cleared: unknown[] = [];
    const scheduler = new DeadlineCadenceScheduler(
      () => now,
      (callback, delayMs) => { delays.push(delayMs); callbacks.push(callback); return callback; },
      (handle) => { cleared.push(handle); },
    );
    scheduler.start(200, () => undefined);
    now = 1_250;
    callbacks.shift()?.();
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepEqual(delays, [200, 150]);
    scheduler.stop();
    assert.equal(cleared.length, 1);
  });
});
