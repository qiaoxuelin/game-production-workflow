import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  candidateEvidenceRelative,
  candidateSummaryRelative,
  controlSummaryRelative,
  validateCandidateDocuments,
  validateCandidateRepository,
} from "./game-art-candidate-evidence.mjs";
import {
  contextCategoryHash,
  publicObservationContract,
} from "./game-art-observation-contract.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const pluginRoot = path.resolve(scriptDirectory, "..");
const repositoryRoot = path.resolve(pluginRoot, "../..");
const evalRoot = path.join(pluginRoot, "evals/game-art-production");
const cliPath = path.join(scriptDirectory, "game-art-fixture.mjs");
const controlSummaryPath = path.join(evalRoot, "control-1.7.2.json");
const ids = ["design-direction", "composite-runtime"];
const expectedStarterFiles = {
  "design-direction": [
    "AGENTS.md",
    "docs/ART_BIBLE.md",
    "production/ACCEPTANCE.md",
    "production/PROJECT.md",
    "production/TASK.md",
    "production/project.json",
    "web/app.mjs",
    "web/index.html",
    "web/styles.css",
  ],
  "composite-runtime": [
    "AGENTS.md",
    "docs/ART_BIBLE.md",
    "production/ACCEPTANCE.md",
    "production/PROJECT.md",
    "production/TASK.md",
    "production/project.json",
    "web/app.mjs",
    "web/assets/inventory-concept.svg",
    "web/index.html",
    "web/state.mjs",
    "web/styles.css",
    "web/verify.mjs",
  ],
};
const hasContent = (value) => Array.isArray(value)
  ? value.length > 0
  : value && typeof value === "object"
    ? Object.keys(value).length > 0
    : typeof value === "string" && value.trim().length > 0;
const publicObservationFiles = [
  "fixture-guidance/observation-contract.json",
  "fixture-guidance/observation-template.json",
  "fixture-guidance/observation-helper.mjs",
];
const operationalFiles = ["fixture-lock.json", "observation.json", "result.json", ...publicObservationFiles];
const outputHash = (runRoot) => fixtureApi.hashTree(runRoot, operationalFiles);
const canonicalValue = (value) => Array.isArray(value)
  ? value.map(canonicalValue)
  : value && typeof value === "object"
    ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalValue(value[key])]))
    : value;
const semanticHash = (value) => `sha256:${crypto.createHash("sha256")
  .update(`${JSON.stringify(canonicalValue(value), null, 2)}\n`)
  .digest("hex")}`;
const fileHash = (file) => `sha256:${crypto.createHash("sha256")
  .update(fs.readFileSync(file))
  .digest("hex")}`;
