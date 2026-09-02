import type { BrowserIdPort } from "@siderealmollusk/rta/browser-runtime";

export interface BrowserCryptoHost { readonly randomUUID?: () => string; }
export const createBrowserIdAdapter = (host: BrowserCryptoHost | undefined = globalThis.crypto): BrowserIdPort => {
  let sequence = 0;
  return Object.freeze({ createIdempotencyKey: () => host?.randomUUID?.() ?? `browser-command-${++sequence}` });
};
