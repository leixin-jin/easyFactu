# POS 点单-下单-结账优化（实施计划 · Feature PLAN）

- ID: pos_improvement
- Owner: TBD
- Status: proposed

## Summary
在不改变现有 POS 页面尺寸与整体 UI 布局的前提下，分阶段优化「点单 → 下单 → 结账」流程的前端组件结构、状态管理与后端金额权威性，提升金额安全性、多终端一致性和可维护性，为后续报表与实时协作扩展打好基础。

## Scope
- In:
  - `POSInterface` 及相关组件/HOOK 的拆分与重构（仅限逻辑与结构，不修改现有页面尺寸与布局分栏比例）
  - POS 相关 API（下单 / 结账 / 订单查询）金额计算逻辑后端收口与错误码处理
  - 针对同桌多终端协作的并发一致性保障（单桌单 open 订单约束）
  - AA 模式与多次收款逻辑梳理（前后端语义统一）
  - 与 POS 直接相关的 util 抽取：`lib/money.ts`, `lib/order-utils.ts`, POS 相关 hooks
- Out:
  - 不改动 UI 视觉设计与组件尺寸（包括栅格/弹窗大小/主区域布局）
  - 不新增复杂状态管理框架（如 Redux / MobX 等）
  - 不在本阶段实现报表/历史订单完整功能，仅为其预留字段语义与结构
  - 不改动与 POS 无关的业务模块（例如会员、库存等）

## UX Notes
- 页面整体布局保持不变：左侧菜品、中间/右侧桌台与订单区域、结账弹窗尺寸与位置均沿用现有实现，只调整内部逻辑与组件边界。
- 下单/结账交互强调「显式」与「可预期」：
  - 结账前要求 cart 为空（推荐方案 A）：有草稿时点击结账给出明确 toast 提示，而不是隐式自动下单。
  - 结账错误码（金额不一致、AA 超量、金额不足等）提供友好中文提示，指示下一步动作（刷新、重新选择、补差额）。
- AA 模式交互进行渐进式微调（不改变弹窗尺寸）：在现有弹窗内部通过文案/数量提示/高亮方式，增强「已选份数 / 剩余可选份数」的可见度。

## API / DB
- API:
  - `POST /api/orders`：仅接受 `menuItemId + quantity (+ notes)`，在后端按菜单表价格计算金额并写入 `order_items.price`，前端不再传递单价决定金额。
  - `GET /api/orders`：统一通过 `lib/order-utils.buildOrderBatches` 聚合批次视图，供 POS 界面与后续报表/详情共用。
  - `PATCH /api/orders/[id]`：调整菜品数量/备注时，同样通过后端价格与金额工具统一计算。
  - `POST /api/orders/checkout`：前端传入的金额仅用于检测 UI 是否过期，最终金额以服务端重新计算为准，并通过错误码提示用户刷新或重试。
  - 如有「清空订单」「重新打开订单」等接口，统一金额字段语义，并复用金额工具函数。
- DB:
  - 为 `orders` 增加「单桌仅允许一个 open 订单」的唯一约束索引（需结合实际数据库方言落地），配合事务控制避免极端高并发产生多 open 订单。
  - 统一金额字段语义（示例）：
    - `orders.subtotal`: 整单原价小计
    - `orders.discount`: 整单折扣金额
    - `orders.totalAmount`: 整单应付金额（含税/服务费策略可在后端统一收口）
    - `orders.paidAmount`: 已收金额（支持多次收款/多次 AA）
    - `restaurant_tables.amount`: 当前桌台尚未结清金额，用于桌台列表展示
  - 通过 `lib/money.ts` 统一金额解析/格式化逻辑，减少浮点误差和格式差异。
  - 如需迁移或新增字段，遵循 Drizzle 规范更新 `db/schema.ts` 并执行：
    - `pnpm drizzle:generate && pnpm drizzle:push`
    - 同步评估是否需要更新 `seed/` 下的相关 CSV。

## Workflow
1. 设计（组件与 hooks 拆分方案、API/DB 收口范围评审）
2. Schema/Migration（如需新增唯一约束或金额字段调整）
3. UI 逻辑重构（保持 POS UI 尺寸与布局不变，仅调整组件边界与状态管理）
4. API 金额计算与错误码统一（引入 `lib/money.ts`, `lib/order-utils.ts`）
5. 联调与并发场景验证（多终端同桌下单/结账、错误码回传与提示）
6. 文档与示例订单（更新 `doc/pos_improvement.md` 链接、补充开发说明）
7. 验收（按验收标准逐条确认功能与边界）

