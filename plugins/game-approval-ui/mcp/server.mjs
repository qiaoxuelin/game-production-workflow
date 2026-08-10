import { createHash, randomBytes } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import readline from "node:readline";

const SERVER_NAME = "game-approval-ui";
const SERVER_VERSION = "0.1.3";
const LATEST_PROTOCOL = "2025-11-25";
const SUPPORTED_PROTOCOLS = new Set([
  "2025-11-25",
  "2025-06-18",
  "2025-03-26",
  "2024-11-05",
]);
function readPositiveIntEnv(name, fallback) {
  const parsed = Number.parseInt(process.env[name] || "", 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

// Keep the synchronous UI attempt below the outer 15-minute MCP tool timeout.
// Expiry ends only the active wait; the durable approval remains pending.
const MAX_ELICITATION_WAIT_MS = readPositiveIntEnv(
  "GAME_APPROVAL_UI_WAIT_MS",
  12 * 60 * 1000
);
const LATE_RESPONSE_RETENTION_MS = readPositiveIntEnv(
  "GAME_APPROVAL_UI_LATE_RESPONSE_RETENTION_MS",
  24 * 60 * 60 * 1000
);
const PASSAGE_WORDS = [
  "approve",
  "accept",
  "pass",
  "continue",
  "批准",
  "接受",
  "采用",
  "通过",
  "继续",
];

let clientCapabilities = {};
let outboundRequestSequence = 0;
const outboundRequests = new Map();

const rl = readline.createInterface({
  input: process.stdin,
  crlfDelay: Infinity,
});

function writeMessage(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

function writeResult(id, result) {
  writeMessage({ jsonrpc: "2.0", id, result });
}

function writeError(id, code, message, data) {
  writeMessage({
    jsonrpc: "2.0",
    id,
    error: {
      code,
      message,
      ...(data === undefined ? {} : { data }),
    },
  });
}

function toolResult(data, summary, isError = false) {
  return {
    content: [{ type: "text", text: summary }],
    structuredContent: data,
    ...(isError ? { isError: true } : {}),
  };
}

function buildToolSummary(data) {
  const decision = data?.approval?.decision;
  if (decision?.label) {
    const note =
      typeof decision.note === "string" ? decision.note.trim() : "";
    return [
      `Recorded decision: ${decision.label}`,
      ...(note ? [`Decision note (part of the decision): ${note}`] : []),
      "Use the selected option and note together, then synchronize project state.",
    ].join("\n");
  }
  if (data?.interaction === "queued") {
    return `Approval queued: ${data.approval.id}`;
  }
  if (data?.interaction === "unsupported") {
    return `Structured UI unavailable; use the returned numbered fallback for ${data.approval.id}.`;
  }
  if (data?.interaction === "expired") {
    return `Approval card session expired; ${data.approval.id} remains pending and can be reopened.`;
  }
  return `Approval operation completed: ${data?.approval?.id || data?.count || 0}`;
}

function cleanText(value, field, maxLength, { optional = false } = {}) {
  if (value === undefined || value === null) {
    if (optional) return "";
    throw new Error(`${field} is required.`);
  }
  if (typeof value !== "string") {
    throw new Error(`${field} must be a string.`);
  }
  const text = value.trim();
  if (!text && !optional) {
    throw new Error(`${field} cannot be empty.`);
  }
  if (text.length > maxLength) {
    throw new Error(`${field} exceeds ${maxLength} characters.`);
  }
  return text;
}

function cleanOptionalList(value, field, maxItems = 12) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.length > maxItems) {
    throw new Error(`${field} must be an array with at most ${maxItems} items.`);
  }
  return value.map((item, index) =>
    cleanText(item, `${field}[${index}]`, 500)
  );
}

function normalizeOptions(value) {
  if (!Array.isArray(value) || value.length < 2 || value.length > 3) {
    throw new Error("options must contain 2-3 choices.");
  }
  const ids = new Set();
  const labels = new Set();
  return value.map((raw, index) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      throw new Error(`options[${index}] must be an object.`);
    }
    const id = cleanText(raw.id, `options[${index}].id`, 64);
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(id)) {
      throw new Error(`options[${index}].id has an invalid format.`);
    }
    const label = cleanText(raw.label, `options[${index}].label`, 80);
    const impact = cleanText(raw.impact, `options[${index}].impact`, 500);
    if (ids.has(id) || labels.has(label)) {
      throw new Error("option ids and labels must be unique.");
    }
    ids.add(id);
    labels.add(label);
    const requestedPassage = raw.grants_passage === true;
    const explicitPassage = PASSAGE_WORDS.some((word) =>
      label.toLocaleLowerCase().includes(word)
    );
    if (requestedPassage && !explicitPassage) {
      throw new Error(
        `Passage option "${label}" must explicitly say approve, accept, pass, or continue.`
      );
    }
    return {
      id,
      label,
      impact,
      grantsPassage: requestedPassage && explicitPassage,
    };
  });
}

