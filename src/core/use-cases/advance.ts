import { Effect } from "effect";
import { Main } from "../context.js";
import { Advance } from "../messages/advance.js";
import { persistReadingSession } from "../persist-reading-session.js";
import { ReadingSessionRepositoryPort } from "../ports/reading-session-repository.js";
export const AdvanceUseCase = Main.useCase({ name: "AdvanceUseCase", description: "Advances one frame on the fixed cadence.", input: Advance, requires: [ReadingSessionRepositoryPort], outcomes: ["advanced", "complete"] as const, run: (_input, useCase) => Effect.gen(function* () {
  const repository = useCase.get(ReadingSessionRepositoryPort);
  const updated = (yield* repository.read()).advance();
  yield* persistReadingSession(repository, updated);
  const snapshot = updated.snapshot();
  return yield* useCase.finish(snapshot.phase === "complete" ? "complete" : "advanced", snapshot);
}) });
