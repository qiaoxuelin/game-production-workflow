import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const candidateSummaryRelative = "plugins/game-production-workflow/evals/game-art-production/candidate-additive-1.8.0.json";
export const candidateEvidenceRelative = "plugins/game-production-workflow/evals/game-art-production/candidate-additive-1.8.0-evidence.json";
export const controlSummaryRelative = "plugins/game-production-workflow/evals/game-art-production/control-1.7.2.json";

const retainedCriterion = "Actual keyboard/controller interaction-to-visual causality";
const candidateRouteAnchor = {
  candidateCommit: "2c26db33dadd2e23e06f7e2eea6604143a38ad7a",
  routes: {
    "design-direction/primary": [
      { path: "plugins/game-production-workflow/skills/game-production-system/SKILL.md", sha256: "sha256:8fd8968c3fa199b0a8b28402e71f46b8de1ecc7153f01889a34732f3bb3bfb9a", wordCount: 4158, contextBucket: "reference" },
      { path: "plugins/game-production-workflow/skills/game-art-production/SKILL.md", sha256: "sha256:5e8c56e40633a8d310ad126c4dd26aed11e89d3c481967ef18344c7eeb9419ba", wordCount: 497, contextBucket: "reference" },
      { path: "plugins/game-production-workflow/skills/game-art-production/references/visual-design.md", sha256: "sha256:832d580fa982fd574f4a16b09cba0f0c12c2eab1eecc03260e4ccb8b16954b37", wordCount: 466, contextBucket: "reference" },
    ],
    "composite-runtime/primary": [
      { path: "plugins/game-production-workflow/skills/game-production-system/SKILL.md", sha256: "sha256:8fd8968c3fa199b0a8b28402e71f46b8de1ecc7153f01889a34732f3bb3bfb9a", wordCount: 40, contextBucket: "metadata" },
      { path: "plugins/game-production-workflow/skills/game-art-production/SKILL.md", sha256: "sha256:5e8c56e40633a8d310ad126c4dd26aed11e89d3c481967ef18344c7eeb9419ba", wordCount: 35, contextBucket: "metadata" },
      { path: "plugins/game-production-workflow/skills/game-production-system/SKILL.md", sha256: "sha256:8fd8968c3fa199b0a8b28402e71f46b8de1ecc7153f01889a34732f3bb3bfb9a", wordCount: 4116, contextBucket: "body" },
      { path: "plugins/game-production-workflow/skills/game-art-production/SKILL.md", sha256: "sha256:5e8c56e40633a8d310ad126c4dd26aed11e89d3c481967ef18344c7eeb9419ba", wordCount: 460, contextBucket: "body" },
      { path: "plugins/game-production-workflow/skills/game-production-system/references/execution.md", sha256: "sha256:4480f51617322904c4684bd463c8265a74857387612268cb6d8cbe0b2d2aef10", wordCount: 1468, contextBucket: "reference" },
      { path: "plugins/game-production-workflow/skills/game-art-production/references/interactive-ui-2d.md", sha256: "sha256:94e723b0d9dc1cc18c7a2a7d2c7df5eb7f2860089fd6b7a56283db84e624330e", wordCount: 523, contextBucket: "reference" },
    ],
    "composite-runtime/no-optional-generation": [
      { path: "plugins/game-production-workflow/skills/game-production-system/SKILL.md", sha256: "sha256:8fd8968c3fa199b0a8b28402e71f46b8de1ecc7153f01889a34732f3bb3bfb9a", wordCount: 4158, contextBucket: "metadata+body" },
      { path: "plugins/game-production-workflow/skills/game-production-system/references/execution.md", sha256: "sha256:4480f51617322904c4684bd463c8265a74857387612268cb6d8cbe0b2d2aef10", wordCount: 1468, contextBucket: "reference" },
      { path: "plugins/game-production-workflow/skills/game-production-system/scripts/doctor.mjs", sha256: "sha256:0c0118a225f1006e54e280c1fb7dc716a433a3f2d12a5072c27d98c87b66bcc5", wordCount: 1004, contextBucket: "reference" },
      { path: "plugins/game-production-workflow/skills/game-art-production/SKILL.md", sha256: "sha256:5e8c56e40633a8d310ad126c4dd26aed11e89d3c481967ef18344c7eeb9419ba", wordCount: 497, contextBucket: "metadata+body" },
      { path: "plugins/game-production-workflow/skills/game-art-production/references/interactive-ui-2d.md", sha256: "sha256:94e723b0d9dc1cc18c7a2a7d2c7df5eb7f2860089fd6b7a56283db84e624330e", wordCount: 523, contextBucket: "reference" },
    ],
  },
};
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

