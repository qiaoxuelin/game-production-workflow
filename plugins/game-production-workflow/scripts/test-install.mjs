import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { validateWindowsArguments } from "../../../install.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const installPath = path.resolve(scriptDirectory, "../../../install.mjs");
const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "game-production-install-"));
const fakeCodex = path.join(fixture, "fake-codex.mjs");

fs.writeFileSync(
  fakeCodex,
  `import fs from "node:fs";
const statePath = process.env.GAME_PRODUCTION_INSTALL_STATE;
const state = JSON.parse(fs.readFileSync(statePath, "utf8"));
const args = process.argv.slice(2);
const key = args.join(" ");
state.calls.push(args);
const save = () => fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
if (key === "--version") { save(); console.log("codex fake"); process.exit(0); }
if (state.failOn === key) { save(); console.error("forced failure"); process.exit(9); }
if (key === "plugin list --json") {
  save();
  console.log(JSON.stringify({ installed: state.installed
    ? [{ name: "game-production-workflow", pluginId: "game-production-workflow@game-production-workflow", enabled: true }]
    : state.legacy ? [{ name: "game-production-system", pluginId: "game-production-system@legacy", enabled: true }] : [] }));
  process.exit(0);
}
if (key === "plugin marketplace list --json") {
  save();
  console.log(JSON.stringify({ marketplaces: state.marketplaceConfigured ? [{ name: "game-production-workflow" }] : [] }));
  process.exit(0);
}
if (args[0] === "plugin" && args[1] === "remove") { state.legacy = false; save(); process.exit(0); }
if (args.slice(0, 3).join(" ") === "plugin marketplace add") { state.marketplaceConfigured = true; state.added = args.slice(3); save(); process.exit(0); }
if (key === "plugin marketplace upgrade game-production-workflow") { state.upgraded = true; save(); process.exit(0); }
if (key === "plugin add game-production-workflow@game-production-workflow") { state.installed = true; save(); process.exit(0); }
save(); console.error("unexpected fake command: " + key); process.exit(8);
`,
  "utf8",
);

function runInstaller(state, ...args) {
  const statePath = path.join(fixture, `state-${Math.random().toString(16).slice(2)}.json`);
  fs.writeFileSync(statePath, JSON.stringify({ calls: [], ...state }), "utf8");
  const result = spawnSync(
    process.execPath,
    [installPath, ...args, "--codex-command", fakeCodex],
    {
      encoding: "utf8",
      env: { ...process.env, GAME_PRODUCTION_INSTALL_STATE: statePath },
    },
  );
  return { result, state: JSON.parse(fs.readFileSync(statePath, "utf8")) };
}

try {
  const dryRun = spawnSync(
    process.execPath,
    [installPath, "--dry-run", "--json", "--repository", "owner/repository", "--ref", "release"],
    { encoding: "utf8" },
  );
  assert.equal(dryRun.status, 0, dryRun.stderr || dryRun.stdout);
  const report = JSON.parse(dryRun.stdout);
  assert.equal(report.platform, process.platform);
  assert.equal(report.externalSkillsRequired, false);
  assert.equal(report.dryRun, true);

  const added = runInstaller(
    { marketplaceConfigured: false, installed: false, legacy: true },
    "--repository",
    "owner/repository",
    "--ref",
    "release",
  );
  assert.equal(added.result.status, 0, added.result.stderr || added.result.stdout);
  assert.deepEqual(added.state.added, ["owner/repository", "--ref", "release"]);
  assert.equal(added.state.legacy, false);
  assert.equal(added.state.installed, true);
  assert.match(
    added.result.stdout,
    /all three bundled Skills and the approval MCP[\s\S]*No external Skill installation is required/i,
  );
  const pluginAdds = added.state.calls.filter(
    (args) => args[0] === "plugin" && args[1] === "add",
  );
  assert.deepEqual(pluginAdds, [["plugin", "add", "game-production-workflow@game-production-workflow"]]);

  const upgraded = runInstaller(
    { marketplaceConfigured: true, installed: false, legacy: false },
    "--json",
  );
  assert.equal(upgraded.result.status, 0, upgraded.result.stderr || upgraded.result.stdout);
  assert.equal(upgraded.state.upgraded, true);

  const mismatch = runInstaller(
    { marketplaceConfigured: true, installed: false, legacy: false },
    "--repository",
    "fork/repository",
    "--ref",
    "release",
  );
  assert.equal(mismatch.result.status, 1);
  assert.match(mismatch.result.stderr, /already configured.*explicit repository or ref/i);

  const failed = runInstaller(
    {
      marketplaceConfigured: false,
      installed: false,
      legacy: false,
      failOn: "plugin add game-production-workflow@game-production-workflow",
    },
  );
  assert.equal(failed.result.status, 1);
  assert.match(failed.result.stderr, /forced failure/);

  assert.doesNotThrow(() => validateWindowsArguments(["plugin", "remove", "game-production-system@legacy"]));
  assert.throws(
    () => validateWindowsArguments(["plugin", "remove", "legacy&calc.exe"]),
    /unsafe Windows command argument/,
  );

  console.log("PASS cross-platform Node installer behavior and Windows argument safety");
} finally {
  fs.rmSync(fixture, { recursive: true, force: true });
}
