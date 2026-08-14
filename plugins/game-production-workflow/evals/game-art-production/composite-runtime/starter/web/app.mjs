import { createInventoryState, reduceInventory } from "./state.mjs";

const inventory = document.querySelector("#inventory");
const description = document.querySelector("#state-description");
let state = createInventoryState("empty");

function render() {
  const concept = document.createElement("img");
  concept.src = "./assets/inventory-concept.svg";
  concept.alt = "Flattened inventory concept; not production runtime UI";
  inventory.replaceChildren(concept);
  inventory.dataset.state = state.name;
  inventory.hidden = !state.isOpen;
  description.textContent = state.isOpen
    ? state.error ?? `Fixture state: ${state.name}; focused slot ${state.focusedIndex + 1}`
    : "Inventory closed";
}

document.querySelectorAll("[data-action]").forEach((button) => {
  button.addEventListener("click", () => {
    state = reduceInventory(state, { type: button.dataset.action });
    render();
    if (state.isOpen) inventory.focus();
  });
});

document.querySelectorAll("[data-state]").forEach((button) => {
  button.addEventListener("click", () => {
    state = createInventoryState(button.dataset.state);
    render();
    inventory.focus();
  });
});

inventory.addEventListener("keydown", (event) => {
  const actionType = {
    ArrowRight: "focus-next",
    ArrowDown: "focus-next",
    ArrowLeft: "focus-previous",
    ArrowUp: "focus-previous",
    Enter: "equip",
  }[event.key];
  if (!actionType) return;
  event.preventDefault();
  state = reduceInventory(state, { type: actionType });
  render();
});

inventory.addEventListener("click", () => {
  state = reduceInventory(state, { type: "equip" });
  render();
});

render();
