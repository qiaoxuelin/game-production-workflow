import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const fixtureIds = new Set(["design-direction", "composite-runtime"]);
const controlFiles = ["fixture-lock.json", "observation.json", "result.json"];

function requireNonEmptyString(value, name) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${name} must be a non-empty string`);
  }
  return value;
}

function requireAbsolute(value, name) {
  requireNonEmptyString(value, name);
  if (!path.isAbsolute(value)) {
    throw new Error(`${name} must be an absolute path`);
  }
  return path.resolve(value);
}

function requireEvalRunPath(pluginRoot, value, name) {
  const resolved = requireAbsolute(value, name);
  const evaluationRoot = path.resolve(pluginRoot, "../..", ".tmp/game-art-evals");
  if (!resolved.startsWith(`${evaluationRoot}${path.sep}`)) {
    throw new Error(`${name} must be under ${evaluationRoot}`);
  }
  return resolved;
}

function parseFlags(values) {
  const flags = {};
  for (let index = 0; index < values.length; index += 2) {
    const flag = values[index];
    const value = values[index + 1];
    if (!flag?.startsWith("--") || value === undefined || value.startsWith("--")) {
      throw new Error(`invalid argument sequence near ${flag ?? "end of command"}`);
    }
    if (Object.hasOwn(flags, flag)) {
      throw new Error(`duplicate flag: ${flag}`);
    }
    flags[flag] = value;
  }
  return flags;
}

export function parseFixtureArguments(argv) {
  const [command, ...values] = argv;
  if (!command || !["prepare", "verify"].includes(command)) {
    throw new Error("command must be prepare or verify");
  }
  const flags = parseFlags(values);
  if (command === "prepare") {
    const allowed = new Set(["--fixture", "--label", "--output"]);
    const unknown = Object.keys(flags).find((flag) => !allowed.has(flag));
    if (unknown) throw new Error(`unknown flag: ${unknown}`);
    const fixtureId = requireNonEmptyString(flags["--fixture"], "--fixture");
    if (!fixtureIds.has(fixtureId)) throw new Error(`unknown fixture: ${fixtureId}`);
    return {
      command,
      fixtureId,
      label: requireNonEmptyString(flags["--label"], "--label"),
      outputRoot: requireAbsolute(flags["--output"], "--output"),
    };
  }

  const allowed = new Set(["--run"]);
  const unknown = Object.keys(flags).find((flag) => !allowed.has(flag));
  if (unknown) throw new Error(`unknown flag: ${unknown}`);
  return { command, runRoot: requireAbsolute(flags["--run"], "--run") };
}

export function loadFixture(pluginRoot, fixtureId) {
  if (!fixtureIds.has(fixtureId)) throw new Error(`unknown fixture: ${fixtureId}`);
  const fixturePath = path.join(
    path.resolve(pluginRoot),
    "evals/game-art-production",
    fixtureId,
    "fixture.json",
  );
  if (!fs.existsSync(fixturePath)) throw new Error(`missing fixture: ${fixtureId}`);
  const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
  if (fixture.id !== fixtureId) throw new Error(`fixture id mismatch: ${fixtureId}`);
  return fixture;
}

function normalizedRelativePath(root, entryPath) {
  return path.relative(root, entryPath).split(path.sep).join("/");
}

function walkFiles(root) {
  const files = [];
  const visit = (directory) => {
    for (const name of fs.readdirSync(directory).sort()) {
      const entryPath = path.join(directory, name);
      const stat = fs.lstatSync(entryPath);
      if (stat.isSymbolicLink()) throw new Error(`symbolic links are not supported: ${entryPath}`);
      if (stat.isDirectory()) visit(entryPath);
      else if (stat.isFile()) files.push(entryPath);
    }
  };
  visit(root);
  return files.sort((left, right) => {
    const leftRelative = normalizedRelativePath(root, left);
    const rightRelative = normalizedRelativePath(root, right);
    return leftRelative < rightRelative ? -1 : leftRelative > rightRelative ? 1 : 0;
  });
}

export function hashTree(root, excludedRelativePaths = []) {
  const resolvedRoot = path.resolve(root);
  if (!fs.existsSync(resolvedRoot) || !fs.statSync(resolvedRoot).isDirectory()) {
    throw new Error(`tree root is not a directory: ${resolvedRoot}`);
  }
  const excluded = new Set(excludedRelativePaths.map((entry) => entry.split(path.sep).join("/")));
  const hash = crypto.createHash("sha256");
  for (const file of walkFiles(resolvedRoot)) {
    const relative = normalizedRelativePath(resolvedRoot, file);
    if (excluded.has(relative)) continue;
    const content = fs.readFileSync(file);
    hash.update(`${Buffer.byteLength(relative)}:${relative}:${content.length}:`);
    hash.update(content);
  }
  return `sha256:${hash.digest("hex")}`;
}

function hashFile(file) {
  return `sha256:${crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex")}`;
}

