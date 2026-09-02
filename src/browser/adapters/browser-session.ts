import type { BrowserSession, BrowserSessionPort } from "@siderealmollusk/rta/browser-runtime";

export interface BrowserSessionStorageHost { readonly getItem: (key: string) => string | null; }
const isSession = (value: unknown): value is BrowserSession => value !== null && typeof value === "object" && "actor" in value && "correlationId" in value;
export const createBrowserSessionAdapter = (key: string, storage: BrowserSessionStorageHost = globalThis.sessionStorage): BrowserSessionPort => Object.freeze({
  bootstrap: async () => {
    const raw = storage.getItem(key);
    if (raw === null) throw new Error(`No browser session is stored under ${key}.`);
    const parsed: unknown = JSON.parse(raw);
    if (!isSession(parsed)) throw new Error(`Browser session stored under ${key} is invalid.`);
    return parsed;
  },
});
