#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SKILL_SOURCE =
  /^plugins\/game-production-workflow\/skills\/[^/]+\/.+$/;
const STRUCTURAL_SKILL_SOURCE =
  /^plugins\/game-production-workflow\/skills\/[^/]+\/(?:SKILL\.md|references\/.+)$/;
const BEHAVIOR_EVAL =
  /^plugins\/game-production-workflow\/evals\/(?:[^/]+\.json|[^/]+\/[^/]+\/fixture\.json)$/;
const SKILL_DESIGN = /^docs\/superpowers\/specs\/[^/]+\.md$/;
const SKILL_PLAN = /^docs\/superpowers\/plans\/[^/]+\.md$/;
const STRUCTURAL_STATUSES = new Set(["A", "D", "R", "C", "T"]);

export function normalizeChangedPath(value) {
  return String(value ?? "")
    .replaceAll("\\", "/")
    .replace(/^\.\//, "")
    .replace(/\/{2,}/g, "/");
}

function normalizedChange(change) {
  const status = String(change?.status ?? "").trim().toUpperCase();
  if (!status) {
    throw new Error("change status is required");
  }
  const changedPath = normalizeChangedPath(change?.path);
  if (!changedPath) {
    throw new Error("change path is required");
  }
  const oldPath = change?.oldPath
    ? normalizeChangedPath(change.oldPath)
    : undefined;
  return { status, path: changedPath, ...(oldPath ? { oldPath } : {}) };
}

function statusKind(change) {
  return change.status === "??" ? "A" : change.status[0];
}

function pathsFor(change) {
  return [change.path, change.oldPath].filter(Boolean);
}

function matchesAnyPath(change, matcher) {
  return pathsFor(change).some((candidate) => matcher.test(candidate));
}

function skillNameFor(relativePath) {
  return normalizeChangedPath(relativePath).match(
    /^plugins\/game-production-workflow\/skills\/([^/]+)\//,
  )?.[1];
}

function sameStringSet(left, right) {
  const leftSet = new Set(left);
  const rightSet = new Set(right);
  return (
    leftSet.size === rightSet.size &&
    [...leftSet].every((value) => rightSet.has(value))
  );
}

export function validateSkillEvolutionChanges(rawChanges, options = {}) {
  const changes = rawChanges.map(normalizedChange);
  const skillChanges = changes.filter((change) =>
    matchesAnyPath(change, SKILL_SOURCE),
  );
  if (skillChanges.length === 0) {
    return [];
  }

  const violations = [];
  const verifiedBehaviorEvidence = new Set(
    (options.verifiedBehaviorEvidencePaths ?? []).map(normalizeChangedPath),
  );
  const hasBehaviorEvidence = changes.some(
    (change) =>
      statusKind(change) !== "D" &&
      verifiedBehaviorEvidence.has(change.path),
  );
  if (!hasBehaviorEvidence) {
    violations.push({
      code: "skill-change-without-behavior-evidence",
      message:
        "Skill source changed without a changed eval or executable test-*.mjs file.",
    });
  }

  const structuralChanges = skillChanges.filter(
    (change) =>
      matchesAnyPath(change, STRUCTURAL_SKILL_SOURCE) &&
      STRUCTURAL_STATUSES.has(statusKind(change)),
  );
  if (structuralChanges.length > 0) {
    const affectedSkills = new Set(
      structuralChanges
        .flatMap(pathsFor)
        .map(skillNameFor)
        .filter(Boolean),
    );
    const changedPaths = new Set(
      changes
        .filter((change) => statusKind(change) !== "D")
        .map((change) => change.path),
    );
    const evidencePairs = options.verifiedStructuralEvidencePairs ?? [];
    const designPaths = new Set(
      (options.verifiedStructuralDesignPaths ?? []).map(normalizeChangedPath),
    );
    const planPaths = new Set(
      (options.verifiedStructuralPlanPaths ?? []).map(normalizeChangedPath),
    );
    const hasDesign = [...designPaths].some((candidate) =>
      changedPaths.has(candidate),
    );
    const hasPlan = [...planPaths].some((candidate) =>
      changedPaths.has(candidate),
    );
    if (!hasDesign) {
      violations.push({
        code: "structural-skill-change-without-design",
        message:
          "Structural Skill change requires a changed Skill-specific design under docs/superpowers/specs/.",
      });
    }
    if (!hasPlan) {
      violations.push({
        code: "structural-skill-change-without-plan",
        message:
          "Structural Skill change requires a changed Skill-specific plan under docs/superpowers/plans/.",
      });
    }
    const hasMatchingPair = evidencePairs.some(
      (pair) =>
        changedPaths.has(normalizeChangedPath(pair.designPath)) &&
        changedPaths.has(normalizeChangedPath(pair.planPath)) &&
        sameStringSet(pair.skills ?? [], affectedSkills),
    );
    if (hasDesign && hasPlan && !hasMatchingPair) {
      violations.push({
        code: "structural-skill-change-without-matching-design-plan",
        message:
          "Structural Skill design and plan must declare the same Skill evolution id and affected Skills.",
      });
    }
  }

  return violations;
}

function repositoryFile(repository, relativePath) {
  const resolved = path.resolve(repository, relativePath);
  const relative = path.relative(repository, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`changed path escapes repository: ${relativePath}`);
  }
  return resolved;
}

function nonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function nonEmptyStringArray(value) {
  return Array.isArray(value) && value.length > 0 && value.every(nonEmptyString);
}

function isBehaviorEvalDocument(document) {
  if (!document || typeof document !== "object" || Array.isArray(document)) {
    return false;
  }
  if (document.schemaVersion !== 1) return false;
  const corpus =
    nonEmptyString(document.skill) &&
    Array.isArray(document.scenarios) &&
    document.scenarios.length > 0 &&
    document.scenarios.every(
      (scenario) =>
        scenario &&
        typeof scenario === "object" &&
        nonEmptyString(scenario.id) &&
        nonEmptyString(scenario.request) &&
        nonEmptyStringArray(scenario.contractIds) &&
        nonEmptyStringArray(scenario.pressures) &&
        nonEmptyStringArray(scenario.requiredActions) &&
        nonEmptyStringArray(scenario.prohibitedActions) &&
        nonEmptyStringArray(scenario.terminalClaims),
    );
  const fixture =
    nonEmptyString(document.id) &&
    nonEmptyString(document.operation) &&
    nonEmptyString(document.request) &&
    Array.isArray(document.objectiveChecks) &&
    document.objectiveChecks.length > 0 &&
    document.objectiveChecks.every(
      (check) =>
        check &&
        typeof check === "object" &&
        nonEmptyString(check.id) &&
        nonEmptyString(check.description),
    ) &&
    nonEmptyStringArray(document.prohibitedClaims) &&
    nonEmptyStringArray(document.stopConditions);
  return corpus || fixture;
}

function executableJavaScript(source) {
  let result = "";
  let state = "code";
  for (let index = 0; index < source.length; index += 1) {
    const current = source[index];
    const next = source[index + 1];
    if (state === "code") {
      if (current === "/" && next === "/") {
        state = "line-comment";
        result += "  ";
        index += 1;
      } else if (current === "/" && next === "*") {
        state = "block-comment";
        result += "  ";
        index += 1;
      } else if (current === "'" || current === '"' || current === "`") {
        state = current;
        result += " ";
      } else {
        result += current;
      }
      continue;
    }
    if (state === "line-comment") {
      if (current === "\n") {
        state = "code";
        result += "\n";
      } else {
        result += " ";
      }
      continue;
    }
    if (state === "block-comment") {
      if (current === "*" && next === "/") {
        state = "code";
        result += "  ";
        index += 1;
      } else {
        result += current === "\n" ? "\n" : " ";
      }
      continue;
    }
    if (current === "\\") {
      result += "  ";
      index += 1;
    } else if (current === state) {
      state = "code";
      result += " ";
    } else {
      result += current === "\n" ? "\n" : " ";
    }
  }
  return result;
}