function buildApprovalContract(args) {
  if (!args || typeof args !== "object" || Array.isArray(args)) {
    throw new Error("Tool arguments must be an object.");
  }
  const options = normalizeOptions(args.options);
  const recommendedOptionId = cleanText(
    args.recommended_option_id,
    "recommended_option_id",
    64
  );
  if (!options.some((option) => option.id === recommendedOptionId)) {
    throw new Error("recommended_option_id must match an option id.");
  }
  const suppliedId = cleanText(args.approval_id, "approval_id", 100, {
    optional: true,
  });
  if (suppliedId && !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(suppliedId)) {
    throw new Error("approval_id has an invalid format.");
  }
  const now = new Date().toISOString();
  const contract = {
    id:
      suppliedId ||
      `APP-${now.replace(/[-:.TZ]/g, "").slice(0, 14)}-${randomBytes(3).toString("hex")}`,
    taskId: cleanText(args.task_id, "task_id", 100, { optional: true }),
    gate: cleanText(args.gate, "gate", 32, { optional: true }),
    kind: cleanText(args.kind, "kind", 64),
    title: cleanText(args.title, "title", 160),
    question: cleanText(args.question, "question", 1200),
    scope: cleanText(args.scope, "scope", 1200),
    artifacts: cleanOptionalList(args.artifacts, "artifacts"),
    options,
    recommendedOptionId,
    blocking: args.blocking !== false,
  };
  const fingerprint = createHash("sha256")
    .update(JSON.stringify(contract))
    .digest("hex");
  return {
    ...contract,
    fingerprint,
    status: "pending",
    createdAt: now,
    updatedAt: now,
    source: SERVER_NAME,
    decision: null,
  };
}

async function resolveStore(projectRoot) {
  const root = path.resolve(cleanText(projectRoot, "project_root", 1000));
  const marker = path.join(root, "production", "project.json");
  let markerStat;
  try {
    markerStat = await fs.stat(marker);
  } catch {
    throw new Error(
      `Governed project marker not found: ${path.join("production", "project.json")}`
    );
  }
  if (!markerStat.isFile()) {
    throw new Error("production/project.json is not a file.");
  }
  const directory = path.join(root, "production", "approvals");
  return {
    root,
    directory,
    indexPath: path.join(directory, "index.json"),
    eventsPath: path.join(directory, "events.ndjson"),
  };
}

async function readIndex(store) {
  try {
    const parsed = JSON.parse(await fs.readFile(store.indexPath, "utf8"));
    if (
      !parsed ||
      typeof parsed !== "object" ||
      parsed.schemaVersion !== "1.0" ||
      !Array.isArray(parsed.approvals)
    ) {
      throw new Error("Invalid approval index structure.");
    }
    return parsed;
  } catch (error) {
    if (error?.code === "ENOENT") {
      return { schemaVersion: "1.0", approvals: [] };
    }
    throw error;
  }
}

async function writeIndex(store, index) {
  await fs.mkdir(store.directory, { recursive: true });
  await fs.writeFile(
    store.indexPath,
    `${JSON.stringify(index, null, 2)}\n`,
    "utf8"
  );
}

async function appendEvent(store, type, approval, extra = {}) {
  await fs.mkdir(store.directory, { recursive: true });
  const event = {
    schemaVersion: "1.0",
    type,
    approvalId: approval.id,
    taskId: approval.taskId || null,
    gate: approval.gate || null,
    at: new Date().toISOString(),
    ...extra,
  };
  await fs.appendFile(store.eventsPath, `${JSON.stringify(event)}\n`, "utf8");
}

async function createOrReuseApproval(projectRoot, args) {
  const store = await resolveStore(projectRoot);
  const candidate = buildApprovalContract(args);
  const index = await readIndex(store);
  const existing = index.approvals.find((item) => item.id === candidate.id);
  if (existing) {
    if (existing.fingerprint !== candidate.fingerprint) {
      throw new Error(
        `Approval ${candidate.id} already exists with a different contract.`
      );
    }
    return { store, index, approval: existing, created: false };
  }
  index.approvals.push(candidate);
  await writeIndex(store, index);
  await appendEvent(store, "created", candidate);
  return { store, index, approval: candidate, created: true };
}