## Acceptance Criteria
- [ ] 现有 POS 页面在视觉布局与尺寸上无变化（包括主区域宽高、弹窗大小、栅格比例）。
- [ ] `POST /api/orders`、`POST /api/orders/checkout` 等接口不再信任前端金额字段，所有订单金额由后端使用统一工具函数计算。
- [ ] 在同桌多终端并发下，不会出现两个 open 订单；若并发命中唯一约束或事务冲突，可正确回滚并向前端返回明确错误提示。
- [ ] 结账时若有未下单菜品，用户会收到明确提示且不会自动隐式下单（方案 A 落地），必要时可在后续扩展显式确认模式（方案 B）。
- [ ] AA 模式下的选择数量与剩余数量展示清晰，且不会出现 AA 份额超量或已全额支付却仍可选择的情况。
- [ ] POS 页面使用的桌台加载逻辑通过共享 hook 复用，接口调用与降级策略一致。
- [ ] 所有金额相关逻辑集中在 `lib/money.ts` 与 `lib/order-utils.ts` 等 util 中，重复实现被移除。
- [ ] 关键错误码（如 `SUBTOTAL_MISMATCH`、`TOTAL_MISMATCH`、`AA_QUANTITY_EXCEEDS_ORDER`、`INSUFFICIENT_RECEIVED_AMOUNT` 等）通过统一映射表展示友好中文文案。

## 任务清单（Tasks）

> 拆分遵循：单任务 ≤ 2 小时，尽量做到单任务可单独提交/回滚；所有任务在实现时遵守 `doc/guides/nextjs.instructions.md` 和 `doc/guides/nextjs-tailwind.instructions.md` 中的 Next.js + Tailwind 最佳实践，必要时在提示词中加入 `use context7` 以获取最新框架文档。

### Task 1: 抽象桌台加载逻辑为共享 hook
**预计时间**: 1.5 小时  
**依赖**: 无  

**AI 提示词**:  
你是一位资深 Next.js + TypeScript + Tailwind 工程师，熟悉 App Router 和 React Hooks。  
目标：在保持现有 POS UI 尺寸与布局完全不变的前提下，把桌台列表加载逻辑抽象成可复用的自定义 hook，并在 POS 与桌台管理页面中复用。  
请在 `hooks/` 目录下新增或完善 `useRestaurantTables`（命名可根据现有代码微调），要求：  
- 封装调用 `/api/restaurant-tables` 的逻辑，包括 loading、error 状态处理和必要的 mock 回退。  
- 输出统一的返回值结构（如 `{ tables, loading, error, reload }`），方便在 `POSInterface` 及桌台管理页面中直接使用。  
- 抽离桌台排序与分组逻辑（例如按区域 + 桌号自然排序）到 hook 内部或单独 util，避免两个页面各自实现。  
- 不改动任何 UI 组件大小、栅格比例或布局，只在原有组件中替换为新 hook 输出的数据。  
- 遵守 `doc/guides/nextjs.instructions.md` 和 `doc/guides/nextjs-tailwind.instructions.md` 的规范，必要时通过 `use context7` 查阅 Next.js 官方推荐的 hooks 与数据获取模式。  
请给出：  
1. 新增或更新的 `hooks/useRestaurantTables.ts` 代码结构。  
2. 在 POS 和桌台管理页面中如何替换旧实现的示例。  

### Task 2: 设计与实现 POS 订单与结账核心 hooks
**预计时间**: 2 小时  
**依赖**: Task 1  

**AI 提示词**:  
你是一位资深全栈工程师，精通 Next.js App Router、React hooks 与 TypeScript。  
目标：在不改变 POS 页面整体布局与组件尺寸的前提下，将当前 `POSInterface` 中与订单、批次和结账相关的复杂状态拆分为独立 hooks，提升可维护性和并发安全性。  
请在 `hooks/` 目录下设计并实现以下 hook（名称可根据现有代码适度调整，但职责需覆盖）：  
1. `usePosOrder(selectedTableId)`  
   - 负责加载指定桌台的当前 open 订单与历史批次，调用 `GET /api/orders?tableId=...`。  
   - 封装下单相关操作：`submitBatch(items)`、`decrementItem(itemId)`、`removeItem(itemId)`、`clearOrder()` 等。  
   - 保证在多终端场景下，对接口错误码有明确处理（如订单不存在、并发冲突）。  
2. `useCheckout(order, batches, cart)`  
   - 维护结账弹窗相关 UI 状态：折扣、支付方式、收款金额、AA 开关与 AA 选择项等。  
   - 提供金额计算结果：应付金额、小计、找零等（金额计算逻辑最终将迁移到 `lib/money.ts`，此处可先调用 util）。  
   - 将结账行为封装为 `checkout()`，调用 `POST /api/orders/checkout`，并根据错误码返回结构化错误信息（供 UI 显示）。  
