import type { BrowserClockPort } from "@siderealmollusk/rta/browser-runtime";

export const createBrowserClockAdapter = (host: Pick<DateConstructor, "now"> = Date): BrowserClockPort => Object.freeze({ now: () => new Date(host.now()) });
