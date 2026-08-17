import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const observationContractPath = "fixture-guidance/observation-contract.json";
export const observationTemplatePath = "fixture-guidance/observation-template.json";
export const observationHelperPath = "fixture-guidance/observation-helper.mjs";
export const observationControlFiles = [
  "fixture-lock.json",
  "observation.json",
  "result.json",
  observationContractPath,
  observationTemplatePath,
  observationHelperPath,
];

const declaredResultKeys = [
  "professionalResult", "representativeProof", "assemblyPrecheck", "taskResult",
  "nextAction", "nextActionKind", "designAcceptance", "producerAcceptance",
];
const proofValues = ["Pending", "Passed", "Not applicable"];
const acceptanceValues = ["Pending", "Accepted", "Not applicable"];
const taskStateKeys = ["gate", "currentTask", "status", "nextAction"];
const durableTaskFields = {
  representativeProof: {
    taskLabel: "Representative proof",
    prefixes: { Pending: "Pending", Passed: "Passed", "Not applicable": "Not applicable" },
  },
  assemblyPrecheck: {
    taskLabel: "Assembly precheck",
    prefixes: { Pending: "Pending", Passed: "Passed", "Not applicable": "Not applicable" },
  },
  taskResult: {
    taskLabel: "Result",
    prefixes: {
      "Not started": "Not started",
      Proposed: "Proposed",
      Implemented: "Implemented",
      Returned: "Returned",
      Blocked: "Blocked",
    },
  },
  designAcceptance: {
    taskLabel: "Design acceptance",
    prefixes: { Pending: "Pending", Accepted: "Accepted", "Not applicable": "Not applicable" },
  },
  producerAcceptance: {
    taskLabel: "Producer acceptance",
    prefixes: { Pending: "Pending", Accepted: "Accepted", "Not applicable": "Not applicable" },
  },
};
const contextBuckets = ["metadata", "body", "reference"];
const contextCategoryKeys = ["metadataWords", "bodyWords", "referenceWords", "files", "hash"];
const contextCategories = ["project", "route", "support"];
const prohibitedContextFragments = [
  ".tmp", "/evals/", "/tests/", "/scripts/test-", "candidate-additive", "control-1.7.2",
  "independent-review.json", "observation.json", "result.json",
];

