import { Effect } from "effect";
import { Main } from "../context.js";
import { Status } from "../messages/status.js";
import { ReadingSessionRepositoryPort } from "../ports/reading-session-repository.js";
export const StatusUseCase = Main.useCase({ name: "StatusUseCase", description: "Returns the public reader state.", input: Status, requires: [ReadingSessionRepositoryPort], outcomes: ["observed"] as const, run: (_input, useCase) => Effect.gen(function* () {
  const session = yield* useCase.get(ReadingSessionRepositoryPort).read();
  return yield* useCase.finish("observed", session.snapshot());
}) });