const assertHistoricalRouteIdentity = (repositoryRoot, route, label) => {
  assert.equal(typeof route.path, "string", `${label}: path must be a string`);
  assert(route.path.length > 0 && !path.posix.isAbsolute(route.path) && !path.win32.isAbsolute(route.path), `${label}: path must be repository-relative`);
  assert.equal(path.posix.normalize(route.path), route.path, `${label}: path must be normalized`);
  assert(!route.path.includes("\\"), `${label}: path must use canonical separators`);
  assert(containedBy(repositoryRoot, path.resolve(repositoryRoot, ...route.path.split("/"))), `${label}: path escapes repository root`);
  assert.match(route.sha256, /^sha256:[a-f0-9]{64}$/, `${label}: invalid historical hash`);
  assert(Number.isInteger(route.wordCount) && route.wordCount > 0, `${label}: invalid historical word count`);
  assert(["metadata", "body", "reference", "metadata+body"].includes(route.contextBucket), `${label}: invalid historical context bucket`);
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
  assert.match(summary.candidateCommit, /^[a-f0-9]{40}$/, "candidate commit must be a full 40-hex identity");
  assert.equal(summary.candidateCommit, candidateRouteAnchor.candidateCommit, "candidate commit differs from the audited route anchor");
  assert.equal(evidence.candidateCommit, summary.candidateCommit);
  assert.deepEqual(summary.committedEvidence, {
    location: candidateEvidenceRelative,
    hash: semanticHash(evidence),
  }, "candidate summary must bind the fixed committed evidence snapshot");
  assert.deepEqual(summary.burdenMeasurementScope, evidence.burdenMeasurementScope, "burden scope must be bound to committed evidence");
  assert.deepEqual(evidence.burdenMeasurementScope, {
    cycleAndElapsedScope: "Design's 3 cycles and 46 elapsed minutes include the independently supplied Chrome recovery evidence cycle; Produce and no-generation retain their recorded run totals.",
    loadedContextScope: "Loaded-context files and word counts reproduce each candidate-run-record worker ledger and its portable route/support mapping.",
    included: [
      "candidate-worker loaded-file ledgers recorded in the three candidate run records",
      "all recorded production and evidence cycles and elapsed minutes, including the Design Chrome recovery cycle",
      "human approval changes recorded before and after each candidate run",
    ],
    excluded: [
      "controller and orchestration context not present in candidate-run-record loaded-file ledgers",
      "independent-reviewer Chrome documentation and context not present in candidate-run-record loaded-file ledgers",
      "any unrecorded word count",
    ],
    comparisonBoundary: "Control/candidate word deltas compare recorded candidate-worker route/context ledgers only; they do not measure total orchestration or reviewer context and do not establish an overall context reduction.",
    unrecordedWordCountsInvented: false,
  });
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
  assert.deepEqual(design.sourceRecords, {
    candidateRunRecord: "sha256:ab24a6cbd1ff05f2cc4cb16381008d4ff307e0a24b88907d553a31c8878a1b58",
    runtimeObservation: "sha256:e78a5afd74fd71e735dd33c052581482e4f7e14d729eeef56c729e002aea0485",
    inputCausalityEvidence: "sha256:7931966fa6731c14d8e306f03c021c5d747ad2d386c71b3a784648bd2b921f9f",
    independentReview: "sha256:3976728210c2bd044b06788e1fe1b140b5d45dffb35256324f22ca57dba65a0e",
  });
  assert.deepEqual(produce.sourceRecords, {
    candidateRunRecord: "sha256:a6b4b8af4fee10693c1bbf10d208a5584839fc4481ad492c505f1661b3b13e75",
    runtimeObservation: "sha256:397937d3ada48defb8b85bdf75b05b55dff0ac20248b746fe70a83091b0355d4",
    inputCausalityEvidence: null,
    independentReview: "sha256:dc5c76fdfe4e72efe4f986621e610851b8b9b35be2e31eed24847664287e8ff2",
  });
  assert.deepEqual(noGeneration.sourceRecords, {
    candidateRunRecord: "sha256:3cbca7cc0b4c2c44dd89c44f7468c7ffa6c3f732284a56f711201fb836c74d0a",
    runtimeObservation: "sha256:2519d22408a997e403b3791beb6de88ab324f71bb9d4c6c96127101a3d02d629",
    inputCausalityEvidence: null,
    independentReview: "sha256:5ab2a5a9f06a9820b035cab5255599197277bcd50e0e8a472a03825073f3cea6",
  });

  for (const record of records.values()) {
    const key = recordKey(record);
    const anchoredRoutes = candidateRouteAnchor.routes[key];
    assert(anchoredRoutes, `${key}: missing audited historical route anchor`);
    assert.deepEqual(record.routeIdentity, anchoredRoutes, `${key}: historical route identity differs from candidate-commit anchor`);
    assert.equal(record.run.candidateCommit, summary.candidateCommit, `${key}: run commit mismatch`);
    assert.deepEqual(Object.keys(record.sourceRecords).sort(), [
      "candidateRunRecord",
      "independentReview",
      "inputCausalityEvidence",
      "runtimeObservation",
    ]);
    for (const [recordName, hash] of Object.entries(record.sourceRecords)) {
      if (recordName === "inputCausalityEvidence" && record.fixtureId !== "design-direction") {
        assert.equal(hash, null, `${key}: unexpected dedicated input-causality record`);
      } else {
        assert.match(hash, /^sha256:[a-f0-9]{64}$/, `${key}: invalid ${recordName} semantic hash`);
      }
    }
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
      assertHistoricalRouteIdentity(trustedRepositoryRoot, route, `${key} route`);
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

  assert.equal(design.objective.status, "Pass");
  assert.equal(design.workspaceContext.filter(({ contextBucket }) => contextBucket === "metadata").reduce((sum, entry) => sum + entry.wordCount, 0), design.run.loadedContext.metadataWords);
  assert.equal(design.workspaceContext.filter(({ contextBucket }) => contextBucket === "body").reduce((sum, entry) => sum + entry.wordCount, 0), design.run.loadedContext.bodyWords);
  assert.equal([...design.routeIdentity, ...design.supportContext].reduce((sum, entry) => sum + entry.wordCount, 0), design.run.loadedContext.referenceWords);
  assert.equal(design.objective.inputCausality.result, "Observed");
  assert.equal(design.objective.inputCausality.verdict, "Pass");
  assert.equal(design.objective.inputCausality.proofStatePresetActivated, false);
  assert.equal(design.objective.inputCausality.syntheticDispatchEventUsed, false);
  assert.equal(design.objective.inputCausality.candidateArtifactRepairBatchUsed, false);
  assert.equal(design.objective.inputCausality.fullMatrixRerun, false);
  assert.deepEqual(design.objective.inputCausality.genuineInputObservation, {
    initialActiveElement: "body",
    tabCountToRetry: 12,
    retryFocusVisible: true,
    enterFeedback: "Retry requested",
    tabAfterRetryActiveId: "exit",
    exitFocusVisible: true,
    spaceFeedback: "Exit requested",
  });
  assert.deepEqual(design.objective.inputCausality.applicationWarningsOrErrors, []);
  assert.deepEqual(design.objective.inputCausality.externalWarningBoundary, {
    count: 12,
    origin: "chrome-extension://nkbihfbeogaeaoehlefnkodbefgpgknn",
    source: "Third-party extension logs; product attribution was not independently verified",
    excludedFromApplicationResult: true,
  });
  assert.deepEqual(design.objective.inputCausality.sourceNoRepairHashes, [
    { path: "candidate-workspace://design-direction/web/index.html", sha256: "sha256:b423da57e49f2e61e6d0027c6e64b1182737e2717aa3deeac10c5cfa55405db3" },
    { path: "candidate-workspace://design-direction/web/app.mjs", sha256: "sha256:e5ca5e32bfd9924d2b9a9f14621fa9db321d8ac840f7a289353db138a99a0b2a" },
    { path: "candidate-workspace://design-direction/web/styles.css", sha256: "sha256:4686bb6db7fa6ded2db475171e13e339a62debf44c5ac5104dc0225155e642fa" },
  ]);
  assert.equal(design.review.status, "Pass with bounded non-blocking findings");
  assert.equal(design.review.reviewerIndependence, "Independent");
  assert.equal(design.review.contributionDisclosure, "No contribution to production artifacts");
  assert.equal(design.review.actualInputCriterion, "Pass");
  assert.equal(design.review.integratedAcceptance, "Not granted");
  assert.match(design.review.authorityBoundary, /not human direction selection.*design acceptance.*producer acceptance.*golden approval.*gate passage.*lifecycle passage/i);
  assert.match(design.run.terminalClaim, /causality passed for the unchanged runtime/i);
  assert.match(design.run.terminalClaim, /human selection/i);
  assert.equal(produce.objective.status, "Pass");
  assert.deepEqual(produce.objective.states, ["empty", "full", "error", "equip", "controller-focus"]);
  assert(produce.objective.actualInputs.length >= 4);
  assert.equal(produce.objective.conceptRendered, false);
  assert.equal(noGeneration.objective.status, "Pass");
  assert.deepEqual(noGeneration.objective.states, ["empty", "full", "error", "equip", "controller-focus"]);
  assert(noGeneration.objective.actualInputs.length >= 4);
  assert.equal(noGeneration.objective.conceptRendered, false);
  assert.match(noGeneration.objective.capabilityRoute, /replaceable/);

  assert.deepEqual(summary.observedFailures, [], "passing primary evidence cannot retain a substantive failure");
  assert.deepEqual(summary.inputGateClosure, {
    id: "genuine-input-causality-observed",
    criterion: retainedCriterion,
    result: "Observed/Pass",
    reviewerIndependence: design.review.reviewerIndependence,
    contributionDisclosure: design.review.contributionDisclosure,
    candidateArtifactRepairBatchUsed: design.objective.inputCausality.candidateArtifactRepairBatchUsed,
    sourceHashMatch: true,
    fullMatrixRerun: design.objective.inputCausality.fullMatrixRerun,
    evidence: [
      design.objective.inputCausality.minimalTestOutcome,
      design.objective.inputCausality.evidenceResult,
    ],
    applicationWarningsOrErrors: design.objective.inputCausality.applicationWarningsOrErrors,
    externalWarningBoundary: design.objective.inputCausality.externalWarningBoundary,
    authorityBoundary: design.review.authorityBoundary,
  }, "input-gate closure must be derived from committed evidence and independent authority");

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
  const candidateFailureCriteria = new Set(summary.observedFailures.map(({ criterion }) => criterion));
  const retained = controlSummary.observedFailures.filter(({ criterion }) => candidateFailureCriteria.has(criterion)).map(({ criterion }) => criterion);
  const corrected = controlSummary.observedFailures.filter(({ criterion }) => !candidateFailureCriteria.has(criterion)).map(({ criterion }) => criterion);
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
  assert.equal(primaryPassed, true);
  assert(summary.decisionBasis.startsWith("CandidatePass."));
  assert.match(summary.decisionBasis, /genuine keyboard\/controller-equivalent input-to-visual causality criterion through independent observation/i);
  assert.match(summary.decisionBasis, /unlocks Task 6, but does not implement it/i);
  assert.match(summary.decisionBasis, /no human direction\/design\/producer\/golden\/G1\/G2/i);
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
