import type { BrowserRouterPort } from "@siderealmollusk/rta/browser-runtime";

export interface BrowserRouterHost { readonly location: { readonly origin: string }; readonly history: { readonly pushState: (data: unknown, unused: string, url?: string | URL | null) => void }; readonly dispatchEvent: (event: Event) => boolean; }
export const createBrowserRouterAdapter = (basePath = "/", host: BrowserRouterHost = globalThis): BrowserRouterPort => Object.freeze({
  navigate: async (path: string, signal?: AbortSignal) => {
    if (signal?.aborted) throw signal.reason;
    const url = new URL(path, new URL(basePath, host.location.origin));
    host.history.pushState(null, "", url);
    host.dispatchEvent(new PopStateEvent("popstate"));
  },
});
