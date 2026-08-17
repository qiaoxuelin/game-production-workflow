export const resultCases = Object.freeze({
  success: { outcome: "Success", score: "Score 12,480", rewards: ["120 coins", "1 compass"] },
  failure: { outcome: "Run failed", score: "Score 2,160", rewards: [] },
  "reward-overflow": {
    outcome: "Success",
    score: "Score 24,900",
    rewards: ["480 coins", "2 keys", "1 compass", "3 shards", "1 map", "2 tokens", "1 relic", "4 sparks"],
  },
  retry: { outcome: "Success", score: "Score 12,480", rewards: ["120 coins", "1 compass"], feedback: "Retry requested" },
  "controller-focus": { outcome: "Success", score: "Score 12,480", rewards: ["120 coins", "1 compass"], focus: true },
});

export const targetViewports = Object.freeze({
  desktop: "1280x720",
  mobile: "390x844",
});

function controlLabel(value) {
  return value.replaceAll("-", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function modelControls(documentRoot, selector, hostSelector, model, dataKey) {
  const existing = [...documentRoot.querySelectorAll(selector)];
  if (existing.length > 0) return existing;
  const host = documentRoot.querySelector(hostSelector);
  if (!host) throw new Error(`missing control host: ${hostSelector}`);
  const controls = Object.entries(model).map(([key, value]) => {
    const button = documentRoot.createElement("button");
    button.dataset[dataKey] = key;
    button.textContent = dataKey === "viewport" ? value.replace("x", "×") : controlLabel(key);
    return button;
  });
  host.append(...controls);
  return controls;
}

export function initializeResultShell(documentRoot = document) {
  const viewport = documentRoot.querySelector("#viewport");
  const outcome = documentRoot.querySelector("#outcome");
  const score = documentRoot.querySelector("#score");
  const rewards = documentRoot.querySelector("#rewards");
  const retry = documentRoot.querySelector("#retry");
  const exit = documentRoot.querySelector("#exit");
  const feedback = documentRoot.querySelector("#feedback");
  const caseButtons = modelControls(documentRoot, "[data-case]", "#case-controls", resultCases, "case");
  const viewportButtons = modelControls(documentRoot, "[data-viewport]", "#viewport-controls", targetViewports, "viewport");
  for (const caseName of Object.keys(resultCases)) {
    if (!caseButtons.some((button) => button.dataset.case === caseName)) throw new Error(`missing case control: ${caseName}`);
  }
  for (const viewportName of Object.keys(targetViewports)) {
    if (!viewportButtons.some((button) => button.dataset.viewport === viewportName)) throw new Error(`missing viewport control: ${viewportName}`);
  }

  function render(caseName) {
    const state = resultCases[caseName];
    outcome.textContent = state.outcome;
    score.textContent = state.score;
    rewards.replaceChildren(...state.rewards.map((reward) => {
      const item = documentRoot.createElement("li");
      item.textContent = reward;
      return item;
    }));
    feedback.textContent = state.feedback ?? "";
    if (state.focus) retry.focus();
  }

  caseButtons.forEach((button) => {
    button.addEventListener("click", () => render(button.dataset.case));
  });
  viewportButtons.forEach((button) => {
    button.addEventListener("click", () => {
      viewport.className = `viewport ${button.dataset.viewport}`;
    });
  });
  retry.addEventListener("click", () => { feedback.textContent = "Retry requested"; });
  exit.addEventListener("click", () => { feedback.textContent = "Exit requested"; });
  render("success");
}

if (typeof document !== "undefined") initializeResultShell(document);
