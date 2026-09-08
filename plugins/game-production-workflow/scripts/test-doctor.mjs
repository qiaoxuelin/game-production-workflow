import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const doctorPath = path.resolve(
  scriptDirectory,
  "../skills/game-production-system/scripts/doctor.mjs",
);
const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "game-production-doctor-"));
const probeMarker = path.join(fixture, "probe-was-executed.txt");

const runDoctor = (...args) =>
  spawnSync(process.execPath, [doctorPath, "--project-root", fixture, "--json", ...args], {
    encoding: "utf8",
  });

try {
  fs.mkdirSync(path.join(fixture, "production"), { recursive: true });
  fs.mkdirSync(path.join(fixture, "tools"), { recursive: true });
  fs.writeFileSync(path.join(fixture, "project.godot"), "[application]\n", "utf8");
  fs.writeFileSync(path.join(fixture, "tools/capture.mjs"), "// capture fixture\n", "utf8");
  fs.writeFileSync(
    path.join(fixture, "tools/malicious-probe.mjs"),
    `import fs from "node:fs"; fs.writeFileSync(${JSON.stringify(probeMarker)}, "unsafe");\n`,
    "utf8",
  );
  fs.writeFileSync(
    path.join(fixture, "production/adapter.json"),
    JSON.stringify(
      {
        schemaVersion: 1,
        commands: {
          test: {
            command: { default: "node --test", darwin: "node --test test/mac.mjs" },
            probe: { type: "executable", value: process.execPath, args: ["--version"] },
          },
          capture: {
            command: "node tools/capture.mjs",
            probe: { type: "file", path: "tools/capture.mjs" },
          },
          upload: {
            command: "node tools/upload.mjs",
            probe: { type: "file", path: "tools/missing-upload.mjs" },
          },
          install: {
            command: "node tools/install.mjs",
            probe: {
              type: "executable",
              value: process.execPath,
              args: [path.join(fixture, "tools/malicious-probe.mjs")],
            },
          },
        },
      },
      null,
      2,
    ),
    "utf8",
  );

  const healthy = runDoctor("--require", "test,capture");
  assert.equal(healthy.status, 0, healthy.stderr || healthy.stdout);
  const report = JSON.parse(healthy.stdout);
  assert.equal(report.schemaVersion, 1);
  assert.equal(report.platform, process.platform);
  assert.equal(report.externalSkillsRequired, false);
  assert.equal(report.runtimes.node.available, true);
  assert.equal(report.capabilities.doctor.configured, true);
  assert.equal(report.capabilities.doctor.available, true);
  assert.equal(report.engine.name, "godot");
  assert.equal(report.capabilities.capture.command, "node tools/capture.mjs");
  assert.equal(
    report.capabilities.test.command,
    process.platform === "darwin" ? "node --test test/mac.mjs" : "node --test",
  );
  assert.deepEqual(report.missingRequired, []);
  assert.equal(report.capabilities.test.available, true);
  assert.equal(report.capabilities.capture.available, true);
  assert.equal(report.capabilities.upload.available, null);
  assert.match(report.capabilities.upload.detail, /not probed/);

  // An existing entry point may still fail in the actual observation environment.
  // Doctor must remain non-executing even when its optimistic availability is tested.
  fs.writeFileSync(
    path.join(fixture, "tools/capture.mjs"),
    'console.error("No browser available"); process.exitCode = 7;\n',
    "utf8",
  );
  const existingButUnusable = runDoctor("--require", "capture");
  assert.equal(existingButUnusable.status, 0, existingButUnusable.stderr);
  assert.equal(
    JSON.parse(existingButUnusable.stdout).capabilities.capture.available,
    true,
  );
  const actualCapture = spawnSync(
    process.execPath,
    [path.join(fixture, "tools/capture.mjs")],
    { encoding: "utf8", timeout: 5000 },
  );
  assert.equal(actualCapture.status, 7);
  assert.match(actualCapture.stderr, /No browser available/);

  const blocked = runDoctor("--require", "upload");
  assert.equal(blocked.status, 2, blocked.stderr || blocked.stdout);
  const blockedReport = JSON.parse(blocked.stdout);
  assert.deepEqual(blockedReport.missingRequired, ["upload"]);
  assert.equal(blockedReport.capabilities.upload.configured, true);
  assert.equal(blockedReport.capabilities.upload.available, false);
  assert.equal(blockedReport.ready, false);

  const safeProbe = runDoctor("--require", "install");
  assert.equal(safeProbe.status, 0, safeProbe.stderr || safeProbe.stdout);
  assert.equal(
    fs.existsSync(probeMarker),
    false,
    "doctor must resolve executable availability without running project-provided probe arguments",
  );

  console.log("PASS standalone cross-platform capability doctor");
} finally {
  fs.rmSync(fixture, { recursive: true, force: true });
}
