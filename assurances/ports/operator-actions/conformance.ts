import type { OperatorActionsPort } from "../../../src/core/ports/operator-actions.js";

const LAWS = ["TODO: define the primary substitutability law", "TODO: define the failure or edge law"] as const;
export const runConformance = () => ({ schemaVersion: "rta-port-conformance/v1", recordType: "port-conformance", app: "rta-rsvp-reader", port: "operator-actions", status: "fail", adapters: [], laws: LAWS });
void (undefined as unknown as OperatorActionsPort);
