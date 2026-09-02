# HTTPS Glasses Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Serve a single-user RSVP reader over HTTPS-ready routes for landing, glasses display, and browser controls.

**Architecture:** The existing Node server remains the shared WebSocket reader authority. It gains a fixed sample-library HTTP API and optional public bind mode; the Vite SPA selects landing, glasses, or controls by pathname. The controls page speaks the existing control protocol through a browser WebSocket client.

**Tech Stack:** TypeScript, React 18, Vite, Node HTTP/WebSocket server, `qrcode`, Docker, Node built-in test runner.

## Global Constraints

- One trusted user and one in-memory reader state; no accounts, sessions, database, persistence, or multi-user isolation.
- Routes are exactly `/`, `/glasses-app`, and `/controls`.
- The glasses route has no visible controls or browser input behavior.
- The controls route supports only sample load, WPM, play, pause, stop, and status; process lifecycle remains host-owned.
- Browser code receives only the allow-listed sample manifest/text API; it never supplies file paths.
- Local use remains loopback by default; Docker/production binds to `0.0.0.0` and honors `PORT`.
- No cloud provider, account, domain, secret, or automatic deployment is added.

---

## File Structure

- Create `src/server/sample-library.ts`: fixed identifiers, safe names, and text reads for bundled samples.
- Modify `src/server/reader-server.ts`: sample API, SPA routes, and explicit host policy.
- Modify `src/entrypoints/server.ts`: `PORT` / `HOST` parsing.
- Create `src/frontends/web/routes.ts`: pure pathname selection and glasses URL construction.
- Create `src/frontends/web/control-client.ts`: browser WebSocket request/ack client.
- Create `src/frontends/web/app/landing-page.tsx`, `controls-page.tsx`, `controls.css`: public route views.
- Modify `src/frontends/web/app/main.tsx` and `src/frontends/web/app/display.css`: route mounting and 600×600 display contract.
- Modify `package.json` / `package-lock.json`: add browser QR dependency.
- Create `Dockerfile` and modify `README.md`: production container and Meta handoff steps.
- Create focused test files under `test/server` and `test/frontends`.

## Task 1: Safe sample library and public-bind server seams

**Files:**
- Create: `src/server/sample-library.ts`
- Modify: `src/server/reader-server.ts`
- Test: `test/server/sample-library.test.ts`
- Test: `test/server/reader-server.test.ts`

**Consumes:** bundled `samples/demo.txt` and `samples/calibration.txt`.

**Produces:** `listSamples(): Promise<readonly SampleSummary[]>`, `readSample(id): Promise<Sample>`, and `createReaderServer().listen(port, host)` supporting loopback or `0.0.0.0`.

- [ ] **Step 1: Write failing API and host tests**

```ts
const server = createReaderServer();
const address = await server.listen(0, "0.0.0.0");
try {
  const list = await fetch(`http://127.0.0.1:${address.port}/api/samples`);
  assert.deepEqual(await list.json(), [
    { id: "demo", name: "Demo" },
    { id: "calibration", name: "Calibration" },
  ]);
  const sample = await fetch(`http://127.0.0.1:${address.port}/api/samples/demo`);
  assert.match((await sample.json()).text, /reading/i);
  assert.equal((await fetch(`http://127.0.0.1:${address.port}/api/samples/../../package`)).status, 404);
} finally { await server.close(); }
```

- [ ] **Step 2: Run the focused tests to verify failure**

Run: `node --import tsx --test test/server/sample-library.test.ts test/server/reader-server.test.ts`

Expected: FAIL because sample API and public host support do not exist.

- [ ] **Step 3: Implement the allow-list and routes**

```ts
const SAMPLES = {
  demo: { name: "Demo", path: "samples/demo.txt" },
  calibration: { name: "Calibration", path: "samples/calibration.txt" },
} as const;

