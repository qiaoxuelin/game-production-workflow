import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const candidateSummaryRelative = "plugins/game-production-workflow/evals/game-art-production/candidate-additive-1.8.0.json";
export const candidateEvidenceRelative = "plugins/game-production-workflow/evals/game-art-production/candidate-additive-1.8.0-evidence.json";
export const controlSummaryRelative = "plugins/game-production-workflow/evals/game-art-production/control-1.7.2.json";

const retainedCriterion = "Actual keyboard/controller interaction-to-visual causality";
const recordKey = ({ fixtureId, variant }) => `${fixtureId}/${variant}`;
const pathIdentity = (value) => process.platform === "win32" ? value.toLowerCase() : value;
const canonicalValue = (value) => Array.isArray(value)
  ? value.map(canonicalValue)
  : value && typeof value === "object"
    ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalValue(value[key])]))
    : value;

export const semanticHash = (value) => `sha256:${crypto.createHash("sha256")
  .update(`${JSON.stringify(canonicalValue(value), null, 2)}\n`)
  .digest("hex")}`;

const fileHash = (file) => `sha256:${crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex")}`;
const containedBy = (root, target) => {
  const relative = path.relative(root, target);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
};

const assertRealCanonicalPath = (target, expectedType, label) => {
  const absolute = path.resolve(target);
  const parsed = path.parse(absolute);
  let cursor = parsed.root;
  for (const component of path.relative(parsed.root, absolute).split(path.sep).filter(Boolean)) {
    cursor = path.join(cursor, component);
    assert(fs.existsSync(cursor), `${label}: missing trusted path: ${cursor}`);
    assert(!fs.lstatSync(cursor).isSymbolicLink(), `${label}: symbolic link substitution: ${cursor}`);
  }
  const real = fs.realpathSync(absolute);
  assert.equal(pathIdentity(real), pathIdentity(absolute), `${label}: non-canonical path: ${absolute}`);
  const stat = fs.statSync(real);
  assert(expectedType === "directory" ? stat.isDirectory() : stat.isFile(), `${label}: wrong path type: ${absolute}`);
  return real;
};

const assertRepositoryFile = (repositoryRoot, relative, label) => {
  assert.equal(typeof relative, "string", `${label}: path must be a string`);
  assert(relative.length > 0 && !path.isAbsolute(relative), `${label}: path must be repository-relative`);
  assert.equal(relative, relative.split(path.sep).join("/"), `${label}: path must use canonical separators`);
  const target = path.resolve(repositoryRoot, relative);
  assert(containedBy(repositoryRoot, target), `${label}: path escapes repository root: ${relative}`);
  return assertRealCanonicalPath(target, "file", label);
};

const approvalChangeCount = (before, after) => {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  return [...keys].filter((key) => JSON.stringify(canonicalValue(before[key])) !== JSON.stringify(canonicalValue(after[key]))).length;
};

const aggregateBurden = (records) => ({
  cycles: records.reduce((sum, record) => sum + record.run.cycles, 0),
  elapsedMinutes: records.reduce((sum, record) => sum + record.run.elapsedMinutes, 0),
  approvals: records.reduce((sum, record) => sum + approvalChangeCount(record.approval.before, record.approval.after), 0),
  loadedContext: {
    metadataWords: records.reduce((sum, record) => sum + record.run.loadedContext.metadataWords, 0),
    bodyWords: records.reduce((sum, record) => sum + record.run.loadedContext.bodyWords, 0),
    referenceWords: records.reduce((sum, record) => sum + record.run.loadedContext.referenceWords, 0),
    files: records.flatMap((record) => record.run.loadedContext.files),
  },
});