function clientSupportsElicitation() {
  return Boolean(
    clientCapabilities &&
      typeof clientCapabilities === "object" &&
      clientCapabilities.elicitation
  );
}

function buildFallback(approval) {
  return approval.options.map((option, index) => ({
    number: index + 1,
    id: option.id,
    label: option.label,
    impact: option.impact,
    recommended: option.id === approval.recommendedOptionId,
  }));
}

function cleanVisibleQuestion(question) {
  return question.replace(/^[A-Z]?\d+\s*[:：]\s*/iu, "").trim();
}

function cleanVisibleOptionLabel(label) {
  return label
    .replace(
      /^(?:(?:approve|accept|adopt|pass|continue)|(?:批准|接受|采用|通过|继续))\s*[:：-]\s*/iu,
      ""
    )
    .trim();
}

function conciseImpact(impact, maxLength = 72) {
  const firstSentence = impact.split(/(?<=[。！？.!?])\s*/u)[0].trim();
  if (firstSentence.length <= maxLength) return firstSentence;
  return `${firstSentence.slice(0, maxLength - 1).trim()}…`;
}

function buildElicitationOptions(approval) {
  const rows = approval.options.map((option) => {
    const label = cleanVisibleOptionLabel(option.label);
    const recommended =
      option.id === approval.recommendedOptionId ? "（推荐）" : "";
    return {
      option,
      display: `${label}${recommended} — ${conciseImpact(option.impact)}`,
    };
  });
  if (new Set(rows.map((row) => row.display)).size !== rows.length) {
    throw new Error("Visible approval options must be unique.");
  }
  return rows;
}

function buildElicitationMessage(approval) {
  const lines = [
    cleanVisibleQuestion(approval.question),
    "",
    `本次只决定：${approval.scope}`,
  ];
  return lines.join("\n").slice(0, 2400);
}

function sendServerRequest(method, params, { onLateResponse } = {}) {
  const id = `game-approval-ui-${++outboundRequestSequence}`;
  writeMessage({ jsonrpc: "2.0", id, method, params });
  return new Promise((resolve, reject) => {
    const pending = {
      timedOut: false,
      timeout: null,
      retentionTimeout: null,
      onLateResponse,
      resolve: (value) => {
        clearTimeout(pending.timeout);
        resolve(value);
      },
      reject: (error) => {
        clearTimeout(pending.timeout);
        reject(error);
      },
    };
    pending.timeout = setTimeout(() => {
      pending.timedOut = true;
      const error = new Error(
        "Approval card session expired; the approval remains pending."
      );
      error.code = "APPROVAL_UI_EXPIRED";
      reject(error);
      pending.retentionTimeout = setTimeout(() => {
        outboundRequests.delete(id);
      }, LATE_RESPONSE_RETENTION_MS);
    }, MAX_ELICITATION_WAIT_MS);
    outboundRequests.set(id, pending);
  });
}

function setInteractionState(approval, state, extra = {}) {
  const now = new Date().toISOString();
  approval.updatedAt = now;
  approval.interaction = {
    ...(approval.interaction || {}),
    state,
    updatedAt: now,
    ...extra,
  };
}

async function recordInteractionState(
  store,
  index,
  approval,
  state,
  eventType,
  extra = {}
) {
  setInteractionState(approval, state, extra);
  await writeIndex(store, index);
  await appendEvent(store, eventType, approval, extra);
}

async function persistDecision(store, index, approval, option, note, source) {
  if (approval.status !== "pending" && approval.status !== "deferred") {
    return approval;
  }
  const now = new Date().toISOString();
  const loweredId = option.id.toLocaleLowerCase();
  const loweredLabel = option.label.toLocaleLowerCase();
  let status = option.grantsPassage ? "approved" : "decided";
  if (
    loweredId.includes("revise") ||
    loweredLabel.includes("修改") ||
    loweredLabel.includes("退回")
  ) {
    status = "revision_requested";
  } else if (
    loweredId.includes("defer") ||
    loweredLabel.includes("稍后") ||
    loweredLabel.includes("延后")
  ) {
    status = "deferred";
  } else if (
    loweredId.includes("stop") ||
    loweredLabel.includes("停止") ||
    loweredLabel.includes("拒绝")
  ) {
    status = "rejected";
  }
  approval.status = status;
  approval.updatedAt = now;
  setInteractionState(approval, "decided", { decidedAt: now });
  approval.decision = {
    optionId: option.id,
    label: option.label,
    note: cleanText(note, "note", 2000, { optional: true }),
    grantsPassage: option.grantsPassage,
    decidedBy: "human producer",
    decidedAt: now,
    source,
  };
  await writeIndex(store, index);
  await appendEvent(store, "decided", approval, {
    status,
    optionId: option.id,
    grantsPassage: option.grantsPassage,
    source,
  });
  return approval;
}

