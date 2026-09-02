import { createBrowserClockAdapter } from "../../../browser/adapters/browser-clock.js";
import { createBrowserHttpAdapter } from "../../../browser/adapters/browser-http.js";
import { createBrowserIdAdapter } from "../../../browser/adapters/browser-identifiers.js";
import { createBrowserRouterAdapter } from "../../../browser/adapters/browser-router.js";
import { createBrowserSessionAdapter } from "../../../browser/adapters/browser-session.js";
import { createMemoryBrowserOperationObservers } from "../../../browser/adapters/memory-operation-observers.js";
import { createWebKernel } from "../../../browser/kernel.js";
import { webRuntimeConfig, type WebRuntimeConfig } from "./web-runtime.config.js";

/** Server-style composition root: policy is declared in config; browser effects stay in adapters. */
export const createWebRuntime = (config: WebRuntimeConfig = webRuntimeConfig) => createWebKernel({
  sessions: config.adapters?.sessions ?? createBrowserSessionAdapter(config.sessionStorageKey),
  transport: config.adapters?.transport ?? createBrowserHttpAdapter(config.apiBaseUrl),
  router: config.adapters?.router ?? createBrowserRouterAdapter(config.routerBasePath),
  identifiers: config.adapters?.identifiers ?? createBrowserIdAdapter(),
  clock: config.adapters?.clock ?? createBrowserClockAdapter(),
  observers: config.adapters?.observers ?? createMemoryBrowserOperationObservers(),
});
