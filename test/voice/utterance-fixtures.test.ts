import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, it } from "node:test";
import { toOperatorAction, type VoiceToolCall } from "../../src/cli/voice-tool-call.js";

interface UtteranceFixture {
  readonly id: string;
  readonly utterance: string;
  readonly expected: VoiceToolCall | null;
  readonly reason?: string;
}

const fixturePath = resolve(import.meta.dirname, "../../samples/voice/utterances.jsonl");

describe("voice utterance fixtures", () => {
  it("contains synthesizable utterances with valid tool-call labels", async () => {
    const source = await readFile(fixturePath, "utf8").catch(() => undefined);
    assert.ok(source, "voice utterance corpus should exist");

    const fixtures = source.trim().split("\n").map((line) => JSON.parse(line) as UtteranceFixture);
    assert.ok(fixtures.length >= 24, "voice utterance corpus should cover at least 24 phrases");
    assert.equal(new Set(fixtures.map((fixture) => fixture.id)).size, fixtures.length, "fixture IDs must be unique");

    for (const fixture of fixtures) {
      assert.ok(fixture.utterance.trim().length > 0, `${fixture.id} needs an utterance`);
      if (fixture.expected) {
        const expected = fixture.expected;
        assert.doesNotThrow(() => toOperatorAction(expected), fixture.id);
      } else assert.ok(fixture.reason, `${fixture.id} needs a no-call reason`);
    }
  });
});