要求：  
- 仅修改状态和逻辑，不改动页面 JSX 结构的实际尺寸（包括弹窗大小和布局）。  
- hook 应有明确的输入/输出类型定义（使用 TypeScript interface/type）。  
- 结合 `doc/pos_improvement.md` 中的并发与一致性建议，确保在设计中预留处理并发错误码的能力。  
- 遵守 Next.js App Router 最佳实践，必要时 `use context7` 查询最新 hooks 与数据获取文档。  
请给出：  
1. `usePosOrder` 与 `useCheckout` 的接口设计（函数签名与关键 state 结构）。  
2. 在 `POSInterface` 中如何接入这些 hooks 的示例代码片段。  

### Task 3: 拆分 POSInterface 为逻辑清晰的子组件
**预计时间**: 2 小时  
**依赖**: Task 2  

**AI 提示词**:  
你是一位熟悉大型 React 组件拆分的高级前端工程师。  
目标：将现有体积过大的 `POSInterface` 按功能拆分为多个子组件，同时不改变当前 UI 的尺寸与布局，只重构内部结构与数据流。  
请在 `components/` 或合适的 feature 目录中拆分出以下子组件（命名可根据实际代码调整、但职责要清晰）：  
- `PosMenuPane`: 左侧菜品列表、搜索与分类筛选；通过 props 接收数据与 `onAddToCart(item)` 回调。  
- `PosCartPane`: 当前批次（cart）展示与数量增减、移除逻辑。  
- `PosOrderBatchList`: 已下单批次展示（只读），数据来源于 `usePosOrder`。  
- `PosOrderSummary`: 整体菜品 × 数量汇总视图，支持在 AA 模式下选择 AA 份额。  
- `PosCheckoutDialog`: 仅负责结账弹窗的 UI 与输入，金额计算与校验由 `useCheckout` 提供。  
- `PosTableSelector`: 桌台选择或桌台列表区域，与 `useRestaurantTables` 协作。  
要求：  
- 拆分过程中严格避免修改任何 Tailwind 类导致的尺寸变化（尽量复用现有样式类）。  
- 数据流以 props 和 hooks 为主，避免新增全局状态管理库。  
- 组件边界清晰，每个组件只关心自身功能，便于后续单独测试与维护。  
- 遵循 `doc/guides/nextjs-tailwind.instructions.md` 中的组件与样式约定，必要时 `use context7` 查阅 Next.js 组件最佳实践。  
请给出：  
1. 每个子组件的 props 设计草案。  
2. 重构后的 `POSInterface` 顶层结构示意（如何组织这些子组件）。  

### Task 4: 引入统一金额工具 lib/money.ts 与订单聚合工具 lib/order-utils.ts
**预计时间**: 1.5 小时  
**依赖**: Task 2  

**AI 提示词**:  
你是一位专注于后端与领域建模的工程师，擅长处理金额精度与订单聚合逻辑。  
目标：将项目中分散的金额计算和订单批次聚合逻辑集中到 `lib/` 下的工具模块中，确保所有 POS 相关 API 与前端逻辑复用相同实现，减少浮点误差与字段不一致风险。  
请在 `lib/` 目录中完成以下模块：  
1. `lib/money.ts`  
   - `parseMoney(value: unknown): number`：将各种输入（字符串、数字）解析为内部统一的金额数值。  
   - `formatMoney(value: number): string`：以统一规则格式化金额字符串（例如保留两位小数，使用四舍五入）。  
2. `lib/order-utils.ts`  
   - `buildOrderBatches(rows: OrderItemWithMenuItem[]): OrderBatchView[]`：从数据库查询结果构建 POS 所需的批次与明细视图。  
   - 其他与订单金额汇总、AA 分摊计算等密切相关的工具函数。  
要求：  
- 所有 POS 相关 API（`POST /api/orders`, `GET /api/orders`, `POST /api/orders/checkout` 等）逐步迁移到新工具函数上，避免重复实现。  
- 简要梳理金额字段语义（参考 `doc/pos_improvement.md` 第 5、6 章），并在工具函数中体现一致的使用方式。  
- 编码过程中遵循 TypeScript 严格类型与 Next.js 最佳实践，必要时 `use context7` 查阅相关 TypeScript/Next.js 文档。  
请给出：  
1. `lib/money.ts` 和 `lib/order-utils.ts` 的接口设计与关键实现片段。  
2. 一个将现有某个 API 切换到新工具函数的示例。  

### Task 5: 后端金额权威性与并发约束落地
**预计时间**: 2 小时  
**依赖**: Task 4  

