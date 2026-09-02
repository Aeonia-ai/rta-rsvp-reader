import assert from "node:assert/strict";
import { chmod, lstat, mkdir, mkdtemp, readFile, readlink, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { delimiter, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, it } from "node:test";

const projectRoot = resolve(import.meta.dirname, "../..");
const commandName = process.platform === "win32" ? "rsvp.cmd" : "rsvp";

const installEnvironment = (binDirectory: string, cliPath: string, extra: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv => ({
  ...process.env,
  ...extra,
  PATH: `${binDirectory}${delimiter}${process.env.PATH ?? ""}`,
  RSVP_CLI_PATH: cliPath,
});

describe("CLI installer", () => {
  it("installs through npm without choosing npm's transient node_modules bin", async () => {
    const npmCliPath = process.env.npm_execpath;
    assert.ok(npmCliPath, "npm_execpath is required for the npm integration test");
    const root = await mkdtemp(join(tmpdir(), "rsvp-npm-install-"));
    const binDirectory = join(root, "bin");
    const cliPath = join(root, "cli.js");

    try {
      await mkdir(binDirectory);
      if (process.platform !== "win32") await symlink(process.execPath, join(binDirectory, "node"));
      await writeFile(cliPath, "#!/usr/bin/env node\nconsole.log('npm-rsvp')\n");

      const install = spawnSync(process.execPath, [npmCliPath, "run", "install:cli"], {
        cwd: projectRoot,
        encoding: "utf8",
        env: installEnvironment(binDirectory, cliPath),
      });

      assert.equal(install.status, 0, `${install.stdout}\n${install.stderr}`);
      await lstat(join(binDirectory, commandName));
      await assert.rejects(lstat(join(projectRoot, "node_modules/.bin", commandName)), { code: "ENOENT" });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("installs an immediately runnable rsvp command into a PATH directory", async () => {
    const root = await mkdtemp(join(tmpdir(), "rsvp-cli-install-"));
    const binDirectory = join(root, "bin");
    const cliPath = join(root, "cli.js");

    try {
      await mkdir(binDirectory);
      if (process.platform !== "win32") await symlink(process.execPath, join(binDirectory, "node"));
      await writeFile(cliPath, "#!/usr/bin/env node\nconsole.log('test-rsvp')\n");
      await chmod(cliPath, 0o644);

      const install = spawnSync(process.execPath, ["scripts/install-cli.mjs"], {
        cwd: projectRoot,
        encoding: "utf8",
        env: installEnvironment(binDirectory, cliPath),
      });

      assert.equal(install.status, 0, install.stderr);
      const commandPath = join(binDirectory, commandName);
      if (process.platform === "win32") {
        assert.match(await readFile(commandPath, "utf8"), /^@rem rta-rsvp-reader/);
      } else {
        assert.equal(await readlink(commandPath), cliPath);
      }

      const invocation = spawnSync(commandPath, [], {
        encoding: "utf8",
        env: installEnvironment(binDirectory, cliPath),
        shell: process.platform === "win32",
      });
      assert.equal(invocation.status, 0, invocation.stderr);
      assert.equal(invocation.stdout.trim(), "test-rsvp");

      const reinstall = spawnSync(process.execPath, ["scripts/install-cli.mjs"], {
        cwd: projectRoot,
        encoding: "utf8",
        env: installEnvironment(binDirectory, cliPath),
      });
      assert.equal(reinstall.status, 0, reinstall.stderr);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("refuses to replace a command it does not own", async () => {
    const root = await mkdtemp(join(tmpdir(), "rsvp-cli-collision-"));
    const binDirectory = join(root, "bin");
    const cliPath = join(root, "cli.js");
    const existingPath = join(root, "unrelated/dist/server/entrypoints/cli.js");

    try {
      await mkdir(binDirectory);
      await mkdir(resolve(existingPath, ".."), { recursive: true });
      await writeFile(cliPath, "#!/usr/bin/env node\n");
      await writeFile(existingPath, "#!/usr/bin/env node\n");
      if (process.platform === "win32") {
        await writeFile(join(binDirectory, commandName), "@echo unrelated\r\n");
      } else {
        await symlink(existingPath, join(binDirectory, commandName));
      }

      const install = spawnSync(process.execPath, ["scripts/install-cli.mjs"], {
        cwd: projectRoot,
        encoding: "utf8",
        env: installEnvironment(binDirectory, cliPath),
      });

      assert.notEqual(install.status, 0);
      assert.match(install.stderr, /another command/);
      if (process.platform === "win32") {
        assert.equal(await readFile(join(binDirectory, commandName), "utf8"), "@echo unrelated\r\n");
      } else {
        assert.equal(await readlink(join(binDirectory, commandName)), existingPath);
      }
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("does not report success when a read-only earlier PATH command would shadow the install", { skip: process.platform === "win32" }, async () => {
    const root = await mkdtemp(join(tmpdir(), "rsvp-cli-shadow-"));
    const firstBin = join(root, "first-bin");
    const preferredBin = join(root, ".local/bin");
    const cliPath = join(root, "cli.js");

    try {
      await mkdir(firstBin);
      await mkdir(preferredBin, { recursive: true });
      await writeFile(cliPath, "#!/usr/bin/env node\n");
      await writeFile(join(firstBin, commandName), "#!/bin/sh\necho shadow\n");
      await chmod(join(firstBin, commandName), 0o755);
      await chmod(firstBin, 0o555);

      const install = spawnSync(process.execPath, ["scripts/install-cli.mjs"], {
        cwd: projectRoot,
        encoding: "utf8",
        env: {
          ...process.env,
          HOME: root,
          PATH: `${firstBin}${process.platform === "win32" ? ";" : ":"}${preferredBin}`,
          RSVP_CLI_PATH: cliPath,
        },
      });

      assert.notEqual(install.status, 0);
      assert.match(install.stderr, /another command/);
      await assert.rejects(lstat(join(preferredBin, commandName)), { code: "ENOENT" });
    } finally {
      await chmod(firstBin, 0o755).catch(() => undefined);
      await rm(root, { recursive: true, force: true });
    }
  });
});
