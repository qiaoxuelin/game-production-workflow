# 游戏生产协同系统

这是现有游戏开发 Skill 流程的可安装版本。一个 GitHub marketplace 插件原子安装两个独立 Skill 和审批 MCP：

- `game-production-system` `1.7.1`：从领域设计直接进入独立制作、组装、运行验证、退回候选收敛、执行止损、证据、验收与跨对话交接。
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
6. 设计与接口冻结后，直接选择下一项玩家可见切片，修改真实代码、场景、数据或素材并立即集成运行；治理文件更新不能冒充制作进展。
7. 互动界面从玩家操作推导状态、反馈层和素材族，先验证共同空间、透视、遮挡、拆层和实际尺寸组装，再进入运行时证明。
8. 先验证最小代表性运行切片；通过后再批量制作关卡、素材或状态覆盖。只有写入路径不重叠、依赖明确且有唯一集成人时才并行。
9. 同一根因连续两轮没有新增证据时停止微调，转为一次根因复盘、有限修复或重排计划。
10. 客观 QA、设计符合性、制作人整体效果和 Gate/发布结论分别记录，互不冒充；任务关闭时保留可恢复版本。

游戏生产插件自身拥有生命周期状态权威和独立制作入口。Superpowers、ImageGen、浏览器控制、计算机控制或其他 Skill 都是可选加速器；缺失时继续使用基础文件编辑、终端、引擎原语、代码原生 UI 和灰盒素材，不退回重复规划或审批。

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

通用前置条件：Git、GitHub CLI、可用的 Codex 桌面端或 CLI，以及用于安装器、能力探测和审批 MCP 的 Node.js 18+。私有仓库还需要该设备具备 GitHub 访问权限。

### macOS 和 Linux

```bash
gh auth login
gh repo clone qiaoxuelin/game-production-workflow
cd game-production-workflow
node install.mjs
```

安装和宿主能力探测不要求 PowerShell。初始化项目、注册证据或运行完整治理检查时，现有兼容脚本仍需要 PowerShell 7（`pwsh`）；`doctor.mjs` 会在当前工作包真正需要这些能力时报告缺失项。

### Windows

推荐使用同一套 Node 安装入口：

```powershell
gh auth login
gh repo clone qiaoxuelin/game-production-workflow
Set-Location game-production-workflow
node .\install.mjs
```

也可以继续使用兼容安装器：

```powershell
gh auth login
gh repo clone qiaoxuelin/game-production-workflow
Set-Location game-production-workflow
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\install.ps1
```

安装器会清理旧版两个插件的安装记录和缓存，但不会删除它们的源码；若发现手工放在 `.codex/skills` 的旧核心 Skill，会提示人工归档。安装完成后重启 Codex，并新建一个任务让插件和 MCP 工具完整加载。首次使用可显式输入：

```text
Use $game-production-system to execute the next player-visible game slice from repository state.
```

之后，匹配 Skill 描述的游戏开发任务可以自动触发；审批决定由核心流程调用 `game-approval-ui`。

## 更新

```bash
git pull
node install.mjs
```

升级后从新任务开始使用新版本。进行中的工作包保持原状态，在自然检查点应用兼容的新策略，不为升级而中断可恢复执行。

## 本地验证

```bash
pwsh -NoProfile -File ./verify.ps1
```

`verify.ps1` 检查插件结构、组件版本、PowerShell 语法、Markdown 链接、常见密钥模式、跨平台 doctor/安装器和审批 MCP 协议。维护者的完整验证仍需要 PowerShell 7；普通安装使用 Node 即可。发布前还应让两个 Skill 分别通过 Codex 内置 `skill-creator` 验证器，并让整合插件通过 `plugin-creator` 验证器。

每次发布都更新插件清单中的 `+codex.<UTC 时间戳>` 缓存标识；不要仅修改内容后沿用旧版本。生产策略版本和审批服务组件版本分别保留在其实现中。
