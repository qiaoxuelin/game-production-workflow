import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workflowPath = path.join(
  repositoryRoot,
  ".github/workflows/game-production-1.8.0-platform.yml",
);

assert(fs.existsSync(workflowPath), "missing Task 8 platform workflow");
const workflow = fs.readFileSync(workflowPath, "utf8");

assert.match(workflow, /^name: Game Production 1\.8\.0 platform RC$/m);
assert.match(workflow, /^\s*push:\s*$/m);
assert.match(workflow, /^\s*workflow_dispatch:\s*$/m);
assert.match(workflow, /agent\/game-art-production-implementation/);
assert.match(workflow, /permissions:\s*\n\s*contents: read/);
assert.match(workflow, /os:\s*\[ubuntu-latest, windows-latest\]/);
assert.match(workflow, /actions\/checkout@v4/);
assert.match(workflow, /fetch-depth: 0/);
assert.match(workflow, /main:refs\/remotes\/origin\/main/);
assert.match(workflow, /actions\/setup-node@v4/);
assert.match(workflow, /node-version: ["']24["']/);
assert.match(workflow, /verify\.ps1 -CompareRef origin\/main/);
assert.match(workflow, /install\.mjs --dry-run --json/);
assert.match(workflow, /--ref \$env:GITHUB_SHA/);
assert.match(workflow, /Get-FileHash -Algorithm SHA256/);
assert.match(workflow, /actions\/upload-artifact@v4/);
assert.match(workflow, /if: always\(\)/);
assert.doesNotMatch(workflow, /pull_request:/);

console.log("PASS Task 8 Linux/Windows release-candidate workflow contract");
