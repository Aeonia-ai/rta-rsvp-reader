import type { WebKernelDependencies } from "../../../browser/kernel.js";

/** Application-owned browser policy. Replace values or complete ports; do not access browser globals from UI code. */
export interface WebRuntimeConfig {
  readonly apiBaseUrl: string;
  readonly sessionStorageKey: string;
  readonly routerBasePath: string;
  readonly adapters?: Partial<WebKernelDependencies>;
}

export const webRuntimeConfig: WebRuntimeConfig = Object.freeze({
  apiBaseUrl: "/api",
  sessionStorageKey: "rta.session",
  routerBasePath: "/",
});
