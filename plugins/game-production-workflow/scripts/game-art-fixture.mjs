import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const fixtureIds = new Set(["design-direction", "composite-runtime"]);
const controlFiles = ["fixture-lock.json", "observation.json", "result.json"];
const taskStateFields = ["gate", "currentTask", "status", "nextAction"];
const sha256Pattern = /^sha256:[a-f0-9]{64}$/;
const declaredResultKeys = [
  "professionalResult", "representativeProof", "assemblyPrecheck", "taskResult",
  "nextAction", "nextActionKind", "designAcceptance", "producerAcceptance",
];
const resultValues = new Set(["Proposed", "Implemented", "Returned", "Blocked"]);
const proofValues = new Set(["Pending", "Passed", "Not applicable"]);
const taskResultValues = new Set(["Not started", "Proposed", "Implemented", "Returned", "Blocked"]);
const nextActionKinds = new Set([
  "produce-first-slice", "human-selection", "independent-review", "human-acceptance",
  "bounded-repair", "replan", "capability-enabling", "alternative-candidate", "stop",
]);
const acceptanceValues = new Set(["Pending", "Accepted", "Not applicable"]);

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

function comparisonPath(value) {
  return process.platform === "win32" ? value.toLocaleLowerCase("en-US") : value;
}

function isContainedPath(root, candidate) {
  const relative = path.relative(comparisonPath(root), comparisonPath(candidate));
  return relative.length > 0 && relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

function rejectSymlinkComponents(root, candidate, name) {
  const relative = path.relative(root, candidate);
  let current = root;
  for (const segment of relative.split(path.sep).filter(Boolean)) {
    current = path.join(current, segment);
    if (!fs.existsSync(current)) break;
    if (fs.lstatSync(current).isSymbolicLink()) throw new Error(`${name} contains a symbolic link: ${current}`);
  }
}

function evaluationRootFor(pluginRoot) {
  const repositoryRoot = path.resolve(pluginRoot, "../..");
  const evaluationRoot = path.join(repositoryRoot, ".tmp/game-art-evals");
  fs.mkdirSync(evaluationRoot, { recursive: true });
  rejectSymlinkComponents(repositoryRoot, evaluationRoot, "evaluation root");
  const canonicalRepositoryRoot = fs.realpathSync.native(repositoryRoot);
  const canonicalEvaluationRoot = fs.realpathSync.native(evaluationRoot);
  if (!isContainedPath(canonicalRepositoryRoot, canonicalEvaluationRoot)) {
    throw new Error("evaluation root resolves outside the repository");
  }
  return { lexical: evaluationRoot, canonical: canonicalEvaluationRoot };
}

function requireEvalRunPath(pluginRoot, value, name) {
  const resolved = requireAbsolute(value, name);
  const evaluationRoot = evaluationRootFor(pluginRoot);
  if (!isContainedPath(evaluationRoot.lexical, resolved)) {
    throw new Error(`${name} must be under ${evaluationRoot.lexical}`);
  }
  rejectSymlinkComponents(evaluationRoot.lexical, resolved, name);
  const relative = path.relative(evaluationRoot.lexical, resolved);
  const canonicalCandidate = path.resolve(evaluationRoot.canonical, relative);
  const reservedBindingNamespace = path.join(evaluationRoot.canonical, ".fixture-bindings");
  if (
    comparisonPath(canonicalCandidate) === comparisonPath(reservedBindingNamespace) ||
    isContainedPath(reservedBindingNamespace, canonicalCandidate)
  ) {
    throw new Error(`${name} uses the reserved trusted binding namespace`);
  }
  if (!isContainedPath(evaluationRoot.canonical, canonicalCandidate)) {
    throw new Error(`${name} resolves outside ${evaluationRoot.canonical}`);
  }
  if (fs.existsSync(resolved)) {
    const canonicalExisting = fs.realpathSync.native(resolved);
    if (!isContainedPath(evaluationRoot.canonical, canonicalExisting)) {
      throw new Error(`${name} resolves outside ${evaluationRoot.canonical}`);
    }
    return canonicalExisting;
  }
  return canonicalCandidate;
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
  if (!fs.existsSync(resolvedRoot) || fs.lstatSync(resolvedRoot).isSymbolicLink() || !fs.statSync(resolvedRoot).isDirectory()) {
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

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function sameValue(left, right) {
  return stableJson(left) === stableJson(right);
}

function trustedBindingRoot(pluginRoot) {
  const evaluationRoot = evaluationRootFor(pluginRoot);
  const root = path.join(evaluationRoot.lexical, ".fixture-bindings");
  try {
    const stat = fs.lstatSync(root);
    if (stat.isSymbolicLink()) throw new Error(`trusted binding root contains a symbolic link: ${root}`);
    if (!stat.isDirectory()) throw new Error(`trusted binding root is not a directory: ${root}`);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    fs.mkdirSync(root);
  }
  const canonicalRoot = fs.realpathSync.native(root);
  if (!isContainedPath(evaluationRoot.canonical, canonicalRoot)) {
    throw new Error("trusted binding root resolves outside the evaluation root");
  }
  return canonicalRoot;
}

function bindingPath(pluginRoot, runRoot) {
  const identity = process.platform === "win32" ? runRoot.toLocaleLowerCase("en-US") : runRoot;
  const key = crypto.createHash("sha256").update(identity).digest("hex");
  const file = path.join(trustedBindingRoot(pluginRoot), `${key}.json`);
  try {
    if (fs.lstatSync(file).isSymbolicLink()) throw new Error(`trusted binding contains a symbolic link: ${file}`);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  return file;
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
  return Object.fromEntries(taskStateFields.map((field) => [field, String(project[field] ?? "")]));
}

function sameRecord(left, right) {
  return taskStateFields.every((field) => left[field] === right[field]);
}

function validateTaskState(value, name) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${name} must be a task-state object`);
  }
  const keys = Object.keys(value).sort();
  const expectedKeys = [...taskStateFields].sort();
  if (keys.length !== expectedKeys.length || keys.some((key, index) => key !== expectedKeys[index])) {
    throw new Error(`${name} must contain exactly ${taskStateFields.join(", ")}`);
  }
  for (const field of taskStateFields) {
    if (typeof value[field] !== "string") throw new Error(`${name}.${field} must be a string`);
  }
}

function validateCapabilities(value, name) {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).length === 0) {
    throw new Error(`${name} must be a non-empty object`);
  }
  for (const [key, capability] of Object.entries(value)) {
    if (key.length === 0 || !["string", "boolean"].includes(typeof capability)) {
      throw new Error(`${name} values must be strings or booleans`);
    }
  }
}

function validateExactKeys(value, expected, name) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${name} must be an object`);
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    throw new Error(`${name} has an invalid schema`);
  }
}

function validateDeclaredResult(value) {
  validateExactKeys(value, declaredResultKeys, "observation declaredResult");
  for (const [field, allowed] of [
    ["professionalResult", resultValues],
    ["representativeProof", proofValues],
    ["assemblyPrecheck", proofValues],
    ["taskResult", taskResultValues],
    ["nextActionKind", nextActionKinds],
    ["designAcceptance", acceptanceValues],
    ["producerAcceptance", acceptanceValues],
  ]) {
    if (!allowed.has(value[field])) {
      throw new Error(`observation declaredResult.${field} is invalid`);
    }
  }
  requireNonEmptyString(value.nextAction, "observation declaredResult.nextAction");
}

function extractDeclaredResult(observation) {
  const hasTopLevelLegacy = Object.hasOwn(observation, "professionalResult");
  const hasNestedLegacy = Boolean(
    observation.result &&
    typeof observation.result === "object" &&
    !Array.isArray(observation.result) &&
    Object.hasOwn(observation.result, "professionalResult"),
  );

  if (observation.schemaVersion === 2) {
    if (hasTopLevelLegacy || hasNestedLegacy) {
      throw new Error("observation schemaVersion 2 permits only declaredResult; legacy professionalResult fields are forbidden");
    }
    if (!observation.declaredResult) {
      throw new Error("observation schemaVersion 2 requires declaredResult");
    }
    validateDeclaredResult(observation.declaredResult);
    return { value: observation.declaredResult, complete: true };
  }

  if (Object.hasOwn(observation, "declaredResult")) {
    throw new Error("observation schemaVersion 1 must not contain declaredResult");
  }

  if (hasTopLevelLegacy && hasNestedLegacy) {
    throw new Error("observation schemaVersion 1 permits only one legacy professionalResult declaration");
  }
  if (!hasTopLevelLegacy && !hasNestedLegacy) return null;

  const legacyValue = hasTopLevelLegacy
    ? observation.professionalResult
    : observation.result.professionalResult;
  if (!resultValues.has(legacyValue)) {
    throw new Error("legacy observation professionalResult is invalid");
  }
  return { value: { professionalResult: legacyValue }, complete: false };
}

function unquoteTaskValue(value) {
  const trimmed = value.trim();
  const quoted = trimmed.match(/^`([\s\S]*)`$/u);
  return quoted ? quoted[1].trim() : trimmed;
}

function readTaskHandoff(runRoot) {
  const taskPath = path.join(runRoot, "production/TASK.md");
  const task = fs.readFileSync(taskPath, "utf8");
  const labels = {
    status: "Status",
    representativeProof: "Representative proof",
    assemblyPrecheck: "Assembly precheck",
    taskResult: "Result",
    nextAction: "Next action",
    designAcceptance: "Design acceptance",
    producerAcceptance: "Producer acceptance",
  };
  return Object.fromEntries(Object.entries(labels).map(([field, label]) => {
    const prefix = `- ${label}:`;
    const matches = task.split(/\r?\n/u).filter((line) => line.startsWith(prefix));
    if (matches.length !== 1) {
      throw new Error(`production/TASK.md must contain exactly one ${label} field`);
    }
    return [field, unquoteTaskValue(matches[0].slice(prefix.length))];
  }));
}

function classifyTaskValue(value, rules, name) {
  const normalized = value.trim().toLocaleLowerCase("en-US");
  const match = rules.find(([, pattern]) => pattern.test(normalized));
  if (!match) throw new Error(`production/TASK.md ${name} has no supported semantic value`);
  return match[0];
}

function classifyProof(value, name) {
  return classifyTaskValue(value, [
    ["Not applicable", /^not applicable(?:\b|:|\s|$)/u],
    ["Pending", /^pending(?:\b|:|\s|$)/u],
    ["Passed", /^(?:passed|accepted)(?:\b|:|\s|$)/u],
  ], name);
}

function classifyTaskResult(value) {
  return classifyTaskValue(value, [
    ["Not started", /^not started(?:\b|:|\s|$)/u],
    ["Proposed", /^proposed(?:\b|:|\s|$)/u],
    ["Implemented", /^(?:implemented|candidate implemented)(?:\b|:|\s|$)/u],
    ["Returned", /^(?:returned|candidate returned)(?:\b|:|\s|$)/u],
    ["Blocked", /^blocked(?:\b|:|\s|$)/u],
  ], "Result");
}

function classifyAcceptance(value, name) {
  return classifyTaskValue(value, [
    ["Not applicable", /^not applicable(?:\b|:|\s|$)/u],
    ["Pending", /^pending(?:\b|:|\s|$)/u],
    ["Accepted", /^(?:accepted|pass|passed)(?:\b|:|\s|$)/u],
  ], name);
}

function isPreProductionNextAction(value) {
  const normalized = value.trim().toLocaleLowerCase("en-US").replace(/\s+/gu, " ");
  return /^(?:assemble|build|create|implement|make|produce|render)\b.*\b(?:first|initial)\b.*\b(?:candidate|slice)\b/u.test(normalized);
}

function validateLifecycleHandoff(runRoot, observation, taskStateAfter) {
  const declaration = extractDeclaredResult(observation);
  if (!declaration) return null;

  const task = readTaskHandoff(runRoot);
  if (task.status !== taskStateAfter.status) {
    throw new Error("lifecycle handoff TASK Status must match taskStateAfter.status");
  }
  if (task.nextAction !== taskStateAfter.nextAction) {
    throw new Error("lifecycle handoff TASK Next action must match project state");
  }

  const durable = {
    representativeProof: classifyProof(task.representativeProof, "Representative proof"),
    assemblyPrecheck: classifyProof(task.assemblyPrecheck, "Assembly precheck"),
    taskResult: classifyTaskResult(task.taskResult),
    designAcceptance: classifyAcceptance(task.designAcceptance, "Design acceptance"),
    producerAcceptance: classifyAcceptance(task.producerAcceptance, "Producer acceptance"),
  };

  if (declaration.complete) {
    for (const field of [
      "representativeProof", "assemblyPrecheck", "taskResult",
      "designAcceptance", "producerAcceptance",
    ]) {
      if (declaration.value[field] !== durable[field]) {
        throw new Error(`lifecycle handoff declared ${field} does not match production/TASK.md`);
      }
    }
    if (declaration.value.nextAction !== task.nextAction) {
      throw new Error("lifecycle handoff declared nextAction must match TASK and project state");
    }
  }

  if (
    !declaration.complete &&
    ["Implemented", "Proposed"].includes(declaration.value.professionalResult) &&
    isPreProductionNextAction(task.nextAction)
  ) {
    throw new Error(`${declaration.value.professionalResult} professional result cannot retain a pre-production Next action`);
  }

  if (declaration.value.professionalResult === "Implemented") {
    if (taskStateAfter.status !== "Implementing") {
      throw new Error("Implemented professional result requires Implementing task status");
    }
    if (durable.taskResult === "Not started") {
      throw new Error("Implemented professional result cannot retain task Result Not started");
    }
    if (durable.taskResult !== "Implemented") {
      throw new Error("Implemented professional result requires an Implemented task Result");
    }
    if (durable.representativeProof !== "Passed") {
      throw new Error("Implemented professional result requires representative proof Passed");
    }
    if (durable.assemblyPrecheck !== "Passed") {
      throw new Error("Implemented professional result requires assembly precheck Passed");
    }
    if (
      declaration.complete &&
      !new Set([
        "independent-review", "human-acceptance", "bounded-repair", "stop",
      ]).has(declaration.value.nextActionKind)
    ) {
      throw new Error("Implemented professional result next action kind must be post-production");
    }
  }

  if (declaration.value.professionalResult === "Proposed") {
    if (taskStateAfter.status !== "Clarifying") {
      throw new Error("Proposed professional result requires Clarifying task status");
    }
    if (durable.taskResult !== "Proposed") {
      throw new Error("Proposed professional result requires task Result Proposed");
    }
  }

  return {
    declaredResult: declaration.complete ? declaration.value : undefined,
    evidence: [
      `professional result: ${declaration.value.professionalResult}`,
      `task status: ${taskStateAfter.status}`,
      `task result: ${durable.taskResult}`,
      `representative proof: ${durable.representativeProof}`,
      `assembly precheck: ${durable.assemblyPrecheck}`,
      `design acceptance: ${durable.designAcceptance}`,
      `producer acceptance: ${durable.producerAcceptance}`,
    ],
  };
}

function validateLock(lock) {
  validateExactKeys(lock, [
    "schemaVersion", "fixtureId", "label", "policyVersion", "capabilities",
    "fixtureDefinitionHash", "sourceTreeHash", "taskStateBefore",
  ], "fixture lock");
  if (lock.schemaVersion !== 1) throw new Error("fixture lock schemaVersion must be 1");
  if (!fixtureIds.has(lock.fixtureId)) throw new Error("fixture lock fixtureId is invalid");
  requireNonEmptyString(lock.label, "fixture lock label");
  requireNonEmptyString(lock.policyVersion, "fixture lock policyVersion");
  validateCapabilities(lock.capabilities, "fixture lock capabilities");
  if (!sha256Pattern.test(lock.fixtureDefinitionHash)) throw new Error("fixture lock fixtureDefinitionHash is invalid");
  if (!sha256Pattern.test(lock.sourceTreeHash)) throw new Error("fixture lock sourceTreeHash is invalid");
  validateTaskState(lock.taskStateBefore, "fixture lock taskStateBefore");
}

function validateBinding(binding) {
  validateExactKeys(binding, ["schemaVersion", "canonicalRunRoot", "lockHash"], "trusted binding");
  if (binding.schemaVersion !== 1) throw new Error("trusted binding schemaVersion must be 1");
  requireAbsolute(binding.canonicalRunRoot, "trusted binding canonicalRunRoot");
  if (!sha256Pattern.test(binding.lockHash)) throw new Error("trusted binding lockHash is invalid");
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
  const trustedBindingPath = bindingPath(resolvedPluginRoot, resolvedOutputRoot);
  if (fs.existsSync(trustedBindingPath)) throw new Error(`trusted binding already exists for outputRoot: ${resolvedOutputRoot}`);
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
  fs.mkdirSync(path.dirname(trustedBindingPath), { recursive: true });
  fs.writeFileSync(trustedBindingPath, `${JSON.stringify({
    schemaVersion: 1,
    canonicalRunRoot: resolvedOutputRoot,
    lockHash: hashFile(lockPath),
  }, null, 2)}\n`, { flag: "wx" });
  fs.chmodSync(trustedBindingPath, 0o444);
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

function inspectRunFile(runRoot, relative, description) {
  if (typeof relative !== "string" || path.isAbsolute(relative)) return { ok: false, evidence: `${description}: invalid relative path` };
  const file = path.resolve(runRoot, relative);
  if (!isContainedPath(runRoot, file)) return { ok: false, evidence: `${description}: outside run root` };
  try {
    rejectSymlinkComponents(runRoot, file, description);
  } catch (error) {
    return { ok: false, evidence: error.message };
  }
  if (!fs.existsSync(file) || !fs.lstatSync(file).isFile()) return { ok: false, evidence: `${description}: missing or not a regular file` };
  return { ok: true, file };
}

function runTrustedVerifier(pluginRoot, fixtureDirectory, runRoot, fixture) {
  if (!fixture.trustedVerifier) return null;
  for (const [relative, description] of [
    [fixture.localVerifier, "run-local verifier input"],
    ["web/state.mjs", "authoritative state input"],
  ]) {
    const runInput = inspectRunFile(runRoot, relative, description);
    if (!runInput.ok) return check("local-state-verifier", false, runInput.evidence);
    const committedInput = path.resolve(fixtureDirectory, "starter", relative);
    if (!fs.existsSync(committedInput) || fs.lstatSync(committedInput).isSymbolicLink() || hashFile(runInput.file) !== hashFile(committedInput)) {
      return check("local-state-verifier", false, `${description} differs from the committed fixture`);
    }
  }

  const trustedVerifier = path.resolve(pluginRoot, fixture.trustedVerifier);
  if (!isContainedPath(pluginRoot, trustedVerifier) || !fs.existsSync(trustedVerifier) || fs.lstatSync(trustedVerifier).isSymbolicLink()) {
    return check("local-state-verifier", false, "trusted harness verifier is missing or invalid");
  }
  const outcome = spawnSync(process.execPath, [trustedVerifier, runRoot], {
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
  if (![1, 2].includes(observation.schemaVersion)) {
    throw new Error("observation schemaVersion must be 1 or 2");
  }
  if (!sha256Pattern.test(observation.sourceTreeHash)) throw new Error("observation sourceTreeHash must be a SHA-256 value");
  if (!sha256Pattern.test(observation.outputTreeHash)) throw new Error("observation outputTreeHash must be a SHA-256 value");
  if (!Number.isInteger(observation.cycles) || observation.cycles < 0) throw new Error("observation cycles must be a non-negative integer");
  if (typeof observation.elapsedMinutes !== "number" || !Number.isFinite(observation.elapsedMinutes) || observation.elapsedMinutes < 0) {
    throw new Error("observation elapsedMinutes must be a non-negative number");
  }
  if (!observation.loadedContext || typeof observation.loadedContext !== "object" || Array.isArray(observation.loadedContext)) {
    throw new Error("observation loadedContext must be an object");
  }
  for (const field of ["metadataWords", "bodyWords", "referenceWords"]) {
    const value = observation.loadedContext[field];
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
      throw new Error(`observation loadedContext.${field} must be a finite non-negative number`);
    }
  }
  if (!Array.isArray(observation.loadedContext.files) || !observation.loadedContext.files.every((file) => typeof file === "string")) {
    throw new Error("observation loadedContext.files must be a string array");
  }
  validateTaskState(observation.taskStateBefore, "observation taskStateBefore");
  validateTaskState(observation.taskStateAfter, "observation taskStateAfter");
  requireNonEmptyString(observation.terminalClaim, "observation terminalClaim");
  extractDeclaredResult(observation);
}

export function verifyFixture({ pluginRoot, runRoot }) {
  const resolvedPluginRoot = path.resolve(pluginRoot);
  const resolvedRunRoot = requireEvalRunPath(resolvedPluginRoot, runRoot, "runRoot");
  const lockInput = inspectRunFile(resolvedRunRoot, "fixture-lock.json", "fixture lock");
  if (!lockInput.ok) throw new Error(lockInput.evidence);
  const lock = readJson(lockInput.file, "fixture lock");
  validateLock(lock);
  const trustedBinding = readJson(bindingPath(resolvedPluginRoot, resolvedRunRoot), "trusted binding");
  validateBinding(trustedBinding);
  if (trustedBinding.canonicalRunRoot !== resolvedRunRoot || trustedBinding.lockHash !== hashFile(path.join(resolvedRunRoot, "fixture-lock.json"))) {
    throw new Error("fixture lock does not match its trusted binding");
  }
  const observationInput = inspectRunFile(resolvedRunRoot, "observation.json", "observation");
  if (!observationInput.ok) throw new Error(observationInput.evidence);
  const observation = readJson(observationInput.file, "observation");
  validateObservation(observation);
  const fixture = loadFixture(resolvedPluginRoot, lock.fixtureId);
  const fixtureDirectory = path.join(resolvedPluginRoot, "evals/game-art-production", lock.fixtureId);
  const starterRoot = path.join(fixtureDirectory, "starter");
  const currentSourceTreeHash = hashTree(starterRoot);
  const currentFixtureHash = hashFile(path.join(fixtureDirectory, "fixture.json"));
  const expectedLock = {
    schemaVersion: 1,
    fixtureId: fixture.id,
    label: lock.label,
    policyVersion: fixture.policyVersion,
    capabilities: fixture.capabilityProfile,
    fixtureDefinitionHash: currentFixtureHash,
    sourceTreeHash: currentSourceTreeHash,
    taskStateBefore: readTaskState(starterRoot),
  };
  if (!sameValue(lock, expectedLock)) throw new Error("fixture lock does not match the committed fixture and starter");
  const localVerifier = runTrustedVerifier(resolvedPluginRoot, fixtureDirectory, resolvedRunRoot, fixture);
  const taskStateAfter = readTaskState(resolvedRunRoot);
  const lifecycleHandoff = validateLifecycleHandoff(
    resolvedRunRoot,
    observation,
    taskStateAfter,
  );
  const currentOutputTreeHash = hashTree(resolvedRunRoot, controlFiles);

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
    check(
      "output-tree-claim",
      observation.outputTreeHash === currentOutputTreeHash,
      `output tree: ${observation.outputTreeHash === currentOutputTreeHash ? "matches observation" : "changed after observation"}`,
    ),
  ];
  if (localVerifier) objectiveChecks.push(localVerifier);
  if (lifecycleHandoff) {
    objectiveChecks.push(check("lifecycle-handoff", true, lifecycleHandoff.evidence));
  }

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
    outputTreeHash: currentOutputTreeHash,
    taskStateBefore: lock.taskStateBefore,
    taskStateAfter,
    ...(lifecycleHandoff?.declaredResult
      ? { declaredResult: lifecycleHandoff.declaredResult }
      : {}),
    loadedContext: {
      metadataWords: observation.loadedContext.metadataWords,
      bodyWords: observation.loadedContext.bodyWords,
      referenceWords: observation.loadedContext.referenceWords,
      files: [...observation.loadedContext.files],
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
