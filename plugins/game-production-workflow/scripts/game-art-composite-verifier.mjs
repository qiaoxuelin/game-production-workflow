import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const [runRoot] = process.argv.slice(2);
assert(runRoot && path.isAbsolute(runRoot), "trusted composite verifier requires an absolute run root");

const statePath = path.join(runRoot, "web/state.mjs");
let current = runRoot;
for (const segment of ["web", "state.mjs"]) {
  current = path.join(current, segment);
  assert(fs.existsSync(current), `missing authoritative state input: ${current}`);
  assert(!fs.lstatSync(current).isSymbolicLink(), `authoritative state input is a symbolic link: ${current}`);
}

const { SLOT_COUNT, createInventoryState, reduceInventory } = await import(
  `${pathToFileURL(statePath).href}?trusted=${process.pid}`
);
assert.equal(SLOT_COUNT, 8);
assert.equal(typeof createInventoryState, "function");
assert.equal(typeof reduceInventory, "function");

const empty = createInventoryState("empty");
assert.deepEqual(empty.slots, Array(8).fill(null));
assert.equal(empty.focusedIndex, 0);
assert.equal(empty.isOpen, true);

const full = createInventoryState("full");
assert.equal(full.slots.length, 8);
assert(full.slots.every(Boolean));

const error = reduceInventory(empty, { type: "equip" });
assert.equal(error.name, "error");
assert.equal(error.error, "Slot 1 is empty");
assert.equal(error.equippedIndex, null);

const equipped = reduceInventory(full, { type: "equip" });
assert.equal(equipped.name, "equip");
assert.equal(equipped.equippedIndex, 0);
assert.equal(equipped.error, null);

const focused = reduceInventory(createInventoryState("controller-focus"), { type: "focus-next" });
assert.equal(focused.name, "controller-focus");
assert.equal(focused.focusedIndex, 2);
assert.deepEqual(focused.slots, ["Compass", "Torch", null, null, null, null, null, null]);

const wrapped = reduceInventory(empty, { type: "focus-previous" });
assert.equal(wrapped.focusedIndex, 7);

const closed = reduceInventory(empty, { type: "close" });
assert.equal(closed.isOpen, false);
assert.equal(closed.name, "empty");
const reopened = reduceInventory(closed, { type: "open" });
assert.equal(reopened.isOpen, true);
assert.equal(reopened.name, "empty");

console.log("PASS trusted authoritative inventory state contract");
