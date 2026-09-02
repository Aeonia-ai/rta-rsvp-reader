import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { OperatorAction, OperatorResult } from "../../src/core/ports/operator-actions.js";

const loadVoiceTools = async () => import("../../src/cli/voice-tool-call.js").catch(() => undefined);

describe("voice tool calls", () => {
  it("maps every supported function to an existing operator action", async () => {
    const voiceTools = await loadVoiceTools();
    assert.ok(voiceTools, "voice tool contract should exist");

    assert.deepEqual(voiceTools.toOperatorAction({ name: "rsvp.server.start", arguments: { port: 4400 } }), {
      action: "server-start", port: 4400,
    });
    assert.deepEqual(voiceTools.toOperatorAction({ name: "rsvp.server.stop", arguments: {} }), { action: "server-stop" });
    assert.deepEqual(voiceTools.toOperatorAction({ name: "rsvp.server.restart", arguments: {} }), { action: "server-restart" });
    assert.deepEqual(voiceTools.toOperatorAction({ name: "rsvp.server.status", arguments: {} }), { action: "server-status" });
    assert.deepEqual(voiceTools.toOperatorAction({ name: "rsvp.load_text", arguments: { path: "samples/demo.txt" } }), {
      action: "load", path: "samples/demo.txt",
    });
    assert.deepEqual(voiceTools.toOperatorAction({ name: "rsvp.set_speed", arguments: { wpm: 600 } }), {
      action: "speed", wpm: 600,
    });
    assert.deepEqual(voiceTools.toOperatorAction({ name: "rsvp.play", arguments: {} }), { action: "play" });
    assert.deepEqual(voiceTools.toOperatorAction({ name: "rsvp.pause", arguments: {} }), { action: "pause" });
    assert.deepEqual(voiceTools.toOperatorAction({ name: "rsvp.stop", arguments: {} }), { action: "stop" });
    assert.deepEqual(voiceTools.toOperatorAction({ name: "rsvp.status", arguments: {} }), { action: "status" });
  });

  it("rejects invalid names, arguments, and extra fields before dispatch", async () => {
    const voiceTools = await loadVoiceTools();
    assert.ok(voiceTools, "voice tool contract should exist");

    assert.throws(() => voiceTools.toOperatorAction({ name: "rsvp.delete_everything", arguments: {} }), /unsupported voice tool/);
    assert.throws(() => voiceTools.toOperatorAction({ name: "rsvp.set_speed", arguments: { wpm: 59 } }), /60 and 1200/);
    assert.throws(() => voiceTools.toOperatorAction({ name: "rsvp.load_text", arguments: {} }), /path/);
    assert.throws(() => voiceTools.toOperatorAction({ name: "rsvp.play", arguments: { now: true } }), /does not accept arguments/);
  });

  it("hands the mapped action to the existing operator seam", async () => {
    const voiceTools = await loadVoiceTools();
    assert.ok(voiceTools, "voice tool contract should exist");
    const seen: OperatorAction[] = [];
    const execute = async (action: OperatorAction): Promise<OperatorResult> => {
      seen.push(action);
      return { message: "accepted", data: action };
    };

    const result = await voiceTools.invokeVoiceToolCall({ name: "rsvp.set_speed", arguments: { wpm: 600 } }, execute);
    assert.deepEqual(seen, [{ action: "speed", wpm: 600 }]);
    assert.deepEqual(result, { message: "accepted", data: { action: "speed", wpm: 600 } });
  });
});
