#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

const knownCapabilities = [
  "doctor",
  "import",
  "test",
  "build",
  "smoke",
  "capture",
  "performance",
  "package",
  "install",
  "upload",
  "rollback",
];

function parseArguments(argv) {
  const options = {
    projectRoot: process.cwd(),
    required: [],
    json: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--project-root") {
      options.projectRoot = argv[++index];
      if (!options.projectRoot) throw new Error("--project-root requires a path");
    } else if (argument === "--require") {
      const value = argv[++index];
      if (!value) throw new Error("--require requires a comma-separated capability list");
      options.required.push(...value.split(",").map((item) => item.trim()).filter(Boolean));
    } else if (argument === "--json") {
      options.json = true;
    } else if (argument === "--help" || argument === "-h") {
      options.help = true;
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }

  options.required = [...new Set(options.required)];
  for (const capability of options.required) {
    if (!knownCapabilities.includes(capability)) {
      throw new Error(`Unknown required capability: ${capability}`);
    }
  }
  return options;
}

function probe(executable, args) {
  const result = spawnSync(executable, args, {
    encoding: "utf8",
    timeout: 3000,
    windowsHide: true,
  });
  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`.trim();
  return {
    available: result.status === 0,
    command: executable,
    version: output.split(/\r?\n/, 1)[0] || null,
  };
}

function detectEngine(projectRoot) {
  if (fs.existsSync(path.join(projectRoot, "project.godot"))) {
    return { name: "godot", marker: "project.godot" };
  }
  const unityMarker = path.join("ProjectSettings", "ProjectVersion.txt");
  if (fs.existsSync(path.join(projectRoot, unityMarker))) {
    return { name: "unity", marker: unityMarker };
  }
  const unrealMarker = fs.existsSync(projectRoot)
    ? fs.readdirSync(projectRoot).find((entry) => entry.endsWith(".uproject"))
    : null;
  if (unrealMarker) return { name: "unreal", marker: unrealMarker };
  return { name: "unknown", marker: null };
}

function loadAdapter(projectRoot) {
  const adapterPath = path.join(projectRoot, "production", "adapter.json");
  if (!fs.existsSync(adapterPath)) {
    return { path: adapterPath, present: false, schemaVersion: null, commands: {} };
  }
  const adapter = JSON.parse(fs.readFileSync(adapterPath, "utf8"));
  if (adapter.schemaVersion !== 1 || typeof adapter.commands !== "object" || !adapter.commands) {
    throw new Error("production/adapter.json must use schemaVersion 1 and contain a commands object");
  }
  return {
    path: adapterPath,
    present: true,
    schemaVersion: adapter.schemaVersion,
    commands: adapter.commands,
  };
}

function resolveCommand(value) {
  if (value && typeof value === "object" && !Array.isArray(value)
      && Object.hasOwn(value, "command")) {
    return resolveCommand(value.command);
  }
  if (typeof value === "string" && value.trim()) return value.trim();
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const selected = value[process.platform] ?? value.default;
  return typeof selected === "string" && selected.trim() ? selected.trim() : null;
}

function isExecutableFile(candidate) {
  try {
    if (!fs.statSync(candidate).isFile()) return false;
    if (process.platform !== "win32") fs.accessSync(candidate, fs.constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function resolveExecutable(value) {
  const executable = value.trim();
  if (path.isAbsolute(executable)) {
    return isExecutableFile(executable) ? executable : null;
  }
  if (executable.includes("/") || executable.includes("\\")
      || !/^[A-Za-z0-9._+-]+$/.test(executable)) {
    return null;
  }
  const extensions = process.platform === "win32"
    ? (process.env.PATHEXT ?? ".COM;.EXE;.BAT;.CMD").split(";").filter(Boolean)
    : [""];
  const names = process.platform === "win32" && !path.extname(executable)
    ? [executable, ...extensions.map((extension) => `${executable}${extension.toLowerCase()}`)]
    : [executable];
  for (const directory of (process.env.PATH ?? "").split(path.delimiter).filter(Boolean)) {
    for (const name of names) {
      const candidate = path.join(directory, name);
      if (isExecutableFile(candidate)) return candidate;
    }
  }
  return null;
}

function evaluateCapability(value, command, projectRoot) {
  if (!command) return { available: false, probe: null, detail: "not configured" };
  const declaredProbe = value && typeof value === "object" && !Array.isArray(value)
    ? value.probe
    : null;
  if (!declaredProbe) {
    return { available: null, probe: null, detail: "configured but not verified" };
  }
  if (!declaredProbe || typeof declaredProbe !== "object" || Array.isArray(declaredProbe)) {
    throw new Error("capability probe must be an object");
  }
  if (declaredProbe.type === "file") {
    if (typeof declaredProbe.path !== "string" || !declaredProbe.path.trim()) {
      throw new Error("file probe requires a path");
    }
    const target = path.resolve(projectRoot, declaredProbe.path);
    const relative = path.relative(projectRoot, target);
    if (relative.startsWith("..") || path.isAbsolute(relative)) {
      throw new Error(`file probe escapes project root: ${declaredProbe.path}`);
    }
    return {
      available: fs.existsSync(target),
      probe: { type: "file", path: declaredProbe.path },
      detail: fs.existsSync(target) ? "probe path exists" : "probe path is missing",
    };
  }
  if (declaredProbe.type === "executable") {
    if (typeof declaredProbe.value !== "string" || !declaredProbe.value.trim()) {
      throw new Error("executable probe requires a value");
    }
    const resolved = resolveExecutable(declaredProbe.value);
    return {
      available: resolved !== null,
      probe: { type: "executable", value: declaredProbe.value },
      detail: resolved ? `executable found at ${resolved}` : "executable not found",
    };
  }
  throw new Error(`unknown capability probe type: ${declaredProbe.type}`);
}

function unprobedCapability(command) {
  return command
    ? { available: null, probe: null, detail: "not probed; add --require to verify" }
    : { available: false, probe: null, detail: "not configured" };
}

function buildReport(options) {
  const projectRoot = path.resolve(options.projectRoot);
  if (!fs.existsSync(projectRoot) || !fs.statSync(projectRoot).isDirectory()) {
    throw new Error(`Project root is not a directory: ${projectRoot}`);
  }

  const adapter = loadAdapter(projectRoot);
  const capabilities = Object.fromEntries(
    knownCapabilities.map((name) => {
      const adapterValue = adapter.commands[name];
      const adapterCommand = resolveCommand(adapterValue);
      const command = name === "doctor" && !adapterCommand
        ? `${JSON.stringify(process.execPath)} ${JSON.stringify(path.resolve(process.argv[1]))} --project-root . --json`
        : adapterCommand;
      const evaluation = name === "doctor" && !adapterCommand
        ? { available: true, probe: { type: "bundled" }, detail: "running doctor" }
        : options.required.includes(name)
          ? evaluateCapability(adapterValue, command, projectRoot)
          : unprobedCapability(command);
      return [
        name,
        {
          configured: command !== null,
          available: evaluation.available,
          command,
          source: adapterCommand
            ? "production/adapter.json"
            : name === "doctor"
              ? "bundled game-production-system"
              : null,
          probe: evaluation.probe,
          detail: evaluation.detail,
        },
      ];
    }),
  );
  const missingRequired = options.required.filter(
    (name) => capabilities[name]?.available !== true,
  );
  const pwsh = probe("pwsh", ["-NoProfile", "-Command", "$PSVersionTable.PSVersion.ToString()"]);
  const windowsPowerShell = process.platform === "win32"
    ? probe("powershell.exe", ["-NoProfile", "-Command", "$PSVersionTable.PSVersion.ToString()"])
    : { available: false, command: "powershell.exe", version: null };

  return {
    schemaVersion: 1,
    platform: process.platform,
    architecture: process.arch,
    projectRoot,
    externalSkillsRequired: false,
    runtimes: {
      node: { available: true, command: process.execPath, version: process.version },
      git: probe("git", ["--version"]),
      pwsh: pwsh.available ? pwsh : windowsPowerShell,
    },
    engine: detectEngine(projectRoot),
    adapter: {
      path: adapter.path,
      present: adapter.present,
      schemaVersion: adapter.schemaVersion,
    },
    capabilities,
    requiredCapabilities: options.required,
    missingRequired,
    ready: missingRequired.length === 0,
  };
}

function printHelp() {
  console.log("Usage: node doctor.mjs [--project-root PATH] [--require test,build] [--json]");
}

try {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    printHelp();
  } else {
    const report = buildReport(options);
    if (options.json) {
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    } else {
      console.log(`Platform: ${report.platform}/${report.architecture}`);
      console.log(`Engine: ${report.engine.name}`);
      console.log(`Adapter: ${report.adapter.present ? report.adapter.path : "not configured"}`);
      console.log(`Ready: ${report.ready}`);
      if (report.missingRequired.length) {
        console.log(`Missing required capabilities: ${report.missingRequired.join(", ")}`);
      }
    }
    if (!report.ready) process.exitCode = 2;
  }
} catch (error) {
  console.error(`doctor: ${error.message}`);
  process.exitCode = 3;
}
