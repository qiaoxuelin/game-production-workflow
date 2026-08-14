import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  candidateEvidenceRelative,
  candidateSummaryRelative,
  controlSummaryRelative,
  validateCandidateDocuments,
  validateCandidateRepository,
} from "./game-art-candidate-evidence.mjs";

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
const operationalFiles = ["fixture-lock.json", "observation.json", "result.json"];
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

for (const id of ids) {
  const fixturePath = path.join(evalRoot, id, "fixture.json");
  assert(fs.existsSync(fixturePath), `missing fixture: ${id}`);
  const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
  assert.equal(fixture.id, id);
  for (const field of ["operation", "request", "capabilityProfile", "requiredArtifacts", "objectiveChecks", "subjectiveChecks", "prohibitedClaims", "stopConditions"]) {
    assert(hasContent(fixture[field]), `${id}: ${field} is empty`);
  }

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
    /\.tmp\/game-art-evals/,
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

    const lock = JSON.parse(fs.readFileSync(path.join(runRoot, "fixture-lock.json"), "utf8"));
    assert.equal(lock.sourceTreeHash, prepared.sourceTreeHash);
    assert.deepEqual(lock.taskStateBefore, prepared.taskStateBefore);
    assert.equal(fixtureApi.hashTree(runRoot, operationalFiles), fixtureApi.hashTree(runRoot, operationalFiles));
    assert.throws(
      () => fixtureApi.prepareFixture({ pluginRoot, fixtureId: id, label: "again", outputRoot: runRoot }),
      /non-empty/,
    );

    const fixture = fixtureApi.loadFixture(pluginRoot, id);
    for (const relative of fixture.requiredArtifacts) {
      const artifact = path.join(runRoot, relative);
      fs.mkdirSync(path.dirname(artifact), { recursive: true });
      fs.writeFileSync(artifact, `fixture test artifact: ${relative}\n`);
    }

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

      const missingArtifact = path.join(runRoot, fixture.requiredArtifacts[0]);
      const missingArtifactContent = fs.readFileSync(missingArtifact, "utf8");
      fs.rmSync(missingArtifact);
      const missingArtifactObservation = { ...observation, outputTreeHash: outputHash(runRoot) };
      fs.writeFileSync(path.join(runRoot, "observation.json"), `${JSON.stringify(missingArtifactObservation, null, 2)}\n`);
      const missingArtifactResult = fixtureApi.verifyFixture({ pluginRoot, runRoot });
      assert(missingArtifactResult.objectiveChecks.some((check) => check.id === "required-artifacts" && check.status === "Fail"));
      fs.writeFileSync(missingArtifact, missingArtifactContent);

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

  const sourceTestPlugin = path.join(sourceTestRepository, "plugins/game-production-workflow");
  fs.mkdirSync(path.join(sourceTestPlugin, "scripts"), { recursive: true });
  fs.cpSync(path.join(pluginRoot, "evals/game-art-production"), path.join(sourceTestPlugin, "evals/game-art-production"), { recursive: true });
  fs.copyFileSync(
    path.join(scriptDirectory, "game-art-composite-verifier.mjs"),
    path.join(sourceTestPlugin, "scripts/game-art-composite-verifier.mjs"),
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
  for (const relative of sourceTestFixture.requiredArtifacts) {
    const artifact = path.join(sourceTestRun, relative);
    fs.mkdirSync(path.dirname(artifact), { recursive: true });
    fs.writeFileSync(artifact, `source test artifact: ${relative}\n`);
  }
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
  for (const relative of mutationFixture.requiredArtifacts) {
    const artifact = path.join(mutationRun, relative);
    fs.mkdirSync(path.dirname(artifact), { recursive: true });
    fs.writeFileSync(artifact, `mutation test artifact: ${relative}\n`);
  }
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
  for (const relative of cliFixture.requiredArtifacts) {
    const artifact = path.join(cliOutput, relative);
    fs.mkdirSync(path.dirname(artifact), { recursive: true });
    fs.writeFileSync(artifact, `CLI fixture artifact: ${relative}\n`);
  }
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