function discoverExecutedTests(repository) {
  const verifyText = fs.readFileSync(path.join(repository, "verify.ps1"), "utf8");
  const assignments = [
    ...verifyText.matchAll(
      /^\$(?<name>[A-Za-z][A-Za-z0-9]*)\s*=\s*Join-Path\s+\$(?<root>repo|plugin)\s+"(?<relative>[^"\r\n]*test-[^"\r\n]+\.mjs)"\s*$/gm,
    ),
  ];
  const lines = verifyText.split(/\r?\n/);
  const executed = [];
  for (const assignment of assignments) {
    const { name, root, relative } = assignment.groups;
    const invocation = new RegExp(
      `^\\s*&\\s+\\$node\\.Source\\s+\\$${name}(?:\\s|$)`,
    );
    if (!lines.some((line) => invocation.test(line))) continue;
    const prefix = root === "plugin" ? "plugins/game-production-workflow/" : "";
    const relativePath = normalizeChangedPath(`${prefix}${relative}`);
    const candidate = repositoryFile(repository, relativePath);
    const stat = fs.lstatSync(candidate);
    if (!stat.isFile() || stat.isSymbolicLink()) continue;
    const code = executableJavaScript(fs.readFileSync(candidate, "utf8"));
    if (!/\bimport\s+assert\s+from\b/.test(code)) continue;
    if (!/\bassert(?:\.[A-Za-z]+\s*\(|\s*\()/.test(code)) continue;
    executed.push(relativePath);
  }
  return executed;
}

function discoverBehaviorEvidence(repository, changes) {
  const verified = new Set(discoverExecutedTests(repository));
  for (const change of changes) {
    if (statusKind(change) === "D" || !BEHAVIOR_EVAL.test(change.path)) continue;
    const candidate = repositoryFile(repository, change.path);
    const stat = fs.lstatSync(candidate);
    if (!stat.isFile() || stat.isSymbolicLink()) continue;
    let document;
    try {
      document = JSON.parse(fs.readFileSync(candidate, "utf8"));
    } catch {
      continue;
    }
    if (isBehaviorEvalDocument(document)) verified.add(change.path);
  }
  return [...verified];
}

function readStructuralDeclaration(repository, change, kind) {
  const matcher = kind === "design" ? SKILL_DESIGN : SKILL_PLAN;
  if (statusKind(change) === "D" || !matcher.test(change.path)) return undefined;
  const candidate = repositoryFile(repository, change.path);
  const stat = fs.lstatSync(candidate);
  if (!stat.isFile() || stat.isSymbolicLink()) return undefined;
  const contents = fs.readFileSync(candidate, "utf8");
  const id = contents.match(/^Skill evolution id:\s*([a-z0-9][a-z0-9-]*)\s*$/m);
  const classification = contents.match(
    /^Skill evolution class:\s*(Patch|Extension|Restructure)\s*$/m,
  );
  const skills = contents.match(
    /^Skill evolution skills:\s*([a-z0-9][a-z0-9-]*(?:\s*,\s*[a-z0-9][a-z0-9-]*)*)\s*$/m,
  );
  if (!id || !classification || classification[1] !== "Restructure" || !skills) {
    return undefined;
  }
  return {
    id: id[1],
    skills: skills[1].split(",").map((item) => item.trim()),
    path: change.path,
  };
}

function discoverStructuralEvidence(repository, changes) {
  const designs = changes
    .map((change) => readStructuralDeclaration(repository, change, "design"))
    .filter(Boolean);
  const plans = changes
    .map((change) => readStructuralDeclaration(repository, change, "plan"))
    .filter(Boolean);
  const pairs = [];
  for (const design of designs) {
    for (const plan of plans) {
      if (design.id !== plan.id) continue;
      if (!sameStringSet(design.skills, plan.skills)) continue;
      pairs.push({
        id: design.id,
        skills: design.skills,
        designPath: design.path,
        planPath: plan.path,
      });
    }
  }
  return {
    designs: designs.map((item) => item.path),
    plans: plans.map((item) => item.path),
    pairs,
  };
}

function runGit(repository, args) {
  const result = spawnSync("git", ["-C", repository, ...args], {
    encoding: "utf8",
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    const detail = `${result.stderr ?? ""}${result.stdout ?? ""}`.trim();
    throw new Error(`git ${args[0]} failed${detail ? `: ${detail}` : ""}`);
  }
  return result.stdout;
}

function parseNameStatusZero(output) {
  const fields = output.split("\0");
  if (fields.at(-1) === "") {
    fields.pop();
  }
  const changes = [];
  for (let index = 0; index < fields.length; ) {
    const status = fields[index++];
    if (!status) {
      throw new Error("git diff returned an empty status");
    }
    if (status.startsWith("R") || status.startsWith("C")) {
      const oldPath = fields[index++];
      const changedPath = fields[index++];
      if (!oldPath || !changedPath) {
        throw new Error(`git diff returned an incomplete ${status} record`);
      }
      changes.push({ status, oldPath, path: changedPath });
      continue;
    }
    const changedPath = fields[index++];
    if (!changedPath) {
      throw new Error(`git diff returned an incomplete ${status} record`);
    }
    changes.push({ status, path: changedPath });
  }
  return changes;
}

export function collectGitChanges(repository, compareRef) {
  if (!compareRef || String(compareRef).startsWith("-")) {
    throw new Error("compare ref must be a non-option Git revision");
  }
  runGit(repository, ["rev-parse", "--verify", `${compareRef}^{commit}`]);
  const tracked = parseNameStatusZero(
    runGit(repository, [
      "diff",
      "--name-status",
      "-z",
      "--find-renames",
      compareRef,
      "--",
    ]),
  );
  const untrackedOutput = runGit(repository, [
    "ls-files",
    "--others",
    "--exclude-standard",
    "-z",
  ]);
  const untracked = untrackedOutput
    .split("\0")
    .filter(Boolean)
    .map((changedPath) => ({ status: "A", path: changedPath }));
  return [...tracked, ...untracked];
}

function parseArguments(argv) {
  const result = { repo: undefined, compareRef: undefined };
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (flag === "--repo" || flag === "--compare-ref") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error(`missing value for ${flag}`);
      }
      if (flag === "--repo") result.repo = value;
      if (flag === "--compare-ref") result.compareRef = value;
      index += 1;
      continue;
    }
    throw new Error(`unknown argument: ${flag}`);
  }
  if (!result.repo) throw new Error("--repo is required");
  if (!result.compareRef) throw new Error("--compare-ref is required");
  return result;
}

export function runCli(argv) {
  try {
    const options = parseArguments(argv);
    const repository = path.resolve(options.repo);
    const changes = collectGitChanges(repository, options.compareRef);
    const structuralEvidence = discoverStructuralEvidence(repository, changes);
    const violations = validateSkillEvolutionChanges(changes, {
      verifiedBehaviorEvidencePaths: discoverBehaviorEvidence(repository, changes),
      verifiedStructuralDesignPaths: structuralEvidence.designs,
      verifiedStructuralPlanPaths: structuralEvidence.plans,
      verifiedStructuralEvidencePairs: structuralEvidence.pairs,
    });
    if (violations.length > 0) {
      console.error("FAIL Skill evolution policy");
      for (const violation of violations) {
        console.error(`[${violation.code}] ${violation.message}`);
      }
      return 1;
    }
    console.log(`PASS Skill evolution policy (${changes.length} changed paths)`);
    return 0;
  } catch (error) {
    console.error(`FAIL Skill evolution policy: ${error.message}`);
    return 1;
  }
}

const invokedPath = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : undefined;
if (invokedPath === import.meta.url) {
  process.exitCode = runCli(process.argv.slice(2));
}
