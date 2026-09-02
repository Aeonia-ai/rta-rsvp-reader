# Contributing

Use Node.js 22 or newer. Install with `npm install`, then run `npm test`, `npm run typecheck`, and `npm run build` before submitting a change.

Preserve the core constraints: constant token cadence, no browser controls, localhost binding by default, RTA use-case ownership of domain transitions, and adapters for external effects. Add a failing test before changing behavior and keep generated RTA descriptors synchronized with the source artifacts.