function readJson(file, description) {
  if (!fs.existsSync(file)) throw new Error(`missing ${description}: ${file}`);
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    throw new Error(`invalid ${description}: ${error.message}`);
  }
}

function readTaskState(root) {
  const project = readJson(path.join(root, "production/project.json"), "project state");
  const fields = ["gate", "currentTask", "status", "nextAction"];
  return Object.fromEntries(fields.map((field) => [field, String(project[field] ?? "")]));
}

function sameRecord(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function assertOutputDirectory(outputRoot) {
  if (!fs.existsSync(outputRoot)) return;
  const stat = fs.statSync(outputRoot);
  if (!stat.isDirectory()) throw new Error(`output is not a directory: ${outputRoot}`);
  if (fs.readdirSync(outputRoot).length > 0) {
    throw new Error(`output directory is non-empty: ${outputRoot}`);
  }
}

export function prepareFixture({ pluginRoot, fixtureId, label, outputRoot }) {
  const resolvedPluginRoot = path.resolve(pluginRoot);
  const resolvedOutputRoot = requireEvalRunPath(resolvedPluginRoot, outputRoot, "outputRoot");
  requireNonEmptyString(label, "label");
  const fixture = loadFixture(resolvedPluginRoot, fixtureId);
  const fixtureDirectory = path.join(resolvedPluginRoot, "evals/game-art-production", fixtureId);
  const starterRoot = path.join(fixtureDirectory, "starter");
  if (!fs.existsSync(starterRoot)) throw new Error(`missing starter: ${fixtureId}`);
  assertOutputDirectory(resolvedOutputRoot);
  fs.mkdirSync(resolvedOutputRoot, { recursive: true });
  fs.cpSync(starterRoot, resolvedOutputRoot, { recursive: true });

  const sourceTreeHash = hashTree(starterRoot);
  const copiedTreeHash = hashTree(resolvedOutputRoot, controlFiles);
  if (sourceTreeHash !== copiedTreeHash) throw new Error("prepared starter does not match its source tree");
  const taskStateBefore = readTaskState(resolvedOutputRoot);
  const lock = {
    schemaVersion: 1,
    fixtureId,
    label,
    policyVersion: fixture.policyVersion,
    capabilities: fixture.capabilityProfile,
    fixtureDefinitionHash: hashFile(path.join(fixtureDirectory, "fixture.json")),
    sourceTreeHash,
    taskStateBefore,
  };
  const lockPath = path.join(resolvedOutputRoot, "fixture-lock.json");
  fs.writeFileSync(lockPath, `${JSON.stringify(lock, null, 2)}\n`, { flag: "wx" });
  fs.chmodSync(lockPath, 0o444);
  return lock;
}

function check(id, passed, evidence, blocked = false) {
  return {
    id,
    status: passed ? "Pass" : blocked ? "Blocked" : "Fail",
    evidence: Array.isArray(evidence) ? evidence : [evidence],
  };
}

function verifyRequiredArtifacts(runRoot, requiredArtifacts) {
  const evidence = [];
  let passed = true;
  for (const relative of requiredArtifacts) {
    const artifactPath = path.resolve(runRoot, relative);
    const insideRun = artifactPath.startsWith(`${runRoot}${path.sep}`);
    const exists = insideRun && fs.existsSync(artifactPath) && fs.statSync(artifactPath).isFile() && fs.statSync(artifactPath).size > 0;
    passed &&= exists;
    evidence.push(`${relative}: ${exists ? "present" : "missing or empty"}`);
  }
  return check("required-artifacts", passed, evidence);
}

function runLocalVerifier(runRoot, relativeVerifier) {
  if (!relativeVerifier) return null;
  const verifierPath = path.resolve(runRoot, relativeVerifier);
  if (!verifierPath.startsWith(`${runRoot}${path.sep}`) || !fs.existsSync(verifierPath)) {
    return check("local-state-verifier", false, `${relativeVerifier}: missing`);
  }
  const outcome = spawnSync(process.execPath, [verifierPath], {
    cwd: runRoot,
    encoding: "utf8",
    timeout: 30_000,
  });
  const output = `${outcome.stdout ?? ""}${outcome.stderr ?? ""}`.trim();
  return check(
    "local-state-verifier",
    outcome.status === 0,
    output || `verifier exited ${outcome.status}`,
    outcome.error?.code === "ETIMEDOUT",
  );
}

function validateObservation(observation) {
  if (observation.schemaVersion !== 1) throw new Error("observation schemaVersion must be 1");
  if (!Number.isInteger(observation.cycles) || observation.cycles < 0) throw new Error("observation cycles must be a non-negative integer");
  if (typeof observation.elapsedMinutes !== "number" || !Number.isFinite(observation.elapsedMinutes) || observation.elapsedMinutes < 0) {
    throw new Error("observation elapsedMinutes must be a non-negative number");
  }
  requireNonEmptyString(observation.terminalClaim, "observation terminalClaim");
}

export function verifyFixture({ pluginRoot, runRoot }) {
  const resolvedPluginRoot = path.resolve(pluginRoot);
  const resolvedRunRoot = requireEvalRunPath(resolvedPluginRoot, runRoot, "runRoot");
  const lock = readJson(path.join(resolvedRunRoot, "fixture-lock.json"), "fixture lock");
  const observation = readJson(path.join(resolvedRunRoot, "observation.json"), "observation");
  validateObservation(observation);
  const fixture = loadFixture(resolvedPluginRoot, lock.fixtureId);
  const fixtureDirectory = path.join(resolvedPluginRoot, "evals/game-art-production", lock.fixtureId);
  const starterRoot = path.join(fixtureDirectory, "starter");
  const currentSourceTreeHash = hashTree(starterRoot);
  const currentFixtureHash = hashFile(path.join(fixtureDirectory, "fixture.json"));
  const taskStateAfter = readTaskState(resolvedRunRoot);

  const objectiveChecks = [
    check(
      "source-lock",
      lock.sourceTreeHash === currentSourceTreeHash && lock.fixtureDefinitionHash === currentFixtureHash,
      [
        `starter tree: ${lock.sourceTreeHash === currentSourceTreeHash ? "matches lock" : "changed after prepare"}`,
        `fixture definition: ${lock.fixtureDefinitionHash === currentFixtureHash ? "matches lock" : "changed after prepare"}`,
      ],
    ),
    check(
      "task-state-claims",
      observation.sourceTreeHash === lock.sourceTreeHash &&
        sameRecord(observation.taskStateBefore, lock.taskStateBefore) &&
        sameRecord(observation.taskStateAfter, taskStateAfter),
      [
        `source claim: ${observation.sourceTreeHash === lock.sourceTreeHash ? "matches lock" : "mismatch"}`,
        `before claim: ${sameRecord(observation.taskStateBefore, lock.taskStateBefore) ? "matches lock" : "mismatch"}`,
        `after claim: ${sameRecord(observation.taskStateAfter, taskStateAfter) ? "matches repository" : "mismatch"}`,
      ],
    ),
    verifyRequiredArtifacts(resolvedRunRoot, fixture.requiredArtifacts),
  ];
  const localVerifier = runLocalVerifier(resolvedRunRoot, fixture.localVerifier);
  if (localVerifier) objectiveChecks.push(localVerifier);

  const prohibited = fixture.prohibitedClaims.filter((claim) =>
    observation.terminalClaim.toLocaleLowerCase("en-US").includes(claim.toLocaleLowerCase("en-US"))
  );
  objectiveChecks.push(check(
    "prohibited-claims",
    prohibited.length === 0,
    prohibited.length === 0 ? "terminal claim contains no prohibited artistic passage" : prohibited.map((claim) => `prohibited claim: ${claim}`),
  ));

  const result = {
    schemaVersion: 1,
    fixtureId: fixture.id,
    label: lock.label,
    policyVersion: fixture.policyVersion,
    capabilities: fixture.capabilityProfile,
    sourceTreeHash: lock.sourceTreeHash,
    outputTreeHash: hashTree(resolvedRunRoot, controlFiles),
    taskStateBefore: lock.taskStateBefore,
    taskStateAfter,
    loadedContext: {
      metadataWords: Number(observation.loadedContext?.metadataWords ?? 0),
      bodyWords: Number(observation.loadedContext?.bodyWords ?? 0),
      referenceWords: Number(observation.loadedContext?.referenceWords ?? 0),
      files: Array.isArray(observation.loadedContext?.files) ? observation.loadedContext.files.map(String) : [],
    },
    cycles: observation.cycles,
    elapsedMinutes: observation.elapsedMinutes,
    objectiveChecks,
    subjectiveReview: {
      status: "Pending",
      reviewerIndependence: "Unassessed",
      findings: [],
    },
    terminalClaim: observation.terminalClaim,
  };
  fs.writeFileSync(path.join(resolvedRunRoot, "result.json"), `${JSON.stringify(result, null, 2)}\n`);
  return result;
}

function runCli() {
  const parsed = parseFixtureArguments(process.argv.slice(2));
  const pluginRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const result = parsed.command === "prepare"
    ? prepareFixture({ pluginRoot, fixtureId: parsed.fixtureId, label: parsed.label, outputRoot: parsed.outputRoot })
    : verifyFixture({ pluginRoot, runRoot: parsed.runRoot });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    runCli();
  } catch (error) {
    process.stderr.write(`ERROR ${error.message}\n`);
    process.exitCode = 1;
  }
}
