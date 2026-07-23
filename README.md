# PlanPal Agentic

PlanPal Agentic 是一个 **BYOK（Bring Your Own Key）Agent 行程规划工作台**。它把自然语言 Agent、可编辑拼图行程、多列工作台、模型配置和本地演示存储放在同一个 pnpm monorepo 里。

在线演示：[https://plan-pal-agentic-zeno.zenojor.chatgpt.site/](https://plan-pal-agentic-zeno.zenojor.chatgpt.site/)

项目最重要的设计原则是：

```text
拼图列里的行程是确定性的 Plan 对象。
聊天框只是 Agent 入口，负责理解意图、提出候选和收集选择。
任何真正修改计划的行为，都必须通过明确的 PlanCommand 写入。
模型输出不能直接落到持久化 Plan。
```

如果你第一次浏览这个仓库，建议先看本文件，再看 [Agent 链路说明](docs/agent-flow.md)。

## 当前能力

- 首页快速创建计划，支持时间、人数、范围、节奏和补充需求。
- `/settings/model` 配置 OpenAI-compatible 模型，内置 DeepSeek/OpenAI 预设，API key 只保存在浏览器本地。
- 模型连接必须先测试成功再保存；没有已验证连接时不能创建计划或进入工作台，不提供伪 Agent 离线模式。
- 创建计划时先从本地虚构 POI Catalog 批量召回候选，再让模型只用候选 `poiId` 编排 3 个方案方向；用户选择后写入拼图主轴。
- POI 的营业窗口和容量同时保留展示文本与 `openWindows/capacityRange` 结构化字段；自然语言中的时段、人数、距离、必需/排除标签、室内、安静和忌辣约束进入统一检索请求。
- POI 搜索固定执行“硬约束过滤 → 相关性评分 → 区域/类目/价位多样性重排”，后续替换和新增节点不再通过无约束 fallback 把被排除候选召回。
- 工作台保留多列框架：对话、拼图、商家、详情、路线、记录。
- 对话列支持全局计划或选中活动上下文，Agent-first 进入替换、加点候选和命令流程。
- 拼图列支持替换、上移/下移、删除、锁定、备注、路线模式选择、生成模拟确认单。
- 候选、初始方案和 fallback POI 使用扩展后的具体虚构地点，不接真实商家、真实地图或真实预订。
- 本地 mock API 支持 POI/merchant/offering 查询、计划路线估算和 sandbox receipt 演示闭环。
- 商家可带 `MerchantOffering` 商品/服务项；酒店房型、电影场次、票务、花礼、SPA 等仍是 fictional local mock。
- Trace 列展示 Agent / model / tool / command 事件、版本历史、run 级 trace replay 和安全检查。
- Agent API 真实执行 12 节点 LangGraph `StateGraph`，支持条件边、多轮 messages、原生 tool calling 和 graph stream。
- command approval、候选、服务和 clarification 共用 typed `interrupt()` / `Command({ resume })` 模型；plan variant 目前只保留 typed schema，首页仍通过 `CHOOSE_PLAN_VARIANT` command 选择方案。
- `packages/eval` 提供 69 项离线 Agent/retrieval eval 与 4 项 DeepSeek live smoke；其中 12 项检索评测覆盖约束违规、Catalog grounding、precision@k 和多样性；默认不读取真实 key、不发外部网络请求。
- 本地 demo 默认使用文件 Plan store + SQLite LangGraph checkpoint，测试环境使用内存存储和 `MemorySaver`。

## 技术栈

- Monorepo：pnpm workspace
- Web：Vite、React、TanStack Router、TanStack Query
- UI：`animal-island-ui`、Tailwind CSS 4、定制 workspace CSS
- API：Hono、Node runtime、SSE
- Domain：共享 Plan 类型、PendingAction、PlanCommand、确定性 mutation
- Agent：LangGraph、LangChain tools、Zod structured output、SQLite checkpoint、OpenAI-compatible BYOK adapter
- DB：repository 接口、文件存储、内存存储、Drizzle schema

## 目录结构

```text
apps/
  api/        Hono API、SSE、store/runtime wiring
  web/        React 前端、模型设置、首页、工作台 UI
packages/
  domain/     Plan 类型、命令、seed/mock POI、确定性计划变更
  db/         repository、file store、memory store、Drizzle schema
  agent/      StateGraph、nodes、typed tools、checkpoint、runtime facade
  eval/       Agent golden/architecture eval、trace 报告和真实模型 smoke
docs/
  agent-flow.md  真实 Graph、状态、条件边和恢复链路
```

这个项目不是传统的 `frontend/` + `backend/` 拆法。真正重要的边界是：

- `apps/*` 是可运行应用。
- `packages/*` 是可复用的产品和运行时内核。
- `domain` 是写计划的唯一可信边界。

## 快速开始

安装依赖：

```powershell
pnpm install
```

如果 pnpm 对 lockfile 供应链策略有拦截，而你已经信任当前 lockfile：

```powershell
pnpm install --trust-lockfile
```

分别启动 API 和 Web：

```powershell
pnpm dev:api
pnpm dev:web
```

默认地址：

- Web: `http://localhost:5174`
- API: `http://localhost:8787`

如果 PowerShell 不允许执行 `pnpm.ps1`，可以通过 Node 调 pnpm：

```powershell
node "$env:APPDATA\npm\node_modules\pnpm\bin\pnpm.mjs" dev:api
node "$env:APPDATA\npm\node_modules\pnpm\bin\pnpm.mjs" dev:web
```

## 模型配置

打开：

```text
http://localhost:5174/settings/model
```

填写一个 OpenAI-compatible provider：

- `baseURL`
- `model`
- `apiKey`

可先点 DeepSeek 或 OpenAI 预设填入常用 `baseURL` / `model`，再填写自己的 API key。

点击 `测试连接` 只会测试，不会保存。点击 `保存到浏览器` 后才会写入浏览器本地存储。

安全边界：

- API key 只保存在浏览器。
- 请求时通过 `Authorization: Bearer <key>` 发送给 API。
- 后端不保存 API key。
- 日志和事件中需要对密钥做 redaction。
- 事件可以携带非敏感信息，例如 model 名称、resolved base URL、attempted endpoints。

## 常用脚本

```powershell
pnpm dev:api
pnpm dev:web

pnpm build:domain
pnpm build:db
pnpm build:agent
pnpm build:eval
pnpm build:api
pnpm build:web
pnpm build:new

pnpm eval:agent -- --suite golden
pnpm eval:agent -- --suite live-smoke --provider deepseek

pnpm --dir packages/domain test
pnpm --dir packages/db test
pnpm --dir packages/agent test
pnpm --dir apps/api test
pnpm --dir apps/web test
pnpm test:new
```

单独做 TypeScript 检查时：

```powershell
.\node_modules\.bin\tsc.cmd -p packages/domain/tsconfig.json --noEmit
.\node_modules\.bin\tsc.cmd -p packages/agent/tsconfig.json --noEmit
.\node_modules\.bin\tsc.cmd -p apps/api/tsconfig.json --noEmit
.\node_modules\.bin\tsc.cmd -p apps/web/tsconfig.json --noEmit
```

## 本地存储

API 默认使用文件存储：

```text
.planpal-data/demo-store.json
.planpal-data/langgraph-checkpoints.sqlite
```

可用环境变量：

```powershell
$env:PLANPAL_STORE_PATH="E:\temp\planpal-store.json"
$env:PLANPAL_STORE_MODE="memory"
```

测试环境会使用 memory store。

Sites 托管构建不是上述本地持久化模式。`scripts/prepare-sites-build.mjs` 会把 API store wiring 替换为 `scripts/sites-worker-store.ts`，当前使用进程内 Plan store 和默认 `MemorySaver`，因此不保证跨 Worker isolate 重启恢复。构建脚本会强制选择 LangGraph 的 Node 入口，并在产物缺少 `node:async_hooks` 初始化时直接失败，避免审批类 `interrupt()` 静默退化为浏览器 mock 上下文。

## 产品流程

1. 打开 `/`，输入想安排的活动。
2. 首页通过 `/api/plans/stream` 创建计划，并显示 SSE 进度。
3. API 调 `createPlanWithVariants`，按活动阶段和服务类别批量召回本地虚构 POI，模型只返回候选 `poiId`、时间和理由；后端用 Catalog 权威字段物化并校验 3 个方案。缺少模型配置、未知 `poiId` 修复失败或 provider 调用失败时直接失败，不持久化本地替代计划。
4. 用户在对话列选择 3 个方案之一。
5. 前端发送 `CHOOSE_PLAN_VARIANT` 到 `/api/plans/:planId/commands`。
6. domain 应用命令，替换拼图主轴并产生版本。
7. 用户在工作台中继续拖拽、替换、加点、改路线、选择商品/服务、生成模拟确认单；自然语言“再加个咖啡/拍照点/酒店/电影”会先生成候选或服务票据。
8. Agent 对话由 compiled LangGraph 执行；模型和工具生成意图、证据与 proposal，写计划仍只通过 `applyPlanCommand()`。

更完整的 Agent 细节见 [docs/agent-flow.md](docs/agent-flow.md)。

## API 概览

- `GET /api/health`
- `POST /api/model/test`
- `GET /api/mock/pois`
- `GET /api/mock/pois/:poiId`
- `GET /api/mock/merchants`
- `GET /api/mock/merchants/:merchantId`
- `GET /api/mock/merchants/:merchantId/offerings`
- `GET /api/mock/offerings`
- `GET /api/plans`
- `POST /api/plans`
- `POST /api/plans/stream`
- `GET /api/plans/:planId`
- `GET /api/plans/:planId/mock/routes`
- `GET /api/plans/:planId/agent/runs`
- `GET /api/plans/:planId/agent/runs/:runId/trace`
- `DELETE /api/plans/:planId`
- `POST /api/plans/:planId/commands`
- `POST /api/plans/:planId/agent/runs`
- `POST /api/plans/:planId/agent/resume`

## PlanCommand 概览

当前确定性命令包括：

- `REQUEST_COMMAND_CONFIRMATION`
- `CONFIRM_COMMAND_ACTION`
- `CLEAR_PLAN_SEGMENTS`
- `RESTORE_PLAN_VERSION`
- `CHOOSE_PLAN_VARIANT`
- `REORDER_SEGMENT`
- `DELETE_SEGMENT`
- `REPLACE_SEGMENT`
- `REWRITE_SEGMENT`
- `ADD_SEGMENT`
- `LOCK_SEGMENT`
- `UNLOCK_SEGMENT`
- `CHOOSE_CANDIDATE`
- `REFRESH_CANDIDATES`
- `REQUEST_CLARIFICATION`
- `DISMISS_PENDING_ACTION`
- `SET_ROUTE_CHOICE`
- `CLEAR_ROUTE_CHOICE`
- `REFRESH_SERVICE_ITEMS`
- `SELECT_SERVICE_ITEM`
- `REMOVE_SERVICE_ITEM`
- `UPDATE_SERVICE_ITEM_QUANTITY`
- `CONFIRM_PLAN`
- `CREATE_SANDBOX_ORDER`

新增会修改计划的能力时，优先问自己：

```text
它是不是应该成为一个 PlanCommand？
它是否能被测试为 deterministic mutation？
模型输出有没有经过解析、校验和 domain command 边界？
```

## 手动 QA 建议

1. 启动 API 和 Web。
2. 打开 `/settings/model`，测试并保存模型配置。
3. 回到 `/` 创建计划。
4. 验证创建进度、3 个方案票据、选择方案后的拼图主轴。
5. 在拼图列中替换一个节点，检查候选票据在对话列出现。
6. 输入类似 `晚上想吃火锅啊`，检查替换候选是否匹配火锅需求。
7. 输入类似 `中间再加个咖啡休息`，检查加点候选是否进入空档票据。
8. 选择候选，检查版本号、Trace 事件和拼图内容。
9. 切换选中活动和全局上下文，检查 Agent 目标是否正确。
10. 改路线模式，检查 `SET_ROUTE_CHOICE` 写入和 Trace 事件。
11. 在 Merchant 面板选择一个电影票/房型/套餐，调整数量或移除，检查 Plan version 与 receipt 项目同步。
12. 打开确认弹窗，生成 sandbox 模拟确认单，检查 receipt id、mock 商户、模拟项目和非真实预订/支付声明。
13. 打开 Trace 列，切换 Timeline / Tools / Replay / Safety，确认 run、tool call、command write 和 redaction 检查可解释。
14. 在 1440、820、390px 宽度下检查工作台无横向溢出。

## Agent Eval

默认 suite 使用 fake model、MemorySaver、临时 SQLite checkpoint 和本地 mock 数据，共 69 个 golden/architecture/retrieval 场景。它覆盖 intent/negation routing、原生 tool calling、tool grounding、structured output、graph path、interrupt/resume、checkpoint recovery、多轮上下文、locked-segment recovery、PlanCommand 写边界、trace correctness，以及 POI 检索 precision@k、硬约束违规和结果多样性：

```powershell
pnpm eval:agent -- --suite golden
```

DeepSeek live smoke 包含 4 个真实模型场景。只有显式设置环境变量时才会联网调用；key 不进入 graph state、checkpoint、store 或报告：

```powershell
$env:PLANPAL_EVAL_API_KEY="<your temporary key>"
pnpm eval:agent -- --suite live-smoke --provider deepseek
Remove-Item Env:\PLANPAL_EVAL_API_KEY
```

报告输出在 `docs/evals/`。

## 开发守则

- 不要让模型自由文本直接改 Plan。
- 不要把真实商家、真实地图、真实预订伪装成已接入能力。
- 不要把用户 API key 写入代码、store、日志、截图或测试 fixture。
- 不要绕过 `packages/domain` 直接在前端拼接持久化计划对象。
- UI 里的“看起来可操作”的控件必须接到真实 command、agent run 或明确 disabled。
- 新增 Agent 能力时，给 domain/agent/web helper 补对应测试。

## 仍未生产化的部分

这是一个本地 product demo，不是生产部署：

- 没有生产用户体系和权限隔离。
- Drizzle schema 已存在，但当前 demo 默认不是 Postgres。
- 地图、商家、排队、预约都是本地虚构/估算信息。
- 模型供应商以 OpenAI-compatible 为主，未做复杂 provider matrix。
- E2E 浏览器截图 QA 需要按视觉迭代阶段补齐。