export const listSamples = async () => Object.entries(SAMPLES).map(([id, value]) => ({ id, name: value.name }));
export const readSample = async (id: string) => {
  const sample = SAMPLES[id as keyof typeof SAMPLES];
  if (!sample) return undefined;
  return { id, name: sample.name, text: await readFile(resolve(process.cwd(), sample.path), "utf8") };
};
```

Before static-file handling, return JSON for `GET /api/samples` and `GET /api/samples/:id`; every other API path returns 404. Permit only `127.0.0.1`, `::1`, and `0.0.0.0` in `listen`.

- [ ] **Step 4: Run focused tests to verify pass**

Run: `node --import tsx --test test/server/sample-library.test.ts test/server/reader-server.test.ts`

Expected: PASS; sample text comes only from the two fixed entries and public bind starts.

- [ ] **Step 5: Commit**

```bash
git add src/server/sample-library.ts src/server/reader-server.ts test/server
git commit -m "feat: add safe sample API for web controls"
```

## Task 2: Production entrypoint and browser route primitives

**Files:**
- Create: `src/frontends/web/routes.ts`
- Modify: `src/entrypoints/server.ts`
- Test: `test/frontends/routes.test.ts`
- Test: `test/entrypoints/server-options.test.ts`

**Consumes:** the server from Task 1.

**Produces:** `selectRoute(pathname): "landing" | "glasses" | "controls"`, `glassesAppUrl(origin): string`, and environment-aware server host/port parsing.

- [ ] **Step 1: Write failing pure route and server-option tests**

```ts
assert.equal(selectRoute("/"), "landing");
assert.equal(selectRoute("/glasses-app"), "glasses");
assert.equal(selectRoute("/controls"), "controls");
assert.equal(selectRoute("/unknown"), "landing");
assert.equal(glassesAppUrl("https://reader.example"), "https://reader.example/glasses-app");
assert.deepEqual(parseServerOptions({ PORT: "8080", HOST: "0.0.0.0" }), { port: 8080, host: "0.0.0.0" });
```

- [ ] **Step 2: Run focused tests to verify failure**

Run: `node --import tsx --test test/frontends/routes.test.ts test/entrypoints/server-options.test.ts`

Expected: FAIL because the route and parsing exports do not exist.

- [ ] **Step 3: Implement minimal pure helpers**

```ts
export const selectRoute = (pathname: string) =>
  pathname === "/glasses-app" ? "glasses" : pathname === "/controls" ? "controls" : "landing";
export const glassesAppUrl = (origin: string): string => new URL("/glasses-app", origin).toString();
export const parseServerOptions = (env: NodeJS.ProcessEnv) => ({
  port: Number(env.PORT ?? "4317"),
  host: env.HOST ?? "127.0.0.1",
});
```

Validate port as an integer in 1–65535 and host against the Task 1 allow-list before calling `server.listen(port, host)`.

- [ ] **Step 4: Run focused tests to verify pass**

Run: `node --import tsx --test test/frontends/routes.test.ts test/entrypoints/server-options.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/frontends/web/routes.ts src/entrypoints/server.ts test/frontends/routes.test.ts test/entrypoints/server-options.test.ts
git commit -m "feat: add HTTPS deployment route primitives"
```

## Task 3: Browser control transport and route views

**Files:**
- Create: `src/frontends/web/control-client.ts`
- Create: `src/frontends/web/app/landing-page.tsx`
- Create: `src/frontends/web/app/controls-page.tsx`
- Create: `src/frontends/web/app/controls.css`
- Modify: `src/frontends/web/app/main.tsx`
- Modify: `src/frontends/web/app/display.css`
- Modify: `index.html`
- Modify: `package.json`, `package-lock.json`
- Test: `test/frontends/control-client.test.ts`
- Test: `test/frontends/routes.test.ts`

**Consumes:** Task 1 sample endpoints, Task 2 route helpers, and existing `ControlMessage` / `ReadingSnapshot` contracts.

**Produces:** a landing QR page, a passive glasses page, and controls UI with response-backed status.

- [ ] **Step 1: Write failing browser transport and rendering tests**

```ts
const sent: unknown[] = [];
const socket = fakeWebSocket((raw) => sent.push(JSON.parse(raw)));
const client = createBrowserControlClient(() => socket);
const result = await client.send({ command: "play" });
assert.equal(sent[0].command, "play");
assert.equal(result.state.phase, "playing");
```

Add route rendering checks that `LandingPage` requests a QR for `https://reader.example/glasses-app`, controls render the five action buttons plus a sample and WPM selector, and the glasses route renders `ReaderDisplay` without controls.

- [ ] **Step 2: Run focused tests to verify failure**

Run: `node --import tsx --test test/frontends/control-client.test.ts test/frontends/routes.test.ts`

Expected: FAIL because browser control transport and route views do not exist.

- [ ] **Step 3: Implement transport and components**

Add `qrcode` as a production dependency and render the QR locally from `glassesAppUrl(location.origin)`.

