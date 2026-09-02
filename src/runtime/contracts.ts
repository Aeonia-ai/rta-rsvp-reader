import { createMemoryGovernedEventStore } from "@siderealmollusk/rta";
import { contractRegistry } from "../core/contracts/index.js";

// This is deliberately parallel to application.ts until an app explicitly adopts
// governed events in its domain behavior.
export const governedEventStore = createMemoryGovernedEventStore(contractRegistry);