export const publicObservationContract = {
  schemaVersion: 2,
  paths: {
    contract: observationContractPath,
    template: observationTemplatePath,
    helper: observationHelperPath,
  },
  observation: {
    requiredKeys: [
      "schemaVersion", "sourceTreeHash", "outputTreeHash", "taskStateBefore",
      "taskStateAfter", "loadedContext", "cycles", "elapsedMinutes",
      "terminalClaim", "declaredResult",
    ],
    optionalKeys: [],
    fields: {
      schemaVersion: { type: "integer", const: 2 },
      sourceTreeHash: {
        type: "string",
        format: "sha256",
        rule: "Copy fixture-lock.json sourceTreeHash exactly; it identifies the immutable starter tree.",
      },
      outputTreeHash: {
        type: "string",
        format: "sha256",
        rule: "Use hashTree below after all product and evidence writes; run the public helper to refresh it.",
      },
      taskStateBefore: {
        type: "object",
        exactKeys: taskStateKeys,
        valueType: "string",
        rule: "Copy fixture-lock.json taskStateBefore exactly.",
      },
      taskStateAfter: {
        type: "object",
        exactKeys: taskStateKeys,
        valueType: "string",
        rule: "Copy gate/currentTask/status/nextAction from the current production/project.json.",
      },
      loadedContext: {
        type: "object",
        rule: "Use loadedContext below. Project and route context are product evidence; support is environment-mandated context and is reported separately.",
      },
      cycles: {
        type: "integer",
        minimum: 0,
        rule: "Count bounded product/evidence cycles actually performed, including a repair or handoff cycle; do not count passive tool polling as a cycle.",
      },
      elapsedMinutes: {
        type: "number",
        minimum: 0,
        rule: "Record wall-clock minutes from starting the fixture to the observation checkpoint, including tool waits and bounded repairs.",
      },
      terminalClaim: {
        type: "string",
        minimumLength: 1,
        rule: "State only evidenced maturity and preserve all human, artistic, gate, and lifecycle authority boundaries.",
      },
      declaredResult: { type: "object", contract: "resultContract" },
    },
  },
  hashTree: {
    algorithm: "sha256-length-prefixed-tree-v1",
    excludedRunRelativePaths: observationControlFiles,
    rule: "Sort canonical run-relative regular-file paths. For each file hash UTF-8 byte-length(path):path:byte-length(content): followed by raw content. Reject every symbolic link. Prefix the digest with sha256:.",
  },
  loadedContext: {
    schemaVersion: 1,
    exactCategories: contextCategories,
    categoryExactKeys: contextCategoryKeys,
    countFields: ["metadataWords", "bodyWords", "referenceWords"],
    countType: "non-negative integer",
    buckets: contextBuckets,
    wordCountRule: "Count Unicode-whitespace-delimited words in the exact context text actually loaded into each bucket; empty text is zero.",
    filesRule: "Use unique portable logical identifiers, never machine paths. project accepts project:// or fixture://, route accepts route://, and support accepts support://.",
    categoryHashRule: "sha256 of canonical JSON {category,metadataWords,bodyWords,referenceWords,files}; use the public helper after editing counts/files.",
    categoryMeaning: {
      project: "Governed project/workspace context required to perform the fixture.",
      route: "Selected game-production-system/game-art-production Skill bodies and references that govern product work.",
      support: "Environment-mandated operating instructions such as Superpowers or browser control; disclosed honestly but excluded from routed-product context and burden.",
    },
    prohibitedLeakageFragments: prohibitedContextFragments,
  },
  resultContract: {
    observationField: "declaredResult",
    requiredKeys: declaredResultKeys,
    stringFields: ["nextAction"],
    enums: {
      professionalResult: ["Proposed", "Implemented", "Returned", "Blocked"],
      representativeProof: proofValues,
      assemblyPrecheck: proofValues,
      taskResult: ["Not started", "Proposed", "Implemented", "Returned", "Blocked"],
      nextActionKind: [
        "produce-first-slice", "human-selection", "independent-review", "human-acceptance",
        "bounded-repair", "replan", "capability-enabling", "alternative-candidate", "stop",
      ],
      designAcceptance: acceptanceValues,
      producerAcceptance: acceptanceValues,
    },
    lifecycle: {
      durableEqualityFields: [
        "representativeProof", "assemblyPrecheck", "taskResult",
        "designAcceptance", "producerAcceptance",
      ],
      durableTaskPrefixRule: "In production/TASK.md, after optional enclosing Markdown backticks are removed, each durable field value must begin with the exact token for its declared semantic value; explanation may follow the token.",
      durableTaskFields,
      taskStatusMustMatch: true,
      nextActionMustMatch: true,
      defaultAllowedFields: {
        representativeProof: proofValues,
        assemblyPrecheck: proofValues,
        designAcceptance: acceptanceValues,
        producerAcceptance: acceptanceValues,
      },
      byProfessionalResult: {
        Proposed: {
          taskStatuses: ["Clarifying"],
          taskResults: ["Proposed"],
          nextActionKinds: ["human-selection", "bounded-repair", "stop"],
          fieldOverrides: {},
        },
        Implemented: {
          taskStatuses: ["Implementing"],
          taskResults: ["Implemented"],
          nextActionKinds: ["independent-review", "human-acceptance", "bounded-repair", "stop"],
          fieldOverrides: {
            representativeProof: ["Passed"],
            assemblyPrecheck: ["Passed"],
          },
        },
        Returned: {
          taskStatuses: ["Implementing"],
          taskResults: ["Returned"],
          nextActionKinds: ["bounded-repair", "replan", "capability-enabling", "alternative-candidate", "stop"],
          fieldOverrides: {
            producerAcceptance: ["Pending", "Not applicable"],
          },
        },
        Blocked: {
          taskStatuses: ["Clarifying", "Ready", "Implementing", "Blocked"],
          taskResults: ["Blocked"],
          nextActionKinds: ["replan", "capability-enabling", "alternative-candidate", "stop"],
          fieldOverrides: {
            producerAcceptance: ["Pending", "Not applicable"],
          },
        },
      },
    },
  },
  templateUsage: {
    copy: `Copy ${observationTemplatePath} to observation.json, then fill truthful context/cycle/time/result values.`,
    refresh: `Run node ${observationHelperPath} refresh after every observation or product change; it refreshes source/output hashes, task states, and category hashes without reading verifier source.`,
    fixtureSpecific: "The prepared template contains this fixture's locked source/task identity and a recommended result row; update TASK/project and the result row consistently with actual maturity.",
  },
};

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function sameContractValue(left, right) {
  return stableJson(left) === stableJson(right);
}

