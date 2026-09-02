import type { BrowserEvidencePort, BrowserTelemetryPort } from "@siderealmollusk/rta/browser-runtime";

/** Browser lifecycle observation is explicit: visual UI never reaches telemetry or evidence directly. */
export interface BrowserOperationObservers {
  readonly telemetry: BrowserTelemetryPort;
  readonly evidence: BrowserEvidencePort;
}
