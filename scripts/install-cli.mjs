#!/usr/bin/env node
import { constants } from "node:fs";
import { access, chmod, lstat, readFile, readlink, stat, symlink, unlink, writeFile } from "node:fs/promises";
import { delimiter, dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const cliPath = resolve(process.env.RSVP_CLI_PATH ?? join(projectRoot, "dist/server/entrypoints/cli.js"));
const commandName = process.platform === "win32" ? "rsvp.cmd" : "rsvp";
const executableNames = process.platform === "win32"
  ? ["rsvp.com", "rsvp.exe", "rsvp.bat", "rsvp.cmd"]
  : [commandName];

const canWrite = async (directory) => {
  try {
    await access(directory, constants.W_OK);
    const metadata = await stat(directory);
    return metadata.isDirectory() && (process.getuid === undefined || metadata.uid === process.getuid());
  } catch {
    return false;
  }
};

const selectBinDirectory = async () => {
  const candidates = (process.env.PATH ?? "")
    .split(delimiter)
    .filter(Boolean)
    .map((entry) => resolve(entry))
    .filter((entry) => !entry.includes(`${sep}node_modules${sep}`));

  for (const candidate of candidates) {
    let existingName;
    for (const executableName of executableNames) {
      try {
        await lstat(join(candidate, executableName));
        existingName = executableName;
        break;
      } catch (error) {
        if (!(error && typeof error === "object" && "code" in error && error.code === "ENOENT")) throw error;
      }
    }

    const writable = await canWrite(candidate);
    if (existingName && (existingName !== commandName || !writable)) {
      throw new Error(`another command already resolves at ${join(candidate, existingName)} and cannot be safely replaced.`);
    }
    if (writable) return candidate;
  }

  throw new Error("No writable user-owned directory is present on PATH.");
};

const isReaderLink = async (commandPath) => {
  const currentTarget = resolve(dirname(commandPath), await readlink(commandPath));
  if (currentTarget === cliPath) return true;
  try {
    const packageRoot = resolve(dirname(currentTarget), "../../..");
    const packageJson = JSON.parse(await readFile(join(packageRoot, "package.json"), "utf8"));
    return packageJson.name === "rta-rsvp-reader";
  } catch {
    return false;
  }
};

const install = async () => {
  await access(cliPath, constants.R_OK);
  await chmod(cliPath, 0o755);

  const binDirectory = await selectBinDirectory();
  const commandPath = join(binDirectory, commandName);

  try {
    const existing = await lstat(commandPath);
    const managed = process.platform === "win32"
      ? existing.isFile() && (await readFile(commandPath, "utf8")).startsWith("@rem rta-rsvp-reader\r\n")
      : existing.isSymbolicLink() && await isReaderLink(commandPath);
    if (!managed) {
      throw new Error(`${commandPath} belongs to another command and was not replaced.`);
    }
    await unlink(commandPath);
  } catch (error) {
    if (!(error && typeof error === "object" && "code" in error && error.code === "ENOENT")) throw error;
  }

  if (process.platform === "win32") {
    await writeFile(commandPath, `@rem rta-rsvp-reader\r\n@"${process.execPath}" "${cliPath}" %*\r\n`);
  } else {
    await symlink(cliPath, commandPath);
  }
  console.log(`Installed rsvp at ${commandPath}`);
};

install().catch((error) => {
  console.error(`rsvp setup: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
