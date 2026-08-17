import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  aggregateLoadedContext,
  buildObservationTemplate,
  hashTree,
  observationContractPath,
  observationControlFiles,
  observationHelperPath,
  observationTemplatePath,
  publicObservationContract,
  sameContractValue,
  validateObservationV2,
} from "./game-art-observation-contract.mjs";

export { hashTree };

const fixtureIds = new Set(["design-direction", "composite-runtime"]);
const controlFiles = observationControlFiles;
const taskStateFields = ["gate", "currentTask", "status", "nextAction"];
const sha256Pattern = /^sha256:[a-f0-9]{64}$/;
const resultValues = new Set(["Proposed", "Implemented", "Returned", "Blocked"]);
const actionKindRequirements = new Map([
  ["Proposed", "human-selection, bounded-repair, or stop"],
  ["Implemented", "post-production"],
  ["Returned", "bounded-repair, replan, capability-enabling, alternative-candidate, or stop"],
  ["Blocked", "replan, capability-enabling, alternative-candidate, or stop"],
]);
const auditedLegacyNextActions = new Map([
  ["Implemented", new Set([
    "Have the named independent reviewer inspect the running 1280×720 experience and record design/producer decisions without treating deterministic checks as artistic passage.",
  ])],
  ["Proposed", new Set([
    "Human producer reviews the three candidate desktop captures and recommended portrait overflow capture, then selects, returns, or bounds one direction.",
  ])],
]);
const resultContractPointer = `${observationContractPath}#resultContract`;

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
  if (fixture.observationContract !== observationContractPath) {
    throw new Error(`fixture observationContract must point to ${observationContractPath}`);
  }
  return fixture;
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

function validateDeclaredResult(value, resultContract) {
  try {
    validateExactKeys(value, resultContract.requiredKeys, "observation declaredResult");
  } catch (error) {
    throw new Error(`${error.message}; see ${resultContractPointer}`);
  }
  for (const [field, allowed] of Object.entries(resultContract.enums)) {
    if (!allowed.includes(value[field])) {
      throw new Error(`observation declaredResult.${field} is invalid; see ${resultContractPointer}`);
    }
  }
  for (const field of resultContract.stringFields) {
    try {
      requireNonEmptyString(value[field], `observation declaredResult.${field}`);
    } catch (error) {
      throw new Error(`${error.message}; see ${resultContractPointer}`);
    }
  }
}

