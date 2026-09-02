import { splitAtOrp } from "./orp.js";
import { tokenize } from "./tokenize.js";

export type ReadingPhase = "empty" | "ready" | "playing" | "paused" | "complete";

export interface ReadingSnapshot {
  readonly phase: ReadingPhase;
  readonly documentName?: string;
  readonly index: number;
  readonly total: number;
  readonly wpm: number;
}

export interface DisplayFrame {
  readonly index: number;
  readonly total: number;
  readonly token: string;
  readonly before: string;
  readonly focus: string;
  readonly after: string;
}

interface ReadingSessionState {
  readonly phase: ReadingPhase;
  readonly documentName?: string;
  readonly tokens: readonly string[];
  readonly index: number;
  readonly wpm: number;
}

export type SerializedReadingSession = ReadingSessionState;

const assertWpm = (wpm: number): void => {
  if (!Number.isInteger(wpm) || wpm < 60 || wpm > 1200) {
    throw new RangeError("WPM must be an integer between 60 and 1200.");
  }
};

export class ReadingSession {
  private constructor(private readonly state: ReadingSessionState) {}

  static empty(wpm = 300): ReadingSession {
    assertWpm(wpm);
    return new ReadingSession(Object.freeze({ phase: "empty", tokens: Object.freeze([]), index: 0, wpm }));
  }

  static deserialize(value: string): ReadingSession {
    const parsed = JSON.parse(value) as Partial<SerializedReadingSession>;
    if (!Array.isArray(parsed.tokens) || !parsed.tokens.every((token) => typeof token === "string")) {
      throw new Error("invalid serialized reading session.");
    }
    if (typeof parsed.wpm !== "number" || typeof parsed.index !== "number" || typeof parsed.phase !== "string") {
      throw new Error("invalid serialized reading session.");
    }
    assertWpm(parsed.wpm);
    return new ReadingSession(Object.freeze({
      phase: parsed.phase as ReadingPhase,
      ...(typeof parsed.documentName === "string" ? { documentName: parsed.documentName } : {}),
      tokens: Object.freeze([...parsed.tokens]),
      index: parsed.index,
      wpm: parsed.wpm,
    }));
  }

  serialize(): string {
    return JSON.stringify(this.state);
  }

  setText(input: { readonly name: string; readonly text: string }): ReadingSession {
    const tokens = tokenize(input.text);
    if (tokens.length === 0) throw new Error("text must contain at least one token.");
    const documentName = input.name.trim();
    if (documentName.length === 0) throw new Error("document name must not be empty.");
    return new ReadingSession(Object.freeze({ phase: "ready", documentName, tokens, index: 0, wpm: this.state.wpm }));
  }

  setSpeed(wpm: number): ReadingSession {
    assertWpm(wpm);
    return new ReadingSession(Object.freeze({ ...this.state, wpm }));
  }

  play(): ReadingSession {
    if (this.state.phase !== "ready" && this.state.phase !== "paused") {
      throw new Error(`cannot play a ${this.state.phase} reading session.`);
    }
    return new ReadingSession(Object.freeze({ ...this.state, phase: "playing" }));
  }

  pause(): ReadingSession {
    if (this.state.phase !== "playing") throw new Error(`cannot pause a ${this.state.phase} reading session.`);
    return new ReadingSession(Object.freeze({ ...this.state, phase: "paused" }));
  }

  stop(): ReadingSession {
    if (this.state.tokens.length === 0) return this;
    return new ReadingSession(Object.freeze({ ...this.state, phase: "ready", index: 0 }));
  }

  advance(): ReadingSession {
    if (this.state.phase !== "playing") throw new Error(`cannot advance a ${this.state.phase} reading session.`);
    const nextIndex = this.state.index + 1;
    return nextIndex >= this.state.tokens.length
      ? new ReadingSession(Object.freeze({ ...this.state, phase: "complete", index: this.state.tokens.length }))
      : new ReadingSession(Object.freeze({ ...this.state, index: nextIndex }));
  }

  periodMs(): number {
    return 60_000 / this.state.wpm;
  }

  snapshot(): ReadingSnapshot {
    return Object.freeze({
      phase: this.state.phase,
      ...(this.state.documentName === undefined ? {} : { documentName: this.state.documentName }),
      index: this.state.index,
      total: this.state.tokens.length,
      wpm: this.state.wpm,
    });
  }

  frame(): DisplayFrame | undefined {
    const token = this.state.tokens[this.state.index];
    if (token === undefined) return undefined;
    return Object.freeze({ index: this.state.index, total: this.state.tokens.length, ...splitAtOrp(token) });
  }
}
