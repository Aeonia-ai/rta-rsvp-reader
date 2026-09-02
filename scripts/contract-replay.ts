import { mkdir, writeFile } from "node:fs/promises";
import { replayContractHistory } from "@siderealmollusk/rta";
import { contractRegistry } from "../src/core/contracts/index.js";

const receipt = await replayContractHistory({
  baseline: "initial",
  registry: contractRegistry,
  source: { readRaw: async () => [] },
  streamIds: [],
  rtaVersion: "0.6.0",
});

await mkdir("assurances/contracts", { recursive: true });
await writeFile("assurances/contracts/replay.json", `${JSON.stringify(receipt, null, 2)}\n`);
console.log(`contract replay: ${receipt.status} (${receipt.eventCount} persisted events)`);