```ts
export const createBrowserControlClient = (createSocket = (url: string) => new WebSocket(url)) => ({
  send: (command: CommandInput): Promise<ReadingSnapshot> =>
    new Promise((resolve, reject) => {
      const socket = createSocket(`${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws?role=control`);
      const requestId = crypto.randomUUID();
      // reject on socket error/timeout; resolve the matching ack state.
    }),
});
```

The controls component fetches `/api/samples` on mount; on Load fetches only `/api/samples/${selectedId}` and sends `set-text` with returned safe data. On every ack it updates the displayed `ReadingSnapshot`. No element in the glasses component receives a control handler.

Use `width=600,height=600,initial-scale=1,user-scalable=no` viewport metadata and 600×600-centered CSS for the glasses route; retain a responsive conventional layout for landing/controls.

- [ ] **Step 4: Run focused tests to verify pass**

Run: `node --import tsx --test test/frontends/control-client.test.ts test/frontends/routes.test.ts`

Expected: PASS; request IDs are matched, QR target is current-origin glasses path, and only controls route exposes buttons.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json index.html src/frontends/web test/frontends
git commit -m "feat: add landing and browser control routes"
```

## Task 4: Container packaging and deployment handoff

**Files:**
- Create: `Dockerfile`
- Modify: `README.md`
- Test: `test/server/reader-server.test.ts`

**Consumes:** production entrypoint and built Vite assets.

**Produces:** host-agnostic OCI image and documented Meta Web App setup checklist.

- [ ] **Step 1: Write failing packaging/documentation checks**

Add assertions that `Dockerfile` uses Node 22, runs `npm ci` and `npm run build`, exposes 4317, and starts `dist/server/entrypoints/server.js`. Add README assertions for `/`, `/glasses-app`, `/controls`, public HTTPS, and Developer Mode registration.

- [ ] **Step 2: Run focused tests to verify failure**

Run: `node --import tsx --test test/server/reader-server.test.ts`

Expected: FAIL because the Dockerfile and handoff section do not exist.

- [ ] **Step 3: Add the Dockerfile and instructions**

```dockerfile
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-bookworm-slim
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/samples ./samples
ENV NODE_ENV=production HOST=0.0.0.0 PORT=4317
EXPOSE 4317
CMD ["node", "dist/server/entrypoints/server.js"]
```

Document `docker build -t rsvp-reader .` and `docker run --rm -p 4317:4317 rsvp-reader`, then state that a deployment host must give the container a public HTTPS URL. Include the exact Meta handoff route: open the URL, scan/use `/glasses-app`, enable Developer Mode, then add that URL as a Web App.

- [ ] **Step 4: Run focused checks to verify pass**

Run: `node --import tsx --test test/server/reader-server.test.ts && npm run build && git diff --check`

Expected: PASS; production assets and image inputs are present.

- [ ] **Step 5: Commit**

```bash
git add Dockerfile README.md test/server/reader-server.test.ts
git commit -m "docs: package HTTPS glasses deployment"
```

## Task 5: Full verification

**Files:** No source changes required.

- [ ] **Step 1: Run complete local verification**

```bash
npm run check:fast
npm run build
git diff --check
git status --short --branch
```

Expected: all tests and TypeScript checks pass, web/server artifacts build, whitespace is clean, and only expected branch state remains.

- [ ] **Step 2: Build the shipping container**

```bash
docker build -t rsvp-reader:local .
docker run --rm -d --name rsvp-reader-smoke -p 4317:4317 rsvp-reader:local
curl --fail http://127.0.0.1:4317/api/samples
docker stop rsvp-reader-smoke
```

Expected: the sample manifest is returned; container stops cleanly. If Docker is unavailable, report that exact environmental limitation after all code-level verification passes.

- [ ] **Step 3: Commit verification-only corrections**

```bash
git status --short
```

## Self-Review

- **Spec coverage:** Task 1 supplies safe samples and public hosting seams; Task 2 defines all routes and host options; Task 3 implements QR, controls, display isolation, and 600×600 styling; Task 4 makes the app deployable and hands it to Meta setup; Task 5 validates code and container.
- **Placeholder scan:** Every task names the required files, interfaces, commands, test behavior, and exact route/control scope.
- **Type consistency:** `SampleSummary`, `Sample`, `selectRoute`, `glassesAppUrl`, and `createBrowserControlClient` are introduced before later tasks consume them. The control client carries existing `CommandInput`/ack snapshots rather than defining a second protocol.

