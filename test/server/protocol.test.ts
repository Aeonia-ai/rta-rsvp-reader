import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseControlMessage } from "../../src/server/protocol.js";

describe("parseControlMessage", () => {
  it("accepts every supported control command", () => {
    assert.deepEqual(parseControlMessage('{"type":"command","requestId":"a","command":"play"}'), {
      type: "command", requestId: "a", command: "play",
    });
    assert.deepEqual(parseControlMessage('{"type":"command","requestId":"b","command":"set-speed","wpm":450}'), {
      type: "command", requestId: "b", command: "set-speed", wpm: 450,
    });
    assert.deepEqual(parseControlMessage('{"type":"command","requestId":"c","command":"set-text","name":"sample.txt","text":"one two"}'), {
      type: "command", requestId: "c", command: "set-text", name: "sample.txt", text: "one two",
    });
  });

  it("rejects malformed, unknown, and out-of-range commands", () => {
    assert.throws(() => parseControlMessage("not json"), /valid JSON/);
    assert.throws(() => parseControlMessage('{"type":"command","requestId":"a","command":"seek"}'), /unsupported/);
    assert.throws(() => parseControlMessage('{"type":"command","requestId":"a","command":"set-speed","wpm":1}'), /between 60 and 1200/);
    assert.throws(() => parseControlMessage(JSON.stringify({ type: "command", requestId: "a", command: "set-text", name: "large", text: "x".repeat(1_048_577) })), /1 MiB/);
  });
});
