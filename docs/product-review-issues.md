# PlanPal 产品复盘问题清单

> 用于连续记录当前线上体验暴露的问题。先收集、定位和排序，待问题收集完成后统一确认修改范围。

## ISSUE-001：方案选择卡无法支持真实决策

- 状态：已确认，待修复
- 严重度：高
- 现象：三个方案的时间、节点数、场景标签和摘要高度相似，用户只能根据“轻松 / 探索 / 休闲”等标题盲选。
- 误导信息：界面显示的 `86% / 81% / 76%` 在模型未提供分数时由代码按顺序填充，并非真实匹配度。
- 数据损失：前端展示模型已经整理出的 `timeline` 和 `reasons` 时没有渲染它们。
- 影响：选择动作缺少可解释性；用户无法判断路线、预算、节奏、活动组合和取舍。
- 待修方向：展示真实节点、优势与代价以及由节点计算出的指标；删除伪匹配度；校验三个方案存在可感知差异。

## ISSUE-002：线上正常对话进入审批节点时 Agent 运行失败

- 状态：根因已定位，待修复
- 严重度：阻断
- 回归输入：`孩子不能吃辣`
- 用户可见错误：`Called interrupt() outside the context of a graph.`
- 预期行为：将新的饮食约束纳入当前计划，给出替换候选并通过 LangGraph interrupt 等待用户选择。
- 实际行为：候选卡已写入 Plan，但 Graph 在执行 `interrupt()` 时失败，运行被标记为 `failed`，留下看似可操作但没有可靠等待中运行关联的半完成状态。
- 根因：Sites 打包配置显式选择 `browser` 条件，`@langchain/langgraph` 因而使用不初始化 Node `AsyncLocalStorage` 的 Web 入口。Cloudflare Worker 虽启用了 `nodejs_compat`，打包结果仍使用 `MockAsyncLocalStorage`，导致 `interrupt()` 读取不到 Graph runnable config。
- 放大因素：`validateProposal` 在 `requestApproval` 成功中断之前就保存了 PendingAction；中断基础设施失败时没有回滚或清理预览状态。
- 影响：所有需要 command approval、candidate selection、clarification 或 service selection 的线上对话 Graph 路径都可能失败，不局限于该句输入。首页 plan variant 当前走直接 `CHOOSE_PLAN_VARIANT` command，不经过该 interrupt 路径。
- 待修方向：让 Sites Worker 使用真实 `AsyncLocalStorage` 上下文；增加打包产物级 interrupt/resume 测试；调整 PendingAction 落盘边界或增加失败补偿，避免半完成状态。

## ISSUE-003：聊天输入框聚焦时出现双层高亮框

- 状态：已修复并提交（`5c62aaa`），待确认线上部署
- 严重度：中
- 现象：消息输入框获得焦点后，同时显示组件自己的黄色边框和全局黄色 `outline`，形成重复的两层高亮框。
- 根因：组件的 Tailwind `focus-visible:outline-none` 位于级联层中，无法覆盖 `styles.css` 中未分层的全局 `:focus-visible` 规则。
- 影响：焦点态显得粗重且像嵌套了两个输入框，降低界面完成度。
- 修复方向：保留组件自身的黄色边框和阴影作为可访问焦点提示，通过未分层的显式类关闭该组件的全局 outline，不影响其他控件。
- 验证结果：鼠标点击和 Tab 键聚焦均只显示单层黄色组件边框；全局 outline 不再绘制，浏览器控制台无新增错误。
