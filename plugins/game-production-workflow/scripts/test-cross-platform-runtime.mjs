import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const pluginRoot = path.resolve(scriptDirectory, "..");
const productionScripts = path.join(
  pluginRoot,
  "skills/game-production-system/scripts",
);
const powershell = process.env.GPW_POWERSHELL ||
  (process.platform === "win32" ? "pwsh.exe" : "pwsh");

let temporaryRoot;
let projectRoot;

function runPowerShell(scriptName, argumentsList, allowedStatuses = [0]) {
  const invocationArguments = ["-NoProfile"];
  if (process.platform === "win32") {
    invocationArguments.push("-ExecutionPolicy", "Bypass");
  }
  invocationArguments.push(
    "-File",
    path.join(productionScripts, scriptName),
    ...argumentsList,
  );

  const result = spawnSync(powershell, invocationArguments, {
    encoding: "utf8",
    windowsHide: true,
  });
  assert.equal(result.error, undefined, `could not start ${powershell}`);
  assert(
    allowedStatuses.includes(result.status),
    `${scriptName} exited ${result.status}\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`,
  );
  return result;
}

function parseJsonOutput(result, context) {
  const start = result.stdout.indexOf("{");
  const end = result.stdout.lastIndexOf("}");
  assert(start >= 0 && end > start, `${context} returned no JSON: ${result.stdout}`);
  return JSON.parse(result.stdout.slice(start, end + 1));
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])));
  return Buffer.concat([length, typeBuffer, data, checksum]);
}

function createRuntimePng(filePath, width = 32, height = 16) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;

  const bytesPerPixel = 4;
  const rows = [];
  for (let y = 0; y < height; y += 1) {
    const row = Buffer.alloc(width * bytesPerPixel);
    for (let x = 0; x < width; x += 1) {
      const offset = x * bytesPerPixel;
      row[offset] = (x * 7) % 256;
      row[offset + 1] = (y * 17) % 256;
      row[offset + 2] = (x + y) % 2 === 0 ? 32 : 224;
      row[offset + 3] = 255;
    }
    rows.push(row);
  }

  const paeth = (left, up, upperLeft) => {
    const prediction = left + up - upperLeft;
    const leftDistance = Math.abs(prediction - left);
    const upDistance = Math.abs(prediction - up);
    const upperLeftDistance = Math.abs(prediction - upperLeft);
    if (leftDistance <= upDistance && leftDistance <= upperLeftDistance) return left;
    return upDistance <= upperLeftDistance ? up : upperLeft;
  };
  const encodedRows = rows.map((row, y) => {
    const filterType = y % 5;
    const previous = y === 0 ? null : rows[y - 1];
    const filtered = Buffer.alloc(row.length + 1);
    filtered[0] = filterType;
    for (let index = 0; index < row.length; index += 1) {
      const left = index >= bytesPerPixel ? row[index - bytesPerPixel] : 0;
      const up = previous ? previous[index] : 0;
      const upperLeft = previous && index >= bytesPerPixel
        ? previous[index - bytesPerPixel]
        : 0;
      const predictor = [
        0,
        left,
        up,
        Math.floor((left + up) / 2),
        paeth(left, up, upperLeft),
      ][filterType];
      filtered[index + 1] = (row[index] - predictor + 256) % 256;
    }
    return filtered;
  });
  const scanlines = Buffer.concat(encodedRows);

  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", header),
    pngChunk("IDAT", zlib.deflateSync(scanlines)),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
  fs.writeFileSync(filePath, png);
}

before(() => {
  temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "gpw-runtime-"));
  projectRoot = path.join(temporaryRoot, "project");
  fs.mkdirSync(projectRoot);

  const bootstrap = runPowerShell("bootstrap.ps1", [
    "-ProjectPath",
    projectRoot,
    "-ProjectId",
    "runtime-smoke",
    "-ProjectTrack",
    "indie_game",
    "-Platform",
    "desktop",
    "-Engine",
    "custom",
  ]);
  const bootstrapResult = parseJsonOutput(bootstrap, "bootstrap");
  const requestedDirectory = fs.statSync(projectRoot);
  const returnedDirectory = fs.statSync(bootstrapResult.projectPath);
  assert.equal(returnedDirectory.dev, requestedDirectory.dev);
  assert.equal(returnedDirectory.ino, requestedDirectory.ino);
  projectRoot = bootstrapResult.projectPath;

  const check = runPowerShell(
    "check.ps1",
    ["-ProjectPath", projectRoot],
    [0, 1],
  );
  assert.equal(parseJsonOutput(check, "initial check").policyVersion, "1.6.0");
});

after(() => {
  if (temporaryRoot) {
    fs.rmSync(temporaryRoot, { force: true, recursive: true });
  }
});

test("bootstrap keeps the optional production plan absent", () => {
  assert.equal(fs.existsSync(path.join(projectRoot, "production/PLAN.md")), false);
});

test("bootstrap installs the portable image inspector", () => {
  assert.equal(
    fs.existsSync(path.join(projectRoot, "tools/production/image-inspect.mjs")),
    true,
  );
});

test("file evidence stores a portable repository-relative location", () => {
  const artifact = path.join(projectRoot, "build/output.txt");
  fs.mkdirSync(path.dirname(artifact), { recursive: true });
  fs.writeFileSync(artifact, "runtime evidence\n", "utf8");

  runPowerShell("evidence.ps1", [
    "-ProjectPath",
    projectRoot,
    "-TaskId",
    "runtime-smoke",
    "-Gate",
    "G0",
    "-Type",
    "build",
    "-FilePath",
    artifact,
  ]);

  const manifest = JSON.parse(
    fs.readFileSync(
      path.join(projectRoot, "production/evidence/manifest.json"),
      "utf8",
    ),
  );
  assert.equal(manifest.entries.at(-1).location, "build/output.txt");
});

test("screenshot evidence uses portable PNG inspection", () => {
  const screenshot = path.join(projectRoot, "production/evidence/runtime.png");
  createRuntimePng(screenshot);

  const evidence = runPowerShell("evidence.ps1", [
    "-ProjectPath",
    projectRoot,
    "-TaskId",
    "runtime-smoke",
    "-Gate",
    "G0",
    "-Type",
    "screenshot",
    "-FilePath",
    screenshot,
    "-Resolution",
    "32x16",
  ]);
  const evidenceEntry = parseJsonOutput(evidence, "screenshot evidence");
  assert.equal(evidenceEntry.location, "production/evidence/runtime.png");
  assert.equal(evidenceEntry.resolution, "32x16");

  const check = runPowerShell(
    "check.ps1",
    ["-ProjectPath", projectRoot],
    [0, 1],
  );
  const checkResult = parseJsonOutput(check, "evidence check");
  const issueCodes = checkResult.issues.map((issue) => issue.code);
  assert.equal(issueCodes.includes("evidence_dimensions_unavailable"), false);
  assert.equal(issueCodes.includes("evidence_resolution_mismatch"), false);
});
