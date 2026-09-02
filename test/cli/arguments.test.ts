import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseArguments } from "../../src/cli/arguments.js";

describe("parseArguments", () => {
  it("parses lifecycle and reading controls", () => {
    assert.deepEqual(parseArguments(["server", "start", "--port", "4400"]), { action: "server-start", port: 4400 });
    assert.deepEqual(parseArguments(["load", "samples/alice.txt"]), { action: "load", path: "samples/alice.txt" });
    assert.deepEqual(parseArguments(["speed", "600"]), { action: "speed", wpm: 600 });
    assert.deepEqual(parseArguments(["play"]), { action: "play" });
    assert.deepEqual(parseArguments(["voice", "call", '{"name":"rsvp.set_speed","arguments":{"wpm":600}}']), {
      action: "voice-call",
      call: { name: "rsvp.set_speed", arguments: { wpm: 600 } },
    });
  });

  it("rejects unsupported syntax before any effect runs", () => {
    assert.throws(() => parseArguments([]), /Usage:/);
    assert.throws(() => parseArguments(["speed", "fast"]), /integer/);
    assert.throws(() => parseArguments(["server", "launch"]), /Usage:/);
    assert.throws(() => parseArguments(["voice", "call", "not-json"]), /valid JSON/);
  });
});