export function validateCandidateDocuments({ repositoryRoot, summary, evidence, controlSummary }) {
  const trustedRepositoryRoot = assertRealCanonicalPath(repositoryRoot, "directory", "repository root");
  assert.equal(summary.schemaVersion, 1);
  assert.equal(evidence.schemaVersion, 1);
  assert.equal(summary.candidateCommit, "2c26db33dadd2e23e06f7e2eea6604143a38ad7a");
  assert.equal(evidence.candidateCommit, summary.candidateCommit);
  assert.deepEqual(summary.committedEvidence, {
    location: candidateEvidenceRelative,
    hash: semanticHash(evidence),
  }, "candidate summary must bind the fixed committed evidence snapshot");
  assert(!JSON.stringify(evidence).includes("/Users/qxl/"), "committed evidence contains a machine-specific path");

  assert.equal(evidence.records.length, 3);
  const records = new Map(evidence.records.map((record) => [recordKey(record), record]));
  assert.deepEqual([...records.keys()], [
    "design-direction/primary",
    "composite-runtime/primary",
    "composite-runtime/no-optional-generation",
  ]);
  const design = records.get("design-direction/primary");
  const produce = records.get("composite-runtime/primary");
  const noGeneration = records.get("composite-runtime/no-optional-generation");

  for (const record of records.values()) {
    const key = recordKey(record);
    assert.equal(record.run.candidateCommit, summary.candidateCommit, `${key}: run commit mismatch`);
    assert(Number.isInteger(record.run.cycles) && record.run.cycles > 0, `${key}: invalid cycles`);
    assert(Number.isInteger(record.run.elapsedMinutes) && record.run.elapsedMinutes > 0, `${key}: invalid elapsed minutes`);
    const workspaceContext = record.workspaceContext ?? [];
    const supportContext = record.supportContext ?? [];
    const expectedLoadedFiles = [
      ...workspaceContext.map(({ logicalId }) => logicalId),
      ...new Set(record.routeIdentity.map(({ path: routePath }) => routePath)),
      ...supportContext.map(({ logicalId }) => logicalId),
    ];
    assert.deepEqual(record.run.loadedContext.files, expectedLoadedFiles, `${key}: loaded context is not derived from workspace, route, and support context`);
    for (const context of [...workspaceContext, ...supportContext]) {
      assert.match(context.logicalId, /^(candidate-workspace|external-plugin):\/\//, `${key}: context needs a portable logical identifier`);
      assert.match(context.sha256, /^sha256:[a-f0-9]{64}$/);
      assert(Number.isInteger(context.wordCount) && context.wordCount > 0);
      assert(["metadata", "body", "reference"].includes(context.contextBucket));
    }
    for (const route of record.routeIdentity) {
      const routePath = assertRepositoryFile(trustedRepositoryRoot, route.path, `${key} route`);
      assert.equal(fileHash(routePath), route.sha256, `${key}: stale route hash`);
      assert(Number.isInteger(route.wordCount) && route.wordCount > 0, `${key}: invalid route word count`);
    }
    assert.equal(record.historicalRawBundle.authoritative, false, `${key}: historical bundle cannot be authoritative`);
    assert.match(record.historicalRawBundle.location, /^\.tmp\/game-art-evals\/candidate-[a-z-]+$/, `${key}: invalid historical provenance`);

    const fixture = summary.fixtureResults.find((entry) => recordKey(entry) === key);
    assert(fixture, `${key}: missing summary fixture result`);
    assert.equal(fixture.label, record.fixture.label);
    assert.equal(fixture.fixtureDefinitionHash, record.fixture.definitionHash);
    assert.equal(fixture.sourceTreeHash, record.fixture.sourceTreeHash);
    assert.equal(fixture.outputTreeHash, record.fixture.outputTreeHash);
    assert.equal(fixture.cycles, record.run.cycles);
    assert.equal(fixture.elapsedMinutes, record.run.elapsedMinutes);
    assert.deepEqual(fixture.loadedContext, record.run.loadedContext, `${key}: context must be derived from committed evidence`);
    assert.deepEqual(fixture.routeFiles, record.routeIdentity, `${key}: route identity must be derived from committed evidence`);
    assert.deepEqual(fixture.maturity, record.run.maturity);
    assert.equal(fixture.approvalChanges, approvalChangeCount(record.approval.before, record.approval.after));
    assert.equal(fixture.objectiveResult.status, record.objective.status, `${key}: objective status contradicts committed evidence`);
    assert.equal(fixture.subjectiveReview.status, record.review.status, `${key}: subjective status contradicts committed review`);
    assert.equal(fixture.subjectiveReview.reviewerIndependence, record.review.reviewerIndependence, `${key}: reviewer independence mismatch`);
    assert.deepEqual(fixture.subjectiveReview.failedCriteria, record.review.failedCriteria, `${key}: failed criteria mismatch`);

    const mismatch = summary.evaluationContractMismatches.find((entry) => recordKey(entry) === key);
    assert(mismatch, `${key}: missing evaluation-contract mismatch`);
    assert.deepEqual(mismatch.evidence, record.evaluationContractMismatch.evidence);
    assert.deepEqual(mismatch.producedAlternatives, record.evaluationContractMismatch.producedAlternatives);
    assert.equal(mismatch.excludedFromGateBasis, true);
    assert.equal(mismatch.objectiveCheckId, "required-artifacts");
  }

  assert.equal(design.objective.status, "Blocked");
  assert.equal(design.workspaceContext.filter(({ contextBucket }) => contextBucket === "metadata").reduce((sum, entry) => sum + entry.wordCount, 0), design.run.loadedContext.metadataWords);
  assert.equal(design.workspaceContext.filter(({ contextBucket }) => contextBucket === "body").reduce((sum, entry) => sum + entry.wordCount, 0), design.run.loadedContext.bodyWords);
  assert.equal([...design.routeIdentity, ...design.supportContext].reduce((sum, entry) => sum + entry.wordCount, 0), design.run.loadedContext.referenceWords);
  assert.equal(design.objective.inputCausality.result, "Blocked");
  assert.equal(design.objective.inputCausality.candidateArtifactRepairBatchUsed, false);
  assert.match(design.run.terminalClaim, /causality is not demonstrated/i);
  assert.equal(produce.objective.status, "Pass");
  assert.deepEqual(produce.objective.states, ["empty", "full", "error", "equip", "controller-focus"]);
  assert(produce.objective.actualInputs.length >= 4);
  assert.equal(produce.objective.conceptRendered, false);
  assert.equal(noGeneration.objective.status, "Pass");
  assert.deepEqual(noGeneration.objective.states, ["empty", "full", "error", "equip", "controller-focus"]);
  assert(noGeneration.objective.actualInputs.length >= 4);
  assert.equal(noGeneration.objective.conceptRendered, false);
  assert.match(noGeneration.objective.capabilityRoute, /replaceable/);

  const expectedFailure = [{
    fixtureId: design.fixtureId,
    variant: design.variant,
    criterion: retainedCriterion,
    evidence: [
      design.objective.inputCausality.blockingEvidenceResult,
      design.objective.inputCausality.rejectedAsPassageEvidence,
      design.objective.inputCausality.minimalTestOutcome,
    ],
  }];
  assert.deepEqual(summary.observedFailures, expectedFailure, "Design causality failure must be derived from committed evidence");
  assert.equal(summary.sharedRootCauseClassification.criterion, retainedCriterion);
  assert.equal(summary.sharedRootCauseClassification.classification, "Environment evidence limitation");
  assert.equal(summary.sharedRootCauseClassification.attribution, design.objective.inputCausality.rootCauseHypothesis);
  assert.deepEqual(summary.sharedRootCauseClassification.notAttributedTo, ["game-art-production Skill wording", "candidate runtime"]);
  assert.equal(summary.sharedRootCauseClassification.candidateArtifactRepairBatchUsed, false);
  assert.equal(summary.sharedRootCauseClassification.sameRootCycles, design.run.cycles);
  assert.deepEqual(summary.sharedRootCauseClassification.evidence, [
    design.objective.inputCausality.workingPath,
    design.objective.inputCausality.candidateStructure,
    design.objective.inputCausality.minimalTestOutcome,
  ]);
  assert.equal(summary.sharedRootCauseClassification.recovery, design.objective.inputCausality.recovery);

  const expectedApprovals = [...records.values()].map((record) => {
    const identity = {
      fixtureId: record.fixtureId,
      variant: record.variant,
      before: record.approval.before,
      after: record.approval.after,
      addedOrChangedCount: approvalChangeCount(record.approval.before, record.approval.after),
    };
    return { ...identity, hash: semanticHash(identity) };
  });
  assert.deepEqual(summary.approvalEvidence, expectedApprovals, "approval evidence must be derived from committed evidence");
  assert.deepEqual(summary.historicalRawBundles, [...records.values()].map((record) => ({
    fixtureId: record.fixtureId,
    variant: record.variant,
    ...record.historicalRawBundle,
  })), "historical provenance must be exact and non-authoritative");

  const primaryRecords = [design, produce];
  const allRecords = [design, produce, noGeneration];
  assert.deepEqual(summary.burden.primaryFixtures, aggregateBurden(primaryRecords));
  assert.deepEqual(summary.burden.allRuns, aggregateBurden(allRecords));
  assert.equal(noGeneration.run.loadedContext.bodyWords, produce.run.loadedContext.bodyWords, "same-hash Skill bodies must use the same frontmatter/body counting convention");

  assert.deepEqual(summary.comparison.controlSummary, {
    location: controlSummaryRelative,
    hash: semanticHash(controlSummary),
    splitDecision: "Proceed",
  });
  const retained = controlSummary.observedFailures.filter(({ criterion }) => criterion === retainedCriterion).map(({ criterion }) => criterion);
  const corrected = controlSummary.observedFailures.filter(({ criterion }) => criterion !== retainedCriterion).map(({ criterion }) => criterion);
  assert.deepEqual(summary.comparison.retainedControlFailures, retained);
  assert.deepEqual(summary.comparison.correctedControlFailures, corrected);
  const primary = summary.burden.primaryFixtures;
  const control = controlSummary.burden;
  assert.deepEqual(Object.fromEntries(Object.entries(summary.comparison.primaryBurdenDelta).filter(([key]) => key !== "interpretation")), {
    cycles: primary.cycles - control.cycles,
    elapsedMinutes: primary.elapsedMinutes - control.elapsedMinutes,
    approvals: primary.approvals - control.approvals,
    metadataWords: primary.loadedContext.metadataWords - control.loadedContext.metadataWords,
    bodyWords: primary.loadedContext.bodyWords - control.loadedContext.bodyWords,
    referenceWords: primary.loadedContext.referenceWords - control.loadedContext.referenceWords,
  });
  assert.equal(summary.comparison.lifecycleOrApprovalBurdenAdded, false);

  const primaryPassed = primaryRecords.every((record) => record.objective.status === "Pass");
  assert.equal(summary.result, primaryPassed ? "CandidatePass" : "BoundedReturn", "terminal result contradicts committed evidence");
  assert.equal(summary.task6Unlocked, primaryPassed, "Task 6 truth contradicts committed evidence");
  assert.equal(primaryPassed, false);
  assert(summary.decisionBasis.startsWith("BoundedReturn, not CandidatePass."));
  assert.match(summary.decisionBasis, /genuine keyboard\/controller-equivalent input-to-visual causality remains unproven/i);
  assert.match(summary.decisionBasis, /Task 6 is not unlocked/i);
  return { summary, evidence, controlSummary };
}

export function validateCandidateRepository(repositoryRoot) {
  const trustedRepositoryRoot = assertRealCanonicalPath(repositoryRoot, "directory", "repository root");
  const summaryPath = assertRepositoryFile(trustedRepositoryRoot, candidateSummaryRelative, "candidate summary");
  const evidencePath = assertRepositoryFile(trustedRepositoryRoot, candidateEvidenceRelative, "candidate evidence");
  const controlPath = assertRepositoryFile(trustedRepositoryRoot, controlSummaryRelative, "control summary");
  const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
  const evidence = JSON.parse(fs.readFileSync(evidencePath, "utf8"));
  const controlSummary = JSON.parse(fs.readFileSync(controlPath, "utf8"));
  return validateCandidateDocuments({ repositoryRoot: trustedRepositoryRoot, summary, evidence, controlSummary });
}