async function applyElicitationResponse(
  store,
  index,
  approval,
  visibleOptions,
  response,
  source
) {
  if (approval.status !== "pending" && approval.status !== "deferred") {
    await appendEvent(store, "late_response_ignored", approval, {
      reason: `Approval is already ${approval.status}.`,
    });
    return { approval, interaction: "already_decided" };
  }
  const action = response?.action;
  if (action !== "accept") {
    const interaction = action === "decline" ? "declined" : "cancelled";
    await recordInteractionState(
      store,
      index,
      approval,
      interaction,
      "interaction_closed",
      { action: action || "unknown" }
    );
    return {
      approval,
      interaction,
      fallback: buildFallback(approval),
    };
  }
  const selected = response?.content?.decision;
  const option =
    visibleOptions.find((row) => row.display === selected)?.option ||
    approval.options.find(
      (item) => item.id === selected || item.label === selected
    );
  if (!option) {
    const reason = "The selected option did not match the approval contract.";
    await recordInteractionState(
      store,
      index,
      approval,
      "failed",
      "interaction_failed",
      { reason }
    );
    return {
      approval,
      interaction: "invalid_response",
      fallback: buildFallback(approval),
    };
  }
  const decided = await persistDecision(
    store,
    index,
    approval,
    option,
    response?.content?.note,
    source
  );
  return { approval: decided, interaction: "accepted" };
}

async function applyLateElicitationResponse(store, approvalId, message) {
  const index = await readIndex(store);
  const approval = index.approvals.find((item) => item.id === approvalId);
  if (!approval) return;
  if (message.error) {
    await appendEvent(store, "late_response_failed", approval, {
      reason: message.error.message || "Client rejected the expired approval card.",
    });
    return;
  }
  await applyElicitationResponse(
    store,
    index,
    approval,
    buildElicitationOptions(approval),
    message.result,
    "game-approval-ui late elicitation"
  );
}

async function elicitApproval(store, index, approval) {
  if (!clientSupportsElicitation()) {
    return {
      approval,
      interaction: "unsupported",
      fallback: buildFallback(approval),
    };
  }
  const visibleOptions = buildElicitationOptions(approval);
  const openedAt = new Date().toISOString();
  const expiresAt = new Date(
    Date.now() + MAX_ELICITATION_WAIT_MS
  ).toISOString();
  const attempt = (approval.interaction?.attempt || 0) + 1;
  await recordInteractionState(
    store,
    index,
    approval,
    "open",
    "interaction_opened",
    { attempt, openedAt, expiresAt }
  );
  let releaseLateResponses;
  const lateResponsesReady = new Promise((resolve) => {
    releaseLateResponses = resolve;
  });
  let response;
  try {
    response = await sendServerRequest("elicitation/create", {
      mode: "form",
      message: buildElicitationMessage(approval),
      requestedSchema: {
        type: "object",
        properties: {
          decision: {
            type: "string",
            title: "请选择一项",
            description: "推荐项已标注；每项后面说明主要影响。",
            enum: visibleOptions.map((row) => row.display),
            default: visibleOptions.find(
              (row) => row.option.id === approval.recommendedOptionId
            )?.display,
          },
          note: {
            type: "string",
            title: "备注或修改意见",
            description: "可选：补充条件，或指出需要修改的地方。",
            maxLength: 2000,
          },
        },
        required: ["decision"],
      },
    }, {
      onLateResponse: async (message) => {
        await lateResponsesReady;
        return applyLateElicitationResponse(store, approval.id, message);
      },
    });
  } catch (error) {
    const expired = error.code === "APPROVAL_UI_EXPIRED";
    try {
      await recordInteractionState(
        store,
        index,
        approval,
        expired ? "expired" : "failed",
        expired ? "interaction_expired" : "interaction_failed",
        {
          reason: error.message,
          ...(expired ? { expiredAt: new Date().toISOString() } : {}),
        }
      );
    } finally {
      releaseLateResponses();
    }
    return {
      approval,
      interaction: expired ? "expired" : "failed",
      message: error.message,
      ...(expired
        ? { reopenRequired: true }
        : { fallback: buildFallback(approval) }),
    };
  }
  releaseLateResponses();
  return applyElicitationResponse(
    store,
    index,
    approval,
    visibleOptions,
    response,
    "game-approval-ui elicitation"
  );
}