const approvalChangeCount = (before, after) => {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  return [...keys].filter((key) => JSON.stringify(canonicalValue(before[key])) !== JSON.stringify(canonicalValue(after[key]))).length;
};
const replaceTaskField = (runRoot, label, value) => {
  const taskPath = path.join(runRoot, "production/TASK.md");
  const task = fs.readFileSync(taskPath, "utf8");
  const pattern = new RegExp(`^- ${label}:.*$`, "mu");
  assert.match(task, pattern, `fixture TASK is missing ${label}`);
  fs.writeFileSync(taskPath, task.replace(pattern, `- ${label}: ${value}`));
};
const taskStateFields = ["gate", "currentTask", "status", "nextAction"];
const writeProjectState = (runRoot, status, nextAction) => {
  const projectPath = path.join(runRoot, "production/project.json");
  const project = JSON.parse(fs.readFileSync(projectPath, "utf8"));
  project.status = status;
  project.nextAction = nextAction;
  fs.writeFileSync(projectPath, `${JSON.stringify(project, null, 2)}\n`);
  return Object.fromEntries(taskStateFields.map((field) => [field, String(project[field] ?? "")]));
};
const writeTaskHandoff = (runRoot, values) => {
  for (const [label, value] of Object.entries(values)) replaceTaskField(runRoot, label, value);
};
const declaredResult = (overrides = {}) => ({
  professionalResult: "Implemented",
  representativeProof: "Passed",
  assemblyPrecheck: "Passed",
  taskResult: "Implemented",
  nextAction: "Have the named independent reviewer inspect the integrated runtime evidence.",
  nextActionKind: "independent-review",
  designAcceptance: "Pending",
  producerAcceptance: "Pending",
  ...overrides,
});
const contextCategory = (category, overrides = {}) => {
  const value = {
    metadataWords: 0,
    bodyWords: 0,
    referenceWords: 0,
    files: [],
    ...overrides,
  };
  return { ...value, hash: contextCategoryHash(category, value) };
};
const categorizedLoadedContext = (overrides = {}) => ({
  schemaVersion: 1,
  project: contextCategory("project", {
    metadataWords: 1,
    bodyWords: 2,
    files: ["project://production/TASK.md"],
  }),
  route: contextCategory("route", {
    referenceWords: 3,
    files: ["route://game-production-system/SKILL.md"],
  }),
  support: contextCategory("support"),
  ...overrides,
});
const legacyLoadedContext = {
  metadataWords: 1,
  bodyWords: 2,
  referenceWords: 3,
  files: ["production/TASK.md"],
};
const expectedResultContract = publicObservationContract.resultContract;
const expectedDurableTaskFields = {
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

for (const id of ids) {
  const fixturePath = path.join(evalRoot, id, "fixture.json");
  assert(fs.existsSync(fixturePath), `missing fixture: ${id}`);
  const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
  assert.equal(fixture.id, id);
  for (const field of ["operation", "request", "capabilityProfile", "artifactContract", "observationContract", "objectiveChecks", "subjectiveChecks", "prohibitedClaims", "stopConditions"]) {
    assert(hasContent(fixture[field]), `${id}: ${field} is empty`);
  }
  assert.equal(fixture.observationContract, "fixture-guidance/observation-contract.json");
  assert.match(fixture.request, /fixture-guidance\/observation-contract\.json.*observation-template\.json.*observation-helper\.mjs/iu, `${id}: raw request must route workers to the complete public observation contract`);
  assert(!fixture.request.includes(".tmp"), `${id}: observation guidance must not depend on an evaluation-root name`);
  assert(!fixture.request.includes(repositoryRoot), `${id}: observation guidance must remain portable across repository relocation`);
  assert.deepEqual(Object.keys(fixture.artifactContract).sort(), [
    "excludedPaths",
    "manifestPath",
    "requirements",
    "schemaVersion",
  ]);
  assert.equal(fixture.artifactContract.schemaVersion, 1);
  assert.equal(fixture.artifactContract.manifestPath, "artifacts/artifact-manifest.json");
  assert(fixture.request.includes(fixture.artifactContract.manifestPath), `${id}: request must disclose the artifact manifest path`);
  assert(Array.isArray(fixture.artifactContract.requirements) && fixture.artifactContract.requirements.length > 0);
  assert(fixture.artifactContract.requirements.some(({ role }) => role === "editable-source"));
  assert(fixture.artifactContract.requirements.some(({ role }) => role === "source-export-import"));
  const runtimeCaptureRequirement = fixture.artifactContract.requirements.find(({ role }) => role === "runtime-capture");
  assert(runtimeCaptureRequirement);
  assert.deepEqual(runtimeCaptureRequirement.extensions, [".png"], `${id}: runtime evidence must use the dependency-free PNG-only contract`);
  assert.match(fixture.request, /runtime-capture.*mediaType image\/png.*PNG-only/iu, `${id}: worker request must disclose the PNG-only runtime evidence policy`);

  const starterRoot = path.join(evalRoot, id, "starter");
  const starterFiles = fs.readdirSync(starterRoot, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => path.relative(starterRoot, path.join(entry.parentPath, entry.name)).split(path.sep).join("/"))
    .sort();
  assert.deepEqual(starterFiles, expectedStarterFiles[id]);
  const agents = fs.readFileSync(path.join(starterRoot, "AGENTS.md"), "utf8");
  assert.match(agents, /Game Production System/);
  for (const entry of fs.readdirSync(starterRoot, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const file = path.join(entry.parentPath, entry.name);
    const text = fs.readFileSync(file, "utf8");
    assert.doesNotMatch(text, /__[A-Z][A-Z0-9_]*__|\bTBD\b|\{\{[^}]+\}\}/, `${id}: unfilled template token in ${path.relative(starterRoot, file)}`);
  }
}

const compositeRoot = path.join(evalRoot, "composite-runtime", "starter");
const conceptPath = path.join(compositeRoot, "web/assets/inventory-concept.svg");
assert(fs.existsSync(conceptPath), "composite fixture lacks its flattened concept");
assert.equal(
  fs.readdirSync(path.join(compositeRoot, "web"), { recursive: true }).filter((entry) => String(entry).endsWith(".svg")).length,
  1,
  "composite starter must contain exactly one flattened concept SVG",
);
const stateVerification = spawnSync(
  process.execPath,
  [path.join(compositeRoot, "web/verify.mjs")],
  { cwd: compositeRoot, encoding: "utf8" },
);
assert.equal(stateVerification.status, 0, stateVerification.stderr || stateVerification.stdout);

const designShell = await import(pathToFileURL(path.join(evalRoot, "design-direction/starter/web/app.mjs")));
const designIndex = fs.readFileSync(path.join(evalRoot, "design-direction/starter/web/index.html"), "utf8");
assert.match(designIndex, /id="case-controls"/);
assert.match(designIndex, /id="viewport-controls"/);
assert.deepEqual(Object.keys(designShell.resultCases), [
  "success",
  "failure",
  "reward-overflow",
  "retry",
  "controller-focus",
]);
assert.deepEqual(designShell.targetViewports, {
  desktop: "1280x720",
  mobile: "390x844",
});

function fakeElement(dataset = {}) {
  return {
    dataset,
    className: "",
    textContent: "",
    children: [],
    focused: false,
    listeners: {},
    addEventListener(type, listener) { this.listeners[type] = listener; },
    click() { this.listeners.click?.(); },
    focus() { this.focused = true; },
    replaceChildren(...children) { this.children = children; },
    append(...children) { this.children.push(...children); },
  };
}

function fakeDesignDocument(omittedCase, generateControls = false) {
  const elements = Object.fromEntries([
    "#viewport", "#outcome", "#score", "#rewards", "#retry", "#exit", "#feedback", "#case-controls", "#viewport-controls",
  ].map((selector) => [selector, fakeElement()]));
  const caseButtons = generateControls ? [] : Object.keys(designShell.resultCases)
    .filter((caseName) => caseName !== omittedCase)
    .map((caseName) => fakeElement({ case: caseName }));
  const viewportButtons = generateControls ? [] : Object.keys(designShell.targetViewports)
    .map((viewport) => fakeElement({ viewport }));
  elements["#case-controls"].append = (...buttons) => caseButtons.push(...buttons);
  elements["#viewport-controls"].append = (...buttons) => viewportButtons.push(...buttons);
  return {
    elements,
    caseButtons,
    viewportButtons,
    querySelector(selector) { return elements[selector]; },
    querySelectorAll(selector) {
      if (selector === "[data-case]") return caseButtons;
      if (selector === "[data-viewport]") return viewportButtons;
      return [];
    },
    createElement() { return fakeElement(); },
  };
}

const generatedControlDocument = fakeDesignDocument(undefined, true);
designShell.initializeResultShell(generatedControlDocument);
assert.deepEqual(
  generatedControlDocument.caseButtons.map((button) => button.dataset.case),
  Object.keys(designShell.resultCases),
);
assert.deepEqual(
  generatedControlDocument.viewportButtons.map((button) => button.dataset.viewport),
  Object.keys(designShell.targetViewports),
);

const fakeDocument = fakeDesignDocument();
designShell.initializeResultShell(fakeDocument);
fakeDocument.caseButtons.find((button) => button.dataset.case === "failure").click();
assert.equal(fakeDocument.elements["#outcome"].textContent, "Run failed");
fakeDocument.caseButtons.find((button) => button.dataset.case === "reward-overflow").click();
assert.equal(fakeDocument.elements["#rewards"].children.length, 8);
fakeDocument.caseButtons.find((button) => button.dataset.case === "controller-focus").click();
assert.equal(fakeDocument.elements["#retry"].focused, true);
fakeDocument.viewportButtons.find((button) => button.dataset.viewport === "mobile").click();
assert.equal(fakeDocument.elements["#viewport"].className, "viewport mobile");
assert.throws(
  () => designShell.initializeResultShell(fakeDesignDocument("failure")),
  /missing case control: failure/,
);

assert(fs.existsSync(cliPath), "missing game art fixture CLI");
const fixtureApi = await import(pathToFileURL(cliPath));
for (const name of ["parseFixtureArguments", "loadFixture", "hashTree", "prepareFixture", "verifyFixture"]) {
  assert.equal(typeof fixtureApi[name], "function", `missing exported CLI function: ${name}`);
}

const crc32 = (content) => {
  let crc = 0xffffffff;
  for (const byte of content) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
};
const pngChunk = (type, payload = Buffer.alloc(0)) => {
  const typeBytes = Buffer.from(type, "ascii");
  const chunk = Buffer.alloc(12 + payload.length);
  chunk.writeUInt32BE(payload.length, 0);
  typeBytes.copy(chunk, 4);
  payload.copy(chunk, 8);
  chunk.writeUInt32BE(crc32(Buffer.concat([typeBytes, payload])), 8 + payload.length);
  return chunk;
};
const pngFixture = (width, height) => {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 2;
  const scanline = Buffer.alloc(1 + width * 3);
  return Buffer.concat([
    Buffer.from("89504e470d0a1a0a", "hex"),
    pngChunk("IHDR", header),
    pngChunk("IDAT", zlib.deflateSync(Buffer.concat(Array.from({ length: height }, () => scanline)))),
    pngChunk("IEND"),
  ]);
};

const materializeArtifactContract = (runRoot, fixture) => {
  const artifacts = [];
  for (const requirement of fixture.artifactContract.requirements) {
    for (let index = 0; index < requirement.minCount; index += 1) {
      const stem = `${requirement.role}-${index + 1}`;
      if (requirement.role === "runtime-capture") {
        const coverage = requirement.requiredCoverage[index];
        const relative = `artifacts/contract/${stem}.png`;
        const target = path.join(runRoot, relative);
        fs.mkdirSync(path.dirname(target), { recursive: true });
        const [width, height] = coverage.viewport.split("x").map(Number);
        fs.writeFileSync(target, pngFixture(width, height));
        artifacts.push({
          path: relative,
          role: requirement.role,
          mediaType: "image/png",
          state: coverage.state,
          viewport: coverage.viewport,
        });
        continue;
      }
      const extension = requirement.extensions[0];
      const relative = `artifacts/contract/${stem}${extension}`;
      const target = path.join(runRoot, relative);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      const content = extension === ".svg"
        ? `<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0h1v1z"/></svg>\n`
        : extension === ".css"
          ? `.fixture { display: block; }\n`
          : extension === ".html"
            ? `<div>fixture</div>\n`
            : `fixture test artifact: ${requirement.role}\n`;
      fs.writeFileSync(target, content);
      artifacts.push({ path: relative, role: requirement.role });
    }
  }
  const manifestPath = path.join(runRoot, fixture.artifactContract.manifestPath);
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  const manifest = { schemaVersion: 1, artifacts };
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  return { manifest, manifestPath };
};

assert(fs.existsSync(controlSummaryPath), "missing 1.7.2 control summary");
const controlSummary = JSON.parse(fs.readFileSync(controlSummaryPath, "utf8"));
assert.deepEqual(Object.keys(controlSummary).sort(), [
  "approvalEvidence",
  "burden",
  "decisionBasis",
  "evaluationContractMismatches",
  "evidenceBundles",
  "fixtureResults",
  "observedFailures",
  "policyCommit",
  "policyVersion",
  "schemaVersion",
  "splitDecision",
]);
assert.equal(controlSummary.schemaVersion, 1);
assert.equal(controlSummary.policyCommit, "1d77557");
assert.equal(controlSummary.policyVersion, "1.7.2+codex.20260814064925");
assert.match(controlSummary.decisionBasis, /\S/);
assert(["Stop", "Proceed"].includes(controlSummary.splitDecision));

const expectedControlIdentities = {
  "design-direction": {
    sourceTreeHash: "sha256:9263408b47f3df7faa539fa6559b92838309d402a1c89c9424611ea776f7ba7e",
    outputTreeHash: "sha256:0f976e279d292491030f51489d021cb49c407ba46920d95376178cb3ce2c0743",
    rawBundleHash: "sha256:b4a03dd591683f516946eda97a67244bc64a22aa6a78cc8da1ad6efd7975732d",
    resultHash: "sha256:a1e7766c5fde25ec2cf7ce0019eebd31ac4360aa13624e0356f6912757392b3f",
    independentReviewHash: "sha256:29c3d2a541ea5cba70f390e260682428fa86649636b66ad1c76a5c7389786ef4",
    independentReviewStatus: "Returned",
  },
  "composite-runtime": {
    sourceTreeHash: "sha256:b1dbaca1b28c58df2aceaca54ede285303fd8151e990f5b83c8e2bed5ce8a848",
    outputTreeHash: "sha256:5404b20d371b1ab5ca0025cf511a7367d22600865a9539e03a693e2c483f5e09",
    rawBundleHash: "sha256:76fe51433efb6e3e164138d6762d23988cf3f847de3b7f2928be04ac48994587",
    resultHash: "sha256:28f9f672f4f6eb3c11f262ac442ac70e70dd286aa945423f86d0a074de925197",
    independentReviewHash: "sha256:4601987905f3ecdc4cdb2d29d71a9a58bab8125d640c558521824ac54fe95326",
    independentReviewStatus: "Returned",
  },
};
const expectedApprovalHashes = {
  "design-direction": "sha256:94d681b5ddd380b5436b4c6fa21ecf595974dd921b49de2a2638e7cc46160f8c",
  "composite-runtime": "sha256:c147377fc9593dc865069622992e40420545a78db973ad74a1c2ed53855b00cb",
};

assert.equal(controlSummary.fixtureResults.length, ids.length);
assert.deepEqual(controlSummary.fixtureResults.map((result) => result.fixtureId).sort(), [...ids].sort());
for (const result of controlSummary.fixtureResults) {
  assert.deepEqual(Object.keys(result).sort(), [
    "capabilities",
    "cycles",
    "elapsedMinutes",
    "fixtureId",
    "label",
    "loadedContext",
    "objectiveChecks",
    "outputTreeHash",
    "policyVersion",
    "schemaVersion",
    "sourceTreeHash",
    "subjectiveReview",
    "taskStateAfter",
    "taskStateBefore",
    "terminalClaim",
  ]);
  assert.equal(result.schemaVersion, 1);
  assert.equal(result.label, "control-1.7.2");
  assert.equal(result.policyVersion, "1.7.2");
  assert.equal(result.sourceTreeHash, expectedControlIdentities[result.fixtureId].sourceTreeHash);
  assert.equal(result.outputTreeHash, expectedControlIdentities[result.fixtureId].outputTreeHash);
  assert.deepEqual(Object.keys(result.loadedContext).sort(), ["bodyWords", "files", "metadataWords", "referenceWords"]);
  assert(Array.isArray(result.objectiveChecks) && result.objectiveChecks.length > 0);
  assert.equal(result.subjectiveReview.status, "Pending");
  assert.equal(result.subjectiveReview.reviewerIndependence, "Unassessed");
}

assert.equal(controlSummary.evidenceBundles.length, ids.length);
assert.deepEqual(controlSummary.evidenceBundles.map((bundle) => bundle.fixtureId).sort(), [...ids].sort());
for (const bundle of controlSummary.evidenceBundles) {
  assert.deepEqual(Object.keys(bundle).sort(), ["fixtureId", "independentReview", "rawBundle", "result"]);
  assert.deepEqual(Object.keys(bundle.rawBundle).sort(), ["hash", "location", "outputTreeHash"]);
  assert.deepEqual(Object.keys(bundle.result).sort(), ["hash", "location"]);
  assert.deepEqual(Object.keys(bundle.independentReview).sort(), ["hash", "location", "record"]);
  assert.equal(bundle.rawBundle.location, `.tmp/game-art-evals/control-${bundle.fixtureId}`);
  assert.equal(bundle.result.location, `${bundle.rawBundle.location}/result.json`);
  assert.equal(bundle.independentReview.location, `${bundle.rawBundle.location}/artifacts/independent-review.json`);
  for (const hash of [bundle.rawBundle.hash, bundle.result.hash, bundle.independentReview.hash]) {
    assert.match(hash, /^sha256:[a-f0-9]{64}$/);
  }
  const result = controlSummary.fixtureResults.find((entry) => entry.fixtureId === bundle.fixtureId);
  assert.equal(bundle.rawBundle.outputTreeHash, result.outputTreeHash);
  assert.equal(bundle.rawBundle.hash, expectedControlIdentities[bundle.fixtureId].rawBundleHash);
  assert.equal(bundle.result.hash, expectedControlIdentities[bundle.fixtureId].resultHash);
  assert.equal(bundle.independentReview.hash, expectedControlIdentities[bundle.fixtureId].independentReviewHash);
  assert.equal(semanticHash(result), bundle.result.hash);

  const review = bundle.independentReview.record;
  assert.deepEqual(Object.keys(review).sort(), [
    "contributionDisclosure",
    "evidencePaths",
    "failedCriteria",
    "findings",
    "humanDecisionsPending",
    "retainedPassingParts",
    "reviewerIndependence",
    "runtimeCoverage",
    "schemaVersion",
    "status",
    "terminalReviewClaim",
  ]);
  assert.equal(review.schemaVersion, 1);
  assert.equal(review.status, expectedControlIdentities[bundle.fixtureId].independentReviewStatus);
  assert.equal(review.reviewerIndependence, "Independent");
  assert.equal(review.contributionDisclosure, "No contribution to production artifacts");
  for (const field of ["evidencePaths", "failedCriteria", "findings", "humanDecisionsPending", "retainedPassingParts"]) {
    assert(Array.isArray(review[field]) && review[field].length > 0);
  }
  assert.match(review.runtimeCoverage, /\S/);
  assert.match(review.terminalReviewClaim, /\S/);
  for (const finding of review.findings) {
    assert.deepEqual(Object.keys(finding).sort(), ["criterion", "evidence", "severity"]);
    assert.match(finding.criterion, /\S/);
    assert(["Blocking", "Non-blocking"].includes(finding.severity));
    assert(Array.isArray(finding.evidence) && finding.evidence.length > 0);
  }
  assert.equal(semanticHash(review), bundle.independentReview.hash);

  const rawBundleRoot = path.join(repositoryRoot, bundle.rawBundle.location);
  if (fs.existsSync(rawBundleRoot)) {
    const resultPath = path.join(repositoryRoot, bundle.result.location);
    const reviewPath = path.join(repositoryRoot, bundle.independentReview.location);
    assert.equal(fixtureApi.hashTree(rawBundleRoot), bundle.rawBundle.hash);
    assert.deepEqual(JSON.parse(fs.readFileSync(resultPath, "utf8")), result);
    assert.deepEqual(JSON.parse(fs.readFileSync(reviewPath, "utf8")), review);
  }
}

assert.equal(controlSummary.approvalEvidence.length, ids.length);
assert.deepEqual(controlSummary.approvalEvidence.map((entry) => entry.fixtureId).sort(), [...ids].sort());
for (const approval of controlSummary.approvalEvidence) {
  assert.deepEqual(Object.keys(approval).sort(), ["addedOrChangedCount", "after", "before", "fixtureId", "hash"]);
  assert.deepEqual(Object.keys(approval.before).sort(), ["G0", "G1", "G2", "G3", "goldenVisual"]);
  assert.deepEqual(Object.keys(approval.after).sort(), ["G0", "G1", "G2", "G3", "goldenVisual"]);
  const { hash, ...identity } = approval;
  assert.equal(hash, expectedApprovalHashes[approval.fixtureId]);
  assert.equal(semanticHash(identity), hash);
  assert.equal(approval.addedOrChangedCount, approvalChangeCount(approval.before, approval.after));

  const rawBundle = controlSummary.evidenceBundles.find((bundle) => bundle.fixtureId === approval.fixtureId);
  const rawBundleRoot = path.join(repositoryRoot, rawBundle.rawBundle.location);
  if (fs.existsSync(rawBundleRoot)) {
    const starterProject = JSON.parse(fs.readFileSync(path.join(evalRoot, approval.fixtureId, "starter/production/project.json"), "utf8"));
    const runProject = JSON.parse(fs.readFileSync(path.join(rawBundleRoot, "production/project.json"), "utf8"));
    assert.deepEqual(approval.before, starterProject.humanApprovals);
    assert.deepEqual(approval.after, runProject.humanApprovals);
  }
}

assert.deepEqual(Object.keys(controlSummary.burden).sort(), ["approvals", "cycles", "elapsedMinutes", "loadedContext"]);
assert.deepEqual(Object.keys(controlSummary.burden.loadedContext).sort(), ["bodyWords", "files", "metadataWords", "referenceWords"]);
assert.equal(controlSummary.burden.cycles, controlSummary.fixtureResults.reduce((total, result) => total + result.cycles, 0));
assert.equal(controlSummary.burden.elapsedMinutes, controlSummary.fixtureResults.reduce((total, result) => total + result.elapsedMinutes, 0));
assert.equal(
  controlSummary.burden.approvals,
  controlSummary.approvalEvidence.reduce((total, approval) => total + approval.addedOrChangedCount, 0),
);
for (const field of ["metadataWords", "bodyWords", "referenceWords"]) {
  assert.equal(
    controlSummary.burden.loadedContext[field],
    controlSummary.fixtureResults.reduce((total, result) => total + result.loadedContext[field], 0),
  );
}
assert.deepEqual(
  controlSummary.burden.loadedContext.files,
  controlSummary.fixtureResults.flatMap((result) => result.loadedContext.files),
);

assert.equal(controlSummary.evaluationContractMismatches.length, ids.length);
for (const mismatch of controlSummary.evaluationContractMismatches) {
  assert.deepEqual(Object.keys(mismatch).sort(), [
    "criterion",
    "evidence",
    "excludedFromSplitBasis",
    "fixtureId",
    "objectiveCheckId",
    "producedAlternatives",
  ]);
  assert(ids.includes(mismatch.fixtureId));
  assert.equal(mismatch.objectiveCheckId, "required-artifacts");
  assert.equal(mismatch.excludedFromSplitBasis, true);
  assert(Array.isArray(mismatch.evidence) && mismatch.evidence.length > 0);
  assert(Array.isArray(mismatch.producedAlternatives) && mismatch.producedAlternatives.length > 0);
  const result = controlSummary.fixtureResults.find((entry) => entry.fixtureId === mismatch.fixtureId);
  const objectiveMismatch = result.objectiveChecks.find((check) => check.id === mismatch.objectiveCheckId);
  assert.equal(objectiveMismatch.status, "Fail");
  assert.deepEqual(mismatch.evidence, objectiveMismatch.evidence);
}
assert(controlSummary.decisionBasis.includes("Exact-path evaluation-contract mismatches are excluded from the split basis."));
assert(controlSummary.decisionBasis.includes("no claim of greater burden is made because no comparator was measured"));

assert(Array.isArray(controlSummary.observedFailures));
for (const failure of controlSummary.observedFailures) {
  assert.deepEqual(Object.keys(failure).sort(), ["criterion", "evidence", "fixtureId"]);
  assert(ids.includes(failure.fixtureId));
  assert.match(failure.criterion, /\S/);
  assert(Array.isArray(failure.evidence) && failure.evidence.length > 0);
  assert(failure.evidence.every((entry) => typeof entry === "string" && /\S/.test(entry)));
  const review = controlSummary.evidenceBundles.find((bundle) => bundle.fixtureId === failure.fixtureId).independentReview.record;
  const matchingFinding = review.findings.find((finding) => finding.severity === "Blocking" && finding.criterion === failure.criterion);
  assert(matchingFinding, `${failure.fixtureId}: substantive failure must resolve to a blocking independent-review finding`);
  assert.deepEqual(failure.evidence, matchingFinding.evidence);
  const mismatch = controlSummary.evaluationContractMismatches.find((entry) => entry.fixtureId === failure.fixtureId);
  assert(!failure.evidence.some((entry) => mismatch.evidence.includes(entry)), `${failure.fixtureId}: exact-path mismatch counted as substantive failure`);
}
if (controlSummary.splitDecision === "Proceed") {
  assert(controlSummary.observedFailures.length > 0, "Proceed requires observed artifact failures");
}

const validatedCandidate = validateCandidateRepository(repositoryRoot);
const { summary: candidateSummary, evidence: candidateEvidence } = validatedCandidate;
assert.deepEqual(Object.keys(candidateSummary).sort(), [
  "approvalEvidence",
  "burden",
  "burdenMeasurementScope",
  "candidateCommit",
  "committedEvidence",
  "comparison",
  "decisionBasis",
  "evaluationContractMismatches",
  "fixtureResults",
  "historicalRawBundles",
  "inputGateClosure",
  "label",
  "observedFailures",
  "result",
  "schemaVersion",
  "task6Unlocked",
]);
assert.equal(candidateSummary.result, "CandidatePass");
assert.equal(candidateSummary.task6Unlocked, true);
assert.equal(candidateSummary.fixtureResults.find(({ fixtureId }) => fixtureId === "design-direction").objectiveResult.status, "Pass");
assert.equal(candidateSummary.fixtureResults.find(({ variant }) => variant === "no-optional-generation").objectiveResult.status, "Pass");
assert.deepEqual(candidateSummary.observedFailures, []);
assert.deepEqual(candidateSummary.comparison.retainedControlFailures, []);

const candidateMutations = [
  {
    name: "noncanonical historical raw bundle",
    mutate(summary) { summary.historicalRawBundles[0].location = ".tmp/game-art-evals/nonexistent-design-evidence"; },
  },
  {
    name: "bounded-return result while both primary records pass",
    mutate(summary) {
      summary.result = "BoundedReturn";
      summary.task6Unlocked = false;
    },
  },
  {
    name: "forged substantive Design failure",
    mutate(summary) {
      summary.observedFailures = [{
        fixtureId: "design-direction",
        variant: "primary",
        criterion: "Actual keyboard/controller interaction-to-visual causality",
        evidence: ["Genuine input causality was not observed."],
      }];
    },
  },
  {
    name: "reverted Design input evidence",
    mutate(summary, evidence) {
      const design = evidence.records.find(({ fixtureId }) => fixtureId === "design-direction");
      design.objective.status = "Blocked";
      design.objective.inputCausality.result = "Blocked";
      design.objective.inputCausality.verdict = "Blocked";
      summary.committedEvidence.hash = semanticHash(evidence);
    },
  },
  {
    name: "forged preset-based Design input passage",
    mutate(summary, evidence) {
      const design = evidence.records.find(({ fixtureId }) => fixtureId === "design-direction");
      design.objective.inputCausality.proofStatePresetActivated = true;
      summary.committedEvidence.hash = semanticHash(evidence);
    },
  },
  {
    name: "forged unchanged-source evidence",
    mutate(summary, evidence) {
      const design = evidence.records.find(({ fixtureId }) => fixtureId === "design-direction");
      design.objective.inputCausality.sourceNoRepairHashes[0].sha256 = `sha256:${"0".repeat(64)}`;
      summary.committedEvidence.hash = semanticHash(evidence);
    },
  },
  {
    name: "Design independent review loses pass",
    mutate(summary, evidence) {
      const design = evidence.records.find(({ fixtureId }) => fixtureId === "design-direction");
      design.review.status = "Blocked";
      summary.committedEvidence.hash = semanticHash(evidence);
    },
  },
  {
    name: "Design review loses independent authority boundary",
    mutate(summary, evidence) {
      const design = evidence.records.find(({ fixtureId }) => fixtureId === "design-direction");
      design.review.reviewerIndependence = "Contributing";
      design.review.contributionDisclosure = "Contributed to candidate source";
      summary.committedEvidence.hash = semanticHash(evidence);
    },
  },
  {
    name: "burden measurement scope omitted",
    mutate(summary) { delete summary.burdenMeasurementScope; },
  },
  {
    name: "burden measurement scope overstates total context reduction",
    mutate(summary) {
      summary.burdenMeasurementScope ??= {};
      summary.burdenMeasurementScope.comparisonBoundary = "Candidate word deltas prove lower total orchestration and reviewer context.";
    },
  },
  {
    name: "traversing historical raw bundle path",
    mutate(summary) { summary.historicalRawBundles[0].location = ".tmp/game-art-evals/../candidate-design-direction"; },
  },
  {
    name: "nonexistent route path",
    mutate(summary) {
      const oldPath = summary.fixtureResults[0].routeFiles[0].path;
      const newPath = `${oldPath}.missing`;
      summary.fixtureResults[0].routeFiles[0].path = newPath;
      summary.fixtureResults[0].loadedContext.files = summary.fixtureResults[0].loadedContext.files.map((entry) => entry === oldPath ? newPath : entry);
    },
  },
  {
    name: "forged historical route hash",
    mutate(summary, evidence) {
      const designEvidence = evidence.records.find(({ fixtureId }) => fixtureId === "design-direction");
      const designSummary = summary.fixtureResults.find(({ fixtureId }) => fixtureId === "design-direction");
      const forgedHash = `sha256:${"0".repeat(64)}`;
      designEvidence.routeIdentity[0].sha256 = forgedHash;
      designSummary.routeFiles[0].sha256 = forgedHash;
      summary.committedEvidence.hash = semanticHash(evidence);
    },
  },
  {
    name: "candidate commit substitution",
    mutate(summary, evidence) {
      const substituteCommit = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
      summary.candidateCommit = substituteCommit;
      evidence.candidateCommit = substituteCommit;
      for (const record of evidence.records) record.run.candidateCommit = substituteCommit;
      summary.committedEvidence.hash = semanticHash(evidence);
    },
  },
  {
    name: "historical route path substitution",
    mutate(summary, evidence) {
      const designEvidence = evidence.records.find(({ fixtureId }) => fixtureId === "design-direction");
      const designSummary = summary.fixtureResults.find(({ fixtureId }) => fixtureId === "design-direction");
      const oldPath = designEvidence.routeIdentity[0].path;
      const newPath = "plugins/game-production-workflow/skills/game-art-production/references/interactive-ui-2d.md";
      const substituteHash = "sha256:94e723b0d9dc1cc18c7a2a7d2c7df5eb7f2860089fd6b7a56283db84e624330e";
      designEvidence.routeIdentity[0].path = newPath;
      designEvidence.routeIdentity[0].sha256 = substituteHash;
      designEvidence.run.loadedContext.files = designEvidence.run.loadedContext.files.map((entry) => entry === oldPath ? newPath : entry);
      designSummary.routeFiles[0].path = newPath;
      designSummary.routeFiles[0].sha256 = substituteHash;
      designSummary.loadedContext.files = designSummary.loadedContext.files.map((entry) => entry === oldPath ? newPath : entry);
      for (const burden of [summary.burden.primaryFixtures, summary.burden.allRuns]) {
        const index = burden.loadedContext.files.indexOf(oldPath);
        burden.loadedContext.files[index] = newPath;
      }
      summary.committedEvidence.hash = semanticHash(evidence);
    },
  },
];
const acceptedCandidateMutations = candidateMutations.flatMap(({ name, mutate }) => {
  const mutation = structuredClone(candidateSummary);
  const evidenceMutation = structuredClone(candidateEvidence);
  mutate(mutation, evidenceMutation);
  try {
    validateCandidateDocuments({
      repositoryRoot,
      summary: mutation,
      evidence: evidenceMutation,
      controlSummary,
    });
    return [name];
  } catch {
    return [];
  }
});
assert.deepEqual(acceptedCandidateMutations, [], `candidate contract accepted mutations: ${acceptedCandidateMutations.join(", ")}`);

const portableRoot = path.join(repositoryRoot, ".tmp", `candidate-portable-${process.pid}`);
const portableRootLink = `${portableRoot}-root-link`;
const portableEvidenceReal = `${portableRoot}-evidence-real`;
fs.rmSync(portableRoot, { recursive: true, force: true });
fs.rmSync(portableRootLink, { recursive: true, force: true });
fs.rmSync(portableEvidenceReal, { recursive: true, force: true });
try {
  const portableFiles = [
    candidateSummaryRelative,
    candidateEvidenceRelative,
    controlSummaryRelative,
    ...new Set(candidateEvidence.records.flatMap((record) => record.routeIdentity.map(({ path: routePath }) => routePath))),
  ];
  for (const relative of portableFiles) {
    const source = path.join(repositoryRoot, relative);
    const destination = path.join(portableRoot, relative);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(source, destination);
  }
  assert.equal(fs.existsSync(path.join(portableRoot, ".tmp/game-art-evals")), false, "portable fixture must not copy ignored raw evidence");
  validateCandidateRepository(portableRoot);
  const laterRoutePath = path.join(portableRoot, candidateEvidence.records[0].routeIdentity[0].path);
  fs.appendFileSync(laterRoutePath, "\nTask 6 later route revision.\n");
  validateCandidateRepository(portableRoot);

  let symlinksSupported = true;
  try {
    fs.symlinkSync(portableRoot, portableRootLink, "dir");
  } catch (error) {
    if (["EPERM", "EACCES", "ENOTSUP"].includes(error.code)) symlinksSupported = false;
    else throw error;
  }
  if (symlinksSupported) {
    assert.throws(() => validateCandidateRepository(portableRootLink), /repository root: symbolic link substitution/);
    const portableEvidenceDirectory = path.dirname(path.join(portableRoot, candidateEvidenceRelative));
    fs.renameSync(portableEvidenceDirectory, portableEvidenceReal);
    fs.symlinkSync(portableEvidenceReal, portableEvidenceDirectory, "dir");
    assert.throws(() => validateCandidateRepository(portableRoot), /symbolic link substitution/);
  }
} finally {
  fs.rmSync(portableRootLink, { recursive: true, force: true });
  fs.rmSync(portableRoot, { recursive: true, force: true });
  fs.rmSync(portableEvidenceReal, { recursive: true, force: true });
}

assert.throws(
  () => fixtureApi.parseFixtureArguments(["prepare", "--fixture", "design-direction", "--label", "test", "--output", ".tmp/relative"]),
  /absolute/,
);
assert.throws(
  () => fixtureApi.parseFixtureArguments(["verify", "--run", ".tmp/relative"]),
  /absolute/,
);

const tempParent = path.join(repositoryRoot, ".tmp/game-art-evals");
const evaluationRootMessagePattern = /\.tmp[\\/]game-art-evals/;
assert.match(
  String.raw`D:\repository\.tmp\game-art-evals`,
  evaluationRootMessagePattern,
  "evaluation-root error matching must accept Windows separators",
);
const tempRoot = path.join(tempParent, `fixture-test-${process.pid}`);
const outsideEvalRoot = path.join(repositoryRoot, ".tmp", `fixture-outside-${process.pid}`);
const symlinkTarget = path.join(repositoryRoot, ".tmp", `fixture-symlink-target-${process.pid}`);
const symlinkRoot = path.join(tempParent, `fixture-symlink-${process.pid}`);
const runAlias = path.join(tempParent, `fixture-run-alias-${process.pid}`);
const sourceTestRepository = path.join(repositoryRoot, ".tmp", `fixture-source-repository-${process.pid}`);
const bindingRoot = path.join(tempParent, ".fixture-bindings");
const bindingsBefore = new Set(fs.existsSync(bindingRoot) ? fs.readdirSync(bindingRoot) : []);
fs.rmSync(tempRoot, { recursive: true, force: true });
fs.rmSync(outsideEvalRoot, { recursive: true, force: true });
fs.rmSync(symlinkRoot, { recursive: true, force: true });
fs.rmSync(runAlias, { recursive: true, force: true });
fs.rmSync(symlinkTarget, { recursive: true, force: true });
fs.rmSync(sourceTestRepository, { recursive: true, force: true });
fs.mkdirSync(tempRoot, { recursive: true });

try {
  const orderedTree = path.join(tempRoot, "hash-order-a");
  const reversedTree = path.join(tempRoot, "hash-order-b");
  const treeEntries = [
    ["alpha/one.txt", "one\n"],
    ["beta/nested/two.txt", "two\n"],
    ["root.txt", "root\n"],
  ];
  for (const [relative, content] of treeEntries) {
    const file = path.join(orderedTree, relative);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  }
  for (const [relative, content] of [...treeEntries].reverse()) {
    const file = path.join(reversedTree, relative);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  }
  assert.equal(fixtureApi.hashTree(orderedTree), fixtureApi.hashTree(reversedTree));

  assert.throws(
    () => fixtureApi.prepareFixture({
      pluginRoot,
      fixtureId: "design-direction",
      label: "outside-contract",
      outputRoot: outsideEvalRoot,
    }),
    evaluationRootMessagePattern,
  );

  fs.mkdirSync(symlinkTarget, { recursive: true });
  let symlinksSupported = true;
  try {
    fs.symlinkSync(symlinkTarget, symlinkRoot, "dir");
  } catch (error) {
    if (["EPERM", "EACCES", "ENOTSUP"].includes(error.code)) symlinksSupported = false;
    else throw error;
  }
  if (symlinksSupported) {
    assert.throws(
      () => fixtureApi.prepareFixture({
        pluginRoot,
        fixtureId: "design-direction",
        label: "symlink-contract",
        outputRoot: path.join(symlinkRoot, "escaped-run"),
      }),
      /symbolic link/,
    );
  }

  for (const id of ids) {
    const runRoot = path.join(tempRoot, id);
    const prepared = fixtureApi.prepareFixture({
      pluginRoot,
      fixtureId: id,
      label: "contract-test",
      outputRoot: runRoot,
    });
    assert.equal(prepared.fixtureId, id);
    assert.match(prepared.sourceTreeHash, /^sha256:[a-f0-9]{64}$/);
    assert(fs.existsSync(path.join(runRoot, "fixture-lock.json")));
    for (const relative of publicObservationFiles) {
      assert(fs.existsSync(path.join(runRoot, relative)), `${id}: fresh prepared fixture lacks worker-visible ${relative}`);
    }

    const lock = JSON.parse(fs.readFileSync(path.join(runRoot, "fixture-lock.json"), "utf8"));
    const publicContractPath = path.join(runRoot, publicObservationFiles[0]);
    const publicTemplatePath = path.join(runRoot, publicObservationFiles[1]);
    const publicHelperPath = path.join(runRoot, publicObservationFiles[2]);
    const preparedContract = JSON.parse(fs.readFileSync(publicContractPath, "utf8"));
    const preparedTemplate = JSON.parse(fs.readFileSync(publicTemplatePath, "utf8"));
    assert.deepEqual(preparedContract, publicObservationContract, `${id}: prepared observation contract drifted from its canonical source`);
    assert.deepEqual(
      preparedContract.resultContract.lifecycle.durableTaskFields,
      expectedDurableTaskFields,
      `${id}: prepared contract must expose every exact TASK durable-field prefix accepted by the lifecycle parser`,
    );
    assert.match(
      preparedContract.resultContract.lifecycle.durableTaskPrefixRule,
      /after optional enclosing Markdown backticks are removed.*must begin with the exact token/iu,
      `${id}: prepared contract must explain how TASK prefix parsing treats Markdown backticks`,
    );
    assert.deepEqual(Object.keys(preparedTemplate).sort(), [...publicObservationContract.observation.requiredKeys].sort());
    assert.equal(preparedTemplate.schemaVersion, 2);
    assert.equal(preparedTemplate.sourceTreeHash, lock.sourceTreeHash);
    assert.deepEqual(preparedTemplate.taskStateBefore, lock.taskStateBefore);
    assert.deepEqual(Object.keys(preparedTemplate.loadedContext).sort(), ["project", "route", "schemaVersion", "support"]);
    assert.deepEqual(lock.observationGuidance, {
      contractPath: publicObservationFiles[0],
      contractHash: fileHash(publicContractPath),
      templatePath: publicObservationFiles[1],
      templateHash: fileHash(publicTemplatePath),
      helperPath: publicObservationFiles[2],
      helperHash: fileHash(publicHelperPath),
    });
    assert(!JSON.stringify(preparedContract).includes(repositoryRoot), `${id}: public observation contract contains a machine path`);
    assert(!JSON.stringify(preparedTemplate).includes(repositoryRoot), `${id}: public observation template contains a machine path`);
    assert.equal(lock.sourceTreeHash, prepared.sourceTreeHash);
    assert.deepEqual(lock.taskStateBefore, prepared.taskStateBefore);
    assert.equal(fixtureApi.hashTree(runRoot, operationalFiles), lock.sourceTreeHash);
    assert.throws(
      () => fixtureApi.prepareFixture({ pluginRoot, fixtureId: id, label: "again", outputRoot: runRoot }),
      /non-empty/,
    );

    const fixture = fixtureApi.loadFixture(pluginRoot, id);
    const { manifest: artifactManifest, manifestPath: artifactManifestPath } =
      materializeArtifactContract(runRoot, fixture);

    const observation = {
      schemaVersion: 1,
      sourceTreeHash: lock.sourceTreeHash,
      outputTreeHash: outputHash(runRoot),
      taskStateBefore: lock.taskStateBefore,
      taskStateAfter: lock.taskStateBefore,
      loadedContext: {
        metadataWords: 12,
        bodyWords: 34,
        referenceWords: 56,
        files: ["production/TASK.md"],
      },
      cycles: 1,
      elapsedMinutes: 5,
      terminalClaim: "Objective fixture verification completed; subjective review remains pending.",
    };
    fs.writeFileSync(path.join(runRoot, "observation.json"), `${JSON.stringify(observation, null, 2)}\n`);
    const result = fixtureApi.verifyFixture({ pluginRoot, runRoot });
    assert.equal(result.schemaVersion, 1);
    assert.equal(result.fixtureId, id);
    assert.equal(result.subjectiveReview.status, "Pending");
    assert.equal(result.subjectiveReview.reviewerIndependence, "Unassessed");
    assert.match(result.outputTreeHash, /^sha256:[a-f0-9]{64}$/);
    assert(fs.existsSync(path.join(runRoot, "result.json")));
    assert(result.objectiveChecks.every((check) => check.status === "Pass"), JSON.stringify(result.objectiveChecks, null, 2));
    assert(result.objectiveChecks.some((check) => check.id === "task-state-claims" && check.status === "Pass"));
    assert(result.objectiveChecks.some((check) => check.id === "required-artifacts" && check.status === "Pass"));
    assert(!result.objectiveChecks.some((check) => check.id === "lifecycle-handoff"));

    if (id === "design-direction") {
      if (symlinksSupported) {
        fs.symlinkSync(runRoot, runAlias, "dir");
        assert.throws(
          () => fixtureApi.verifyFixture({ pluginRoot, runRoot: runAlias }),
          /symbolic link/,
        );
        fs.rmSync(runAlias, { recursive: true, force: true });
      }

      const mutableFile = path.join(runRoot, "web/index.html");
      const mutableContent = fs.readFileSync(mutableFile, "utf8");
      fs.appendFileSync(mutableFile, "\n<!-- changed after observation -->\n");
      const outputTamperResult = fixtureApi.verifyFixture({ pluginRoot, runRoot });
      assert(outputTamperResult.objectiveChecks.some((check) => check.id === "output-tree-claim" && check.status === "Fail"));
      fs.writeFileSync(mutableFile, mutableContent);

      const lockPath = path.join(runRoot, "fixture-lock.json");
      fs.chmodSync(lockPath, 0o644);
      fs.writeFileSync(lockPath, `${JSON.stringify({ ...lock, label: "forged-label" }, null, 2)}\n`);
      assert.throws(
        () => fixtureApi.verifyFixture({ pluginRoot, runRoot }),
        /trusted binding/,
      );
      fs.writeFileSync(lockPath, `${JSON.stringify(lock, null, 2)}\n`);
      fs.chmodSync(lockPath, 0o444);
      if (symlinksSupported) {
        const externalLock = path.join(symlinkTarget, "external-lock.json");
        fs.writeFileSync(externalLock, `${JSON.stringify(lock, null, 2)}\n`);
        fs.rmSync(lockPath);
        fs.symlinkSync(externalLock, lockPath);
        assert.throws(
          () => fixtureApi.verifyFixture({ pluginRoot, runRoot }),
          /fixture lock.*symbolic link/,
        );
        fs.rmSync(lockPath);
        fs.writeFileSync(lockPath, `${JSON.stringify(lock, null, 2)}\n`);
        fs.chmodSync(lockPath, 0o444);
      }

      const bindingIdentity = process.platform === "win32" ? runRoot.toLocaleLowerCase("en-US") : runRoot;
      const bindingKey = crypto.createHash("sha256").update(bindingIdentity).digest("hex");
      const trustedBindingPath = path.join(bindingRoot, `${bindingKey}.json`);
      const trustedBinding = JSON.parse(fs.readFileSync(trustedBindingPath, "utf8"));
      fs.chmodSync(trustedBindingPath, 0o644);
      fs.writeFileSync(trustedBindingPath, `${JSON.stringify({ ...trustedBinding, lockHash: `sha256:${"0".repeat(64)}` }, null, 2)}\n`);
      assert.throws(
        () => fixtureApi.verifyFixture({ pluginRoot, runRoot }),
        /trusted binding/,
      );
      fs.writeFileSync(trustedBindingPath, `${JSON.stringify(trustedBinding, null, 2)}\n`);
      fs.chmodSync(trustedBindingPath, 0o444);
      if (symlinksSupported) {
        const externalBinding = path.join(symlinkTarget, "forged-binding.json");
        fs.writeFileSync(externalBinding, `${JSON.stringify(trustedBinding, null, 2)}\n`);
        fs.rmSync(trustedBindingPath);
        fs.symlinkSync(externalBinding, trustedBindingPath);
        assert.throws(
          () => fixtureApi.verifyFixture({ pluginRoot, runRoot }),
          /trusted binding.*symbolic link/,
        );
        fs.rmSync(trustedBindingPath);
        fs.writeFileSync(trustedBindingPath, `${JSON.stringify(trustedBinding, null, 2)}\n`);
        fs.chmodSync(trustedBindingPath, 0o444);
      }

      const reorderedState = Object.fromEntries(Object.entries(lock.taskStateBefore).reverse());
      const reorderedObservation = {
        ...observation,
        taskStateBefore: reorderedState,
        taskStateAfter: reorderedState,
      };
      fs.writeFileSync(path.join(runRoot, "observation.json"), `${JSON.stringify(reorderedObservation, null, 2)}\n`);
      const reorderedResult = fixtureApi.verifyFixture({ pluginRoot, runRoot });
      assert(reorderedResult.objectiveChecks.some((check) => check.id === "task-state-claims" && check.status === "Pass"));

      const falseTaskClaim = {
        ...observation,
        taskStateAfter: { ...lock.taskStateBefore, status: "Implementing" },
      };
      fs.writeFileSync(path.join(runRoot, "observation.json"), `${JSON.stringify(falseTaskClaim, null, 2)}\n`);
      const falseTaskResult = fixtureApi.verifyFixture({ pluginRoot, runRoot });
      assert(falseTaskResult.objectiveChecks.some((check) => check.id === "task-state-claims" && check.status === "Fail"));

      const invalidState = {
        ...observation,
        taskStateAfter: { ...lock.taskStateBefore, extra: "untrusted" },
      };
      fs.writeFileSync(path.join(runRoot, "observation.json"), `${JSON.stringify(invalidState, null, 2)}\n`);
      assert.throws(
        () => fixtureApi.verifyFixture({ pluginRoot, runRoot }),
        /taskStateAfter/,
      );

      const invalidContext = {
        ...observation,
        loadedContext: {
          metadataWords: "not-a-number",
          bodyWords: -1,
          referenceWords: 0,
          files: [{}],
        },
      };
      fs.writeFileSync(path.join(runRoot, "observation.json"), `${JSON.stringify(invalidContext, null, 2)}\n`);
      assert.throws(
        () => fixtureApi.verifyFixture({ pluginRoot, runRoot }),
        /loadedContext/,
      );

      const prohibitedObservation = {
        ...observation,
        terminalClaim: "Final art approved by deterministic checks.",
      };
      fs.writeFileSync(path.join(runRoot, "observation.json"), `${JSON.stringify(prohibitedObservation, null, 2)}\n`);
      const prohibitedResult = fixtureApi.verifyFixture({ pluginRoot, runRoot });
      assert(prohibitedResult.objectiveChecks.some((check) => check.id === "prohibited-claims" && check.status === "Fail"));
      fs.writeFileSync(path.join(runRoot, "observation.json"), `${JSON.stringify(observation, null, 2)}\n`);
    }

    if (id === "composite-runtime") {
      const runVerifier = path.join(runRoot, "web/verify.mjs");
      const verifierContent = fs.readFileSync(runVerifier, "utf8");
      fs.writeFileSync(runVerifier, "process.exit(0);\n");
      const substitutedObservation = {
        ...observation,
        outputTreeHash: outputHash(runRoot),
      };
      fs.writeFileSync(path.join(runRoot, "observation.json"), `${JSON.stringify(substitutedObservation, null, 2)}\n`);
      const substitutedResult = fixtureApi.verifyFixture({ pluginRoot, runRoot });
      assert(substitutedResult.objectiveChecks.some((check) => check.id === "local-state-verifier" && check.status === "Fail"));
      fs.writeFileSync(runVerifier, verifierContent);
      fs.writeFileSync(path.join(runRoot, "observation.json"), `${JSON.stringify(observation, null, 2)}\n`);

      const statePath = path.join(runRoot, "web/state.mjs");
      const stateContent = fs.readFileSync(statePath, "utf8");
      fs.writeFileSync(statePath, "export const SLOT_COUNT = 8; export const createInventoryState = () => ({ slots: [] }); export const reduceInventory = (state) => state;\n");
      const brokenStateObservation = { ...observation, outputTreeHash: outputHash(runRoot) };
      fs.writeFileSync(path.join(runRoot, "observation.json"), `${JSON.stringify(brokenStateObservation, null, 2)}\n`);
      const brokenStateResult = fixtureApi.verifyFixture({ pluginRoot, runRoot });
      assert(brokenStateResult.objectiveChecks.some((check) => check.id === "local-state-verifier" && check.status === "Fail"));
      fs.writeFileSync(statePath, stateContent);

      fs.writeFileSync(statePath, "process.exit(0);\n");
      const terminatingStateObservation = { ...observation, outputTreeHash: outputHash(runRoot) };
      fs.writeFileSync(path.join(runRoot, "observation.json"), `${JSON.stringify(terminatingStateObservation, null, 2)}\n`);
      const terminatingStateResult = fixtureApi.verifyFixture({ pluginRoot, runRoot });
      assert(terminatingStateResult.objectiveChecks.some((check) => check.id === "local-state-verifier" && check.status === "Fail"));
      fs.writeFileSync(statePath, stateContent);

      const missingArtifactRelative = artifactManifest.artifacts.find(
        ({ role }) => role === "editable-source",
      ).path;
      const missingArtifact = path.join(runRoot, missingArtifactRelative);
      const missingArtifactContent = fs.readFileSync(missingArtifact);
      fs.rmSync(missingArtifact);
      const missingArtifactObservation = { ...observation, outputTreeHash: outputHash(runRoot) };
      fs.writeFileSync(path.join(runRoot, "observation.json"), `${JSON.stringify(missingArtifactObservation, null, 2)}\n`);
      const missingArtifactResult = fixtureApi.verifyFixture({ pluginRoot, runRoot });
      assert(missingArtifactResult.objectiveChecks.some((check) => check.id === "required-artifacts" && check.status === "Fail"));
      fs.writeFileSync(missingArtifact, missingArtifactContent);

      const writeArtifactMutation = (manifest) => {
        fs.writeFileSync(artifactManifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
        const mutatedObservation = { ...observation, outputTreeHash: outputHash(runRoot) };
        fs.writeFileSync(path.join(runRoot, "observation.json"), `${JSON.stringify(mutatedObservation, null, 2)}\n`);
        return fixtureApi.verifyFixture({ pluginRoot, runRoot });
      };
      const expectArtifactFailure = (name, manifest, evidencePattern) => {
        const mutationResult = writeArtifactMutation(manifest);
        const artifactCheck = mutationResult.objectiveChecks.find(({ id: checkId }) => checkId === "required-artifacts");
        assert.equal(artifactCheck.status, "Fail", `${name}: artifact mutation passed`);
        assert.match(artifactCheck.evidence.join("\n"), evidencePattern, `${name}: wrong failure evidence`);
      };
      const captureEntry = artifactManifest.artifacts.find(({ role }) => role === "runtime-capture");
      const editableEntry = artifactManifest.artifacts.find(({ role }) => role === "editable-source");
      const outsidePath = path.join(tempRoot, "outside-artifact.svg");
      fs.writeFileSync(outsidePath, "<svg/>\n");

      expectArtifactFailure(
        "missing required role",
        {
          ...artifactManifest,
          artifacts: artifactManifest.artifacts.filter(({ role }) => role !== "source-export-import"),
        },
        /source-export-import.*requires/i,
      );
      expectArtifactFailure(
        "outside-run artifact path",
        {
          ...artifactManifest,
          artifacts: artifactManifest.artifacts.map((entry) => entry === editableEntry
            ? { ...entry, path: path.relative(runRoot, outsidePath) }
            : entry),
        },
        /outside run root/i,
      );

      const emptyArtifactContent = fs.readFileSync(missingArtifact);
      fs.writeFileSync(missingArtifact, "");
      expectArtifactFailure("empty artifact", artifactManifest, /empty/i);
      fs.writeFileSync(missingArtifact, emptyArtifactContent);

      const unsupportedCapture = "artifacts/contract/unsupported-capture.svg";
      fs.writeFileSync(path.join(runRoot, unsupportedCapture), "<svg/>\n");
      expectArtifactFailure(
        "unsupported capture type",
        {
          ...artifactManifest,
          artifacts: artifactManifest.artifacts.map((entry) => entry === captureEntry
            ? { ...entry, path: unsupportedCapture, mediaType: "image/svg+xml" }
            : entry),
        },
        /runtime-capture.*PNG-only/i,
      );

      const falseEditable = "artifacts/contract/false-editable.png";
      fs.writeFileSync(path.join(runRoot, falseEditable), pngFixture(1280, 720));
      expectArtifactFailure(
        "false editable role",
        {
          ...artifactManifest,
          artifacts: artifactManifest.artifacts.map((entry) => entry === editableEntry
            ? { ...entry, path: falseEditable }
            : entry),
        },
        /editable-source.*extension/i,
      );

      const falseEditableSource = "artifacts/contract/false-editable.svg";
      fs.writeFileSync(path.join(runRoot, falseEditableSource), "plain text is not editable SVG source\n");
      expectArtifactFailure(
        "false editable source role",
        {
          ...artifactManifest,
          artifacts: artifactManifest.artifacts.map((entry) => entry === editableEntry
            ? { ...entry, path: falseEditableSource }
            : entry),
        },
        /editable-source.*not recognizable/i,
      );

      const excludedEditable = fixture.artifactContract.excludedPaths[0];
      assert(excludedEditable, "composite fixture must exclude its flattened concept input");
      expectArtifactFailure(
        "excluded fixture input role",
        {
          ...artifactManifest,
          artifacts: artifactManifest.artifacts.map((entry) => entry === editableEntry
            ? { ...entry, path: excludedEditable }
            : entry),
        },
        /editable-source.*excluded fixture input/i,
      );

      const falseRuntime = "artifacts/contract/false-runtime.png";
      fs.writeFileSync(path.join(runRoot, falseRuntime), "not a raster capture\n");
      expectArtifactFailure(
        "false runtime role",
        {
          ...artifactManifest,
          artifacts: artifactManifest.artifacts.map((entry) => entry === captureEntry
            ? { ...entry, path: falseRuntime }
            : entry),
        },
        /runtime-capture.*signature/i,
      );

      const falseDimensions = "artifacts/contract/false-dimensions.png";
      fs.writeFileSync(path.join(runRoot, falseDimensions), pngFixture(1, 1));
      expectArtifactFailure(
        "false runtime dimensions",
        {
          ...artifactManifest,
          artifacts: artifactManifest.artifacts.map((entry) => entry === captureEntry
            ? { ...entry, path: falseDimensions }
            : entry),
        },
        /runtime-capture.*declared viewport.*does not match raster dimensions/i,
      );

      const truncatedRuntime = "artifacts/contract/truncated-runtime.png";
      const truncatedPng = Buffer.alloc(24);
      Buffer.from("89504e470d0a1a0a", "hex").copy(truncatedPng, 0);
      truncatedPng.writeUInt32BE(1280, 16);
      truncatedPng.writeUInt32BE(720, 20);
      fs.writeFileSync(path.join(runRoot, truncatedRuntime), truncatedPng);
      expectArtifactFailure(
        "truncated raster container",
        {
          ...artifactManifest,
          artifacts: artifactManifest.artifacts.map((entry) => entry === captureEntry
            ? { ...entry, path: truncatedRuntime }
            : entry),
        },
        /runtime-capture.*PNG.*(?:IDAT|structure)/i,
      );

      const falseInterlacedRuntime = "artifacts/contract/false-interlaced-dimensions.png";
      const falseInterlacedHeader = Buffer.alloc(13);
      falseInterlacedHeader.writeUInt32BE(1280, 0);
      falseInterlacedHeader.writeUInt32BE(720, 4);
      falseInterlacedHeader[8] = 8;
      falseInterlacedHeader[9] = 2;
      falseInterlacedHeader[12] = 1;
      fs.writeFileSync(path.join(runRoot, falseInterlacedRuntime), Buffer.concat([
        Buffer.from("89504e470d0a1a0a", "hex"),
        pngChunk("IHDR", falseInterlacedHeader),
        pngChunk("IDAT", zlib.deflateSync(Buffer.from([0]))),
        pngChunk("IEND"),
      ]));
      expectArtifactFailure(
        "false interlaced runtime dimensions",
        {
          ...artifactManifest,
          artifacts: artifactManifest.artifacts.map((entry) => entry === captureEntry
            ? { ...entry, path: falseInterlacedRuntime }
            : entry),
        },
        /runtime-capture.*PNG.*(?:IDAT dimensions|scanline)/i,
      );

      const frameHeader = Buffer.alloc(11);
      frameHeader.writeUInt16BE(11, 0);
      frameHeader[2] = 8;
      frameHeader.writeUInt16BE(720, 3);
      frameHeader.writeUInt16BE(1280, 5);
      frameHeader[7] = 1;
      frameHeader[8] = 1;
      frameHeader[9] = 0x11;
      const scanHeader = Buffer.from([0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00]);
      const undecodableJpegRuntime = "artifacts/contract/marker-assembled-undecodable.jpg";
      fs.writeFileSync(path.join(runRoot, undecodableJpegRuntime), Buffer.concat([
        Buffer.from("ffd8ffc0", "hex"),
        frameHeader,
        Buffer.from("ffda", "hex"),
        scanHeader,
        Buffer.from([0x01]),
        Buffer.from("ffd9", "hex"),
      ]));
      expectArtifactFailure(
        "marker-assembled undecodable JPEG",
        {
          ...artifactManifest,
          artifacts: artifactManifest.artifacts.map((entry) => entry === captureEntry
            ? { ...entry, path: undecodableJpegRuntime, mediaType: "image/jpeg" }
            : entry),
        },
        /runtime-capture.*PNG-only/i,
      );

      const jpegExtensionRuntime = "artifacts/contract/runtime-capture.jpeg";
      fs.writeFileSync(path.join(runRoot, jpegExtensionRuntime), pngFixture(1280, 720));
      expectArtifactFailure(
        ".jpeg runtime evidence",
        {
          ...artifactManifest,
          artifacts: artifactManifest.artifacts.map((entry) => entry === captureEntry
            ? { ...entry, path: jpegExtensionRuntime, mediaType: "image/jpeg" }
            : entry),
        },
        /runtime-capture.*PNG-only.*\.jpeg/i,
      );

      expectArtifactFailure(
        "image/jpeg runtime claim",
        {
          ...artifactManifest,
          artifacts: artifactManifest.artifacts.map((entry) => entry === captureEntry
            ? { ...entry, mediaType: "image/jpeg" }
            : entry),
        },
        /runtime-capture.*PNG-only.*image\/png/i,
      );

      fs.writeFileSync(artifactManifestPath, `${JSON.stringify(artifactManifest, null, 2)}\n`);

      if (symlinksSupported) {
        const externalArtifact = path.join(symlinkTarget, "external-artifact.txt");
        fs.writeFileSync(externalArtifact, "outside run\n");
        fs.rmSync(missingArtifact);
        fs.symlinkSync(externalArtifact, missingArtifact);
        assert.throws(
          () => fixtureApi.verifyFixture({ pluginRoot, runRoot }),
          /symbolic links/,
        );
        fs.rmSync(missingArtifact);
        fs.writeFileSync(missingArtifact, missingArtifactContent);

        const manifestTarget = path.join(symlinkTarget, "external-manifest.json");
        fs.writeFileSync(manifestTarget, `${JSON.stringify(artifactManifest, null, 2)}\n`);
        fs.rmSync(artifactManifestPath);
        fs.symlinkSync(manifestTarget, artifactManifestPath);
        assert.throws(
          () => fixtureApi.verifyFixture({ pluginRoot, runRoot }),
          /symbolic links/,
        );
        fs.rmSync(artifactManifestPath);
        fs.writeFileSync(artifactManifestPath, `${JSON.stringify(artifactManifest, null, 2)}\n`);

        fs.rmSync(runVerifier);
        fs.symlinkSync(externalArtifact, runVerifier);
        assert.throws(
          () => fixtureApi.verifyFixture({ pluginRoot, runRoot }),
          /symbolic links/,
        );
        fs.rmSync(runVerifier);
        fs.writeFileSync(runVerifier, verifierContent);
      }
      fs.writeFileSync(path.join(runRoot, "observation.json"), `${JSON.stringify(observation, null, 2)}\n`);
    }
  }

  const prepareLifecycleRun = (fixtureId, name) => {
    const runRoot = path.join(tempRoot, name);
    const lock = fixtureApi.prepareFixture({
      pluginRoot,
      fixtureId,
      label: `lifecycle-${name}`,
      outputRoot: runRoot,
    });
    const fixture = fixtureApi.loadFixture(pluginRoot, fixtureId);
    materializeArtifactContract(runRoot, fixture);
    return { runRoot, lock };
  };
  const writeLifecycleObservation = (runRoot, lock, taskStateAfter, resultDeclaration) => {
    const observation = {
      schemaVersion: 2,
      sourceTreeHash: lock.sourceTreeHash,
      outputTreeHash: outputHash(runRoot),
      taskStateBefore: lock.taskStateBefore,
      taskStateAfter,
      loadedContext: categorizedLoadedContext(),
      cycles: 1,
      elapsedMinutes: 1,
      terminalClaim: "Declared lifecycle handoff is ready for semantic verification; subjective authorities remain pending.",
      declaredResult: resultDeclaration,
    };
    fs.writeFileSync(path.join(runRoot, "observation.json"), `${JSON.stringify(observation, null, 2)}\n`);
    return observation;
  };
  const configureImplementedRun = (runRoot, lock, overrides = {}) => {
    const declaration = declaredResult(overrides.declaredResult);
    const status = overrides.status ?? "Implementing";
    const nextAction = declaration.nextAction;
    writeTaskHandoff(runRoot, {
      Status: `\`${status}\``,
      "Representative proof": `\`${declaration.representativeProof}${declaration.representativeProof === "Passed" ? " — representative runtime evidence recorded" : ""}\``,
      "Assembly precheck": `\`${declaration.assemblyPrecheck}${declaration.assemblyPrecheck === "Passed" ? " — actual-size native assembly recorded" : ""}\``,
      Result: `\`${declaration.taskResult}${declaration.taskResult === "Implemented" ? " — integrated runtime candidate recorded" : ""}\``,
      "Next action": nextAction,
      "Design acceptance": `\`${declaration.designAcceptance}\``,
      "Producer acceptance": `\`${declaration.producerAcceptance}\``,
    });
    const taskStateAfter = writeProjectState(runRoot, status, nextAction);
    return writeLifecycleObservation(runRoot, lock, taskStateAfter, declaration);
  };
  const acceptedReviewerBypasses = [];
  const expectLifecycleRejection = (name, operation, expectedError) => {
    try {
      operation();
      acceptedReviewerBypasses.push(name);
    } catch (error) {
      assert.match(error.message, expectedError, `${name} failed for the wrong reason`);
    }
  };
  const auditedLegacyImplementedAction = "Have the named independent reviewer inspect the running 1280×720 experience and record design/producer decisions without treating deterministic checks as artistic passage.";
  const auditedLegacyProposedAction = "Human producer reviews the three candidate desktop captures and recommended portrait overflow capture, then selects, returns, or bounds one direction.";

  const contractOnlyLifecycle = prepareLifecycleRun("design-direction", "public-contract-only");
  const contractOnlyNextAction = "Present the runtime-backed candidates for human direction selection.";
  writeTaskHandoff(contractOnlyLifecycle.runRoot, {
    Status: "`Clarifying`",
    "Representative proof": "`Pending`",
    "Assembly precheck": "`Pending`",
    Result: "`Proposed — runtime-backed direction candidates await human selection`",
    "Next action": contractOnlyNextAction,
    "Design acceptance": "`Pending`",
    "Producer acceptance": "`Pending`",
  });
  writeProjectState(contractOnlyLifecycle.runRoot, "Clarifying", contractOnlyNextAction);
  const workerContract = JSON.parse(fs.readFileSync(
    path.join(contractOnlyLifecycle.runRoot, "fixture-guidance/observation-contract.json"),
    "utf8",
  ));
  const workerObservation = JSON.parse(fs.readFileSync(
    path.join(contractOnlyLifecycle.runRoot, "fixture-guidance/observation-template.json"),
    "utf8",
  ));
  assert.deepEqual(Object.keys(workerContract.observation.fields).sort(), [...workerContract.observation.requiredKeys].sort());
  assert.deepEqual(workerContract.loadedContext.exactCategories, ["project", "route", "support"]);
  assert.match(workerContract.loadedContext.categoryMeaning.support, /environment-mandated.*excluded from routed-product/iu);
  workerObservation.loadedContext.project = {
    metadataWords: 2,
    bodyWords: 4,
    referenceWords: 0,
    files: ["project://production/TASK.md", "fixture://request"],
    hash: "refreshed-by-public-helper",
  };
  workerObservation.loadedContext.route = {
    metadataWords: 0,
    bodyWords: 0,
    referenceWords: 6,
    files: ["route://game-production-system/SKILL.md"],
    hash: "refreshed-by-public-helper",
  };
  workerObservation.loadedContext.support = {
    metadataWords: 0,
    bodyWords: 0,
    referenceWords: 3,
    files: ["support://superpowers/test-driven-development/SKILL.md"],
    hash: "refreshed-by-public-helper",
  };
  workerObservation.cycles = 2;
  workerObservation.elapsedMinutes = 7;
  workerObservation.terminalClaim = "Runtime-backed direction is proposed; independent subjective review and human selection remain pending.";
  workerObservation.declaredResult.nextAction = contractOnlyNextAction;
  fs.writeFileSync(
    path.join(contractOnlyLifecycle.runRoot, "observation.json"),
    `${JSON.stringify(workerObservation, null, 2)}\n`,
  );
  const publicHelperRun = spawnSync(
    process.execPath,
    [path.join(contractOnlyLifecycle.runRoot, "fixture-guidance/observation-helper.mjs"), "refresh"],
    { cwd: contractOnlyLifecycle.runRoot, encoding: "utf8" },
  );
  assert.equal(publicHelperRun.status, 0, publicHelperRun.stderr || publicHelperRun.stdout);
  assert.match(publicHelperRun.stdout, /PASS refreshed observation\.json sha256:/u);
  const contractOnlyResult = fixtureApi.verifyFixture({
    pluginRoot,
    runRoot: contractOnlyLifecycle.runRoot,
  });
  assert(contractOnlyResult.objectiveChecks.every(({ status }) => status === "Pass"), JSON.stringify(contractOnlyResult.objectiveChecks, null, 2));
  assert.deepEqual(contractOnlyResult.loadedContext, {
    metadataWords: 2,
    bodyWords: 4,
    referenceWords: 6,
    files: ["project://production/TASK.md", "fixture://request", "route://game-production-system/SKILL.md"],
  });
  assert.deepEqual(contractOnlyResult.supportContext, {
    metadataWords: 0,
    bodyWords: 0,
    referenceWords: 3,
    files: ["support://superpowers/test-driven-development/SKILL.md"],
  });

  const implementedLifecycle = prepareLifecycleRun("composite-runtime", "implemented-lifecycle");

  configureImplementedRun(implementedLifecycle.runRoot, implementedLifecycle.lock, { status: "Ready" });
  assert.throws(
    () => fixtureApi.verifyFixture({ pluginRoot, runRoot: implementedLifecycle.runRoot }),
    /Implemented.*Implementing/i,
    "Implemented professional results must not remain Ready",
  );

  configureImplementedRun(implementedLifecycle.runRoot, implementedLifecycle.lock, {
    declaredResult: { taskResult: "Not started" },
  });
  assert.throws(
    () => fixtureApi.verifyFixture({ pluginRoot, runRoot: implementedLifecycle.runRoot }),
    /task Result.*Not started/i,
    "Implemented professional results must update the durable task Result",
  );

  configureImplementedRun(implementedLifecycle.runRoot, implementedLifecycle.lock, {
    declaredResult: { representativeProof: "Pending" },
  });
  assert.throws(
    () => fixtureApi.verifyFixture({ pluginRoot, runRoot: implementedLifecycle.runRoot }),
    /representative proof.*Passed/i,
    "Implemented professional results must map passed representative proof",
  );

  configureImplementedRun(implementedLifecycle.runRoot, implementedLifecycle.lock, {
    declaredResult: { assemblyPrecheck: "Pending" },
  });
  assert.throws(
    () => fixtureApi.verifyFixture({ pluginRoot, runRoot: implementedLifecycle.runRoot }),
    /assembly precheck.*Passed/i,
    "Implemented professional results must map the passed assembly precheck",
  );

  configureImplementedRun(implementedLifecycle.runRoot, implementedLifecycle.lock, {
    declaredResult: {
      nextAction: "Build and inspect the first native slice.",
      nextActionKind: "produce-first-slice",
    },
  });
  assert.throws(
    () => fixtureApi.verifyFixture({ pluginRoot, runRoot: implementedLifecycle.runRoot }),
    /next action kind.*post-production/i,
    "Implemented professional results must reject stale first-slice next actions",
  );

  const validImplementedObservation = configureImplementedRun(
    implementedLifecycle.runRoot,
    implementedLifecycle.lock,
  );
  const validImplementedResult = fixtureApi.verifyFixture({
    pluginRoot,
    runRoot: implementedLifecycle.runRoot,
  });
  assert.equal(validImplementedResult.taskStateAfter.status, "Implementing");
  assert.deepEqual(validImplementedResult.declaredResult, validImplementedObservation.declaredResult);
  assert(validImplementedResult.objectiveChecks.some(
    (entry) => entry.id === "lifecycle-handoff" && entry.status === "Pass",
  ));

  replaceTaskField(
    implementedLifecycle.runRoot,
    "Representative proof",
    "`Accepted — legacy alias must not satisfy a schema-2 Passed declaration`",
  );
  fs.writeFileSync(
    path.join(implementedLifecycle.runRoot, "observation.json"),
    `${JSON.stringify({
      ...validImplementedObservation,
      outputTreeHash: outputHash(implementedLifecycle.runRoot),
    }, null, 2)}\n`,
  );
  assert.throws(
    () => fixtureApi.verifyFixture({ pluginRoot, runRoot: implementedLifecycle.runRoot }),
    /Representative proof.*exact canonical semantic prefix.*fixture-guidance\/observation-contract\.json/i,
    "schema-2 TASK durable fields must begin with the public contract's canonical semantic token",
  );
  configureImplementedRun(implementedLifecycle.runRoot, implementedLifecycle.lock);

  const expectObservationContractRejection = (name, mutate, expectedError) => {
    const mutated = structuredClone(validImplementedObservation);
    mutate(mutated);
    fs.writeFileSync(
      path.join(implementedLifecycle.runRoot, "observation.json"),
      `${JSON.stringify(mutated, null, 2)}\n`,
    );
    assert.throws(
      () => fixtureApi.verifyFixture({ pluginRoot, runRoot: implementedLifecycle.runRoot }),
      (error) => {
        assert.match(error.message, expectedError, `${name}: wrong contract failure`);
        assert.match(error.message, /fixture-guidance\/observation-contract\.json/u, `${name}: diagnostic omitted the public contract`);
        return true;
      },
      `${name}: observation mutation passed`,
    );
  };
  for (const [name, mutate, expectedError] of [
    ["negative cycles", (value) => { value.cycles = -1; }, /cycles.*non-negative integer/i],
    ["fractional cycles", (value) => { value.cycles = 1.5; }, /cycles.*non-negative integer/i],
    ["negative elapsed minutes", (value) => { value.elapsedMinutes = -1; }, /elapsedMinutes.*non-negative/i],
    ["missing loaded context", (value) => { delete value.loadedContext; }, /loadedContext/i],
    ["missing context category", (value) => { delete value.loadedContext.support; }, /loadedContext.*support/i],
    ["project metadata count drift", (value) => { value.loadedContext.project.metadataWords += 1; }, /project\.hash.*category\/count\/files/i],
    ["route body count drift", (value) => { value.loadedContext.route.bodyWords += 1; }, /route\.hash.*category\/count\/files/i],
    ["support reference count drift", (value) => { value.loadedContext.support.referenceWords += 1; }, /support\.hash.*category\/count\/files/i],
    ["loaded context hash drift", (value) => { value.loadedContext.project.hash = `sha256:${"0".repeat(64)}`; }, /project\.hash.*category\/count\/files/i],
    ["loaded context category drift", (value) => {
      value.loadedContext.project.files = ["route://game-production-system/SKILL.md"];
      value.loadedContext.project.hash = contextCategoryHash("project", value.loadedContext.project);
    }, /wrong logical category/i],
    ["loaded context evidence leakage", (value) => {
      value.loadedContext.route.files = ["route://candidate-additive/evidence.json"];
      value.loadedContext.route.hash = contextCategoryHash("route", value.loadedContext.route);
    }, /prohibited sibling\/evidence\/test leakage/i],
  ]) {
    expectObservationContractRejection(name, mutate, expectedError);
  }
  for (const [name, field, checkId] of [
    ["source tree hash drift", "sourceTreeHash", "task-state-claims"],
    ["output tree hash drift", "outputTreeHash", "output-tree-claim"],
  ]) {
    const mutated = {
      ...validImplementedObservation,
      [field]: `sha256:${"0".repeat(64)}`,
    };
    fs.writeFileSync(
      path.join(implementedLifecycle.runRoot, "observation.json"),
      `${JSON.stringify(mutated, null, 2)}\n`,
    );
    const mutationResult = fixtureApi.verifyFixture({ pluginRoot, runRoot: implementedLifecycle.runRoot });
    const failedCheck = mutationResult.objectiveChecks.find((entry) => entry.id === checkId);
    assert.equal(failedCheck?.status, "Fail", `${name}: valid but false hash claim passed objective verification`);
    assert.match(
      failedCheck.evidence.join("\n"),
      /fixture-guidance\/observation-contract\.json/u,
      `${name}: objective diagnostic omitted the public contract`,
    );
  }
  fs.writeFileSync(
    path.join(implementedLifecycle.runRoot, "observation.json"),
    `${JSON.stringify(validImplementedObservation, null, 2)}\n`,
  );

  const missingPublicDeclaration = { ...validImplementedObservation, declaredResult: undefined };
  fs.writeFileSync(
    path.join(implementedLifecycle.runRoot, "observation.json"),
    `${JSON.stringify(missingPublicDeclaration, null, 2)}\n`,
  );
  assert.throws(
    () => fixtureApi.verifyFixture({ pluginRoot, runRoot: implementedLifecycle.runRoot }),
    /declaredResult.*fixture-guidance\/observation-contract\.json/i,
    "missing schema-2 declarations must route workers to the public contract",
  );

  const invalidPublicEnum = {
    ...validImplementedObservation,
    declaredResult: { ...validImplementedObservation.declaredResult, professionalResult: "Accepted" },
  };
  fs.writeFileSync(
    path.join(implementedLifecycle.runRoot, "observation.json"),
    `${JSON.stringify(invalidPublicEnum, null, 2)}\n`,
  );
  assert.throws(
    () => fixtureApi.verifyFixture({ pluginRoot, runRoot: implementedLifecycle.runRoot }),
    /declaredResult\.professionalResult.*fixture-guidance\/observation-contract\.json/i,
    "invalid schema-2 enum diagnostics must route workers to the public contract",
  );
  fs.writeFileSync(
    path.join(implementedLifecycle.runRoot, "observation.json"),
    `${JSON.stringify(validImplementedObservation, null, 2)}\n`,
  );

  const nonPassageCases = [
    {
      professionalResult: "Returned",
      status: "Implementing",
      taskResult: "Returned",
      nextAction: "Repair the frozen runtime criterion, then repeat independent review.",
      nextActionKind: "bounded-repair",
    },
    {
      professionalResult: "Blocked",
      status: "Clarifying",
      taskResult: "Blocked",
      nextAction: "Restore the missing observation path before any passage decision.",
      nextActionKind: "capability-enabling",
    },
  ];
  for (const fixtureCase of nonPassageCases) {
    const observation = configureImplementedRun(
      implementedLifecycle.runRoot,
      implementedLifecycle.lock,
      {
        status: fixtureCase.status,
        declaredResult: {
          professionalResult: fixtureCase.professionalResult,
          taskResult: fixtureCase.taskResult,
          nextAction: fixtureCase.nextAction,
          nextActionKind: fixtureCase.nextActionKind,
          designAcceptance: "Accepted",
          producerAcceptance: "Pending",
        },
      },
    );
    const result = fixtureApi.verifyFixture({
      pluginRoot,
      runRoot: implementedLifecycle.runRoot,
    });
    assert.equal(result.taskStateAfter.status, fixtureCase.status);
    assert.deepEqual(result.declaredResult, observation.declaredResult);
    assert(result.objectiveChecks.some(
      (entry) => entry.id === "lifecycle-handoff" && entry.status === "Pass",
    ));
  }

  for (const professionalResult of ["Returned", "Blocked"]) {
    const nextActionKind = professionalResult === "Returned" ? "bounded-repair" : "capability-enabling";
    const nextAction = `${professionalResult} work must remain in a non-passage state.`;
    configureImplementedRun(implementedLifecycle.runRoot, implementedLifecycle.lock, {
      status: "Accepted",
      declaredResult: {
        professionalResult,
        taskResult: professionalResult,
        nextAction,
        nextActionKind,
      },
    });
    assert.throws(
      () => fixtureApi.verifyFixture({ pluginRoot, runRoot: implementedLifecycle.runRoot }),
      new RegExp(`${professionalResult}.*Accepted|Accepted.*${professionalResult}`, "i"),
      `${professionalResult} professional results must never accept Accepted task status`,
    );

    configureImplementedRun(implementedLifecycle.runRoot, implementedLifecycle.lock, {
      status: professionalResult === "Returned" ? "Implementing" : "Clarifying",
      declaredResult: {
        professionalResult,
        taskResult: "Implemented",
        nextAction,
        nextActionKind,
      },
    });
    assert.throws(
      () => fixtureApi.verifyFixture({ pluginRoot, runRoot: implementedLifecycle.runRoot }),
      new RegExp(`${professionalResult}.*task Result ${professionalResult}`, "i"),
      `${professionalResult} professional results must not retain an Implemented task result`,
    );

    configureImplementedRun(implementedLifecycle.runRoot, implementedLifecycle.lock, {
      status: professionalResult === "Returned" ? "Implementing" : "Clarifying",
      declaredResult: {
        professionalResult,
        taskResult: professionalResult,
        nextAction,
        nextActionKind,
        producerAcceptance: "Accepted",
      },
    });
    assert.throws(
      () => fixtureApi.verifyFixture({ pluginRoot, runRoot: implementedLifecycle.runRoot }),
      new RegExp(`${professionalResult}.*producer acceptance.*Pending|Not applicable`, "i"),
      `${professionalResult} professional results must not smuggle producer passage`,
    );
  }
  configureImplementedRun(implementedLifecycle.runRoot, implementedLifecycle.lock);

  for (const [professionalResult, nextActionKind] of [
    ["Returned", "human-acceptance"],
    ["Blocked", "human-selection"],
  ]) {
    configureImplementedRun(implementedLifecycle.runRoot, implementedLifecycle.lock, {
      declaredResult: {
        professionalResult,
        taskResult: professionalResult,
        nextAction: `Exercise disallowed ${nextActionKind} for ${professionalResult}.`,
        nextActionKind,
      },
    });
    expectLifecycleRejection(
      `schema 2 ${professionalResult} disallowed action kind: ${nextActionKind}`,
      () => fixtureApi.verifyFixture({ pluginRoot, runRoot: implementedLifecycle.runRoot }),
      new RegExp(`${professionalResult}.*next action kind`, "i"),
    );
  }
  configureImplementedRun(implementedLifecycle.runRoot, implementedLifecycle.lock);

  const schema2ConflictingLegacy = {
    ...validImplementedObservation,
    professionalResult: "Proposed",
    result: { professionalResult: "Blocked" },
  };
  fs.writeFileSync(
    path.join(implementedLifecycle.runRoot, "observation.json"),
    `${JSON.stringify(schema2ConflictingLegacy, null, 2)}\n`,
  );
  expectLifecycleRejection(
    "schema 2 conflicting legacy declarations",
    () => fixtureApi.verifyFixture({ pluginRoot, runRoot: implementedLifecycle.runRoot }),
    /schemaVersion 2.*legacy professionalResult/i,
  );

  const schema2DuplicateTopLevel = {
    ...validImplementedObservation,
    professionalResult: "Implemented",
  };
  fs.writeFileSync(
    path.join(implementedLifecycle.runRoot, "observation.json"),
    `${JSON.stringify(schema2DuplicateTopLevel, null, 2)}\n`,
  );
  expectLifecycleRejection(
    "schema 2 duplicate top-level legacy declaration",
    () => fixtureApi.verifyFixture({ pluginRoot, runRoot: implementedLifecycle.runRoot }),
    /schemaVersion 2.*legacy professionalResult/i,
  );

  const schema2DuplicateNested = {
    ...validImplementedObservation,
    result: { professionalResult: "Implemented" },
  };
  fs.writeFileSync(
    path.join(implementedLifecycle.runRoot, "observation.json"),
    `${JSON.stringify(schema2DuplicateNested, null, 2)}\n`,
  );
  expectLifecycleRejection(
    "schema 2 duplicate nested legacy declaration",
    () => fixtureApi.verifyFixture({ pluginRoot, runRoot: implementedLifecycle.runRoot }),
    /schemaVersion 2.*legacy professionalResult/i,
  );

  const schema1RetainedDeclaredResult = {
    ...validImplementedObservation,
    schemaVersion: 1,
  };
  fs.writeFileSync(
    path.join(implementedLifecycle.runRoot, "observation.json"),
    `${JSON.stringify(schema1RetainedDeclaredResult, null, 2)}\n`,
  );
  expectLifecycleRejection(
    "schema 1 retained declaredResult",
    () => fixtureApi.verifyFixture({ pluginRoot, runRoot: implementedLifecycle.runRoot }),
    /schemaVersion 1.*declaredResult/i,
  );

  const schema1DuplicateLegacy = {
    ...validImplementedObservation,
    schemaVersion: 1,
    declaredResult: undefined,
    professionalResult: "Implemented",
    result: { professionalResult: "Implemented" },
  };
  fs.writeFileSync(
    path.join(implementedLifecycle.runRoot, "observation.json"),
    `${JSON.stringify(schema1DuplicateLegacy, null, 2)}\n`,
  );
  expectLifecycleRejection(
    "schema 1 duplicate legacy declarations",
    () => fixtureApi.verifyFixture({ pluginRoot, runRoot: implementedLifecycle.runRoot }),
    /schemaVersion 1.*one legacy professionalResult/i,
  );

  const schema1ConflictingLegacy = {
    ...schema1DuplicateLegacy,
    result: { professionalResult: "Blocked" },
  };
  fs.writeFileSync(
    path.join(implementedLifecycle.runRoot, "observation.json"),
    `${JSON.stringify(schema1ConflictingLegacy, null, 2)}\n`,
  );
  expectLifecycleRejection(
    "schema 1 conflicting legacy declarations",
    () => fixtureApi.verifyFixture({ pluginRoot, runRoot: implementedLifecycle.runRoot }),
    /(?:schemaVersion 1.*one legacy professionalResult|professionalResult declarations conflict)/i,
  );

  configureImplementedRun(implementedLifecycle.runRoot, implementedLifecycle.lock);
  replaceTaskField(
    implementedLifecycle.runRoot,
    "Next action",
    "Build and inspect the first native slice.",
  );
  const mismatchedLegacyImplemented = {
    ...validImplementedObservation,
    schemaVersion: 1,
    declaredResult: undefined,
    result: { professionalResult: "Implemented" },
    loadedContext: legacyLoadedContext,
    outputTreeHash: outputHash(implementedLifecycle.runRoot),
  };
  fs.writeFileSync(
    path.join(implementedLifecycle.runRoot, "observation.json"),
    `${JSON.stringify(mismatchedLegacyImplemented, null, 2)}\n`,
  );
  expectLifecycleRejection(
    "schema 1 TASK and project next actions disagree",
    () => fixtureApi.verifyFixture({ pluginRoot, runRoot: implementedLifecycle.runRoot }),
    /TASK Next action.*project state/i,
  );

  const staleImplementedTaskState = writeProjectState(
    implementedLifecycle.runRoot,
    "Implementing",
    "Build and inspect the first native slice.",
  );
  const legacyImplementedStaleAction = {
    ...mismatchedLegacyImplemented,
    taskStateAfter: staleImplementedTaskState,
    outputTreeHash: outputHash(implementedLifecycle.runRoot),
  };
  fs.writeFileSync(
    path.join(implementedLifecycle.runRoot, "observation.json"),
    `${JSON.stringify(legacyImplementedStaleAction, null, 2)}\n`,
  );
  expectLifecycleRejection(
    "schema 1 Implemented result repeats first-slice production",
    () => fixtureApi.verifyFixture({ pluginRoot, runRoot: implementedLifecycle.runRoot }),
    /(?:Implemented.*pre-production Next action|schemaVersion 1.*audited legacy Next action.*schemaVersion 2)/i,
  );

  for (const [name, nextAction] of [
    ["generate first slice", "Generate the first native slice for inspection."],
    ["start first candidate", "Start by producing the first bounded native candidate."],
    ["unstructured sample production", "Prepare a representative UI sample before review."],
  ]) {
    replaceTaskField(implementedLifecycle.runRoot, "Next action", nextAction);
    const taskStateAfter = writeProjectState(
      implementedLifecycle.runRoot,
      "Implementing",
      nextAction,
    );
    const observation = {
      ...mismatchedLegacyImplemented,
      taskStateAfter,
      outputTreeHash: outputHash(implementedLifecycle.runRoot),
    };
    fs.writeFileSync(
      path.join(implementedLifecycle.runRoot, "observation.json"),
      `${JSON.stringify(observation, null, 2)}\n`,
    );
    expectLifecycleRejection(
      `schema 1 Implemented unsupported action: ${name}`,
      () => fixtureApi.verifyFixture({ pluginRoot, runRoot: implementedLifecycle.runRoot }),
      /schemaVersion 1.*audited legacy Next action.*schemaVersion 2/i,
    );
  }
  configureImplementedRun(implementedLifecycle.runRoot, implementedLifecycle.lock);

  replaceTaskField(
    implementedLifecycle.runRoot,
    "Next action",
    auditedLegacyImplementedAction,
  );
  const validLegacyImplementedTaskState = writeProjectState(
    implementedLifecycle.runRoot,
    "Implementing",
    auditedLegacyImplementedAction,
  );
  replaceTaskField(
    implementedLifecycle.runRoot,
    "Representative proof",
    "`Accepted — audited schema-1 alias for Passed`",
  );
  replaceTaskField(
    implementedLifecycle.runRoot,
    "Design acceptance",
    "`Pass — audited schema-1 alias for Accepted`",
  );
  const validLegacyImplemented = {
    ...validImplementedObservation,
    schemaVersion: 1,
    declaredResult: undefined,
    result: { professionalResult: "Implemented" },
    loadedContext: legacyLoadedContext,
    taskStateAfter: validLegacyImplementedTaskState,
    outputTreeHash: outputHash(implementedLifecycle.runRoot),
  };
  fs.writeFileSync(
    path.join(implementedLifecycle.runRoot, "observation.json"),
    `${JSON.stringify(validLegacyImplemented, null, 2)}\n`,
  );
  const validLegacyImplementedResult = fixtureApi.verifyFixture({
    pluginRoot,
    runRoot: implementedLifecycle.runRoot,
  });
  assert(validLegacyImplementedResult.objectiveChecks.some(
    (entry) => entry.id === "lifecycle-handoff" && entry.status === "Pass",
  ));

  for (const professionalResult of ["Returned", "Blocked"]) {
    const nextAction = `Follow an unstructured legacy ${professionalResult.toLocaleLowerCase("en-US")} route.`;
    writeTaskHandoff(implementedLifecycle.runRoot, {
      Result: `\`${professionalResult}\``,
      "Next action": nextAction,
    });
    const taskStateAfter = writeProjectState(
      implementedLifecycle.runRoot,
      "Implementing",
      nextAction,
    );
    const observation = {
      ...validLegacyImplemented,
      result: { professionalResult },
      taskStateAfter,
      outputTreeHash: outputHash(implementedLifecycle.runRoot),
    };
    fs.writeFileSync(
      path.join(implementedLifecycle.runRoot, "observation.json"),
      `${JSON.stringify(observation, null, 2)}\n`,
    );
    expectLifecycleRejection(
      `schema 1 ${professionalResult} has no audited legacy action`,
      () => fixtureApi.verifyFixture({ pluginRoot, runRoot: implementedLifecycle.runRoot }),
      /schemaVersion 1.*audited legacy Next action.*schemaVersion 2/i,
    );
  }

  configureImplementedRun(implementedLifecycle.runRoot, implementedLifecycle.lock, {
    declaredResult: {
      taskResult: "Not started",
      nextAction: auditedLegacyImplementedAction,
    },
  });
  const legacyImplementedObservation = {
    ...validImplementedObservation,
    schemaVersion: 1,
    declaredResult: undefined,
    result: { professionalResult: "Implemented" },
    loadedContext: legacyLoadedContext,
    outputTreeHash: outputHash(implementedLifecycle.runRoot),
  };
  fs.writeFileSync(
    path.join(implementedLifecycle.runRoot, "observation.json"),
    `${JSON.stringify(legacyImplementedObservation, null, 2)}\n`,
  );
  assert.throws(
    () => fixtureApi.verifyFixture({ pluginRoot, runRoot: implementedLifecycle.runRoot }),
    /task Result.*Not started/i,
    "legacy nested Implemented results must receive the same lifecycle validation",
  );
  configureImplementedRun(implementedLifecycle.runRoot, implementedLifecycle.lock);

  const proposedLifecycle = prepareLifecycleRun("design-direction", "proposed-lifecycle");
  const proposedNextAction = "Present the runtime-backed candidates for human direction selection.";
  writeTaskHandoff(proposedLifecycle.runRoot, {
    Status: "`Clarifying`",
    "Representative proof": "`Pending`",
    "Assembly precheck": "`Pending`",
    Result: "`Proposed — runtime-backed direction candidates await human selection`",
    "Next action": proposedNextAction,
    "Design acceptance": "`Pending`",
    "Producer acceptance": "`Pending`",
  });
  const proposedTaskState = writeProjectState(
    proposedLifecycle.runRoot,
    "Clarifying",
    proposedNextAction,
  );
  const proposedObservation = writeLifecycleObservation(
    proposedLifecycle.runRoot,
    proposedLifecycle.lock,
    proposedTaskState,
    declaredResult({
      professionalResult: "Proposed",
      representativeProof: "Pending",
      assemblyPrecheck: "Pending",
      taskResult: "Proposed",
      nextAction: proposedNextAction,
      nextActionKind: "human-selection",
    }),
  );
  const proposedResult = fixtureApi.verifyFixture({
    pluginRoot,
    runRoot: proposedLifecycle.runRoot,
  });
  assert.equal(proposedResult.taskStateAfter.status, "Clarifying");
  assert.deepEqual(proposedResult.declaredResult, proposedObservation.declaredResult);
  assert(proposedResult.objectiveChecks.some(
    (entry) => entry.id === "lifecycle-handoff" && entry.status === "Pass",
  ));

  for (const nextActionKind of [
    "produce-first-slice",
    "independent-review",
    "human-acceptance",
    "replan",
    "capability-enabling",
    "alternative-candidate",
  ]) {
    const nextAction = nextActionKind === "produce-first-slice"
      ? "Produce the first bounded original direction candidate."
      : `Exercise the structured ${nextActionKind} route for the proposed result.`;
    replaceTaskField(proposedLifecycle.runRoot, "Next action", nextAction);
    const taskStateAfter = writeProjectState(
      proposedLifecycle.runRoot,
      "Clarifying",
      nextAction,
    );
    const observation = {
      ...proposedObservation,
      taskStateAfter,
      declaredResult: {
        ...proposedObservation.declaredResult,
        nextAction,
        nextActionKind,
      },
      outputTreeHash: outputHash(proposedLifecycle.runRoot),
    };
    fs.writeFileSync(
      path.join(proposedLifecycle.runRoot, "observation.json"),
      `${JSON.stringify(observation, null, 2)}\n`,
    );
    expectLifecycleRejection(
      `schema 2 Proposed disallowed action kind: ${nextActionKind}`,
      () => fixtureApi.verifyFixture({ pluginRoot, runRoot: proposedLifecycle.runRoot }),
      /Proposed.*next action kind/i,
    );
  }

  writeTaskHandoff(proposedLifecycle.runRoot, { "Next action": proposedNextAction });
  writeProjectState(proposedLifecycle.runRoot, "Clarifying", proposedNextAction);

  replaceTaskField(proposedLifecycle.runRoot, "Result", "`Not started`");
  replaceTaskField(
    proposedLifecycle.runRoot,
    "Next action",
    auditedLegacyProposedAction,
  );
  const legacyProposedNotStartedTaskState = writeProjectState(
    proposedLifecycle.runRoot,
    "Clarifying",
    auditedLegacyProposedAction,
  );
  const legacyProposedNotStarted = {
    ...proposedObservation,
    schemaVersion: 1,
    declaredResult: undefined,
    professionalResult: "Proposed",
    loadedContext: legacyLoadedContext,
    taskStateAfter: legacyProposedNotStartedTaskState,
    outputTreeHash: outputHash(proposedLifecycle.runRoot),
  };
  fs.writeFileSync(
    path.join(proposedLifecycle.runRoot, "observation.json"),
    `${JSON.stringify(legacyProposedNotStarted, null, 2)}\n`,
  );
  expectLifecycleRejection(
    "schema 1 Proposed result remains Not started",
    () => fixtureApi.verifyFixture({ pluginRoot, runRoot: proposedLifecycle.runRoot }),
    /Proposed.*task Result Proposed/i,
  );

  const staleProposedNextAction = "Produce the first bounded original direction candidate.";
  replaceTaskField(
    proposedLifecycle.runRoot,
    "Result",
    "`Proposed — runtime-backed direction candidates await human selection`",
  );
  replaceTaskField(proposedLifecycle.runRoot, "Next action", staleProposedNextAction);
  const staleProposedTaskState = writeProjectState(
    proposedLifecycle.runRoot,
    "Clarifying",
    staleProposedNextAction,
  );
  const legacyProposedStaleAction = {
    ...legacyProposedNotStarted,
    taskStateAfter: staleProposedTaskState,
    outputTreeHash: outputHash(proposedLifecycle.runRoot),
  };
  fs.writeFileSync(
    path.join(proposedLifecycle.runRoot, "observation.json"),
    `${JSON.stringify(legacyProposedStaleAction, null, 2)}\n`,
  );
  expectLifecycleRejection(
    "schema 1 Proposed result repeats first-candidate production",
    () => fixtureApi.verifyFixture({ pluginRoot, runRoot: proposedLifecycle.runRoot }),
    /(?:Proposed.*pre-production Next action|schemaVersion 1.*audited legacy Next action.*schemaVersion 2)/i,
  );

  for (const [name, nextAction] of [
    ["start first candidate", "Start by producing the first bounded direction candidate."],
    ["draft before selection", "Draft one more direction before human selection."],
    ["continue candidate production", "Continue candidate production prior to human review."],
  ]) {
    replaceTaskField(proposedLifecycle.runRoot, "Next action", nextAction);
    const taskStateAfter = writeProjectState(
      proposedLifecycle.runRoot,
      "Clarifying",
      nextAction,
    );
    const observation = {
      ...legacyProposedStaleAction,
      taskStateAfter,
      outputTreeHash: outputHash(proposedLifecycle.runRoot),
    };
    fs.writeFileSync(
      path.join(proposedLifecycle.runRoot, "observation.json"),
      `${JSON.stringify(observation, null, 2)}\n`,
    );
    expectLifecycleRejection(
      `schema 1 Proposed unsupported action: ${name}`,
      () => fixtureApi.verifyFixture({ pluginRoot, runRoot: proposedLifecycle.runRoot }),
      /schemaVersion 1.*audited legacy Next action.*schemaVersion 2/i,
    );
  }

  writeTaskHandoff(proposedLifecycle.runRoot, {
    Result: "`Proposed — runtime-backed direction candidates await human selection`",
    "Next action": auditedLegacyProposedAction,
  });
  const legacyProposedTaskState = writeProjectState(
    proposedLifecycle.runRoot,
    "Clarifying",
    auditedLegacyProposedAction,
  );

  const legacyProposedObservation = {
    ...proposedObservation,
    schemaVersion: 1,
    declaredResult: undefined,
    professionalResult: "Proposed",
    loadedContext: legacyLoadedContext,
    taskStateAfter: legacyProposedTaskState,
    outputTreeHash: outputHash(proposedLifecycle.runRoot),
  };
  fs.writeFileSync(
    path.join(proposedLifecycle.runRoot, "observation.json"),
    `${JSON.stringify(legacyProposedObservation, null, 2)}\n`,
  );
  const legacyProposedResult = fixtureApi.verifyFixture({
    pluginRoot,
    runRoot: proposedLifecycle.runRoot,
  });
  assert(legacyProposedResult.objectiveChecks.some(
    (entry) => entry.id === "lifecycle-handoff" && entry.status === "Pass",
  ));

  const oldLocationClaim = {
    ...validImplementedObservation,
    declaredResult: undefined,
    result: { professionalResult: "Implemented" },
  };
  fs.writeFileSync(
    path.join(implementedLifecycle.runRoot, "observation.json"),
    `${JSON.stringify(oldLocationClaim, null, 2)}\n`,
  );
  assert.throws(
    () => fixtureApi.verifyFixture({ pluginRoot, runRoot: implementedLifecycle.runRoot }),
    /declaredResult.*fixture-guidance\/observation-contract\.json/i,
    "professional results in legacy ad hoc locations must use declaredResult",
  );

  assert.deepEqual(
    acceptedReviewerBypasses,
    [],
    `trusted verifier accepted lifecycle bypasses: ${acceptedReviewerBypasses.join(", ")}`,
  );

  const sourceTestPlugin = path.join(sourceTestRepository, "plugins/game-production-workflow");
  fs.mkdirSync(path.join(sourceTestPlugin, "scripts"), { recursive: true });
  fs.cpSync(path.join(pluginRoot, "evals/game-art-production"), path.join(sourceTestPlugin, "evals/game-art-production"), { recursive: true });
  fs.copyFileSync(
    path.join(scriptDirectory, "game-art-composite-verifier.mjs"),
    path.join(sourceTestPlugin, "scripts/game-art-composite-verifier.mjs"),
  );
  fs.copyFileSync(
    path.join(scriptDirectory, "game-art-observation-contract.mjs"),
    path.join(sourceTestPlugin, "scripts/game-art-observation-contract.mjs"),
  );
  const publicContractFixturePath = path.join(
    sourceTestPlugin,
    "evals/game-art-production/design-direction/fixture.json",
  );
  const publicContractFixture = JSON.parse(fs.readFileSync(publicContractFixturePath, "utf8"));
  for (const [name, observationContract] of [
    ["missing path", undefined],
    ["path substitution", "fixture-guidance/alternate-contract.json"],
    ["machine path", path.join(sourceTestRepository, "observation-contract.json")],
  ]) {
    const mutatedFixture = { ...publicContractFixture, observationContract };
    fs.writeFileSync(publicContractFixturePath, `${JSON.stringify(mutatedFixture, null, 2)}\n`);
    assert.throws(
      () => fixtureApi.loadFixture(sourceTestPlugin, "design-direction"),
      /fixture observationContract must point to fixture-guidance\/observation-contract\.json/i,
      `${name}: fixture contract path drift must fail closed after repository relocation`,
    );
  }
  fs.writeFileSync(publicContractFixturePath, `${JSON.stringify(publicContractFixture, null, 2)}\n`);
  assert.equal(
    fixtureApi.loadFixture(sourceTestPlugin, "design-direction").observationContract,
    "fixture-guidance/observation-contract.json",
    "restored public observation contract path must validate after repository relocation",
  );
  const reservedBindingNamespace = path.join(sourceTestRepository, ".tmp/game-art-evals/.fixture-bindings");
  assert.throws(
    () => fixtureApi.prepareFixture({
      pluginRoot: sourceTestPlugin,
      fixtureId: "design-direction",
      label: "reserved-binding-namespace",
      outputRoot: reservedBindingNamespace,
    }),
    /reserved trusted binding namespace/,
  );
  if (symlinksSupported) {
    const fakeEvaluationRoot = path.join(sourceTestRepository, ".tmp/game-art-evals");
    const externalBindingRoot = path.join(sourceTestRepository, "external-bindings");
    fs.mkdirSync(fakeEvaluationRoot, { recursive: true });
    fs.mkdirSync(externalBindingRoot, { recursive: true });
    fs.symlinkSync(externalBindingRoot, path.join(fakeEvaluationRoot, ".fixture-bindings"), "dir");
    assert.throws(
      () => fixtureApi.prepareFixture({
        pluginRoot: sourceTestPlugin,
        fixtureId: "design-direction",
        label: "binding-symlink",
        outputRoot: path.join(fakeEvaluationRoot, "binding-symlink-run"),
      }),
      /trusted binding root.*symbolic link/,
    );
    fs.rmSync(path.join(fakeEvaluationRoot, "binding-symlink-run"), { recursive: true, force: true });
    fs.rmSync(path.join(fakeEvaluationRoot, ".fixture-bindings"), { recursive: true, force: true });
  }
  const sourceTestRun = path.join(sourceTestRepository, ".tmp/game-art-evals/source-tamper");
  const sourceTestLock = fixtureApi.prepareFixture({
    pluginRoot: sourceTestPlugin,
    fixtureId: "design-direction",
    label: "source-tamper",
    outputRoot: sourceTestRun,
  });
  const sourceTestFixture = fixtureApi.loadFixture(sourceTestPlugin, "design-direction");
  materializeArtifactContract(sourceTestRun, sourceTestFixture);
  const sourceTestObservation = {
    schemaVersion: 1,
    sourceTreeHash: sourceTestLock.sourceTreeHash,
    outputTreeHash: outputHash(sourceTestRun),
    taskStateBefore: sourceTestLock.taskStateBefore,
    taskStateAfter: sourceTestLock.taskStateBefore,
    loadedContext: { metadataWords: 0, bodyWords: 0, referenceWords: 0, files: [] },
    cycles: 0,
    elapsedMinutes: 0,
    terminalClaim: "Objective source tamper test; subjective review pending.",
  };
  fs.writeFileSync(path.join(sourceTestRun, "observation.json"), `${JSON.stringify(sourceTestObservation, null, 2)}\n`);
  for (const relative of publicObservationFiles) {
    const guidanceFile = path.join(sourceTestRun, relative);
    const original = fs.readFileSync(guidanceFile);
    fs.chmodSync(guidanceFile, 0o644);
    fs.appendFileSync(guidanceFile, "\nDRIFT\n");
    assert.throws(
      () => fixtureApi.verifyFixture({ pluginRoot: sourceTestPlugin, runRoot: sourceTestRun }),
      /worker-visible observation contract\/template\/helper drifted from fixture lock.*fixture-guidance\/observation-contract\.json/i,
      `${relative}: prepared public guidance drift must fail closed`,
    );
    fs.writeFileSync(guidanceFile, original);
    fs.chmodSync(guidanceFile, 0o444);
  }
  if (symlinksSupported) {
    for (const relative of publicObservationFiles) {
      const guidanceFile = path.join(sourceTestRun, relative);
      const original = fs.readFileSync(guidanceFile);
      const externalGuidance = path.join(symlinkTarget, `substituted-${path.basename(relative)}`);
      fs.writeFileSync(externalGuidance, original);
      fs.chmodSync(guidanceFile, 0o644);
      fs.rmSync(guidanceFile);
      fs.symlinkSync(externalGuidance, guidanceFile);
      assert.throws(
        () => fixtureApi.verifyFixture({ pluginRoot: sourceTestPlugin, runRoot: sourceTestRun }),
        /worker-visible observation.*symbolic link.*fixture-guidance\/observation-contract\.json/i,
        `${relative}: prepared public guidance path substitution must fail closed`,
      );
      fs.rmSync(guidanceFile);
      fs.writeFileSync(guidanceFile, original);
      fs.chmodSync(guidanceFile, 0o444);
    }
  }
  const relocatedCanonicalHelper = path.join(sourceTestPlugin, "scripts/game-art-observation-contract.mjs");
  const relocatedCanonicalHelperContent = fs.readFileSync(relocatedCanonicalHelper);
  fs.appendFileSync(relocatedCanonicalHelper, "\n// canonical drift mutation\n");
  assert.throws(
    () => fixtureApi.verifyFixture({ pluginRoot: sourceTestPlugin, runRoot: sourceTestRun }),
    /worker-visible observation helper drifted from the canonical helper.*fixture-guidance\/observation-helper\.mjs/i,
    "canonical/public helper drift must fail closed after repository relocation",
  );
  fs.writeFileSync(relocatedCanonicalHelper, relocatedCanonicalHelperContent);
  const relocatedValidResult = fixtureApi.verifyFixture({ pluginRoot: sourceTestPlugin, runRoot: sourceTestRun });
  assert(relocatedValidResult.objectiveChecks.every(({ status }) => status === "Pass"), JSON.stringify(relocatedValidResult.objectiveChecks, null, 2));
  fs.appendFileSync(
    path.join(sourceTestPlugin, "evals/game-art-production/design-direction/starter/AGENTS.md"),
    "\nUnexpected committed-source mutation.\n",
  );
  assert.throws(
    () => fixtureApi.verifyFixture({ pluginRoot: sourceTestPlugin, runRoot: sourceTestRun }),
    /committed fixture and starter/,
  );

  const mutatingVerifierRelative = "scripts/mutating-composite-verifier.mjs";
  fs.writeFileSync(
    path.join(sourceTestPlugin, mutatingVerifierRelative),
    [
      'import fs from "node:fs";',
      'import path from "node:path";',
      'const runRoot = process.argv[2];',
      'const projectPath = path.join(runRoot, "production/project.json");',
      'const project = JSON.parse(fs.readFileSync(projectPath, "utf8"));',
      'project.status = "Implementing";',
      'fs.writeFileSync(projectPath, `${JSON.stringify(project, null, 2)}\\n`);',
      'fs.writeFileSync(path.join(runRoot, "verifier-side-effect.txt"), "mutated during verification\\n");',
      'console.log("PASS mutating verifier fixture");',
      "",
    ].join("\n"),
  );
  const mutationFixturePath = path.join(sourceTestPlugin, "evals/game-art-production/composite-runtime/fixture.json");
  const mutationFixture = JSON.parse(fs.readFileSync(mutationFixturePath, "utf8"));
  mutationFixture.trustedVerifier = mutatingVerifierRelative;
  fs.writeFileSync(mutationFixturePath, `${JSON.stringify(mutationFixture, null, 2)}\n`);
  const mutationRun = path.join(sourceTestRepository, ".tmp/game-art-evals/verifier-mutation");
  const mutationLock = fixtureApi.prepareFixture({
    pluginRoot: sourceTestPlugin,
    fixtureId: "composite-runtime",
    label: "verifier-mutation",
    outputRoot: mutationRun,
  });
  materializeArtifactContract(mutationRun, mutationFixture);
  const mutationObservation = {
    schemaVersion: 1,
    sourceTreeHash: mutationLock.sourceTreeHash,
    outputTreeHash: outputHash(mutationRun),
    taskStateBefore: mutationLock.taskStateBefore,
    taskStateAfter: mutationLock.taskStateBefore,
    loadedContext: { metadataWords: 0, bodyWords: 0, referenceWords: 0, files: [] },
    cycles: 0,
    elapsedMinutes: 0,
    terminalClaim: "Verifier mutation ordering regression; subjective review pending.",
  };
  fs.writeFileSync(path.join(mutationRun, "observation.json"), `${JSON.stringify(mutationObservation, null, 2)}\n`);
  const mutationResult = fixtureApi.verifyFixture({ pluginRoot: sourceTestPlugin, runRoot: mutationRun });
  assert(mutationResult.objectiveChecks.some((check) => check.id === "task-state-claims" && check.status === "Fail"));
  assert(mutationResult.objectiveChecks.some((check) => check.id === "output-tree-claim" && check.status === "Fail"));
  assert.equal(mutationResult.taskStateAfter.status, "Implementing");
  assert.equal(mutationResult.outputTreeHash, outputHash(mutationRun));

  const cliOutput = path.join(tempRoot, "cli-prepare");
  const cliRun = spawnSync(
    process.execPath,
    [cliPath, "prepare", "--fixture", "design-direction", "--label", "cli-test", "--output", cliOutput],
    { cwd: repositoryRoot, encoding: "utf8" },
  );
  assert.equal(cliRun.status, 0, cliRun.stderr || cliRun.stdout);
  assert(fs.existsSync(path.join(cliOutput, "fixture-lock.json")));

  const cliFixture = fixtureApi.loadFixture(pluginRoot, "design-direction");
  materializeArtifactContract(cliOutput, cliFixture);
  const cliLock = JSON.parse(fs.readFileSync(path.join(cliOutput, "fixture-lock.json"), "utf8"));
  const cliObservation = {
    schemaVersion: 1,
    sourceTreeHash: cliLock.sourceTreeHash,
    outputTreeHash: outputHash(cliOutput),
    taskStateBefore: cliLock.taskStateBefore,
    taskStateAfter: cliLock.taskStateBefore,
    loadedContext: { metadataWords: 1, bodyWords: 2, referenceWords: 3, files: ["production/TASK.md"] },
    cycles: 1,
    elapsedMinutes: 1,
    terminalClaim: "Objective checks complete; subjective review pending.",
  };
  fs.writeFileSync(path.join(cliOutput, "observation.json"), `${JSON.stringify(cliObservation, null, 2)}\n`);
  const cliVerify = spawnSync(
    process.execPath,
    [cliPath, "verify", "--run", cliOutput],
    { cwd: repositoryRoot, encoding: "utf8" },
  );
  assert.equal(cliVerify.status, 0, cliVerify.stderr || cliVerify.stdout);
  assert.equal(JSON.parse(cliVerify.stdout).fixtureId, "design-direction");
  assert(fs.existsSync(path.join(cliOutput, "result.json")));
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
  fs.rmSync(outsideEvalRoot, { recursive: true, force: true });
  fs.rmSync(symlinkRoot, { recursive: true, force: true });
  fs.rmSync(runAlias, { recursive: true, force: true });
  fs.rmSync(symlinkTarget, { recursive: true, force: true });
  fs.rmSync(sourceTestRepository, { recursive: true, force: true });
  if (fs.existsSync(bindingRoot)) {
    for (const entry of fs.readdirSync(bindingRoot)) {
      if (bindingsBefore.has(entry)) continue;
      const file = path.join(bindingRoot, entry);
      if (!fs.lstatSync(file).isSymbolicLink()) fs.chmodSync(file, 0o644);
      fs.rmSync(file, { force: true });
    }
  }
}

console.log("PASS game art fixture contracts and CLI behavior");
