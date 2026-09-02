import { Effect } from "effect";
import { Main } from "../context.js";
import { Frame } from "../messages/frame.js";
import { ReadingSessionRepositoryPort } from "../ports/reading-session-repository.js";
export const FrameUseCase = Main.useCase({ name: "FrameUseCase", description: "Reads the current display frame and constant period.", input: Frame, requires: [ReadingSessionRepositoryPort], outcomes: ["observed"] as const, run: (_input, useCase) => Effect.gen(function* () {
  const session = yield* useCase.get(ReadingSessionRepositoryPort).read();
  return yield* useCase.finish("observed", {
    state: session.snapshot(),
    frame: session.frame(),
    periodMs: session.periodMs(),
  });
}) });
