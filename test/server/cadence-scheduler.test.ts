import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { IntervalCadenceScheduler } from "../../src/server/cadence-scheduler.js";

describe("IntervalCadenceScheduler", () => {
  it("uses one unchanged period for every token", () => {
    const periods: number[] = [];
    const cleared: unknown[] = [];
    const scheduler = new IntervalCadenceScheduler(
      (callback, periodMs) => { periods.push(periodMs); return { callback }; },
      (handle) => { cleared.push(handle); },
    );
    scheduler.start(200, () => undefined);
    scheduler.restart(200, () => undefined);
    scheduler.stop();
    assert.deepEqual(periods, [200, 200]);
    assert.equal(cleared.length, 2);
  });
});
