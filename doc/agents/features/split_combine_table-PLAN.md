# 拆台与并台（POS 桌台订单流转）

- ID: split_combine_table
- Owner: 待定
- Status: proposed

## Summary
实现 POS 页面桌台订单的拆台与并台，支持部分菜品与整单流转，保持 UI 不变，通过可复用子组件与清晰逻辑提升可维护性。

## Scope
- In: POS 桌台订单（`components/pos-interface.tsx` 及其相关子组件/状态管理/接口）；部分/整单拆台、部分/整单并台；数据一致性与边界校验。
- Out: UI 视觉与交互重设计；支付、优惠、会员等非桌台流转逻辑；非 POS 场景。

## UX Notes
- 保持现有 UI，不新增复杂交互；复用现有弹窗/选择交互模式。
- 清晰标识源桌台、目标桌台、选中菜品数；整单操作需二次确认。
- 空状态：无可拆/并菜品时禁用操作并提示原因。

## API / DB
- API: 复用现有订单/菜品更新接口（确认 `components/pos-interface.tsx` 调用的服务层）；若需新增接口，采用 `app/api` 路由并校验输入。
- DB: 预期不改 schema；若发现需要表字段支持（如订单项目标桌台），需更新 `db/schema.ts`、生成/推送迁移（`pnpm drizzle:generate && pnpm drizzle:push`）并同步 `seed/`。
- 数据一致性：拆/并操作需原子更新订单项归属；避免重复菜品 ID 或孤儿记录。

## Workflow
1. 设计（数据流、子组件拆分方案）
2. Schema/Migration（若需）
3. UI 交互实现（保持现有样式，新增子组件）
4. API/服务层更新
5. 联调与状态校验
6. 文档/用法说明
7. 验收（拆/并台流程与边界验证）

## Acceptance Criteria
- [ ] 部分拆台：可选择部分菜品移至目标桌台，源/目标数量正确更新。
- [ ] 整单拆台：源桌台清空，目标桌台完整接收；无孤儿记录。
- [ ] 部分并台：可选择目标桌台菜品并入当前桌台，数量正确。
- [ ] 整单并台：目标桌台清空，当前桌台累加；数据一致。
- [ ] UI 保持现状（无布局/视觉变化），新增逻辑通过子组件封装，`components/pos-interface.tsx` 体量可控。
- [ ] 异常防护：桌台不存在/无菜品/重复操作时给予可理解提示；关键操作有确认或禁用态。
- [ ] 可观测性：关键流程添加日志/错误提示；若有 API，返回状态明确。

## 任务清单（Tasks）

### Task 1: 现状梳理与数据流确认
**预计时间**: 1 小时  
**依赖**: 无

**AI 提示词**:
你是一位资深 Next.js (App Router) + TypeScript 工程师。阅读 `components/pos-interface.tsx` 以及被它直接/间接引用的 POS 逻辑文件，梳理桌台、订单、菜品的状态结构与更新入口（API/服务层）。输出：关键数据结构、拆/并台可复用的状态/方法位置，当前 UI 交互限制。遵循 `doc/guides/nextjs.instructions.md` 和 `doc/guides/nextjs-tailwind.instructions.md`，保持 UI 不变。

### Task 2: 方案设计与子组件拆分
**预计时间**: 1.5 小时  
**依赖**: Task 1

**AI 提示词**:
你是一位资深前端架构师，基于 Task 1 的现状，设计拆台/并台的数据流与子组件方案，目标是降低 `components/pos-interface.tsx` 体积。提出：需要新增的子组件/HOOK（文件路径建议在 `components/` 或 `hooks/`）、props 设计、状态提升方案、边界校验点。输出设计文档要点（中文），保持现有 UI，参考 Next.js App Router 最佳实践（use context7）。

### Task 3: 实现拆台（部分/整单）逻辑
**预计时间**: 2 小时  
**依赖**: Task 2

**AI 提示词**:
你是一位资深 Next.js + TypeScript 工程师。按照 Task 2 设计，在不改变 UI 的前提下实现拆台：支持选择部分菜品与整单迁移至目标桌台。要求：复用/新增子组件承载选择与确认逻辑；保证状态/后端更新原子性；无菜品或目标桌台不可用时需禁用/提示。修改集中在 `components/pos-interface.tsx` 及其抽出的子组件/HOOK，遵循 `doc/guides/nextjs.instructions.md`、`doc/guides/nextjs-tailwind.instructions.md`。

### Task 4: 实现并台（部分/整单）逻辑
**预计时间**: 2 小时  
**依赖**: Task 3

**AI 提示词**:
你是一位资深 Next.js + TypeScript 工程师。基于 Task 3 已有模式，实现并台：从目标桌台选择部分或整单菜品并入当前桌台，保持 UI 不变。复用已有子组件/HOOK；确保源桌台清空逻辑正确；处理并发/重复点击防抖；所有状态更新需一致。遵循项目指南与 context7（Next.js App Router）。

### Task 5: 校验、边界与可观测性
**预计时间**: 1.5 小时  
**依赖**: Task 4

**AI 提示词**:
你是一位资深 QA/前端工程师。验证拆/并台的主要与边界场景：无菜品、桌台不存在、同桌台重复操作、整单迁移后再次操作、接口失败重试/提示。补充必要的错误提示与日志，不改变 UI 布局；如有 API，检查请求/响应状态处理。记录发现并修复的点。

### Task 6: 文档与验收记录
**预计时间**: 0.5 小时  
**依赖**: Task 5

**AI 提示词**:
你是一位项目维护者。更新相关说明：在 `doc/agents/features/` 中标记完成情况或补充使用说明（若需），列出已验证场景与残留风险。确保更改遵循项目指南与 Next.js App Router 最佳实践。

## Links
- `../../guides/nextjs.instructions.md`
- `../../guides/nextjs-tailwind.instructions.md`
- Context7: Next.js App Router (`/websites/nextjs_app`)
