import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import readline from "node:readline";

const pluginRoot = path.resolve(
  path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")),
  ".."
);
const projectRoot = await fs.mkdtemp(
  path.join(os.tmpdir(), "game-approval-ui-test-")
);
await fs.mkdir(path.join(projectRoot, "production"), { recursive: true });
await fs.writeFile(
  path.join(projectRoot, "production", "project.json"),
  '{"systemVersion":"1.3.0"}\n',
  "utf8"
);

const child = spawn(process.execPath, ["./mcp/server.mjs"], {
  cwd: pluginRoot,
  env: {
    ...process.env,
    GAME_APPROVAL_UI_WAIT_MS: "80",
    GAME_APPROVAL_UI_LATE_RESPONSE_RETENTION_MS: "2000",
  },
  stdio: ["pipe", "pipe", "pipe"],
});
const output = readline.createInterface({
  input: child.stdout,
  crlfDelay: Infinity,
});
let sequence = 0;
const pending = new Map();
let lateRequestId = null;
let lateDecisionLabel = null;
let reopenAttempts = 0;

function send(message) {
  child.stdin.write(`${JSON.stringify(message)}\n`);
}

function request(method, params = {}) {
  const id = ++sequence;
  send({ jsonrpc: "2.0", id, method, params });
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`Timed out waiting for ${method}`));
    }, 10000);
    pending.set(id, {
      resolve: (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      reject,
    });
  });
}

output.on("line", (line) => {
  const message = JSON.parse(line);
  if (message.method === "elicitation/create") {
    assert.equal(message.params.mode, "form");
    if (message.params.message.startsWith("超时后是否仍应记录迟到审批")) {
      lateRequestId = message.id;
      lateDecisionLabel =
        message.params.requestedSchema.properties.decision.enum[0];
      return;
    }
    if (message.params.message.startsWith("过期审批是否可以重新打开")) {
      reopenAttempts += 1;
      if (reopenAttempts === 1) return;
      send({
        jsonrpc: "2.0",
        id: message.id,
        result: {
          action: "accept",
          content: {
            decision:
              message.params.requestedSchema.properties.decision.enum[0],
            note: "Reopened card",
          },
        },
      });
      return;
    }
    if (message.params.message.startsWith("整体设计框架应先规划到什么深度")) {
      assert.equal(
        message.params.message,
        "整体设计框架应先规划到什么深度，再进入首个实现？\n\n本次只决定：确定前置规划边界，不决定具体港口、剧情或实现。"
      );
      assert.deepEqual(
        message.params.requestedSchema.properties.decision.enum,
        [
          "产品框架＋首季架构（推荐） — 先确定完整产品的循环层级、成长与内容生产规则，再规划第一赛季结构；只把首个验证细化到可实现规格。",
          "完整设计第一赛季 — 在任何实现前，把第一赛季所有港口、每日任务、故事、奖励和经济全部详细确定。",
          "只规划首个验证段 — 只规划一个目的地小循环、一次目的地切换和最终目标验证。",
        ]
      );
      send({
        jsonrpc: "2.0",
        id: message.id,
        result: {
          action: "accept",
          content: {
            decision:
              "产品框架＋首季架构（推荐） — 先确定完整产品的循环层级、成长与内容生产规则，再规划第一赛季结构；只把首个验证细化到可实现规格。",
            note: "",
          },
        },
      });
      return;
    }
    assert.equal(
      message.params.message,
      "是否采用当前视觉候选？\n\n本次只决定：本轮视觉基线，不代表 G1 通过。"
    );
    assert.deepEqual(message.params.requestedSchema.properties.decision.enum, [
      "当前视觉基线（推荐） — 记录该候选通过并继续依赖工作。",
      "退回修改 — 保持门禁未通过并根据意见调整。",
      "稍后处理 — 保留待审批状态。",
    ]);
    send({
      jsonrpc: "2.0",
      id: message.id,
      result: {
        action: "accept",
        content: {
          decision: "当前视觉基线（推荐） — 记录该候选通过并继续依赖工作。",
          note: "Automated protocol test",
        },
      },
    });
    return;
  }
  const waiter = pending.get(message.id);
  if (!waiter) return;
  pending.delete(message.id);
  if (message.error) waiter.reject(new Error(message.error.message));
  else waiter.resolve(message.result);
});

