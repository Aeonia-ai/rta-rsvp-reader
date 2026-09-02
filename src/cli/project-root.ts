import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const findProjectRoot = (): string => {
  if (process.env.RSVP_READER_ROOT) return resolve(process.env.RSVP_READER_ROOT);
  let candidate = dirname(fileURLToPath(import.meta.url));
  while (true) {
    const manifest = join(candidate, "package.json");
    if (existsSync(manifest)) {
      const parsed = JSON.parse(readFileSync(manifest, "utf8")) as { readonly name?: string };
      if (parsed.name === "rta-rsvp-reader") return candidate;
    }
    const parent = dirname(candidate);
    if (parent === candidate) throw new Error("could not locate the rta-rsvp-reader project root.");
    candidate = parent;
  }
};
