# Paired Companion Simulator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide a deterministic, in-memory simulator for a future paired companion that accepts only play, pause, next, and back tool calls and controls the existing RSVP reader.

**Architecture:** A pure `CompanionController` owns prepared chunks and selected index. It validates a narrow four-tool contract and uses a small `CompanionReaderPort`; a local adapter maps that port to current `OperatorAction` and WebSocket control.

**Tech Stack:** TypeScript, Node.js built-in test runner, existing Effect/RTA application, existing local WebSocket control client.

## Global Constraints

- Preserve the passive display; add no browser controls.
- Add no mobile, VTT/ASR, model, microphone, Bluetooth, persistence, hosting, or new network dependency.
- The companion surface is exactly `rsvp.companion.play`, `rsvp.companion.pause`, `rsvp.companion.next`, and `rsvp.companion.back`.
- Every companion tool call has exactly an empty `arguments` object.
- `next` and `back` never wrap; they select a neighboring chunk, reset it to word zero, and leave it stopped.
- Invalid and boundary calls must not contact the reader.
- Use the pinned published `@siderealmollusk/rta@0.6.0`; do not link a local checkout.

---

## File Structure

- Create `src/companion/contracts.ts`: companion-call schemas, chunks, snapshots, and results.
- Create `src/companion/reader-port.ts`: the narrow reader-effect port.
- Create `src/companion/controller.ts`: pure tool validation and chunk-navigation policy.
- Create `src/adapters/local-companion-reader.ts`: maps companion effects to existing operator actions.
- Modify `src/core/ports/operator-actions.ts`: add internal prepared-text action.
- Modify `src/cli/operator.ts`: send that action through existing `set-text` WebSocket control.
- Create `test/companion/controller.test.ts`: recording-port unit and contract tests.
- Create `test/adapters/local-companion-reader.test.ts`: mapping and live-reader integration tests.
- Create `samples/voice/companion-utterances.jsonl` and `test/voice/companion-utterance-fixtures.test.ts`.
- Modify `samples/voice/README.md` and `README.md`.

## Task 1: Pure companion contract and controller

**Files:**
- Create: `src/companion/contracts.ts`
- Create: `src/companion/reader-port.ts`
- Create: `src/companion/controller.ts`
- Test: `test/companion/controller.test.ts`

**Consumes:** Immutable chunks at construction; no application adapter.

**Produces:** `createCompanionController(chunks, reader)`, with `invoke(call): Promise<CompanionResult>` and `snapshot(): CompanionSnapshot`.

- [ ] **Step 1: Write failing controller tests**

```ts
const reader = new RecordingReader();
const companion = createCompanionController([
  { name: "chapter-1", text: "first words" },
  { name: "chapter-2", text: "second words" },
], reader);

await companion.invoke({ name: "rsvp.companion.next", arguments: {} });
assert.deepEqual(companion.snapshot(), {
  index: 1, chunk: { name: "chapter-2", text: "second words" },
});
assert.deepEqual(reader.effects, [
  { type: "set-text", name: "chapter-2", text: "second words" },
  { type: "stop" },
]);
```

Also write separate tests for play, pause, back, first/last boundary no-ops, unknown names, extra arguments, rejected legacy `rsvp.play`, and a `stop` failure that leaves the index unchanged.

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `node --import tsx --test test/companion/controller.test.ts`

Expected: FAIL because `src/companion/controller.ts` does not exist.

- [ ] **Step 3: Write minimal contract and controller**

```ts
export type CompanionToolName =
  | "rsvp.companion.play" | "rsvp.companion.pause"
  | "rsvp.companion.next" | "rsvp.companion.back";

export interface CompanionReaderPort {
  setText(chunk: PreparedChunk): Promise<void>;
  play(): Promise<void>;
  pause(): Promise<void>;
  stop(): Promise<void>;
}
```

Validate `Object.keys(call.arguments).length === 0` before switching on the exact name. Require non-empty chunks and chunk names/text. For navigation: compute target; return `{ kind: "noop", reason: "boundary" }` if invalid; otherwise await `reader.setText(chunks[target])`, await `reader.stop()`, then assign `index = target`. Return a typed executed result. Do not mutate index before both effects finish.

- [ ] **Step 4: Run focused tests to verify they pass**

Run: `node --import tsx --test test/companion/controller.test.ts`

Expected: PASS; valid effects are recorded and invalid/boundary calls record none.

- [ ] **Step 5: Commit**

```bash
git add src/companion test/companion/controller.test.ts
git commit -m "feat: add paired companion controller"
```

## Task 2: Adapt prepared text to the existing reader path

**Files:**
- Modify: `src/core/ports/operator-actions.ts`
- Modify: `src/cli/operator.ts`
- Create: `src/adapters/local-companion-reader.ts`
- Test: `test/adapters/local-companion-reader.test.ts`

**Consumes:** `PreparedChunk`, `CompanionReaderPort`, and existing `performOperatorAction`.

**Produces:** `createLocalCompanionReader(execute?)` implementing the companion port.

- [ ] **Step 1: Write failing adapter tests**

```ts
const seen: OperatorAction[] = [];
const reader = createLocalCompanionReader(async (action) => {
  seen.push(action);
  return { message: "ok" };
});
await reader.setText({ name: "chapter-2", text: "second words" });
await reader.stop();
assert.deepEqual(seen, [
  { action: "set-text", name: "chapter-2", text: "second words" },
  { action: "stop" },
]);
```

Add a live integration test: start `createReaderServer()`, set `RSVP_READER_URL` to its control endpoint, invoke a two-chunk controller’s `next`, then request `status`; assert the state is stopped at index zero and contains the second chunk.

- [ ] **Step 2: Run focused tests to verify failure**

Run: `node --import tsx --test test/adapters/local-companion-reader.test.ts`