**AI 提示词**:  
你是一位熟悉数据库事务与并发控制的后端工程师。  
目标：确保 POS 下单与结账金额全部由后端根据当前菜单价格与折扣规则计算，并通过数据库约束和事务避免同桌多 open 订单等并发问题。  
请按以下方向调整后端：  
- 修改 `POST /api/orders` 使其只接受 `menuItemId` 与 `quantity`，在后端根据 `menuItems.price` 计算各项金额，并写入 `order_items.price` 与订单金额字段。  
- 修改 `POST /api/orders/checkout`：前端金额仅用于校验 UI 是否过期，最终金额重新从数据库中计算，出现不一致时返回明确错误码与服务端金额。  
- 为 `orders` 增加「同一桌台仅有一个 open 订单」的唯一索引（使用 Drizzle 及目标数据库支持的部分索引语法），在并发创建时保证后提交者失败并返回明确错误。  
- 在相关 API 中使用事务与必要的锁保证查询 + 写入过程的原子性。  
要求：  
- 金额计算复用 `lib/money.ts` 和 `lib/order-utils.ts`。  
- 对所有新增/调整的错误码给出文档说明，方便前端用映射表展示友好提示。  
- 不影响现有 UI 尺寸和行为，仅调整数据来源。  
- 遵守 `db/schema.ts` 作为单一事实源，并使用 `pnpm drizzle:generate && pnpm drizzle:push` 更新迁移。  
必要时使用 `use context7` 查阅 Drizzle + Next.js 的最佳实践文档。  
请给出：  
1. 关键 API 路由的调整思路与示例代码（伪代码即可）。  
2. 唯一索引的 Drizzle 定义示例。  

### Task 6: 结账交互与错误码提示优化
**预计时间**: 1.5 小时  
**依赖**: Task 3, Task 5  

**AI 提示词**:  
你是一位注重交互细节的前端工程师。  
目标：在不改变结账弹窗尺寸与整体布局的情况下，优化「结账」入口行为与错误提示体验，使操作员清楚知道当前可结账范围与可能出现的问题。  
请完成以下工作：  
- 在 POS 主界面中实现「方案 A」：当 cart 非空时，点击结账按钮只弹出 toast 提示（例如「当前还有未提交的菜品，请先下单后再结账」），不打开结账弹窗，也不触发隐式下单。  
- 在前端新增一个错误码到文案的映射表（如 `errorCodeToMessage`），集中处理后端返回的错误码：  
  - `SUBTOTAL_MISMATCH`、`TOTAL_MISMATCH` → 提示数据已在其他终端更新，建议刷新重试。  
  - `AA_QUANTITY_EXCEEDS_ORDER` → 提示 AA 份额超出订单数量。  
  - `INSUFFICIENT_RECEIVED_AMOUNT` → 提示收款金额不足。  
  - `ITEM_FULLY_PAID` 等其他业务错误。  
- 在 `PosCheckoutDialog` 内部优雅展示这些错误提示，确保不会挤压现有布局或导致弹窗尺寸改变（如使用已有的提示区域或轻量 toast）。  
要求：  
- 不改变任何现有弹窗与按钮尺寸，只在逻辑与文案层面优化交互。  
- 与 `useCheckout` hook 协作，将错误信息通过 hook 暴露给 UI。  
- 样式遵循现有 Tailwind 设计体系，不新增大块布局变更。  
请给出：  
1. 结账入口拦截逻辑的示例代码。  
2. 错误码映射表的数据结构设计与在 UI 中使用的示例。  

### Task 7: AA 模式与多次收款体验微调
**预计时间**: 1.5 小时  
**依赖**: Task 3, Task 4  

**AI 提示词**:  
你是一位熟悉餐饮业收银场景的前端工程师。  
目标：在不改变现有弹窗尺寸和大体布局的约束下，增强 AA 模式和多次收款的可见性和一致性。  
请在 `PosOrderSummary` 与 `PosCheckoutDialog` 内部进行以下调整：  
- 在 AA 模式下，给每道菜展示「总份数 / 已 AA 份数 / 剩余可分配份数」的文本或轻量视觉提示（如小标签），确保服务员一眼能看出可分配空间。  
- 当订单已经存在部分收款（含多次 AA）时，在结账弹窗中展示「已收金额」和「本次应收金额」的清晰文案，金额由后端统一计算并通过 `useCheckout` 提供。  
- 确保任何 AA 操作不会违反后端约束（如已全额支付的菜不可再次 AA），前端通过错误码映射表进行友好提示。  
要求：  
- 不扩大弹窗尺寸，如需增加信息，请优先使用现有空白区域或通过简洁文案/标签呈现。  
- 保持现有颜色和整体视觉风格，只做信息层级与文案优化。  
请给出：  
1. 文案与标签展示方案（示例 JSX 结构）。  
2. 与后端数据结构/金额工具的协作方式说明。  

## Links
- 现状与优化方案说明：`../../pos_analysis.md`, `../../pos_improvement.md`  
- Next.js 通用最佳实践：`../../guides/nextjs.instructions.md`  
- Next.js + Tailwind 规范：`../../guides/nextjs-tailwind.instructions.md`  