export function semanticHash(value) {
  return `sha256:${crypto.createHash("sha256").update(stableJson(value)).digest("hex")}`;
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

export function contextCategoryHash(category, value) {
  return semanticHash({
    category,
    metadataWords: value.metadataWords,
    bodyWords: value.bodyWords,
    referenceWords: value.referenceWords,
    files: value.files,
  });
}

export function emptyContextCategory(category) {
  const value = { metadataWords: 0, bodyWords: 0, referenceWords: 0, files: [] };
  return { ...value, hash: contextCategoryHash(category, value) };
}

function validateExactKeys(value, expected, name) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${name} must be an object`);
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    const missing = wanted.filter((key) => !actual.includes(key));
    const unexpected = actual.filter((key) => !wanted.includes(key));
    const details = [
      ...(missing.length > 0 ? [`missing: ${missing.join(", ")}`] : []),
      ...(unexpected.length > 0 ? [`unexpected: ${unexpected.join(", ")}`] : []),
    ];
    throw new Error(`${name} has an invalid schema${details.length > 0 ? ` (${details.join("; ")})` : ""}`);
  }
}

function validateTaskState(value, name) {
  validateExactKeys(value, taskStateKeys, name);
  for (const key of taskStateKeys) {
    if (typeof value[key] !== "string") throw new Error(`${name}.${key} must be a string`);
  }
}

function validateContextCategory(category, value) {
  validateExactKeys(value, contextCategoryKeys, `observation loadedContext.${category}`);
  for (const field of ["metadataWords", "bodyWords", "referenceWords"]) {
    if (!Number.isInteger(value[field]) || value[field] < 0) {
      throw new Error(`observation loadedContext.${category}.${field} must be a non-negative integer`);
    }
  }
  if (!Array.isArray(value.files) || !value.files.every((file) => typeof file === "string" && file.length > 0)) {
    throw new Error(`observation loadedContext.${category}.files must be a non-empty-string array`);
  }
  if (new Set(value.files).size !== value.files.length) {
    throw new Error(`observation loadedContext.${category}.files must be unique`);
  }
  const prefixes = category === "project" ? ["project://", "fixture://"] : [`${category}://`];
  for (const logicalId of value.files) {
    if (!prefixes.some((prefix) => logicalId.startsWith(prefix))) {
      throw new Error(`observation loadedContext.${category}.files uses the wrong logical category: ${logicalId}`);
    }
    const normalized = logicalId.toLocaleLowerCase("en-US").replaceAll("\\", "/");
    if (prohibitedContextFragments.some((fragment) => normalized.includes(fragment))) {
      throw new Error(`observation loadedContext.${category}.files contains prohibited sibling/evidence/test leakage: ${logicalId}`);
    }
  }
  if (!/^sha256:[a-f0-9]{64}$/u.test(value.hash) || value.hash !== contextCategoryHash(category, value)) {
    throw new Error(`observation loadedContext.${category}.hash does not match its category/count/files claim`);
  }
}

export function validateLoadedContext(value) {
  validateExactKeys(value, ["schemaVersion", ...contextCategories], "observation loadedContext");
  if (value.schemaVersion !== 1) throw new Error("observation loadedContext.schemaVersion must be 1");
  for (const category of contextCategories) validateContextCategory(category, value[category]);
}

export function validateDeclaredResult(value) {
  const contract = publicObservationContract.resultContract;
  validateExactKeys(value, contract.requiredKeys, "observation declaredResult");
  for (const [field, allowed] of Object.entries(contract.enums)) {
    if (!allowed.includes(value[field])) throw new Error(`observation declaredResult.${field} is invalid`);
  }
  for (const field of contract.stringFields) {
    if (typeof value[field] !== "string" || value[field].trim().length === 0) {
      throw new Error(`observation declaredResult.${field} must be a non-empty string`);
    }
  }
}

export function validateObservationV2(observation) {
  const contract = publicObservationContract.observation;
  validateExactKeys(observation, contract.requiredKeys, "observation schemaVersion 2");
  if (observation.schemaVersion !== 2) throw new Error("observation schemaVersion must be 2");
  for (const field of ["sourceTreeHash", "outputTreeHash"]) {
    if (!/^sha256:[a-f0-9]{64}$/u.test(observation[field])) throw new Error(`observation ${field} must be a SHA-256 value`);
  }
  validateTaskState(observation.taskStateBefore, "observation taskStateBefore");
  validateTaskState(observation.taskStateAfter, "observation taskStateAfter");
  validateLoadedContext(observation.loadedContext);
  if (!Number.isInteger(observation.cycles) || observation.cycles < 0) throw new Error("observation cycles must be a non-negative integer");
  if (typeof observation.elapsedMinutes !== "number" || !Number.isFinite(observation.elapsedMinutes) || observation.elapsedMinutes < 0) {
    throw new Error("observation elapsedMinutes must be a finite non-negative number");
  }
  if (typeof observation.terminalClaim !== "string" || observation.terminalClaim.trim().length === 0) {
    throw new Error("observation terminalClaim must be a non-empty string");
  }
  validateDeclaredResult(observation.declaredResult);
}

