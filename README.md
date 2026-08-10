# 游戏生产协同系统

这是现有游戏开发 Skill 流程的可安装版本，用一个 GitHub marketplace 向不同设备分发两个独立组件：

- `game-production-system` `1.5.8`：生产规划、领域设计前置、任务拆分、执行止损、证据、验收与跨对话交接。
- `game-approval-ui` `0.1.3`：可点击审批卡、离线待审批队列、附加意见和项目内持久化。

仓库只包含通用流程、模板、校验脚本和审批工具，不包含具体游戏工程、商业素材、证据文件、账号或密钥。

## 运行结构

项目仓库是长期事实来源，Skill 负责按统一方式读取和更新它：

1. 识别请求是讨论、诊断还是实施。
2. 选择最轻的执行档：`Fast`、`Standard` 或 `Full`。
3. 选择需求澄清模式：
   - `original_design`：从产品目标、约束和少量参考形成原创设计合同。
   - `reference_replication`：先拆解并冻结原作版本、范围、关键体验、状态、比较方式、容差和允许偏差。
4. 生产规划明确下一项玩家可见结果、代表性证明、依赖、集成人、并行边界、止损条件和证据预算。
5. 受影响的玩法、关卡、数值、经济、内容、美术、UX、动画、VFX、音频负责人先完成设计；技术负责人只评估可行性，不补写缺失设计。
6. 设计与接口冻结后进入有界实现。只有写入路径不重叠、依赖明确且有唯一集成人时才并行。
7. 先验证最小代表性运行切片；通过后再批量制作关卡、素材或状态覆盖。
8. 同一根因连续两轮没有新增证据时停止微调，转为一次根因复盘、有限修复或重排计划。
9. 客观 QA、设计符合性、制作人整体效果和 Gate/发布结论分别记录，互不冒充。
10. 任务关闭时保留可恢复版本，并把可复用经验沉淀为候选设计模块；只有人工明确采用后才成为项目默认。

## 角色边界

- 人类制作人：产品方向、商业模式、黄金视觉、Gate、发布和豁免等最终决策。
- 生产规划：把目标拆成可执行路线和工作包。
- 生产协调：路线正常时保持轻量；出现停滞、重复返工或错误基线时触发止损。
- 领域设计负责人：在实现前决定对应领域规则，并在实现后验收符合性。
- 技术负责人/实现者：架构、接口、实现、可恢复交付和技术验证。
- QA/独立评审：提供客观验证；高风险工作不由实现者自我终审。
- 唯一集成人：串行处理共享核心并完成组合回归。

角色是按领域和风险启用的责任视角，不要求每个任务都创建代理或额外文档。

## 审批与离线运行

- 只有真正阻塞下一项代表性证明的决定才弹出审批卡。
- 每张卡只处理一个决定，提供 2-3 个互斥选项，并把推荐项放在首位。
- 超时或过期只是交互会话结束，不代表拒绝或通过；决定保持待处理。
- 用户离线时只继续已授权且相互独立的工作，阻塞决定进入队列，不以沉默代替授权。
- 审批选项和附加意见共同构成最终决定，并写入项目的 `production/approvals/`。

## 项目内持久化

跨设备继续开发还需要同步每个游戏自己的 Git 仓库。核心状态位于：

- `AGENTS.md`
- `production/project.json`
- `production/PROJECT.md`
- `production/TASK.md`
- 必要时的 `production/PLAN.md`
- `production/ACCEPTANCE.md`
- `production/approvals/`
- `design/modules/`
- 视觉工作使用的 `docs/ART_BIBLE.md`

本仓库同步“怎么工作”；游戏项目仓库同步“当前做到了哪里、哪些设计已经冻结、哪些决定已经批准”。

## 在另一台设备安装

前置条件：Git、可用的 Codex 桌面端或 CLI、PowerShell 7，以及用于审批 MCP 的 Node.js 18+。私有仓库还需要该设备具备 GitHub 访问权限。

```powershell
gh auth login
codex.cmd plugin marketplace add qiaoxuelin/game-production-workflow --ref main
codex.cmd plugin add game-production-system@game-production-workflow
codex.cmd plugin add game-approval-ui@game-production-workflow
```

安装完成后重启 Codex，并新建一个任务让插件和 MCP 工具完整加载。首次使用可显式输入：

```text
Use $game-production-system to adopt or continue this game project from its repository state.
```

之后，匹配 Skill 描述的游戏开发任务可以自动触发；审批决定由核心流程调用 `game-approval-ui`。

## 更新

```powershell
codex.cmd plugin marketplace upgrade game-production-workflow
codex.cmd plugin add game-production-system@game-production-workflow
codex.cmd plugin add game-approval-ui@game-production-workflow
```

升级后从新任务开始使用新版本。进行中的工作包保持原状态，在自然检查点应用兼容的新策略，不为升级而中断可恢复执行。

## 本地验证

```powershell
node plugins/game-approval-ui/scripts/test-server.mjs
```

两个插件清单和两个 Skill 还应分别通过 Codex 内置的 `plugin-creator` 与 `skill-creator` 验证器。
