import { createBrowserRuntime, type BrowserClockPort, type BrowserIdPort, type BrowserRouterPort, type BrowserSessionPort, type BrowserTransportPort } from "@siderealmollusk/rta/browser-runtime";
import type { BrowserOperationObservers } from "./ports/operation-observers.js";

/** The renderer-independent browser composition root. UI frameworks receive this kernel; they do not own transport or telemetry. */
export interface WebKernelDependencies {
  readonly sessions: BrowserSessionPort;
  readonly transport: BrowserTransportPort;
  readonly router: BrowserRouterPort;
  readonly identifiers: BrowserIdPort;
  readonly clock: BrowserClockPort;
  readonly observers: BrowserOperationObservers;
}

export const createWebKernel = (dependencies: WebKernelDependencies) => createBrowserRuntime({
  sessions: dependencies.sessions,
  transport: dependencies.transport,
  router: dependencies.router,
  identifiers: dependencies.identifiers,
  clock: dependencies.clock,
  telemetry: dependencies.observers.telemetry,
  evidence: dependencies.observers.evidence,
});
