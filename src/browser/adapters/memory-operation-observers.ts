import { createMemoryBrowserEvidencePort, createMemoryBrowserTelemetryPort } from "@siderealmollusk/rta/browser-runtime";
import type { BrowserOperationObservers } from "../ports/operation-observers.js";

/** Deterministic adapter for browser-kernel tests. Replace in production assembly. */
export const createMemoryBrowserOperationObservers = (): BrowserOperationObservers => Object.freeze({
  telemetry: createMemoryBrowserTelemetryPort(),
  evidence: createMemoryBrowserEvidencePort(),
});
