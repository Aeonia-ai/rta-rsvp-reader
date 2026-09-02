import type { Effect } from "effect";
import { Main } from "../context.js";
export interface StatusRepositoryContract { readonly read: () => Effect.Effect<string>; }
export const StatusRepository = Main.port<"StatusRepository", StatusRepositoryContract>({ name: "StatusRepository", description: "Reads application status.", actions: ["read"] });
