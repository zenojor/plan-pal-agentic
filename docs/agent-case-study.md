# PlanPal Agent Case Study

## 项目一句话

PlanPal 是一个基于 TypeScript、LangGraph 和 React 的可恢复行程 Agent：模型通过 structured output 和原生 tool calling 理解用户，LangGraph 管理多轮状态、条件分支、interrupt/resume 与 checkpoint，所有计划写入仍由确定性的 `PlanCommand` domain boundary 执行。

## 为什么重构

旧实现虽然有一个 `graph.ts` 示例，但 API 并不调用它；主链路在 800 多行 runtime 中用 `if/else` 手工编排。工具由应用提前决定，`poi.search` 的结果甚至会被丢弃后由 domain 重搜；所谓 checkpoint 只是时间戳字符串，resume 会创建一套新事件序号。

这类实现可以演示 UI，却无法回答面试中最重要的问题：执行路径是否真由 graph 决定、工具结果是否真正 grounding、interrupt 能否跨进程恢复、失败是否可追踪、计划 invariant 是否可证明。

## 重构后的架构决策

1. `packages/domain` 继续是唯一写边界。模型、tool 和 graph node 都不能直接持久化修改后的 Plan。
2. API 的 Agent 入口只调用 compiled `StateGraph.stream()`；runtime 是 facade，不再承载业务分支。
3. Graph state 使用 `StateSchema` 和 Zod；messages、tool calls、tool results 使用 reducer，保证多轮与 checkpoint 合并语义。
4. 模型使用 LangChain `bindTools()`，输出 `AIMessage.tool_calls`；每个结果以同一个 `tool_call_id` 返回 `ToolMessage`。
5. 候选和 offering 作为 typed `PlanCommand` 字段进入 domain，避免工具执行后再次搜索。
6. 用户决策统一为 `interrupt()`；恢复统一为同一 `thread_id` 下的 `Command({ resume })`。
7. 测试用 `MemorySaver`，本地应用用 SQLite checkpointer；thread id 使用可解释的 `plan:${planId}`。
8. Graph update 映射为稳定事件，run sequence 在 resume 时从 store 最大值继续，Trace UI 展示真实 node path。
9. schema/tool/domain failure 进入可观测 graph recovery；模型网络、认证或 provider 失败则明确结束为 `failed`，不伪造离线回答。
10. 模型配置必须测试成功再保存；Web 路由和 create/run/resume API 共同阻止无连接进入工作台。

## 一次候选替换的真实链路

```text
HTTP SSE request
  -> PlanPalAgentRuntime.run
  -> compiledGraph.stream
  -> loadContext
  -> understandIntent (Zod structured output)
  -> routeIntent (candidate-search)
  -> planningAgent (model.bindTools)
  -> AIMessage.tool_calls[poi_search]
  -> callTools
  -> ToolMessage(tool_call_id)
  -> buildCommandProposal (uses exact tool candidates)
  -> validateProposal (applyPlanCommand preview)
  -> requestApproval (interrupt)
  -> waiting_for_user checkpoint
  -> Command({ resume }) on the same thread
  -> applyCommand (CHOOSE_CANDIDATE)
  -> finalize
```

用户说“换一个”会从 `applyCommand` 的 conditional edge 回到 `planningAgent`，并排除上一轮候选；“就第二个”变成 typed candidate selection；“还是算了”变成 rejected resume 并以 `cancelled` 结束。

## 工程证据

- 12 个真实 graph nodes，route、tool、validation、resume、recovery 多组 conditional edges。
- 6 个 LangChain + Zod typed tools：POI、offering、路线、天气、order preview、current plan。
- 4 个核心 structured outputs：intent、route、command proposal、final response。
- SQLite checkpoint 集成测试会销毁旧 runtime，再创建新 runtime 恢复同一 interrupt。
- Trace 记录 node/model/tool/command/interrupt/resume/run，确认包装命令和实际内层 command 都可见。
- 全仓 148 项测试通过：domain 27、db 2、agent 46、API 15、Web 58。
- Agent eval 52/52；真实 DeepSeek smoke 3/3。
- domain、db、agent、eval、API TypeScript 检查和 Vite production build 全部通过。

