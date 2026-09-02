import { createDomainRuntime, defineDomain, makeMemoryEvidenceSink } from "@siderealmollusk/rta";
import { Effect } from "effect";
import { SetText } from "../core/messages/set-text.js";
import { SetSpeed } from "../core/messages/set-speed.js";
import { Play } from "../core/messages/play.js";
import { Pause } from "../core/messages/pause.js";
import { Stop } from "../core/messages/stop.js";
import { CheckStatus } from "../core/messages/check-status.js";
import { Status } from "../core/messages/status.js";
import { StatusRepository } from "../core/ports/status-repository.js";
import { ReadingSessionRepositoryPort } from "../core/ports/reading-session-repository.js";
import { CheckStatusUseCase } from "../core/use-cases/check-status.js";
import { SetTextUseCase } from "../core/use-cases/set-text.js";
import { SetSpeedUseCase } from "../core/use-cases/set-speed.js";
import { PlayUseCase } from "../core/use-cases/play.js";
import { PauseUseCase } from "../core/use-cases/pause.js";
import { StopUseCase } from "../core/use-cases/stop.js";
import { StatusUseCase } from "../core/use-cases/status.js";
import { MemoryStatusRepository } from "../adapters/memory-status-repository.js";
import { MemoryReadingSession } from "../adapters/memory-reading-session.js";
const domain = defineDomain({ name: "main", artifacts: [SetText, SetSpeed, Play, Pause, Stop, CheckStatus, Status, StatusRepository, ReadingSessionRepositoryPort, CheckStatusUseCase, SetTextUseCase, SetSpeedUseCase, PlayUseCase, PauseUseCase, StopUseCase, StatusUseCase, MemoryStatusRepository, MemoryReadingSession], profiles: { "browser": { StatusRepository: MemoryStatusRepository, ReadingSessionRepositoryPort: MemoryReadingSession }, "local": { StatusRepository: MemoryStatusRepository, ReadingSessionRepositoryPort: MemoryReadingSession } } });
const evidence = makeMemoryEvidenceSink();
type RuntimeProfile = "browser" | "local";
export const applicationEvidence = evidence.entries;
export const createRuntime = (profile: RuntimeProfile = "local") => ((runtime) => Object.freeze({
  dispatch: async (message: { readonly kind?: string; readonly type?: string; readonly input?: unknown }): Promise<unknown> => ((key) => (key === "main.check-status" || key === "check-status")
      ? Effect.runPromise(Effect.provide(runtime.run(CheckStatusUseCase, (message.input ?? {}) as Parameters<typeof CheckStatusUseCase.run>[0]), evidence.layer)).then((result) => result.output)
      : (key === "main.set-text" || key === "set-text")
      ? Effect.runPromise(Effect.provide(runtime.run(SetTextUseCase, (message.input ?? {}) as Parameters<typeof SetTextUseCase.run>[0]), evidence.layer)).then((result) => result.output)
      : (key === "main.set-speed" || key === "set-speed")
      ? Effect.runPromise(Effect.provide(runtime.run(SetSpeedUseCase, (message.input ?? {}) as Parameters<typeof SetSpeedUseCase.run>[0]), evidence.layer)).then((result) => result.output)
      : (key === "main.play" || key === "play")
      ? Effect.runPromise(Effect.provide(runtime.run(PlayUseCase, (message.input ?? {}) as Parameters<typeof PlayUseCase.run>[0]), evidence.layer)).then((result) => result.output)
      : (key === "main.pause" || key === "pause")
      ? Effect.runPromise(Effect.provide(runtime.run(PauseUseCase, (message.input ?? {}) as Parameters<typeof PauseUseCase.run>[0]), evidence.layer)).then((result) => result.output)
      : (key === "main.stop" || key === "stop")
      ? Effect.runPromise(Effect.provide(runtime.run(StopUseCase, (message.input ?? {}) as Parameters<typeof StopUseCase.run>[0]), evidence.layer)).then((result) => result.output)
      : (key === "main.status" || key === "status")
      ? Effect.runPromise(Effect.provide(runtime.run(StatusUseCase, (message.input ?? {}) as Parameters<typeof StatusUseCase.run>[0]), evidence.layer)).then((result) => result.output)
      : Promise.reject(new Error(`unregistered RTA message: ${key || "unknown"}`)))(message.kind ?? message.type ?? ""),
}))(createDomainRuntime(domain, profile));
export const application = createRuntime();
