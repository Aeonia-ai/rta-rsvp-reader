export interface CadenceScheduler {
  readonly start: (periodMs: number, tick: () => void | Promise<void>) => void;
  readonly restart: (periodMs: number, tick: () => void | Promise<void>) => void;
  readonly stop: () => void;
}

type TimeoutHandle = ReturnType<typeof setTimeout>;

export class DeadlineCadenceScheduler implements CadenceScheduler {
  private handle: unknown;
  private generation = 0;

  constructor(
    private readonly now: () => number = performance.now.bind(performance),
    private readonly set: (callback: () => void, delayMs: number) => unknown = setTimeout,
    private readonly clear: (handle: unknown) => void = (handle) => clearTimeout(handle as TimeoutHandle),
  ) {}

  start(periodMs: number, tick: () => void | Promise<void>): void {
    this.stop();
    const generation = ++this.generation;
    const epoch = this.now();
    let tickNumber = 1;
    const schedule = (): void => {
      const deadline = epoch + tickNumber * periodMs;
      this.handle = this.set(() => { void (async () => {
        if (generation !== this.generation) return;
        await tick();
        if (generation !== this.generation) return;
        tickNumber += 1;
        schedule();
      })(); }, Math.max(0, deadline - this.now()));
    };
    schedule();
  }

  restart(periodMs: number, tick: () => void | Promise<void>): void {
    this.start(periodMs, tick);
  }

  stop(): void {
    this.generation += 1;
    if (this.handle !== undefined) this.clear(this.handle);
    this.handle = undefined;
  }
}
