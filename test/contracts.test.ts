import assert from "node:assert/strict";
import { it } from "node:test";
import { contractRegistry } from "../src/core/contracts/index.js";
import { governedEventStore } from "../src/runtime/contracts.js";

it("inspects the generated contract registry without binding domain behavior", async () => {
  assert.deepEqual(contractRegistry.inspect().contracts.map((contract) => contract.reference), ["main.ExampleEvent@1"]);
  assert.deepEqual(await governedEventStore.readRaw("example"), []);
});
