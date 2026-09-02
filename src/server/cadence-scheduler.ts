export interface CadenceScheduler {
  readonly start: (periodMs: number, tick: () => void) => void;
  readonly restart: (periodMs: number, tick: () => void) => void;
  readonly stop: () => void;
}

type IntervalHandle = ReturnType<typeof setInterval>;

export class IntervalCadenceScheduler implements CadenceScheduler {
  private handle: unknown;

  constructor(
    private readonly set: (callback: () => void, periodMs: number) => unknown = setInterval,
    private readonly clear: (handle: unknown) => void = (handle) => clearInterval(handle as IntervalHandle),
  ) {}

  start(periodMs: number, tick: () => void): void {
    this.stop();
    this.handle = this.set(tick, periodMs);
  }

  restart(periodMs: number, tick: () => void): void {
    this.start(periodMs, tick);
  }

  stop(): void {
    if (this.handle !== undefined) this.clear(this.handle);
    this.handle = undefined;
  }
}