function extractDeclaredResult(observation, resultContract) {
  const hasTopLevelLegacy = Object.hasOwn(observation, "professionalResult");
  const hasNestedLegacy = Boolean(
    observation.result &&
    typeof observation.result === "object" &&
    !Array.isArray(observation.result) &&
    Object.hasOwn(observation.result, "professionalResult"),
  );

  if (observation.schemaVersion === 2) {
    if (hasTopLevelLegacy || hasNestedLegacy) {
      throw new Error(`observation schemaVersion 2 permits only declaredResult; legacy professionalResult fields are forbidden; see ${resultContractPointer}`);
    }
    if (!observation.declaredResult) {
      throw new Error(`observation schemaVersion 2 requires declaredResult; see ${resultContractPointer}`);
    }
    validateDeclaredResult(observation.declaredResult, resultContract);
    return { value: observation.declaredResult, complete: true };
  }

  if (Object.hasOwn(observation, "declaredResult")) {
    throw new Error(`observation schemaVersion 1 must not contain declaredResult; see ${resultContractPointer}`);
  }

  if (hasTopLevelLegacy && hasNestedLegacy) {
    throw new Error(`observation schemaVersion 1 permits only one legacy professionalResult declaration; see ${resultContractPointer}`);
  }
  if (!hasTopLevelLegacy && !hasNestedLegacy) return null;

  const legacyValue = hasTopLevelLegacy
    ? observation.professionalResult
    : observation.result.professionalResult;
  if (!resultValues.has(legacyValue)) {
    throw new Error(`legacy observation professionalResult is invalid; see ${resultContractPointer}`);
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
    ...Object.fromEntries(Object.entries(
      publicObservationContract.resultContract.lifecycle.durableTaskFields,
    ).map(([field, contract]) => [field, contract.taskLabel])),
    nextAction: "Next action",
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

function classifyTaskValue(value, rules, name, canonicalOnly = false) {
  const normalized = value.trim().toLocaleLowerCase("en-US");
  const match = rules.find(([, pattern]) => pattern.test(normalized));
  if (!match) {
    const requirement = canonicalOnly ? "must begin with an exact canonical semantic prefix" : "has no supported semantic value";
    throw new Error(`production/TASK.md ${name} ${requirement}; see ${resultContractPointer}`);
  }
  return match[0];
}

function canonicalDurableRules(field) {
  const contract = publicObservationContract.resultContract.lifecycle.durableTaskFields[field];
  return Object.entries(contract.prefixes).map(([semanticValue, token]) => {
    const escaped = token.toLocaleLowerCase("en-US").replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
    return [semanticValue, new RegExp(`^${escaped}(?:\\b|:|\\s|$)`, "u")];
  });
}

function classifyProof(value, name, field, allowLegacyAliases) {
  return classifyTaskValue(value, [
    ...canonicalDurableRules(field),
    ...(allowLegacyAliases ? [["Passed", /^accepted(?:\b|:|\s|$)/u]] : []),
  ], name, !allowLegacyAliases);
}

function classifyTaskResult(value, allowLegacyAliases) {
  return classifyTaskValue(value, [
    ...canonicalDurableRules("taskResult"),
    ...(allowLegacyAliases ? [
      ["Implemented", /^candidate implemented(?:\b|:|\s|$)/u],
      ["Returned", /^candidate returned(?:\b|:|\s|$)/u],
    ] : []),
  ], "Result", !allowLegacyAliases);
}

function classifyAcceptance(value, name, field, allowLegacyAliases) {
  return classifyTaskValue(value, [
    ...canonicalDurableRules(field),
    ...(allowLegacyAliases ? [["Accepted", /^(?:pass|passed)(?:\b|:|\s|$)/u]] : []),
  ], name, !allowLegacyAliases);
}

function validateLifecycleHandoff(runRoot, observation, taskStateAfter, resultContract) {
  const declaration = extractDeclaredResult(observation, resultContract);
  if (!declaration) return null;

  const task = readTaskHandoff(runRoot);
  if (task.status !== taskStateAfter.status) {
    throw new Error(`lifecycle handoff TASK Status must match taskStateAfter.status; see ${resultContractPointer}`);
  }
  if (task.nextAction !== taskStateAfter.nextAction) {
    throw new Error(`lifecycle handoff TASK Next action must match project state; see ${resultContractPointer}`);
  }

  const allowLegacyAliases = !declaration.complete;
  const durable = {
    representativeProof: classifyProof(task.representativeProof, "Representative proof", "representativeProof", allowLegacyAliases),
    assemblyPrecheck: classifyProof(task.assemblyPrecheck, "Assembly precheck", "assemblyPrecheck", allowLegacyAliases),
    taskResult: classifyTaskResult(task.taskResult, allowLegacyAliases),
    designAcceptance: classifyAcceptance(task.designAcceptance, "Design acceptance", "designAcceptance", allowLegacyAliases),
    producerAcceptance: classifyAcceptance(task.producerAcceptance, "Producer acceptance", "producerAcceptance", allowLegacyAliases),
  };

  if (declaration.complete) {
    for (const field of resultContract.lifecycle.durableEqualityFields) {
      if (declaration.value[field] !== durable[field]) {
        throw new Error(`lifecycle handoff declared ${field} does not match production/TASK.md; see ${resultContractPointer}`);
      }
    }
    if (declaration.value.nextAction !== task.nextAction) {
      throw new Error(`lifecycle handoff declared nextAction must match TASK and project state; see ${resultContractPointer}`);
    }
    const lifecycleRow = resultContract.lifecycle.byProfessionalResult[
      declaration.value.professionalResult
    ];
    if (!lifecycleRow.nextActionKinds.includes(declaration.value.nextActionKind)) {
      const requirement = actionKindRequirements.get(declaration.value.professionalResult);
      throw new Error(`${declaration.value.professionalResult} professional result next action kind must be ${requirement}; see ${resultContractPointer}`);
    }
  } else {
    const allowedActions = auditedLegacyNextActions.get(
      declaration.value.professionalResult,
    );
    if (!allowedActions?.has(task.nextAction)) {
      throw new Error(`observation schemaVersion 1 professionalResult requires an audited legacy Next action; migrate to schemaVersion 2; see ${resultContractPointer}`);
    }
  }

  const lifecycleRow = resultContract.lifecycle.byProfessionalResult[
    declaration.value.professionalResult
  ];
  const requirements = [
    ["task status", taskStateAfter.status, lifecycleRow.taskStatuses],
    ["task Result", durable.taskResult, lifecycleRow.taskResults],
    ...Object.entries(resultContract.lifecycle.defaultAllowedFields).map(([field, defaults]) => [
      field.replace(/[A-Z]/gu, (character) => ` ${character.toLocaleLowerCase("en-US")}`),
      durable[field],
      lifecycleRow.fieldOverrides[field] ?? defaults,
    ]),
  ];
  for (const [label, actual, allowed] of requirements) {
    if (!allowed.includes(actual)) {
      const expected = allowed.length === 1 ? allowed[0] : `one of ${allowed.join(", ")}`;
      throw new Error(`${declaration.value.professionalResult} professional result requires ${label} ${expected}; got ${actual}; see ${resultContractPointer}`);
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
    "fixtureDefinitionHash", "sourceTreeHash", "taskStateBefore", "observationGuidance",
  ], "fixture lock");
  if (lock.schemaVersion !== 1) throw new Error("fixture lock schemaVersion must be 1");
  if (!fixtureIds.has(lock.fixtureId)) throw new Error("fixture lock fixtureId is invalid");
  requireNonEmptyString(lock.label, "fixture lock label");
  requireNonEmptyString(lock.policyVersion, "fixture lock policyVersion");
  validateCapabilities(lock.capabilities, "fixture lock capabilities");
  if (!sha256Pattern.test(lock.fixtureDefinitionHash)) throw new Error("fixture lock fixtureDefinitionHash is invalid");
  if (!sha256Pattern.test(lock.sourceTreeHash)) throw new Error("fixture lock sourceTreeHash is invalid");
  validateTaskState(lock.taskStateBefore, "fixture lock taskStateBefore");
  validateObservationGuidanceIdentity(lock.observationGuidance);
}

function validateBinding(binding) {
  validateExactKeys(binding, ["schemaVersion", "canonicalRunRoot", "lockHash"], "trusted binding");
  if (binding.schemaVersion !== 1) throw new Error("trusted binding schemaVersion must be 1");
  requireAbsolute(binding.canonicalRunRoot, "trusted binding canonicalRunRoot");
  if (!sha256Pattern.test(binding.lockHash)) throw new Error("trusted binding lockHash is invalid");
}

function canonicalObservationHelper(pluginRoot) {
  const helper = path.resolve(pluginRoot, "scripts/game-art-observation-contract.mjs");
  if (!isContainedPath(pluginRoot, helper) || !fs.existsSync(helper) || fs.lstatSync(helper).isSymbolicLink() || !fs.lstatSync(helper).isFile()) {
    throw new Error("canonical observation helper is missing or invalid");
  }
  return helper;
}

function observationGuidanceIdentity(runRoot) {
  return {
    contractPath: observationContractPath,
    contractHash: hashFile(path.join(runRoot, observationContractPath)),
    templatePath: observationTemplatePath,
    templateHash: hashFile(path.join(runRoot, observationTemplatePath)),
    helperPath: observationHelperPath,
    helperHash: hashFile(path.join(runRoot, observationHelperPath)),
  };
}

function validateObservationGuidanceIdentity(value) {
  validateExactKeys(value, [
    "contractPath", "contractHash", "templatePath", "templateHash", "helperPath", "helperHash",
  ], "fixture lock observationGuidance");
  const expectedPaths = {
    contractPath: observationContractPath,
    templatePath: observationTemplatePath,
    helperPath: observationHelperPath,
  };
  for (const [field, expected] of Object.entries(expectedPaths)) {
    if (value[field] !== expected) throw new Error(`fixture lock observationGuidance.${field} must be ${expected}`);
  }
  for (const field of ["contractHash", "templateHash", "helperHash"]) {
    if (!sha256Pattern.test(value[field])) throw new Error(`fixture lock observationGuidance.${field} is invalid`);
  }
}

function validatePreparedObservationGuidance(pluginRoot, runRoot, lock) {
  const inputs = {};
  for (const [field, relative] of [
    ["contract", observationContractPath],
    ["template", observationTemplatePath],
    ["helper", observationHelperPath],
  ]) {
    const inspected = inspectRunFile(runRoot, relative, `worker-visible observation ${field}`);
    if (!inspected.ok) throw new Error(`${inspected.evidence}; see ${observationContractPath}`);
    inputs[field] = inspected.file;
  }

  const actualIdentity = observationGuidanceIdentity(runRoot);
  if (!sameValue(actualIdentity, lock.observationGuidance)) {
    throw new Error(`worker-visible observation contract/template/helper drifted from fixture lock; see ${observationContractPath}`);
  }

  const expectedContractText = `${JSON.stringify(publicObservationContract, null, 2)}\n`;
  if (fs.readFileSync(inputs.contract, "utf8") !== expectedContractText) {
    throw new Error(`worker-visible observation contract drifted from the verifier's canonical contract; see ${observationContractPath}`);
  }
  const expectedTemplate = buildObservationTemplate({
    fixtureId: lock.fixtureId,
    sourceTreeHash: lock.sourceTreeHash,
    taskStateBefore: lock.taskStateBefore,
  });
  const actualTemplate = readJson(inputs.template, "worker-visible observation template");
  if (!sameContractValue(actualTemplate, expectedTemplate)) {
    throw new Error(`worker-visible observation template drifted from the canonical fixture template; see ${observationTemplatePath}`);
  }
  try {
    validateObservationV2(actualTemplate);
  } catch (error) {
    throw new Error(`worker-visible observation template is invalid: ${error.message}; see ${observationContractPath}`);
  }

  const canonicalHelper = canonicalObservationHelper(pluginRoot);
  if (hashFile(inputs.helper) !== hashFile(canonicalHelper)) {
    throw new Error(`worker-visible observation helper drifted from the canonical helper; see ${observationHelperPath}`);
  }
  return actualIdentity;
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
  const guidanceRoot = path.join(resolvedOutputRoot, path.dirname(observationContractPath));
  fs.mkdirSync(guidanceRoot);
  const contractPath = path.join(resolvedOutputRoot, observationContractPath);
  const templatePath = path.join(resolvedOutputRoot, observationTemplatePath);
  const helperPath = path.join(resolvedOutputRoot, observationHelperPath);
  fs.writeFileSync(contractPath, `${JSON.stringify(publicObservationContract, null, 2)}\n`, { flag: "wx" });
  fs.writeFileSync(templatePath, `${JSON.stringify(buildObservationTemplate({
    fixtureId,
    sourceTreeHash,
    taskStateBefore,
  }), null, 2)}\n`, { flag: "wx" });
  fs.copyFileSync(canonicalObservationHelper(resolvedPluginRoot), helperPath, fs.constants.COPYFILE_EXCL);
  for (const file of [contractPath, templatePath, helperPath]) fs.chmodSync(file, 0o444);
  const lock = {
    schemaVersion: 1,
    fixtureId,
    label,
    policyVersion: fixture.policyVersion,
    capabilities: fixture.capabilityProfile,
    fixtureDefinitionHash: hashFile(path.join(fixtureDirectory, "fixture.json")),
    sourceTreeHash,
    taskStateBefore,
    observationGuidance: observationGuidanceIdentity(resolvedOutputRoot),
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

function validateArtifactContract(contract) {
  validateExactKeys(
    contract,
    ["schemaVersion", "manifestPath", "requirements", "excludedPaths"],
    "fixture artifactContract",
  );
  if (contract.schemaVersion !== 1) throw new Error("fixture artifactContract schemaVersion must be 1");
  requireNonEmptyString(contract.manifestPath, "fixture artifactContract.manifestPath");
  if (path.isAbsolute(contract.manifestPath) || contract.manifestPath.includes("\\")) {
    throw new Error("fixture artifactContract.manifestPath must be a canonical run-relative path");
  }
  if (!Array.isArray(contract.excludedPaths) || !contract.excludedPaths.every((entry) => typeof entry === "string" && entry.length > 0)) {
    throw new Error("fixture artifactContract.excludedPaths must be a string array");
  }
  if (!Array.isArray(contract.requirements) || contract.requirements.length === 0) {
    throw new Error("fixture artifactContract.requirements must be non-empty");
  }
  const roles = new Set();
  for (const requirement of contract.requirements) {
    const runtimeCapture = requirement?.role === "runtime-capture";
    validateExactKeys(
      requirement,
      runtimeCapture
        ? ["role", "minCount", "extensions", "requiredCoverage"]
        : ["role", "minCount", "extensions"],
      "fixture artifact requirement",
    );
    requireNonEmptyString(requirement.role, "fixture artifact requirement role");
    if (roles.has(requirement.role)) throw new Error(`duplicate fixture artifact role: ${requirement.role}`);
    roles.add(requirement.role);
    if (!Number.isInteger(requirement.minCount) || requirement.minCount < 1) {
      throw new Error(`fixture artifact role ${requirement.role} minCount must be a positive integer`);
    }
    if (!Array.isArray(requirement.extensions) || requirement.extensions.length === 0 ||
      !requirement.extensions.every((extension) => /^\.[a-z0-9]+$/u.test(extension))) {
      throw new Error(`fixture artifact role ${requirement.role} extensions are invalid`);
    }
    if (runtimeCapture) {
      if (requirement.extensions.length !== 1 || requirement.extensions[0] !== ".png") {
        throw new Error("fixture runtime-capture extensions must be exactly .png under the PNG-only evidence policy");
      }
      if (!Array.isArray(requirement.requiredCoverage) || requirement.requiredCoverage.length !== requirement.minCount) {
        throw new Error("fixture runtime-capture coverage must contain one entry per required capture");
      }
      for (const coverage of requirement.requiredCoverage) {
        validateExactKeys(coverage, ["state", "viewport"], "fixture runtime-capture coverage");
        requireNonEmptyString(coverage.state, "fixture runtime-capture coverage state");
        if (!/^\d+x\d+$/u.test(coverage.viewport)) {
          throw new Error("fixture runtime-capture coverage viewport must use WIDTHxHEIGHT");
        }
      }
    }
  }
}

function crc32(content) {
  let crc = 0xffffffff;
  for (const byte of content) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function validatePngScanlines(header, scanlines) {
  const channels = new Map([[0, 1], [2, 3], [3, 1], [4, 2], [6, 4]]).get(header.colorType);
  const passes = header.interlace === 0
    ? [[0, 0, 1, 1]]
    : [[0, 0, 8, 8], [4, 0, 8, 8], [0, 4, 4, 8], [2, 0, 4, 4], [0, 2, 2, 4], [1, 0, 2, 2], [0, 1, 1, 2]];
  let offset = 0;
  for (const [startX, startY, stepX, stepY] of passes) {
    const width = header.width <= startX ? 0 : Math.ceil((header.width - startX) / stepX);
    const height = header.height <= startY ? 0 : Math.ceil((header.height - startY) / stepY);
    if (width === 0 || height === 0) continue;
    const rowBytes = Math.ceil(width * channels * header.bitDepth / 8);
    const stride = rowBytes + 1;
    const passLength = height * stride;
    if (!Number.isSafeInteger(passLength) || offset + passLength > scanlines.length) {
      throw new Error("PNG IDAT dimensions do not match IHDR");
    }
    for (let row = 0; row < height; row += 1) {
      if (scanlines[offset + row * stride] > 4) throw new Error("PNG scanline uses an invalid filter");
    }
    offset += passLength;
  }
  if (offset !== scanlines.length) throw new Error("PNG IDAT dimensions do not match IHDR");
}

function pngIdentity(content) {
  let offset = 8;
  let header = null;
  let sawImageData = false;
  let sawEnd = false;
  const imageData = [];
  while (offset < content.length) {
    if (offset + 12 > content.length) throw new Error("truncated PNG chunk");
    const length = content.readUInt32BE(offset);
    const chunkEnd = offset + 12 + length;
    if (chunkEnd > content.length) throw new Error("truncated PNG chunk payload");
    const type = content.toString("ascii", offset + 4, offset + 8);
    const payload = content.subarray(offset + 8, offset + 8 + length);
    const declaredCrc = content.readUInt32BE(offset + 8 + length);
    if (crc32(content.subarray(offset + 4, offset + 8 + length)) !== declaredCrc) {
      throw new Error(`invalid PNG ${type} checksum`);
    }
    if (!header && type !== "IHDR") throw new Error("PNG must begin with IHDR");
    if (type === "IHDR") {
      if (header || length !== 13) throw new Error("invalid PNG IHDR");
      const width = payload.readUInt32BE(0);
      const height = payload.readUInt32BE(4);
      const bitDepth = payload[8];
      const colorType = payload[9];
      const compression = payload[10];
      const filter = payload[11];
      const interlace = payload[12];
      const validBitDepths = new Map([
        [0, new Set([1, 2, 4, 8, 16])],
        [2, new Set([8, 16])],
        [3, new Set([1, 2, 4, 8])],
        [4, new Set([8, 16])],
        [6, new Set([8, 16])],
      ]);
      if (!width || !height || !validBitDepths.get(colorType)?.has(bitDepth) || compression !== 0 || filter !== 0 || ![0, 1].includes(interlace)) {
        throw new Error("invalid PNG IHDR fields");
      }
      header = { width, height, bitDepth, colorType, interlace };
    } else if (type === "IDAT") {
      if (!header || sawEnd || length === 0) throw new Error("invalid PNG IDAT sequence");
      sawImageData = true;
      imageData.push(payload);
    } else if (type === "IEND") {
      if (!sawImageData || length !== 0) throw new Error("PNG IEND requires image data");
      sawEnd = true;
      offset = chunkEnd;
      break;
    }
    offset = chunkEnd;
  }
  if (!header || !sawImageData || !sawEnd || offset !== content.length) {
    throw new Error("PNG structure requires IHDR, IDAT, and final IEND chunks");
  }
  let scanlines;
  try {
    scanlines = zlib.inflateSync(Buffer.concat(imageData), { maxOutputLength: 128 * 1024 * 1024 });
  } catch {
    throw new Error("PNG IDAT is not valid compressed image data");
  }
  validatePngScanlines(header, scanlines);
  return { mediaType: "image/png", width: header.width, height: header.height };
}

function rasterIdentity(file) {
  const content = fs.readFileSync(file);
  const pngSignature = Buffer.from("89504e470d0a1a0a", "hex");
  if (content.length >= 8 && content.subarray(0, 8).equals(pngSignature)) {
    try {
      return pngIdentity(content);
    } catch (error) {
      throw new Error(`runtime-capture: PNG structure invalid: ${error.message}`);
    }
  }
  return null;
}

function sourceLooksEditable(file, extension) {
  const content = fs.readFileSync(file, "utf8").trim();
  if (extension === ".svg") return /<svg(?:\s|>)/iu.test(content);
  if (extension === ".css") return /\{[\s\S]*\}/u.test(content);
  if (extension === ".html") return /<[^>]+>/u.test(content);
  return content.length > 0;
}

function verifyRequiredArtifacts(runRoot, artifactContract) {
  validateArtifactContract(artifactContract);
  const evidence = [];
  const manifestInput = inspectRunFile(
    runRoot,
    artifactContract.manifestPath,
    "artifact manifest",
  );
  if (!manifestInput.ok) return check("required-artifacts", false, manifestInput.evidence);

  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestInput.file, "utf8"));
    validateExactKeys(manifest, ["schemaVersion", "artifacts"], "artifact manifest");
    if (manifest.schemaVersion !== artifactContract.schemaVersion) {
      throw new Error("artifact manifest schemaVersion does not match the fixture contract");
    }
    if (!Array.isArray(manifest.artifacts) || manifest.artifacts.length === 0) {
      throw new Error("artifact manifest artifacts must be non-empty");
    }
  } catch (error) {
    return check("required-artifacts", false, `artifact manifest invalid: ${error.message}`);
  }

  const requirements = new Map(artifactContract.requirements.map((entry) => [entry.role, entry]));
  const entriesByRole = new Map([...requirements.keys()].map((role) => [role, []]));
  const seenPaths = new Set();
  let passed = true;
  for (const [index, entry] of manifest.artifacts.entries()) {
    const description = `artifact manifest entry ${index + 1}`;
    try {
      const runtimeCapture = entry?.role === "runtime-capture";
      validateExactKeys(
        entry,
        runtimeCapture
          ? ["path", "role", "mediaType", "state", "viewport"]
          : ["path", "role"],
        description,
      );
      requireNonEmptyString(entry.path, `${description}.path`);
      requireNonEmptyString(entry.role, `${description}.role`);
      const requirement = requirements.get(entry.role);
      if (!requirement) throw new Error(`${description}: unsupported role ${entry.role}`);
      const normalizedPath = entry.path.split(path.sep).join("/");
      if (path.isAbsolute(entry.path) || entry.path.includes("\\") || normalizedPath !== path.posix.normalize(normalizedPath)) {
        throw new Error(`${entry.role}: path must be canonical and run-relative`);
      }
      const pathKey = process.platform === "win32" ? normalizedPath.toLocaleLowerCase("en-US") : normalizedPath;
      if (seenPaths.has(pathKey)) throw new Error(`${entry.role}: one file cannot satisfy multiple artifact roles`);
      seenPaths.add(pathKey);
      if (artifactContract.excludedPaths.includes(normalizedPath)) {
        throw new Error(`${entry.role}: excluded fixture input cannot satisfy the artifact contract`);
      }
      const inspected = inspectRunFile(runRoot, entry.path, entry.role);
      if (!inspected.ok) throw new Error(inspected.evidence);
      if (fs.statSync(inspected.file).size === 0) throw new Error(`${entry.role}: ${entry.path} is empty`);
      const extension = path.extname(normalizedPath).toLocaleLowerCase("en-US");
      if (runtimeCapture && extension !== ".png") {
        throw new Error(`runtime-capture: PNG-only evidence requires .png; got ${extension || "(none)"}`);
      }
      if (!requirement.extensions.includes(extension)) {
        throw new Error(`${entry.role}: extension ${extension || "(none)"} is not supported`);
      }
      if (entry.role === "editable-source" && !sourceLooksEditable(inspected.file, extension)) {
        throw new Error(`editable-source: ${entry.path} is not recognizable editable source`);
      }
      if (runtimeCapture) {
        requireNonEmptyString(entry.mediaType, `${description}.mediaType`);
        requireNonEmptyString(entry.state, `${description}.state`);
        requireNonEmptyString(entry.viewport, `${description}.viewport`);
        if (entry.mediaType !== "image/png") {
          throw new Error(`runtime-capture: PNG-only evidence requires mediaType image/png; got ${entry.mediaType}`);
        }
        const raster = rasterIdentity(inspected.file);
        if (!raster || raster.mediaType !== entry.mediaType) {
          throw new Error(`runtime-capture: raster signature does not match ${entry.mediaType} for ${entry.path}`);
        }
        const expectedViewport = `${raster.width}x${raster.height}`;
        if (entry.viewport !== expectedViewport) {
          throw new Error(`runtime-capture: declared viewport ${entry.viewport} does not match raster dimensions ${expectedViewport}`);
        }
      }
      entriesByRole.get(entry.role).push(entry);
      evidence.push(`${entry.role}: ${entry.path} passed`);
    } catch (error) {
      passed = false;
      evidence.push(error.message);
    }
  }

  for (const requirement of artifactContract.requirements) {
    const entries = entriesByRole.get(requirement.role);
    if (entries.length < requirement.minCount) {
      passed = false;
      evidence.push(`${requirement.role} requires ${requirement.minCount} files; found ${entries.length}`);
    }
    if (requirement.role === "runtime-capture") {
      for (const coverage of requirement.requiredCoverage) {
        const covered = entries.some((entry) => entry.state === coverage.state && entry.viewport === coverage.viewport);
        if (!covered) {
          passed = false;
          evidence.push(`runtime-capture missing ${coverage.state} at ${coverage.viewport}`);
        }
      }
    }
  }
  evidence.unshift(`artifact manifest: ${artifactContract.manifestPath} ${passed ? "passed" : "failed"}`);
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
    throw new Error(`observation schemaVersion must be 1 or 2; see ${observationContractPath}`);
  }
  if (observation.schemaVersion === 2) {
    extractDeclaredResult(observation, publicObservationContract.resultContract);
    try {
      validateObservationV2(observation);
    } catch (error) {
      throw new Error(`${error.message}; see ${observationContractPath} and ${observationTemplatePath}`);
    }
    return;
  }
  extractDeclaredResult(observation, publicObservationContract.resultContract);
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
  const fixture = loadFixture(resolvedPluginRoot, lock.fixtureId);
  const observationGuidance = validatePreparedObservationGuidance(
    resolvedPluginRoot,
    resolvedRunRoot,
    lock,
  );
  const observationInput = inspectRunFile(resolvedRunRoot, "observation.json", "observation");
  if (!observationInput.ok) throw new Error(observationInput.evidence);
  const observation = readJson(observationInput.file, "observation");
  validateObservation(observation);
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
    observationGuidance,
  };
  if (!sameValue(lock, expectedLock)) throw new Error("fixture lock does not match the committed fixture and starter");
  const localVerifier = runTrustedVerifier(resolvedPluginRoot, fixtureDirectory, resolvedRunRoot, fixture);
  const taskStateAfter = readTaskState(resolvedRunRoot);
  const lifecycleHandoff = validateLifecycleHandoff(
    resolvedRunRoot,
    observation,
    taskStateAfter,
    publicObservationContract.resultContract,
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
        `source claim: ${observation.sourceTreeHash === lock.sourceTreeHash ? "matches lock" : "mismatch"}; see ${observationContractPath}`,
        `before claim: ${sameRecord(observation.taskStateBefore, lock.taskStateBefore) ? "matches lock" : "mismatch"}; see ${observationContractPath}`,
        `after claim: ${sameRecord(observation.taskStateAfter, taskStateAfter) ? "matches repository" : "mismatch"}; see ${observationContractPath}`,
      ],
    ),
    verifyRequiredArtifacts(resolvedRunRoot, fixture.artifactContract),
    check(
      "output-tree-claim",
      observation.outputTreeHash === currentOutputTreeHash,
      `output tree: ${observation.outputTreeHash === currentOutputTreeHash ? "matches observation" : "changed after observation"}; see ${observationContractPath}`,
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

  const loadedContext = observation.schemaVersion === 2
    ? aggregateLoadedContext(observation.loadedContext)
    : {
        product: {
          metadataWords: observation.loadedContext.metadataWords,
          bodyWords: observation.loadedContext.bodyWords,
          referenceWords: observation.loadedContext.referenceWords,
          files: [...observation.loadedContext.files],
        },
        support: null,
      };
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
    loadedContext: loadedContext.product,
    ...(loadedContext.support ? { supportContext: loadedContext.support } : {}),
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