export function aggregateLoadedContext(loadedContext) {
  const productCategories = [loadedContext.project, loadedContext.route];
  const sum = (categories, field) => categories.reduce((total, category) => total + category[field], 0);
  return {
    product: {
      metadataWords: sum(productCategories, "metadataWords"),
      bodyWords: sum(productCategories, "bodyWords"),
      referenceWords: sum(productCategories, "referenceWords"),
      files: productCategories.flatMap((category) => category.files),
    },
    support: {
      metadataWords: loadedContext.support.metadataWords,
      bodyWords: loadedContext.support.bodyWords,
      referenceWords: loadedContext.support.referenceWords,
      files: [...loadedContext.support.files],
    },
  };
}

function readTaskState(runRoot) {
  const project = JSON.parse(fs.readFileSync(path.join(runRoot, "production/project.json"), "utf8"));
  return Object.fromEntries(taskStateKeys.map((field) => [field, String(project[field] ?? "")]));
}

function recommendedDeclaredResult(fixtureId, taskStateBefore) {
  if (fixtureId === "design-direction") {
    return {
      professionalResult: "Proposed",
      representativeProof: "Pending",
      assemblyPrecheck: "Pending",
      taskResult: "Proposed",
      nextAction: taskStateBefore.nextAction,
      nextActionKind: "human-selection",
      designAcceptance: "Pending",
      producerAcceptance: "Pending",
    };
  }
  return {
    professionalResult: "Implemented",
    representativeProof: "Passed",
    assemblyPrecheck: "Passed",
    taskResult: "Implemented",
    nextAction: "Have an independent reviewer inspect the representative runtime without granting human, gate, or lifecycle passage.",
    nextActionKind: "independent-review",
    designAcceptance: "Pending",
    producerAcceptance: "Pending",
  };
}

export function buildObservationTemplate({ fixtureId, sourceTreeHash, taskStateBefore }) {
  return {
    schemaVersion: 2,
    sourceTreeHash,
    outputTreeHash: sourceTreeHash,
    taskStateBefore,
    taskStateAfter: { ...taskStateBefore },
    loadedContext: {
      schemaVersion: 1,
      project: emptyContextCategory("project"),
      route: emptyContextCategory("route"),
      support: emptyContextCategory("support"),
    },
    cycles: 0,
    elapsedMinutes: 0,
    terminalClaim: "Replace with the truthful evidenced maturity and unresolved human/subjective authority boundary.",
    declaredResult: recommendedDeclaredResult(fixtureId, taskStateBefore),
  };
}

export function refreshObservation(runRoot) {
  const resolvedRunRoot = path.resolve(runRoot);
  const lock = JSON.parse(fs.readFileSync(path.join(resolvedRunRoot, "fixture-lock.json"), "utf8"));
  const observationPath = path.join(resolvedRunRoot, "observation.json");
  const templatePath = path.join(resolvedRunRoot, observationTemplatePath);
  const observation = JSON.parse(fs.readFileSync(fs.existsSync(observationPath) ? observationPath : templatePath, "utf8"));
  observation.schemaVersion = 2;
  observation.sourceTreeHash = lock.sourceTreeHash;
  observation.taskStateBefore = lock.taskStateBefore;
  observation.taskStateAfter = readTaskState(resolvedRunRoot);
  for (const category of contextCategories) {
    observation.loadedContext[category].hash = contextCategoryHash(category, observation.loadedContext[category]);
  }
  observation.outputTreeHash = hashTree(resolvedRunRoot, observationControlFiles);
  validateObservationV2(observation);
  fs.writeFileSync(observationPath, `${JSON.stringify(observation, null, 2)}\n`);
  return observation;
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  if (!process.argv[2] || process.argv[2] !== "refresh") {
    process.stderr.write(`Usage: node ${observationHelperPath} refresh\n`);
    process.exitCode = 1;
  } else {
    const runRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
    const observation = refreshObservation(runRoot);
    process.stdout.write(`PASS refreshed observation.json ${observation.outputTreeHash}\n`);
  }
}
