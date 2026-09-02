import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, it } from "node:test";
import { createCompanionController } from "../../src/companion/controller.js";
import type { CompanionToolCall } from "../../src/companion/contracts.js";

interface Fixture {
  readonly id: string;
  readonly utterance: string;
  readonly expected: CompanionToolCall | null;
  readonly initialIndex?: number;
  readonly after?: { readonly index: number; readonly chunk: string };
  readonly effects?: readonly string[];
  readonly reason?: string;
}

const fixturePath = resolve(import.meta.dirname, "../../samples/voice/companion-utterances.jsonl");

const createFixtureCompanion = async (initialIndex: number) => {
  const effects: string[] = [];
  const companion = createCompanionController([
    { name: "chapter-1", text: "first words" },
    { name: "chapter-2", text: "second words" },
  ], {
    setText: async (chunk) => { effects.push(`set-text:${chunk.name}`); },
    play: async () => { effects.push("play"); },
    pause: async () => { effects.push("pause"); },
    stop: async () => { effects.push("stop"); },
  });
  if (initialIndex === 1) await companion.invoke({ name: "rsvp.companion.next", arguments: {} });
  effects.length = 0;
  return { companion, effects };
};

describe("companion voice utterance fixtures", () => {
  it("labels v1 voice commands with exact calls, state, and no-call behavior", async () => {
    const source = await readFile(fixturePath, "utf8").catch(() => undefined);
    assert.ok(source, "companion voice utterance corpus should exist");
    if (!source) return;
    const fixtures = source.trim().split("\n").map((line) => JSON.parse(line) as Fixture);
    assert.ok(fixtures.length >= 30, "companion corpus should cover at least 30 phrases");
    assert.equal(new Set(fixtures.map((fixture) => fixture.id)).size, fixtures.length, "fixture IDs must be unique");

    for (const fixture of fixtures) {
      assert.ok(fixture.utterance.trim().length > 0, `${fixture.id} needs an utterance`);
      const { companion, effects } = await createFixtureCompanion(fixture.initialIndex ?? 0);
      if (fixture.expected === null) {
        assert.ok(fixture.reason, `${fixture.id} needs a no-call reason`);
        assert.deepEqual(companion.snapshot(), { index: fixture.initialIndex ?? 0, chunk: fixture.initialIndex === 1 ? { name: "chapter-2", text: "second words" } : { name: "chapter-1", text: "first words" } });
        assert.deepEqual(effects, []);
        continue;
      }
      const result = await companion.invoke(fixture.expected);
      assert.equal(result.kind, "executed", fixture.id);
      assert.deepEqual(effects, fixture.effects, fixture.id);
      assert.deepEqual(companion.snapshot(), {
        index: fixture.after?.index,
        chunk: fixture.after?.chunk === "chapter-2" ? { name: "chapter-2", text: "second words" } : { name: "chapter-1", text: "first words" },
      }, fixture.id);
    }
  });
});
