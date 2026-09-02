import type { ReadingSessionRepositoryPort } from "../../../src/core/ports/reading-session-repository.js";

const LAWS = ["TODO: define the primary substitutability law", "TODO: define the failure or edge law"] as const;
export const runConformance = () => ({ schemaVersion: "rta-port-conformance/v1", recordType: "port-conformance", app: "rta-rsvp-reader", port: "reading-session-repository", status: "fail", adapters: [], laws: LAWS });
void (undefined as unknown as ReadingSessionRepositoryPort);
