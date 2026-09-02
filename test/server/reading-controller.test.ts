import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { resetMemoryReadingSession } from "../../src/adapters/memory-reading-session.js";
import { createRuntime } from "../../src/runtime/application.js";
import type { CadenceScheduler } from "../../src/server/cadence-scheduler.js";
import { ReadingController } from "../../src/server/reading-controller.js";
import type { ServerMessage } from "../../src/server/protocol.js";

class FakeScheduler implements CadenceScheduler {
  periodMs?: number;
  tick?: () => void | Promise<void>;
  starts = 0;
  stops = 0;
  start(periodMs: number, tick: () => void | Promise<void>): void { this.periodMs = periodMs; this.tick = tick; this.starts += 1; }
  restart(periodMs: number, tick: () => void | Promise<void>): void { this.stop(); this.start(periodMs, tick); }
  stop(): void { this.tick = undefined; this.stops += 1; }
  async fire(): Promise<void> { const tick = this.tick; await tick?.(); }
}

describe("ReadingController", () => {
  beforeEach(() => resetMemoryReadingSession());

  it("publishes the first frame immediately, advances at one period, and clears on completion", async () => {
    const messages: ServerMessage[] = [];
    const scheduler = new FakeScheduler();
    const controller = new ReadingController(createRuntime("local"), scheduler, (message) => messages.push(message));
    await controller.handle({ type: "command", requestId: "1", command: "set-text", name: "sample", text: "Hello, world." });
    await controller.handle({ type: "command", requestId: "2", command: "play" });
    assert.equal(scheduler.periodMs, 200);
    assert.equal(messages.find((message) => message.type === "frame")?.type, "frame");
    assert.equal((messages.find((message) => message.type === "frame") as { frame: { token: string } }).frame.token, "Hello,");

    await scheduler.fire();
    assert.equal((messages.filter((message) => message.type === "frame").at(-1) as { frame: { token: string } }).frame.token, "world.");
    await scheduler.fire();
    assert.equal(messages.at(-1)?.type, "clear");
    assert.equal(scheduler.tick, undefined);
  });

  it("restarts the timer at a new constant rate while playing", async () => {
    const scheduler = new FakeScheduler();
    const controller = new ReadingController(createRuntime("local"), scheduler, () => undefined);
    await controller.handle({ type: "command", requestId: "1", command: "set-text", name: "sample", text: "one two" });
    await controller.handle({ type: "command", requestId: "2", command: "play" });
    await controller.handle({ type: "command", requestId: "3", command: "set-speed", wpm: 600 });
    assert.equal(scheduler.periodMs, 100);
    assert.equal(scheduler.starts, 2);
  });
});
