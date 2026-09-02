#!/usr/bin/env node
import { parseArguments, USAGE, VERSION } from "../cli/arguments.js";
import type { OperatorResult } from "../core/ports/operator-actions.js";
import { createRuntime } from "../runtime/application.js";

const main = async (): Promise<void> => {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    console.log(USAGE);
    return;
  }
  if (process.argv.includes("--version") || process.argv.includes("-v")) {
    console.log(VERSION);
    return;
  }
  const json = process.argv.includes("--json");
  const input = parseArguments(process.argv.slice(2).filter((argument) => argument !== "--json"));
  const result = await createRuntime("local").dispatch({ type: "operate", input }) as OperatorResult;
  console.log(json ? JSON.stringify(result) : result.message);
};

main().catch((error) => {
  console.error(`rsvp: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
