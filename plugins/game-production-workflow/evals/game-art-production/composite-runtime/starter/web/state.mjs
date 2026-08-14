export const SLOT_COUNT = 8;

const fieldKit = [
  "Compass", "Torch", "Rope", "Canteen", "Map", "Lens", "Key", "Flare",
];

function slotsFor(stateName) {
  if (stateName === "full" || stateName === "equip") return [...fieldKit];
  if (stateName === "controller-focus") return ["Compass", "Torch", null, null, null, null, null, null];
  return Array(SLOT_COUNT).fill(null);
}

export function createInventoryState(stateName = "empty") {
  if (!["empty", "full", "error", "equip", "controller-focus"].includes(stateName)) {
    throw new Error(`unknown inventory state: ${stateName}`);
  }
  const slots = slotsFor(stateName);
  return Object.freeze({
    name: stateName,
    isOpen: true,
    slots: Object.freeze(slots),
    focusedIndex: stateName === "controller-focus" ? 1 : 0,
    equippedIndex: stateName === "equip" ? 0 : null,
    error: stateName === "error" ? "Slot 1 is empty" : null,
  });
}

export function reduceInventory(state, action) {
  if (action.type === "open" || action.type === "close") {
    return Object.freeze({
      ...state,
      isOpen: action.type === "open",
      error: null,
    });
  }
  if (action.type === "focus-next" || action.type === "focus-previous") {
    const step = action.type === "focus-next" ? 1 : -1;
    return Object.freeze({
      ...state,
      name: "controller-focus",
      focusedIndex: (state.focusedIndex + step + SLOT_COUNT) % SLOT_COUNT,
      error: null,
    });
  }
  if (action.type === "focus") {
    if (!Number.isInteger(action.index) || action.index < 0 || action.index >= SLOT_COUNT) throw new Error("focus index is out of range");
    return Object.freeze({ ...state, name: "controller-focus", focusedIndex: action.index, error: null });
  }
  if (action.type === "equip") {
    if (!state.slots[state.focusedIndex]) {
      return Object.freeze({ ...state, name: "error", equippedIndex: null, error: `Slot ${state.focusedIndex + 1} is empty` });
    }
    return Object.freeze({ ...state, name: "equip", equippedIndex: state.focusedIndex, error: null });
  }
  throw new Error(`unknown inventory action: ${action.type}`);
}
