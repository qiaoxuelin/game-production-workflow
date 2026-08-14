const cases = {
  success: { outcome: "Success", score: "Score 12,480", rewards: ["120 coins", "1 compass"] },
  failure: { outcome: "Run failed", score: "Score 2,160", rewards: [] },
  "reward-overflow": {
    outcome: "Success",
    score: "Score 24,900",
    rewards: ["480 coins", "2 keys", "1 compass", "3 shards", "1 map", "2 tokens", "1 relic", "4 sparks"],
  },
  retry: { outcome: "Success", score: "Score 12,480", rewards: ["120 coins", "1 compass"], feedback: "Retry requested" },
  "controller-focus": { outcome: "Success", score: "Score 12,480", rewards: ["120 coins", "1 compass"], focus: true },
};

const viewport = document.querySelector("#viewport");
const outcome = document.querySelector("#outcome");
const score = document.querySelector("#score");
const rewards = document.querySelector("#rewards");
const retry = document.querySelector("#retry");
const exit = document.querySelector("#exit");
const feedback = document.querySelector("#feedback");

function render(caseName) {
  const state = cases[caseName];
  outcome.textContent = state.outcome;
  score.textContent = state.score;
  rewards.replaceChildren(...state.rewards.map((reward) => {
    const item = document.createElement("li");
    item.textContent = reward;
    return item;
  }));
  feedback.textContent = state.feedback ?? "";
  if (state.focus) retry.focus();
}

document.querySelectorAll("[data-case]").forEach((button) => {
  button.addEventListener("click", () => render(button.dataset.case));
});
document.querySelectorAll("[data-viewport]").forEach((button) => {
  button.addEventListener("click", () => {
    viewport.className = `viewport ${button.dataset.viewport}`;
  });
});
retry.addEventListener("click", () => { feedback.textContent = "Retry requested"; });
exit.addEventListener("click", () => { feedback.textContent = "Exit requested"; });
render("success");
