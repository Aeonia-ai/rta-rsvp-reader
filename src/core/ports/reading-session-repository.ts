import type { Effect } from "effect";
import type { RtaSecret } from "@siderealmollusk/rta";
import { Main } from "../context.js";
import type { ReadingSession } from "../reading-session.js";

export interface ReadingSessionRepositoryPortContract {
  readonly read: () => Effect.Effect<ReadingSession>;
  readonly write: (session: RtaSecret<"ReadingSessionPayload">) => Effect.Effect<void>;
}

export const ReadingSessionRepositoryPort = Main.port<"ReadingSessionRepositoryPort", ReadingSessionRepositoryPortContract>({
  name: "ReadingSessionRepositoryPort",
  description: "Stores the process-local authoritative reading session.",
  actions: ["read", "write"],
});
