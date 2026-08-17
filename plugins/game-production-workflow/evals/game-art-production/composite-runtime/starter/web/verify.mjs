import assert from "node:assert/strict";
import { SLOT_COUNT, createInventoryState, reduceInventory } from "./state.mjs";

assert.equal(SLOT_COUNT, 8);

const empty = createInventoryState("empty");
assert.deepEqual(empty.slots, Array(8).fill(null));
assert.equal(empty.focusedIndex, 0);

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

console.log("PASS authoritative inventory state contract");
