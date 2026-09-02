import type { DisplayFrame, ReadingSnapshot } from "../core/reading-session.js";
import type { CadenceScheduler } from "./cadence-scheduler.js";
import type { ControlMessage, ServerMessage } from "./protocol.js";

interface ApplicationRuntime {
  readonly dispatch: (message: { readonly type: string; readonly input: unknown }) => Promise<unknown>;
}

interface FrameState {
  readonly state: ReadingSnapshot;
  readonly frame?: DisplayFrame;
  readonly periodMs: number;
}

export class ReadingController {
  private advancing = false;

  constructor(
    private readonly runtime: ApplicationRuntime,
    private readonly scheduler: CadenceScheduler,
    private readonly publish: (message: ServerMessage) => void,
  ) {}

  async handle(message: ControlMessage): Promise<ServerMessage> {
    let state: ReadingSnapshot;
    switch (message.command) {
      case "set-text":
        this.scheduler.stop();
        state = await this.dispatchState("set-text", { name: message.name, text: message.text });
        this.publish({ type: "clear" });
        break;
      case "set-speed":
        state = await this.dispatchState("set-speed", { wpm: message.wpm });
        if (state.phase === "playing") {
          const display = await this.frameState();
          this.scheduler.restart(display.periodMs, () => this.advance());
        }
        break;
      case "play": {
        state = await this.dispatchState("play", {});
        const display = await this.frameState();
        if (display.frame) this.publish({ type: "frame", frame: display.frame, periodMs: display.periodMs });
        this.scheduler.start(display.periodMs, () => this.advance());
        break;
      }
      case "pause":
        state = await this.dispatchState("pause", {});
        this.scheduler.stop();
        break;
      case "stop":
        state = await this.dispatchState("stop", {});
        this.scheduler.stop();
        this.publish({ type: "clear" });
        break;
      case "status":
        state = await this.dispatchState("status", {});
        break;
    }
    this.publish({ type: "state", state });
    return { type: "ack", requestId: message.requestId, command: message.command, state };
  }

  async initialMessages(): Promise<readonly ServerMessage[]> {
    const display = await this.frameState();
    const messages: ServerMessage[] = [{ type: "state", state: display.state }];
    if ((display.state.phase === "playing" || display.state.phase === "paused") && display.frame) {
      messages.push({ type: "frame", frame: display.frame, periodMs: display.periodMs });
    } else {
      messages.push({ type: "clear" });
    }
    return messages;
  }

  close(): void {
    this.scheduler.stop();
  }

  private async advance(): Promise<void> {
    if (this.advancing) return;
    this.advancing = true;
    try {
      const state = await this.dispatchState("advance", {});
      this.publish({ type: "state", state });
      if (state.phase === "complete") {
        this.scheduler.stop();
        this.publish({ type: "clear" });
        return;
      }
      const display = await this.frameState();
      if (display.frame) this.publish({ type: "frame", frame: display.frame, periodMs: display.periodMs });
    } finally {
      this.advancing = false;
    }
  }

  private async dispatchState(type: string, input: unknown): Promise<ReadingSnapshot> {
    return await this.runtime.dispatch({ type, input }) as ReadingSnapshot;
  }

  private async frameState(): Promise<FrameState> {
    return await this.runtime.dispatch({ type: "frame", input: {} }) as FrameState;
  }
}
