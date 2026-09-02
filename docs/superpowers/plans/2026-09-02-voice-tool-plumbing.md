# Voice Tool Plumbing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a strict voice-function-call adapter that dispatches existing RSVP reader actions and provide Level 2 text utterance fixtures.

**Architecture:** Keep tool parsing and validation in a focused CLI boundary. The boundary maps a public function name and JSON arguments to the existing `OperatorAction` union, then invokes the existing operator function. Fixtures describe spoken language and expected tool calls but do not add an ASR or model dependency.

**Tech Stack:** TypeScript, Node.js test runner, existing RTA application and CLI.

## Global Constraints

- Use the pinned published `@siderealmollusk/rta@0.6.0` only.
- Preserve the passive browser display and current CLI behavior.
- Add no model, ASR, TTS, persistence, or network dependency.
- Keep tool names and argument schemas explicit and validated before dispatch.

---

### Task 1: Voice tool contract and mapper

**Files:**
- Create: `src/cli/voice-tool-call.ts`
- Test: `test/cli/voice-tool-call.test.ts`

**Consumes:** `OperatorAction` from `src/core/ports/operator-actions.ts`.

**Produces:** `VoiceToolCall`, `VOICE_TOOL_DEFINITIONS`, `toOperatorAction(call)`, and `invokeVoiceToolCall(call, execute)`.

- [ ] **Step 1: Write the failing mapping tests**

```ts
assert.deepEqual(toOperatorAction({ name: "rsvp.set_speed", arguments: { wpm: 600 } }), {
  action: "speed", wpm: 600,
});
assert.throws(() => toOperatorAction({ name: "rsvp.set_speed", arguments: { wpm: 2 } }), /60 and 1200/);
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --import tsx --test test/cli/voice-tool-call.test.ts`

Expected: FAIL because `voice-tool-call.ts` does not exist.

- [ ] **Step 3: Implement the strict mapper and injected hand-off**

```ts
export const invokeVoiceToolCall = async (
  call: VoiceToolCall,
  execute: (action: OperatorAction) => Promise<OperatorResult>,
): Promise<OperatorResult> => execute(toOperatorAction(call));
```

- [ ] **Step 4: Run the focused tests**

Run: `node --import tsx --test test/cli/voice-tool-call.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```sh
git add src/cli/voice-tool-call.ts test/cli/voice-tool-call.test.ts
git commit -m "feat: add voice tool call contract"
```

### Task 2: CLI and RTA operator hand-off

**Files:**
- Modify: `src/core/ports/operator-actions.ts`
- Modify: `src/cli/arguments.ts`
- Modify: `src/cli/operator.ts`
- Test: `test/cli/arguments.test.ts`
- Test: `test/cli/voice-tool-call.test.ts`

**Consumes:** `VoiceToolCall` and `invokeVoiceToolCall` from Task 1.

**Produces:** `rsvp voice call '<json>'`, which uses the existing operator dispatcher.

- [ ] **Step 1: Write the failing CLI parsing and safe integration tests**

```ts
assert.deepEqual(parseArguments(["voice", "call", '{"name":"rsvp.status","arguments":{}}']), {
  action: "voice-call",
  call: { name: "rsvp.status", arguments: {} },
});
```

- [ ] **Step 2: Run the focused tests to verify failure**

Run: `node --import tsx --test test/cli/arguments.test.ts test/cli/voice-tool-call.test.ts`

Expected: FAIL because `voice call` is not a supported action.

- [ ] **Step 3: Parse JSON at the CLI edge and dispatch through the existing operator**

```ts
if (input.action === "voice-call") {
  return invokeVoiceToolCall(input.call, performOperatorAction);
}
```

- [ ] **Step 4: Run focused tests**

Run: `node --import tsx --test test/cli/arguments.test.ts test/cli/voice-tool-call.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```sh
git add src/core/ports/operator-actions.ts src/cli/arguments.ts src/cli/operator.ts test/cli
git commit -m "feat: dispatch voice tool calls through operator"
```

### Task 3: Level 2 utterance corpus and documentation

**Files:**
- Create: `samples/voice/utterances.jsonl`
- Create: `samples/voice/README.md`
- Create: `test/voice/utterance-fixtures.test.ts`
- Modify: `README.md`

**Consumes:** the voice tool names and mapper from Tasks 1–2.

**Produces:** natural-language voice commands with gold function calls for later ASR/model TDD.

- [ ] **Step 1: Write a failing fixture validation test**

```ts
for (const fixture of fixtures) {
  assert.doesNotThrow(() => toOperatorAction(fixture.expected));
}
```

- [ ] **Step 2: Run it to verify failure**

Run: `node --import tsx --test test/voice/utterance-fixtures.test.ts`

Expected: FAIL because the corpus does not exist.

- [ ] **Step 3: Add commands and corpus documentation**

Include direct commands, polite variants, disfluencies, speed changes, file loads, lifecycle controls, and invalid/ambiguous examples that must not produce a tool call.

- [ ] **Step 4: Run fixture tests**

Run: `node --import tsx --test test/voice/utterance-fixtures.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```sh
git add samples/voice test/voice README.md
git commit -m "test: add voice command utterance corpus"
```

### Task 4: Full verification

**Files:** No source changes required.

- [ ] **Step 1: Run verification**

Run: `npm run check:fast && npm run build && git diff --check`

Expected: all tests pass, TypeScript typecheck passes, production build succeeds, and no whitespace errors are reported.

- [ ] **Step 2: Commit any verification-only corrections**

```sh
git status --short
```
