import { createContractRegistry } from "@siderealmollusk/rta";
import { ExampleContract } from "./example.js";
import { contractMigrations } from "./migrations/index.js";

export { ExampleContract } from "./example.js";
export { contractMigrations } from "./migrations/index.js";
export { legacyEventBindings } from "./legacy-bindings.js";

export const contractRegistry = createContractRegistry({
  contracts: [ExampleContract],
  migrations: contractMigrations,
});
