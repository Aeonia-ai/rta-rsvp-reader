import { Effect } from "effect";
import { Main } from "../core/context.js";
import { StatusRepository } from "../core/ports/status-repository.js";
export const MemoryStatusRepository = Main.adapter({ name: "MemoryStatusRepository", description: "Deterministic in-memory status source for local development and tests.", port: StatusRepository, runtimes: ["local"], implementation: { read: () => Effect.succeed("up") } });