Expected: FAIL because the adapter and internal `set-text` action do not exist.

- [ ] **Step 3: Add the narrow adapter and internal action**

Extend `OperatorAction` with:

```ts
| { readonly action: "set-text"; readonly name: string; readonly text: string }
```

Add an operator branch:

```ts
case "set-text": {
  const response = await sendControl(
    { command: "set-text", name: input.name, text: input.text },
    await controlUrl(),
  );
  return { message: `loaded ${input.name} (${response.state.total} words)`, data: response.state };
}
```

Implement the adapter:

```ts
export const createLocalCompanionReader = (
  execute: (action: OperatorAction) => Promise<OperatorResult> = performOperatorAction,
): CompanionReaderPort => ({
  setText: async ({ name, text }) => { await execute({ action: "set-text", name, text }); },
  play: async () => { await execute({ action: "play" }); },
  pause: async () => { await execute({ action: "pause" }); },
  stop: async () => { await execute({ action: "stop" }); },
});
```

Do not expose `set-text` through public CLI parsing or the existing broad voice tools.

- [ ] **Step 4: Run focused tests**

Run: `node --import tsx --test test/adapters/local-companion-reader.test.ts test/cli/voice-tool-call.test.ts`

Expected: PASS; existing voice tools are unchanged and the companion path observes the stopped second chunk.

- [ ] **Step 5: Commit**

```bash
git add src/core/ports/operator-actions.ts src/cli/operator.ts src/adapters/local-companion-reader.ts test/adapters/local-companion-reader.test.ts
git commit -m "feat: connect companion simulator to reader"
```

## Task 3: Companion voice acceptance corpus

**Files:**
- Create: `samples/voice/companion-utterances.jsonl`
- Create: `test/voice/companion-utterance-fixtures.test.ts`
- Modify: `samples/voice/README.md`

**Consumes:** `CompanionToolCall` and controller from Task 1.

**Produces:** Text-first v1 utterances labelled with exact tool calls and expected simulator outcomes.

- [ ] **Step 1: Write a failing fixture test**

```ts
for (const fixture of fixtures) {
  const { companion, reader } = createFixtureCompanion(fixture.initialIndex ?? 0);
  if (fixture.expected === null) {
    await invokeNoCall(companion, reader, fixture);
    continue;
  }
  await companion.invoke(fixture.expected);
  assert.deepEqual(companion.snapshot(), fixture.after);
}
```

The no-call assertion must verify no port effect and unchanged snapshot.

- [ ] **Step 2: Run it to verify failure**

Run: `node --import tsx --test test/voice/companion-utterance-fixtures.test.ts`

Expected: FAIL because the corpus file does not exist.

- [ ] **Step 3: Add fixtures and documentation**

Use exact JSONL records:

```json
{"id":"next-direct","utterance":"Next.","expected":{"name":"rsvp.companion.next","arguments":{}},"initialIndex":0,"after":{"index":1,"chunk":"chapter-2"}}
{"id":"no-call-speed","utterance":"Make it faster.","expected":null,"reason":"Speed belongs to paired-app setup, not the v1 voice surface."}
```

Include at least six examples each for play, pause, next, and back, spanning direct, polite, and disfluent speech. Include at least six no-call records for speed, content loading, chunking, lifecycle, unrelated speech, and ambiguous navigation. Document exact name + empty arguments scoring and the required no-effect behavior.

- [ ] **Step 4: Run fixture test to verify pass**

Run: `node --import tsx --test test/voice/companion-utterance-fixtures.test.ts`

Expected: PASS; all valid calls yield the labelled state and all no-call records preserve state/effects.

- [ ] **Step 5: Commit**

```bash
git add samples/voice/companion-utterances.jsonl samples/voice/README.md test/voice/companion-utterance-fixtures.test.ts
git commit -m "test: add companion voice acceptance corpus"
```

## Task 4: Document and verify

**Files:**
- Modify: `README.md`
- Test: `test/voice/companion-utterance-fixtures.test.ts`

**Consumes:** all prior tasks.

**Produces:** a documented boundary for future model and paired-app work.

- [ ] **Step 1: Write the failing README expectation**

Add a test which reads `README.md` and asserts it names all four `rsvp.companion.*` tools plus the statement that VTT, models, and mobile implementation are deferred.

- [ ] **Step 2: Run it to verify failure**

Run: `node --import tsx --test test/voice/companion-utterance-fixtures.test.ts`

Expected: FAIL because the README does not yet describe the simulator.

- [ ] **Step 3: Document the boundary**

Add a `Paired companion simulator` section:

```text
transcript/model result → rsvp.companion.{play|pause|next|back} → companion controller → existing reader WebSocket
```

State that it is process-memory-only and test-focused, not a VTT integration or phone app. Link the corpus and design spec.

- [ ] **Step 4: Run complete verification**

```bash
npm run check:fast
npm run build
git diff --check
```

Expected: all tests/typecheck pass, production builds complete, and no whitespace errors occur.

- [ ] **Step 5: Commit**

```bash
git add README.md test/voice/companion-utterance-fixtures.test.ts
git commit -m "docs: explain paired companion simulator"
git status --short --branch
```

## Self-Review

- **Spec coverage:** Task 1 covers the exact four-call policy, boundaries, and rollback. Task 2 uses the current reader path without a new protocol. Task 3 supplies voice-ready fixtures/no-calls. Task 4 documents scope and verifies the whole feature.
- **Placeholder scan:** No implementation step depends on unspecified behavior.
- **Type consistency:** `PreparedChunk`, `CompanionToolCall`, `CompanionReaderPort`, and `createCompanionController` originate in Task 1 and are consumed unchanged later. The sole internal action is exactly `{ action: "set-text", name, text }`.