async function requestApproval(args) {
  const interactive = args?.interactive !== false;
  const { store, index, approval, created } = await createOrReuseApproval(
    args?.project_root,
    args
  );
  if (approval.status !== "pending" && approval.status !== "deferred") {
    return {
      approval,
      created,
      interaction: "already_decided",
    };
  }
  if (!interactive) {
    return {
      approval,
      created,
      interaction: "queued",
      fallback: buildFallback(approval),
    };
  }
  return {
    ...(await elicitApproval(store, index, approval)),
    created,
  };
}

async function listApprovals(args) {
  const store = await resolveStore(args?.project_root);
  const index = await readIndex(store);
  const status = cleanText(args?.status, "status", 32, { optional: true }) || "pending";
  const approvals =
    status === "all"
      ? index.approvals
      : index.approvals.filter((approval) => approval.status === status);
  return {
    projectRoot: store.root,
    status,
    count: approvals.length,
    approvals,
  };
}

async function reviewApproval(args) {
  const store = await resolveStore(args?.project_root);
  const index = await readIndex(store);
  const id = cleanText(args?.approval_id, "approval_id", 100);
  const approval = index.approvals.find((item) => item.id === id);
  if (!approval) throw new Error(`Approval ${id} was not found.`);
  if (approval.status !== "pending" && approval.status !== "deferred") {
    return { approval, interaction: "already_decided" };
  }
  return elicitApproval(store, index, approval);
}

async function recordApprovalDecision(args) {
  const store = await resolveStore(args?.project_root);
  const index = await readIndex(store);
  const id = cleanText(args?.approval_id, "approval_id", 100);
  const approval = index.approvals.find((item) => item.id === id);
  if (!approval) throw new Error(`Approval ${id} was not found.`);
  const selection = args?.selection;
  let option;
  if (Number.isInteger(selection)) {
    option = approval.options[selection - 1];
  } else if (typeof selection === "string") {
    const text = selection.trim();
    const numeric = Number(text);
    option = Number.isInteger(numeric)
      ? approval.options[numeric - 1]
      : approval.options.find(
          (item) => item.id === text || item.label === text
        );
  }
  if (!option) {
    throw new Error("selection must be an option id, label, or 1-based number.");
  }
  const decided = await persistDecision(
    store,
    index,
    approval,
    option,
    args?.note,
    "game-approval-ui fallback selection"
  );
  return { approval: decided, interaction: "recorded" };
}

const approvalOptionSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    id: { type: "string", description: "Stable option identifier." },
    label: {
      type: "string",
      description:
        "Short, self-contained user-facing label. Use natural language; never expose internal ids.",
    },
    impact: {
      type: "string",
      description:
        "One plain-language sentence stating the main consequence or tradeoff; it is shown beside the option.",
    },
    grants_passage: {
      type: "boolean",
      description:
        "True only for an explicitly approve, accept, pass, or continue option.",
    },
  },
  required: ["id", "label", "impact", "grants_passage"],
};

