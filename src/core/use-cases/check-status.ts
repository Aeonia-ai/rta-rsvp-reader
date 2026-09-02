import { Effect } from "effect";
import { Main } from "../context.js";
import { CheckStatus } from "../messages/check-status.js";
import { StatusRepository } from "../ports/status-repository.js";
export const CheckStatusUseCase = Main.useCase({ name: "CheckStatusUseCase", description: "Checks and returns application status.", input: CheckStatus, requires: [StatusRepository], outcomes: ["checked"] as const, run: (_input, useCase) => Effect.gen(function* () { const status = yield* useCase.get(StatusRepository).read(); return yield* useCase.finish("checked", status); }) });
