#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const marketplaceName = "game-production-workflow";
const pluginName = "game-production-workflow";

function parseArguments(argv) {
  const options = {
    repository: "qiaoxuelin/game-production-workflow",
    ref: "main",
    repositoryExplicit: false,
    refExplicit: false,
    codexCommand: null,
    keepLegacyPlugins: false,
    dryRun: false,
    json: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--repository") {
      options.repository = argv[++index];
      options.repositoryExplicit = true;
    } else if (argument === "--ref") {
      options.ref = argv[++index];
      options.refExplicit = true;
    } else if (argument === "--codex-command") {
      options.codexCommand = argv[++index];
    } else if (argument === "--keep-legacy-plugins") {
      options.keepLegacyPlugins = true;
    } else if (argument === "--dry-run") {
      options.dryRun = true;
    } else if (argument === "--json") {
      options.json = true;
    } else if (argument === "--help" || argument === "-h") {
      console.log("Usage: node install.mjs [--repository OWNER/REPO] [--ref REF] [--keep-legacy-plugins] [--dry-run] [--json]");
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(options.repository ?? "")) {
    throw new Error("--repository must use OWNER/REPOSITORY with no shell characters");
  }
  if (!/^[A-Za-z0-9._/-]+$/.test(options.ref ?? "")) {
    throw new Error("--ref contains unsupported characters");
  }
  if (options.codexCommand !== null && !String(options.codexCommand).trim()) {
    throw new Error("--codex-command requires a path");
  }
  return options;
}

function dryRunCommands(options) {
  return [
    ["codex", "plugin", "list", "--json"],
    ["codex", "plugin", "marketplace", "list", "--json"],
    ["codex", "plugin", "marketplace", "add", options.repository, "--ref", options.ref],
    ["codex", "plugin", "add", `${pluginName}@${marketplaceName}`],
    ["codex", "plugin", "list", "--json"],
  ];
}

export function validateWindowsArguments(args) {
  for (const argument of args) {
    if (!/^[A-Za-z0-9@._+:/=\\-]+$/.test(argument)) {
      throw new Error(`unsafe Windows command argument: ${argument}`);
    }
  }
}

function createRuntime(command, prefixArgs = []) {
  return {
    command,
    prefixArgs,
    usesCmd: process.platform === "win32" && command.toLowerCase().endsWith(".cmd"),
  };
}

function runCodex(runtime, args) {
  const commandArgs = [...runtime.prefixArgs, ...args];
  if (runtime.usesCmd) validateWindowsArguments(commandArgs);
  const result = spawnSync(runtime.command, commandArgs, {
    encoding: "utf8",
    shell: runtime.usesCmd,
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status !== 0) {
    throw new Error(`codex ${args.join(" ")} failed: ${(result.stderr || result.stdout).trim()}`);
  }
  return result.stdout;
}

function findCodex(options) {
  const candidates = [];
  if (options.codexCommand) {
    const explicit = path.resolve(options.codexCommand);
    candidates.push(
      /\.(?:mjs|js)$/i.test(explicit)
        ? createRuntime(process.execPath, [explicit])
        : createRuntime(explicit),
    );
  } else {
    const commands = process.platform === "win32"
      ? ["codex.exe", "codex", "codex.cmd"]
      : ["codex"];
    candidates.push(...commands.map((command) => createRuntime(command)));
  }
  for (const runtime of candidates) {
    try {
      runCodex(runtime, ["--version"]);
      return runtime;
    } catch {
      // Try the next platform-specific executable form.
    }
  }
  throw new Error("Codex CLI was not found. Install or open Codex before running this installer.");
}

function parseJson(output, operation) {
  try {
    return JSON.parse(output);
  } catch {
    throw new Error(`${operation} did not return valid JSON`);
  }
}

function install(options) {
  const codex = findCodex(options);
  const initial = parseJson(runCodex(codex, ["plugin", "list", "--json"]), "plugin list");
  if (!options.keepLegacyPlugins) {
    for (const plugin of initial.installed ?? []) {
      if (["game-production-system", "game-approval-ui"].includes(plugin.name)) {
        runCodex(codex, ["plugin", "remove", plugin.pluginId]);
      }
    }
  }

  const marketplaces = parseJson(
    runCodex(codex, ["plugin", "marketplace", "list", "--json"]),
    "marketplace list",
  );
  const configured = (marketplaces.marketplaces ?? []).some(
    (marketplace) => marketplace.name === marketplaceName,
  );
  if (configured) {
    if (options.repositoryExplicit || options.refExplicit) {
      throw new Error(
        "marketplace game-production-workflow is already configured; explicit repository or ref cannot be honored safely. Run without overrides or remove the marketplace first.",
      );
    }
    runCodex(codex, ["plugin", "marketplace", "upgrade", marketplaceName]);
  } else {
    runCodex(codex, ["plugin", "marketplace", "add", options.repository, "--ref", options.ref]);
  }
  runCodex(codex, ["plugin", "add", `${pluginName}@${marketplaceName}`]);

  const installed = parseJson(runCodex(codex, ["plugin", "list", "--json"]), "plugin list verification");
  const matches = (installed.installed ?? []).filter((plugin) => plugin.name === pluginName);
  if (matches.length !== 1 || !matches[0].enabled) {
    throw new Error(`${pluginName} is not installed and enabled exactly once`);
  }
  const standaloneSkill = path.join(os.homedir(), ".codex", "skills", "game-production-system");
  return {
    standaloneSkill,
    duplicateStandaloneSkill: fs.existsSync(standaloneSkill),
  };
}

function main() {
try {
  const options = parseArguments(process.argv.slice(2));
  if (options.dryRun) {
    const report = {
      platform: process.platform,
      externalSkillsRequired: false,
      dryRun: true,
      commands: dryRunCommands(options),
    };
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    const result = install(options);
    if (options.json) {
      process.stdout.write(`${JSON.stringify({ platform: process.platform, externalSkillsRequired: false, installed: true, ...result }, null, 2)}\n`);
    } else {
      console.log(`Installed ${pluginName} with both bundled Skills and the approval UI.`);
      if (result.duplicateStandaloneSkill) {
        console.warn(`Archive the old standalone Skill at ${result.standaloneSkill} before restarting Codex.`);
      }
      console.log("Restart Codex and begin a new task.");
    }
  }
} catch (error) {
  console.error(`install: ${error.message}`);
  process.exitCode = 1;
}
}

const isMain = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();