const tools = [
  {
    name: "request_approval",
    description:
      "Use this before presenting any 2-3 option game-production decision in prose. Create a durable approval and show a structured choice UI when supported; set interactive=false only for offline stewardship.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        project_root: { type: "string" },
        approval_id: { type: "string" },
        task_id: { type: "string" },
        gate: { type: "string" },
        kind: {
          type: "string",
          description: "For example visual, design, gate, business, migration, or waiver.",
        },
        title: {
          type: "string",
          description:
            "Short internal/display title without task ids; do not repeat the full question.",
        },
        question: {
          type: "string",
          description:
            "One plain-language question the user can answer without reading project files.",
        },
        scope: {
          type: "string",
          description:
            "One concise sentence describing only what this decision does and does not decide.",
        },
        artifacts: {
          type: "array",
          maxItems: 12,
          items: { type: "string" },
        },
        options: {
          type: "array",
          minItems: 2,
          maxItems: 3,
          items: approvalOptionSchema,
        },
        recommended_option_id: { type: "string" },
        blocking: { type: "boolean", default: true },
        interactive: { type: "boolean", default: true },
      },
      required: [
        "project_root",
        "kind",
        "title",
        "question",
        "scope",
        "options",
        "recommended_option_id",
      ],
    },
    annotations: {
      title: "Request game approval",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
  },
  {
    name: "list_approvals",
    description:
      "List durable approvals for a governed game project. Defaults to pending approvals.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        project_root: { type: "string" },
        status: {
          type: "string",
          description:
            "pending, deferred, approved, revision_requested, rejected, decided, or all.",
          default: "pending",
        },
      },
      required: ["project_root"],
    },
    annotations: {
      title: "List game approvals",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: "review_approval",
    description:
      "Open the structured choice UI for one existing pending or deferred approval.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        project_root: { type: "string" },
        approval_id: { type: "string" },
      },
      required: ["project_root", "approval_id"],
    },
    annotations: {
      title: "Review game approval",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
  },
  {
    name: "record_approval_decision",
    description:
      "Record an explicit human option after a numbered-text fallback. Never call without a direct user choice.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        project_root: { type: "string" },
        approval_id: { type: "string" },
        selection: {
          description: "Option id, exact label, or 1-based option number.",
          anyOf: [{ type: "string" }, { type: "integer", minimum: 1, maximum: 3 }],
        },
        note: {
          type: "string",
          description:
            "Optional human guidance that becomes part of the effective decision.",
          maxLength: 2000,
        },
      },
      required: ["project_root", "approval_id", "selection"],
    },
    annotations: {
      title: "Record game approval",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
];

async function callTool(name, args) {
  switch (name) {
    case "request_approval":
      return requestApproval(args);
    case "list_approvals":
      return listApprovals(args);
    case "review_approval":
      return reviewApproval(args);
    case "record_approval_decision":
      return recordApprovalDecision(args);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

async function handleRequest(message) {
  const { id, method, params } = message;
  try {
    if (method === "initialize") {
      clientCapabilities = params?.capabilities || {};
      const requested = params?.protocolVersion;
      const protocolVersion = SUPPORTED_PROTOCOLS.has(requested)
        ? requested
        : LATEST_PROTOCOL;
      writeResult(id, {
        protocolVersion,
        capabilities: {
          tools: { listChanged: false },
        },
        serverInfo: {
          name: SERVER_NAME,
          version: SERVER_VERSION,
        },
      });
      return;
    }
    if (method === "ping") {
      writeResult(id, {});
      return;
    }
    if (method === "tools/list") {
      writeResult(id, { tools });
      return;
    }
    if (method === "tools/call") {
      const data = await callTool(params?.name, params?.arguments || {});
      writeResult(id, toolResult(data, buildToolSummary(data)));
      return;
    }
    writeError(id, -32601, `Method not found: ${method}`);
  } catch (error) {
    if (method === "tools/call") {
      writeResult(
        id,
        toolResult(
          { error: error.message },
          `Game approval error: ${error.message}`,
          true
        )
      );
      return;
    }
    writeError(id, -32603, error.message);
  }
}

function handleResponse(message) {
  const pending = outboundRequests.get(message.id);
  if (!pending) return;
  outboundRequests.delete(message.id);
  clearTimeout(pending.timeout);
  clearTimeout(pending.retentionTimeout);
  if (pending.timedOut) {
    if (pending.onLateResponse) {
      void Promise.resolve(pending.onLateResponse(message)).catch((error) => {
        process.stderr.write(`Late approval response failed: ${error.message}\n`);
      });
    }
    return;
  }
  if (message.error) {
    pending.reject(
      new Error(message.error.message || "Client rejected the approval UI request.")
    );
    return;
  }
  pending.resolve(message.result);
}

rl.on("line", (line) => {
  if (!line.trim()) return;
  let message;
  try {
    message = JSON.parse(line);
  } catch (error) {
    writeError(null, -32700, "Parse error", error.message);
    return;
  }
  if (message && typeof message === "object" && "method" in message) {
    if ("id" in message) {
      void handleRequest(message);
    }
    return;
  }
  if (message && typeof message === "object" && "id" in message) {
    handleResponse(message);
  }
});

rl.on("close", () => {
  for (const pending of outboundRequests.values()) {
    clearTimeout(pending.timeout);
    clearTimeout(pending.retentionTimeout);
    if (!pending.timedOut) {
      pending.reject(new Error("MCP client disconnected."));
    }
  }
  outboundRequests.clear();
});
