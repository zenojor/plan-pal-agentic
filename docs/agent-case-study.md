# PlanPal Agent Case Study

## 背景

PlanPal 是一个 BYOK Agent 行程规划工作台。项目刻意不让模型直接写计划，而是把用户可编辑的行程建模为确定性的 `Plan`，让 Agent 负责理解自然语言、调用只读工具、生成候选和解释，真正状态变更必须经过 `PlanCommand`。

这个设计解决的核心问题是：行程类 Agent 很容易看起来“聪明”，但实际很难证明它没有偷偷改状态、没有绕过用户确认、没有泄露 API key、没有把 mock 能力伪装成真实预订。PlanPal 的下一阶段重点就是把这些边界做成可评测、可回放、可审计的工程证据。

## 架构决策

- `packages/domain` 是可信写入边界，定义 `Plan`、`PendingAction`、`PlanCommand` 和 deterministic mutation。
- `packages/agent` 只负责 runtime、intent routing、model adapter 和 tool registry；工具按 `read-only` / `external-write` 标注 effect。
- `packages/db` 存储 plans、runs、events、tool calls；API key 不入库，事件和错误都做 redaction。
- `apps/api` 通过 SSE 暴露 agent run/resume，并提供 run trace 的只读聚合接口。
- `apps/web` 把 Agent Chat、Puzzle、Merchant、Map、Trace 拆成可解释工作台，Trace 列用于展示运行链路而不是修改状态。
- `packages/eval` 用 fake model + in-memory store 跑 golden suite；DeepSeek 只作为显式环境变量驱动的 live smoke。

## Agent 控制流

1. 用户输入自然语言。
2. Runtime 先确定当前 `Plan` 和选中 segment 上下文。
3. 对明显 QA 的消息直接进入 answer phase；对可能改计划的消息进入 intent phase 或 deterministic fallback。
4. Agent 可以调用 `poi.search`、`offering.search`、`route.estimate`、`order.preview` 等只读工具。
5. 需要用户选择时写入 `PendingAction`，并产生 `action.required` 事件。
6. 用户选择候选或服务项后，resume 把选择转换为 `CHOOSE_CANDIDATE` 或 `SELECT_SERVICE_ITEM`。
7. Domain 应用 `PlanCommand`，生成 `plan.updated` 事件、version 和 patch。
8. Trace snapshot 聚合 run、events、tool calls、command writes 和 safety findings，供 UI 回放和 eval 报告使用。

## Eval 指标

Golden suite v1 包含 36 个离线场景，覆盖：

- 替换候选：安静、室内、预算、火锅、拍照、亲子、商务、夜间。
- add-after：咖啡、甜品、散步、酒店、电影、雨天室内、礼物。
- 服务选择：电影票、酒店房型、餐饮套餐。
- 命令边界：confirm、sandbox order、delete、rewrite、model-generated intent。
- 容错与安全：模型 JSON 失败、模型错误 fallback、locked segment、secret redaction、external-write 不成功。

核心判断维度：

- `route_accuracy`
- `tool_selection`
- `command_gate`
- `user_confirm_boundary`
- `service_selection`
- `safety_no_external_write`
- `secret_redaction`
- `deterministic_replay`

默认报告输出到 `docs/evals/agent-golden.md` 和 `docs/evals/agent-golden.json`。live smoke 使用 `PLANPAL_EVAL_API_KEY`，默认不运行真实网络请求。

## 失败案例

- 模型返回非 JSON intent：runtime 产生 `agent.model.error`，回退到 deterministic router，仍通过候选/命令边界继续。
- 模型错误包含密钥：错误文案在 runtime/API/UI/eval 报告中统一 redacted。
- 用户尝试改 locked segment：domain 拒绝命令，证明写入边界不依赖前端按钮状态。
- external-write 工具存在但不允许执行：tool registry 会返回 `blocked`，Trace Safety 展示外部写入没有成功。

## 面试亮点

- 不只是“接了 LLM”，而是实现了 Agent state machine、tool effect gate、deterministic command boundary 和 trace replay。
- 不依赖真实地图、酒店、影院或支付 API，也能演示完整计划闭环；mock 能力在 UI 和 receipt 中明确标注为 sandbox。
- eval harness 可在无网络、无真实 key 的情况下复现结果；DeepSeek live smoke 只验证模型链路，不污染 golden suite。
- Trace UI 能把一次 Agent run 拆成 Timeline、Tools、Replay、Safety，适合演示“为什么可信”。

## 后续生产化

- 增加 auth-scoped persistence，把 plan/run/event/tool call 绑定到真实用户边界。
- 如果接真实地图/商家/provider，先抽 provider interface，再让 provider 结果进入只读候选层，仍不直接改 `Plan`。
- 增加浏览器截图 QA 和关键 demo flow E2E。
- 把 eval 报告接入 CI，要求 golden suite 100% pass、安全违规 0。
