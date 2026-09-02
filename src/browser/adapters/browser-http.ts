import type { BrowserCommandEnvelope, BrowserQueryEnvelope, BrowserTransportPort, BrowserTransportResponse } from "@siderealmollusk/rta/browser-runtime";

export interface BrowserFetchHost { readonly fetch: (request: Request) => Promise<Response>; }
const endpoint = (baseUrl: string, operation: string) => new URL(`operations/${encodeURIComponent(operation)}`, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
export const createBrowserHttpAdapter = (baseUrl: string, host: BrowserFetchHost = { fetch: globalThis.fetch.bind(globalThis) }): BrowserTransportPort => Object.freeze({
  dispatch: async <Input, Output>(command: BrowserCommandEnvelope<Input>, signal: AbortSignal): Promise<BrowserTransportResponse<Output>> => {
    const response = await host.fetch(new Request(endpoint(baseUrl, command.operation), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(command), signal }));
    if (!response.ok) throw new Error(`Browser transport request failed with HTTP ${response.status}.`);
    return await response.json() as BrowserTransportResponse<Output>;
  },
  query: async <Input, Output>(query: BrowserQueryEnvelope<Input>, signal: AbortSignal): Promise<Output> => {
    const url = endpoint(baseUrl, query.operation); url.searchParams.set("input", JSON.stringify(query.input));
    const response = await host.fetch(new Request(url, { headers: { "x-rta-correlation-id": query.correlationId }, signal }));
    if (!response.ok) throw new Error(`Browser transport request failed with HTTP ${response.status}.`);
    return await response.json() as Output;
  },
});
