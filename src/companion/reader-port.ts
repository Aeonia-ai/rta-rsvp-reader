import type { PreparedChunk } from "./contracts.js";

export interface CompanionReaderPort {
  readonly setText: (chunk: PreparedChunk) => Promise<void>;
  readonly play: () => Promise<void>;
  readonly pause: () => Promise<void>;
  readonly stop: () => Promise<void>;
}
