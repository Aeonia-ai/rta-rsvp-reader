import assert from "node:assert/strict";
import { it } from "node:test";
import { Effect } from "effect";
import { makeMemoryEvidenceSink } from "@siderealmollusk/rta";
import { MemoryStatusRepository } from "../src/adapters/memory-status-repository.js";
it("provides deterministic local status and records evidence", async () => {
  const sink = makeMemoryEvidenceSink();
  const result = await Effect.runPromise(Effect.provide(MemoryStatusRepository.implementation.read(), sink.layer));
  assert.equal(result, "up");
  assert.equal(sink.entries().length, 1);
});