## Eval 覆盖

离线 suite 不依赖网络，使用 fake model、MemorySaver、SQLite 临时数据库和 fictional mock catalog，覆盖：

- intent routing 与否定路由
- 原生 tool selection 和 tool result grounding
- structured output 修复/fallback
- graph node path
- interrupt/resume 和事件连续性
- runtime 重启后的 checkpoint recovery
- 多轮 messages
- tool exception、空候选、model exception
- locked segment、base version、PlanCommand invariant
- trace redaction 和 command write correctness

回归输入包含“删除咖啡这个安排”“不要酒店了”“确认酒店安排”“换一个”“就第二个”“还是算了”，以及清空计划后询问“这个计划怎么样”。

真实 DeepSeek smoke 使用临时环境变量调用 provider。首次运行曾发现模型把“换近一点”误判成原地 rewrite；最终实现增加了可追踪的关键意图 guard。这个案例说明 eval 不只是 happy path，也能直接推动 runtime 设计。

## 面试描述

可以如实描述为：

> 设计并重构了一个 TypeScript/LangGraph 行程 Agent runtime，将原有 800+ 行手工分支改为 12 节点的可 checkpoint StateGraph。接入 LangChain 原生 tool calling、Zod structured output、SQLite checkpoint 和 typed human-in-the-loop interrupt/resume；通过稳定 thread id 支持跨 runtime 恢复和多轮上下文。所有计划 mutation 均经过 deterministic PlanCommand domain boundary，工具结果直接 grounding command proposal。建立 node/model/tool/interrupt/command trace、连续 SSE 事件和 Agent eval，并用真实 DeepSeek smoke 验证模型链路；无有效模型连接时明确拒绝进入工作台。

## 二次 review 的取舍

- 已删除无模型配置时的本地 Agent 分支。Web 只接受测试成功的配置，workspace route、create/run/resume API 和 runtime facade 分层拒绝无连接请求。
- 保留 structured output 两次失败后的 deterministic intent fallback，以及模型未产生预期 tool call 时的 typed tool-call recovery；它们只在已经发起模型协议调用后生效，并写入 trace，不构成离线模式。
- 没有引入 RAG、多 Agent、向量库或 MCP。当前单 Agent graph 已能覆盖产品路径，继续加抽象只会增加维护面。
- 删除了只为借用 `CoreMessage` 类型而存在的 Vercel AI SDK 依赖；graph 模型与 tool calling 只保留 LangChain，简单 endpoint 探测/创建流使用项目内最小消息类型。
- 仍有两个可后续合并的工程面：初始方案 planner 与对话 graph 是两条真实但独立的模型入口；OpenAI-compatible endpoint/stream adapter 与 LangChain `ChatOpenAI` 同时存在。现阶段前者负责连接探测和创建流，后者负责 structured output/tool calling，直接合并的收益尚不足以抵消回归风险。
- `router.ts` 仍是较大的 deterministic guard 模块；它承担否定、指代、resume 文本和 schema fallback 的回归语义。后续应按 intent/target/resume 拆分纯函数，不应再增加一层 router framework。

## 仍未实现

- 没有真实地图、天气、酒店、票务、预订或支付 provider；数据明确为 local fictional mock。
- 已定义的路线、天气、current-plan tools 尚未全部进入主产品意图路由。
- plan variant 已有 typed interrupt schema，但首页初始方案仍由 UI 直接发 `CHOOSE_PLAN_VARIANT`。
- checkpoint 仅提供本地 SQLite，没有远程数据库、分布式 worker 或多实例并发锁。
- Trace 是自建本地事件模型，未接 LangSmith/OpenTelemetry exporter。
