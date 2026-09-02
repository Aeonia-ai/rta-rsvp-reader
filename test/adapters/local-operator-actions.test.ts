import assert from "node:assert/strict";
import { it } from "node:test";
import { Effect } from "effect";
import { makeMemoryEvidenceSink } from "@siderealmollusk/rta";
import { LocalOperatorActions } from "../../src/adapters/local-operator-actions.js";
it("local-operator-actions reports lifecycle state and records evidence", async () => {
  const sink = makeMemoryEvidenceSink();
  const result = await Effect.runPromise(Effect.provide(LocalOperatorActions.implementation.execute({ action: "server-status" }), sink.layer));
  assert.match(result.message, /reader server/);
  assert.equal(sink.entries().length, 1);
});
