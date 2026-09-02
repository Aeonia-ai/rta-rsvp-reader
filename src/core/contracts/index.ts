import { createContractRegistry } from "@siderealmollusk/rta";
import { DisplayFrameContract } from "./display-frame.js";
import { contractMigrations } from "./migrations/index.js";

export { DisplayFrameContract } from "./display-frame.js";
export { contractMigrations } from "./migrations/index.js";
export { legacyEventBindings } from "./legacy-bindings.js";

export const contractRegistry = createContractRegistry({
  contracts: [DisplayFrameContract],
  migrations: contractMigrations,
});