const commonApproval = {
  project_root: projectRoot,
  approval_id: "TEST-VISUAL-001",
  task_id: "TEST-TASK",
  gate: "G1",
  kind: "visual",
  title: "视觉候选审批",
  question: "P1：是否采用当前视觉候选？",
  scope: "本轮视觉基线，不代表 G1 通过。",
  artifacts: ["production/evidence/test.png"],
  options: [
    {
      id: "approve",
      label: "采用：当前视觉基线",
      impact: "记录该候选通过并继续依赖工作。",
      grants_passage: true,
    },
    {
      id: "revise",
      label: "退回修改",
      impact: "保持门禁未通过并根据意见调整。",
      grants_passage: false,
    },
    {
      id: "defer",
      label: "稍后处理",
      impact: "保留待审批状态。",
      grants_passage: false,
    },
  ],
  recommended_option_id: "approve",
  blocking: true,
};

try {
  const initialized = await request("initialize", {
    protocolVersion: "2025-11-25",
    capabilities: { elicitation: { form: {} } },
    clientInfo: { name: "game-approval-ui-test", version: "0.1.0" },
  });
  assert.equal(initialized.protocolVersion, "2025-11-25");
  send({ jsonrpc: "2.0", method: "notifications/initialized", params: {} });

  const toolList = await request("tools/list");
  assert.deepEqual(
    toolList.tools.map((tool) => tool.name),
    [
      "request_approval",
      "list_approvals",
      "review_approval",
      "record_approval_decision",
    ]
  );

  const interactive = await request("tools/call", {
    name: "request_approval",
    arguments: { ...commonApproval, interactive: true },
  });
  assert.equal(interactive.isError, undefined);
  assert.equal(interactive.structuredContent.interaction, "accepted");
  assert.equal(
    interactive.structuredContent.approval.decision.optionId,
    "approve"
  );
  assert.equal(
    interactive.structuredContent.approval.decision.grantsPassage,
    true
  );
  assert.match(
    interactive.content[0].text,
    /Decision note \(part of the decision\): Automated protocol test/
  );

  const queued = await request("tools/call", {
    name: "request_approval",
    arguments: {
      ...commonApproval,
      approval_id: "TEST-GATE-002",
      kind: "gate",
      title: "Gate 决策",
      interactive: false,
    },
  });
  assert.equal(queued.structuredContent.interaction, "queued");
  assert.equal(queued.structuredContent.fallback.length, 3);

  const recorded = await request("tools/call", {
    name: "record_approval_decision",
    arguments: {
      project_root: projectRoot,
      approval_id: "TEST-GATE-002",
      selection: 2,
      note: "Needs another pass",
    },
  });
  assert.equal(
    recorded.structuredContent.approval.status,
    "revision_requested"
  );
  assert.equal(
    recorded.structuredContent.approval.decision.grantsPassage,
    false
  );
  assert.match(
    recorded.content[0].text,
    /Decision note \(part of the decision\): Needs another pass/
  );

  const listed = await request("tools/call", {
    name: "list_approvals",
    arguments: { project_root: projectRoot, status: "all" },
  });
  assert.equal(listed.structuredContent.count, 2);

  const persisted = JSON.parse(
    await fs.readFile(
      path.join(projectRoot, "production", "approvals", "index.json"),
      "utf8"
    )
  );
  assert.equal(persisted.approvals.length, 2);
  assert.equal(persisted.approvals[0].status, "approved");
  assert.equal(persisted.approvals[1].status, "revision_requested");

  const p1 = await request("tools/call", {
    name: "request_approval",
    arguments: {
      project_root: projectRoot,
      approval_id: "TEST-P1-003",
      task_id: "TEST-TASK",
      gate: "G1",
      kind: "design",
      title: "P1 制作规划深度",
      question: "P1：整体设计框架应先规划到什么深度，再进入首个实现？",
      scope: "确定前置规划边界，不决定具体港口、剧情或实现。",
      artifacts: ["production/PLAN.md", "production/TASK.md"],
      options: [
        {
          id: "framework",
          label: "Accept：产品框架＋首季架构",
          impact:
            "先确定完整产品的循环层级、成长与内容生产规则，再规划第一赛季结构；只把首个验证细化到可实现规格。",
          grants_passage: true,
        },
        {
          id: "season",
          label: "Accept：完整设计第一赛季",
          impact:
            "在任何实现前，把第一赛季所有港口、每日任务、故事、奖励和经济全部详细确定。",
          grants_passage: true,
        },
        {
          id: "proof",
          label: "Accept：只规划首个验证段",
          impact:
            "只规划一个目的地小循环、一次目的地切换和最终目标验证。",
          grants_passage: true,
        },
      ],
      recommended_option_id: "framework",
      blocking: true,
      interactive: true,
    },
  });
  assert.equal(p1.structuredContent.interaction, "accepted");
  assert.equal(p1.structuredContent.approval.decision.optionId, "framework");

  const lateArgs = {
    ...commonApproval,
    approval_id: "TEST-LATE-004",
    question: "P1：超时后是否仍应记录迟到审批？",
    scope: "验证迟到点击持久化，不代表任何项目门禁通过。",
  };
  const expired = await request("tools/call", {
    name: "request_approval",
    arguments: { ...lateArgs, interactive: true },
  });
  assert.equal(expired.structuredContent.interaction, "expired");
  assert.equal(expired.structuredContent.reopenRequired, true);
  assert.equal(expired.structuredContent.approval.status, "pending");
  assert.equal(expired.structuredContent.approval.interaction.state, "expired");
  assert.ok(lateRequestId);
  send({
    jsonrpc: "2.0",
    id: lateRequestId,
    result: {
      action: "accept",
      content: {
        decision: lateDecisionLabel,
        note: "Late card response",
      },
    },
  });

  let lateApproval = null;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const all = await request("tools/call", {
      name: "list_approvals",
      arguments: { project_root: projectRoot, status: "all" },
    });
    lateApproval = all.structuredContent.approvals.find(
      (item) => item.id === "TEST-LATE-004"
    );
    if (lateApproval?.status === "approved") break;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  assert.equal(lateApproval.status, "approved");
  assert.equal(lateApproval.decision.note, "Late card response");
  assert.equal(
    lateApproval.decision.source,
    "game-approval-ui late elicitation"
  );

  const reopenArgs = {
    ...commonApproval,
    approval_id: "TEST-REOPEN-005",
    question: "P1：过期审批是否可以重新打开？",
    scope: "验证重新打开，不代表任何项目门禁通过。",
  };
  const firstAttempt = await request("tools/call", {
    name: "request_approval",
    arguments: { ...reopenArgs, interactive: true },
  });
  assert.equal(firstAttempt.structuredContent.interaction, "expired");
  const reopened = await request("tools/call", {
    name: "review_approval",
    arguments: {
      project_root: projectRoot,
      approval_id: "TEST-REOPEN-005",
    },
  });
  assert.equal(reopened.structuredContent.interaction, "accepted");
  assert.equal(reopened.structuredContent.approval.status, "approved");
  assert.equal(reopened.structuredContent.approval.interaction.attempt, 2);

  process.stdout.write(
    `PASS game-approval-ui protocol and persistence (${projectRoot})\n`
  );
} finally {
  child.stdin.end();
  output.close();
}
