# POS 二轮优化（草稿阻断与 AA 合规）

- ID: improvement-pos-2nd
- Owner: TBD
- Status: proposed

## Summary
修正 POS 结账草稿阻断、AA 交互一致性与金额计算复用，降低误下单与金额偏差风险，保持现有 UI 不变。

## Scope
- In: POS 结账流程、AA 分摊逻辑（`components/pos-interface.tsx`, `components/PosCheckoutDialog.tsx`）、订单接口 `app/api/orders/checkout/route.ts`
- Out: UI 样式与布局改版；新增可视化组件（保持现有 UI）

## UX Notes
沿用现有 UI 交互，仅修正流程与状态：阻止草稿直接结账、AA 仅出现单一数量弹窗、删除/修改 AA 时即时反馈。

## API / DB
- API: `POST /api/orders/checkout`（修正金额/批次计算复用工具函数）
- DB: 无 schema 变更，保持 `db/schema.ts` 不变
  - 若后续发现字段需求，再补充迁移：`pnpm drizzle:generate && pnpm drizzle:push`

## Workflow
1. 设计/流程校对 → 2. 拆分 Hook → 3. UI 行为修正（无样式改动） → 4. API 金额逻辑收口 → 5. 联调验收 → 6. 文档更新

## Acceptance Criteria
- [ ] 有草稿/未保存订单时禁止结账与隐式下单，打开结账入口不应创建订单记录
- [ ] AA 数量弹窗仅保留单一实现，无重复/冲突状态
- [ ] AA 列表删除仅影响单条，修改数量可见且可保存，列表状态不撕裂
- [ ] POSInterface 订单/结账状态拆分为 Hook，组件行数与重复逻辑显著下降且行为一致
- [ ] 订单金额与批次聚合统一复用 `lib/money.ts` / `lib/order-utils.ts`，接口与前端金额一致
- [ ] 保持现有 UI 外观不变（无样式/布局新增或改版）

## 任务清单（Tasks）

```markdown
### Task 1: 阻断草稿结账与隐式下单
**预计时间**: 1.5小时
**依赖**: 无

**AI 提示词**:
你是一位资深 Next.js/TypeScript 工程师，请在 `components/pos-interface.tsx` 修正结账入口逻辑：确保有草稿或未保存订单时禁止结账，不得在打开结账弹窗时隐式 POST 创建订单；`handleCheckout` 仅在明确提交时下单，保留现有 UI/交互不变。调整后补充必要的状态校验与错误提示复用现有模式。完成后自查现有用例，必要时更新相关调用。保持 UI 样式不变。
```

```markdown
### Task 2: 合并 AA 数量弹窗为单一实现
**预计时间**: 1.5小时
**依赖**: Task 1

**AI 提示词**:
你是一位资深 React 工程师，请在 `components/pos-interface.tsx` 与 `components/PosCheckoutDialog.tsx` 合并 AA 数量弹窗实现，删除重复的对话框/状态，保留单一来源的弹窗与状态管理，避免双弹窗或状态撕裂。保持现有 UI，不新增样式。完成后验证调用路径与状态流转一致。
```

```markdown
### Task 3: 修复 AA 列表删除/编辑交互
**预计时间**: 1小时
**依赖**: Task 2

**AI 提示词**:
你是一位资深前端工程师，请修复 `components/PosCheckoutDialog.tsx` AA 列表交互：删除按钮仅删除对应项（不要清空全部），修改数量需绑定目标项并在 UI 可见，必要时复用 Task 2 的单一弹窗。保持现有 UI 样式不变，确保状态同步无撕裂。
```

```markdown
### Task 4: 抽离 POS 订单/结账逻辑 Hook
**预计时间**: 1.5小时
**依赖**: Task 1

**AI 提示词**:
你是一位资深 React/TypeScript 工程师，请将 `components/pos-interface.tsx` 中的订单加载、提交、结账状态与错误处理抽离为 Hook（如 `hooks/usePosOrder.ts`、`hooks/useCheckout.ts`），减少重复 fetch/金额计算/状态管理，保持现有 UI/接口行为一致。拆分后更新组件调用，确保类型与副作用完整。必要时在提示中注明使用 context7 查阅官方 Hook/Next.js 文档。
```

```markdown
### Task 5: 金额与批次计算复用工具函数
**预计时间**: 1小时
**依赖**: Task 4

**AI 提示词**:
你是一位资深后端工程师，请在 `app/api/orders/checkout/route.ts` 等订单接口中统一复用 `lib/money.ts` 与 `lib/order-utils.ts` 进行金额舍入与批次聚合，移除手写 toFixed 与重复聚合逻辑，确保前后端金额一致。必要时使用 context7 查询库/浮点处理最佳实践。保持接口响应结构不变。
```

## Links
- 现状问题: `doc/improvement_2nd.md`
- 上一轮方案: `doc/pos_improvement.md`
- 相关计划: `doc/agents/features/pos_improvement-PLAN.md`
