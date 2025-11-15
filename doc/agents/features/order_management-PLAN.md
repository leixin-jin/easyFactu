# 点单加减菜与批次显示（order_management）

- ID: order_management
- Owner: TBD
- Status: proposed

## Summary
为 POS 点单页面（`app/pos/page.tsx` + `components/POSInterface.tsx`）提供完整的加菜/减菜能力，并将同一桌台多次加菜按批次区分显示与配色，同时落库到 `orders` / `order_items` 表，保持现有 UI 布局和尺寸不变，仅补充菜品与批次信息展示。

## Scope
- In:  
  - 前端：`components/pos-interface.tsx`、`app/pos/page.tsx` 内的点单交互与状态管理  
  - 后端：新增/扩展与点单相关的 API（建议放在 `app/api/orders/route.ts` 及必要的子路由，例如 `app/api/orders/[id]/route.ts`）  
  - 数据库：基于现有 `orders` 与 `order_items` 结构完成新增订单与明细写入；可在 `db/schema.ts` 中增加必要的辅助字段（如批次标记字段）并用 Drizzle 迁移同步  
  - 功能：  
    - 加菜：根据当前购物车内容创建订单及订单明细  
    - 减菜：在前端对某一批次的订单行做减数量/清空，并通过后端更新 `order_items`（或生成新的“冲减”订单，视最终设计而定）  
    - 批次显示：同一桌台的多次加菜批次在 UI 中按时间顺序分组显示，使用两种配色区分“首次下单批次”和“后续加菜批次”，分组展示而不将多批次菜品合并  
- Out:  
  - 账单结算后的对账、财务流水统计（仍由 `transactions` 负责，当前不在本功能范围内扩展）  
  - 折扣策略、优惠券、会员系统等复杂定价逻辑  
  - 桌台开台/并台/拆台流程的改造（仅复用已有接口和 UI，不调整布局尺寸）

## UX Notes
- 保持 POS 页面现有整体布局与尺寸不变：  
  - 左侧为菜单筛选与菜品卡片区域  
  - 右侧为“当前订单”购物车区域，宽度继续使用现有 `w-96`，不改变主容器的 `h-[calc(100vh-8rem)]`  
- 菜品展示：  
  - 继续使用当前的网格卡片布局，仅在“当前订单”区域中新增按批次的分组与颜色展示，不增加额外的全屏弹窗或改变主容器尺寸  
- 批次显示与颜色：  
  - 第一次下单/加菜：使用默认颜色（沿用当前 Card/Badge 风格）  
  - 第二次及之后加菜：在“当前订单”中采用另一种清晰但不刺眼的颜色区分（例如轻微背景色变化或左侧批次标识条），保证在浅色/深色模式下都清晰可见  
  - 同一批次内的菜品可以继续按菜名排序，但不同批次须在视觉上分组（例如“第1批次”“第2批次”小标题或分隔条），不能合并到同一列表中  
- 操作行为：  
  - “加菜”：  
    - 用户在菜单区域选择菜品并调整数量后，点击“加菜”或“下单”按钮时，将当前选中菜品作为一个新批次提交  
    - 提交成功后，右侧“当前订单”区域刷新，显示每个批次的菜品与数量，并清晰标出批次顺序  
  - “减菜”：  
    - “-” 按钮：对当前批次中某一道菜的数量减 1，如数量减为 0 则移除该条目  
    - “垃圾桶”按钮：清空当前批次中某一道菜的数量（即删除该菜品行）  
    - 减菜操作只影响对应批次和菜品，不跨批次合并  
  - 空状态：  
    - 当当前订单为空时，显示现有 “购物车为空/点击菜品添加到订单” 空状态文案，无需新增模态框  

## API / DB
- API（建议）：  
  - `POST /api/orders`  
    - 作用：为指定桌台创建一个新订单或新加菜批次，并写入 `orders` 与 `order_items`  
    - 请求体（示例）：  
      ```json
      {
        "tableId": "<restaurant_table_id>",
        "items": [
          { "menuItemId": "<menu_item_uuid>", "quantity": 2, "price": 12.50, "notes": "" }
        ],
        "paymentMethod": "cash",
        "batchTag": "1" // 可选：用于区分第几次加菜
      }
      ```  
    - 响应：返回新建订单的基础信息与当前桌台的全部批次与明细，用于前端刷新  
  - `GET /api/orders?tableId=<id>`  
    - 作用：根据桌台 ID 获取该桌台当前开放订单以及按批次分组的 `order_items` 明细  
  - `PATCH /api/orders/[id]`（可选，根据数据模型选用）：  
    - 用于加菜/减菜时更新既有订单明细；或者新增一条“加菜批次”，并在 `order_items` 中标记所属批次  
- DB：  
  - 现有结构：  
    - `orders`：记录订单基本信息、状态、金额等  
    - `order_items`：记录菜品明细（`order_id`, `menu_item_id`, `quantity`, `price` 等）  
  - 批次支持的建议方案：  
    - 在 `order_items` 表中增加一个 `batch_no`（或 `batch_index`）字段，整数型，表示该行所属的加菜批次；由后端在创建时按 `order_id` 范围内递增生成  
    - 修改 `db/schema.ts` 对应表定义并执行：  
      - `pnpm drizzle:generate && pnpm drizzle:push`  
  - 资金相关表（`transactions`）暂不扩展，“结账后记账”逻辑可在后续独立功能中实现  

## Workflow
1. 设计交互与批次显示方案（按现有 UI 限制）  
2. 更新 `db/schema.ts` 与迁移脚本，为 `order_items` 增加批次字段（如采用该方案）  
3. 实现 `app/api/orders` 相关路由：创建订单、查询桌台订单、更新加/减菜明细  
4. 在 `POSInterface` 中对接新 API：加载当前桌台订单与批次信息  
5. 调整前端状态结构：支持“按批次的购物车/订单视图”，实现加菜、减菜、清空本菜品逻辑  
6. 联调前后端，验证批次颜色与分组展示效果  
7. 更新文档与相关链接（`doc/agents/features/`、`doc/guides`）并在 PR 中说明

## Acceptance Criteria
- [ ] 用户在 POS 页面选择菜品并点击“加菜/下单”后，能在数据库 `orders` / `order_items` 中生成对应记录，包含桌台、菜品、数量与价格信息  
- [ ] 同一桌台多次加菜会在 UI 中按批次分组显示，每个批次的菜品独立展示，不会被合并到单一列表中  
- [ ] 批次间采用两种不同颜色或视觉风格（例如背景、边框或批次标签）加以区分，首次下单使用默认颜色，后续加菜使用另一种颜色  
- [ ] 点击“-”按钮能正确减少对应批次和菜品的数量，为 0 时自动移除该行；点击“垃圾桶”按钮能清空该菜品在该批次中的数量  
- [ ] 前端交互保持现有布局尺寸（包括主容器高度和右侧 `w-96` 宽度）不变，在桌台未选择时有清晰的引导文案  
- [ ] API 接口在参数错误或桌台不存在时返回合理错误响应（4xx/5xx），并在前端展示友好的错误提示（不影响整体布局）

## 任务清单（Tasks）

### Task 1: 设计批次模型与 DB 字段
**预计时间**: 1小时  
**依赖**: 无  

**AI 提示词**:  
你是一位资深的后端与数据库工程师，熟悉 Drizzle ORM 与 PostgreSQL。请在 easyFactu 项目中为点单加菜功能设计“批次”模型：在不破坏现有 `orders` / `order_items` 逻辑的前提下，为 `order_items` 增加表示批次的字段（例如 `batch_no`），并在 `db/schema.ts` 中完成定义、生成迁移（`pnpm drizzle:generate`）以及推送（`pnpm drizzle:push`）。请给出字段类型、默认值与索引建议，并考虑后续查询一个桌台的订单时如何按 `order_id` + `batch_no` 排序。完成后更新相关文档注释。必要时可参考 Drizzle 官方文档（use context7）。  

### Task 2: 实现订单创建与批次写入 API
**预计时间**: 2小时  
**依赖**: Task 1  

**AI 提示词**:  
你是一位资深的 Next.js + TypeScript 后端工程师，请在 `app/api/orders/route.ts` 中实现 `POST /api/orders` 路由，用于为指定桌台创建订单或加菜批次。使用 Drizzle ORM 操作 `orders` 与 `order_items` 表，根据请求体中的 `tableId` 与菜品数组创建记录，并为每一条 `order_items` 生成正确的 `batch_no`。注意：需要支持同一桌台多次加菜，新的批次应在已有批次最大值基础上递增。请添加基本参数校验（可以使用 `zod`），保证错误时返回合适的 HTTP 状态码。完成后，返回当前桌台的订单信息及按批次分组的明细列表。必要时 use context7 查询 Drizzle ORM 插入与事务示例。  

### Task 3: 实现按桌台查询订单与批次 API
**预计时间**: 1小时  
**依赖**: Task 2  

**AI 提示词**:  
你是一位熟悉 REST 设计与 Drizzle ORM 的工程师，请在 `app/api/orders/route.ts` 中实现 `GET /api/orders?tableId=<id>` 接口，返回指定桌台当前开放订单（`status = 'open'`）以及全部 `order_items`，并在响应 JSON 中按 `batch_no` 和创建时间排序与分组，方便前端直接渲染为“批次 + 菜品列表”的结构。请确保查询性能（合理使用索引），同时在桌台无订单时返回空列表而不是错误。  

### Task 4: 调整 POSInterface 购物车/订单状态结构
**预计时间**: 2小时  
**依赖**: Task 3  

**AI 提示词**:  
你是一位资深的前端工程师，熟悉 Next.js App Router 与 React hooks。请在 `components/pos-interface.tsx` 中，将当前基于 `cart: CartItem[]` 的购物车结构扩展为“按批次的订单视图”，例如 `batches: Array<{ batchNo: number; items: CartItem[] }>`，并保证：  
1）现有布局与尺寸（左侧菜单区域 + 右侧宽度 `w-96` 的订单卡片）保持不变；  
2）点击菜单卡片“加号”或“加菜”按钮时，会在当前“临时选中批次”中累加数量；  
3）提交时调用 `POST /api/orders`，并根据返回数据更新本地 `batches` 状态。  
请重用现有 UI 组件（Card、Badge、Button 等），不要扩大页面尺寸或增加全屏弹窗。  

### Task 5: 在 UI 中实现批次分组与两种配色
**预计时间**: 1.5小时  
**依赖**: Task 4  

**AI 提示词**:  
你是一位熟悉 Tailwind 与 UX 设计的前端工程师。请在 `components/pos-interface.tsx` 的“当前订单”区域中，将订单展示调整为：按批次分组的列表。第 1 批使用当前默认样式，第 2 批及之后使用另一种但风格统一的颜色（例如背景、边框或批次标签颜色略有区别），同时在每个批次前增加“第 N 批加菜”的小标题或分隔条。注意所有修改必须局限在现有订单卡片区域内部，不得改变整体布局的宽高与主容器的 Tailwind 类。  

### Task 6: 实现减菜与清空菜品逻辑（前后端联动）
**预计时间**: 1.5小时  
**依赖**: Task 4  

**AI 提示词**:  
你是一位全栈工程师，请在 `components/pos-interface.tsx` 中完善“-”与“垃圾桶”按钮的行为：  
1）“-” 按钮：将当前批次中对应菜品的数量减 1，减至 0 时移除该行；  
2）“垃圾桶”按钮：直接从当前批次中移除该菜品；  
3）在需要持久化到数据库的场景中，调用适当的 API（例如 `PATCH /api/orders/[id]` 或重新提交批次）同步更新 `order_items`。  
请保持 UI 尺寸不变，并为失败的网络请求提供轻量级错误提示（如 Toast 或顶部提示条），避免弹出全屏错误。  

### Task 7: 联调与文档更新
**预计时间**: 1小时  
**依赖**: Task 5, Task 6  

**AI 提示词**:  
你是一位负责交付质量的全栈工程师。请在完成前述实现后，联调前后端：  
1）验证在不同桌台、多次加菜、减菜、清空菜品的情况下，`orders` 与 `order_items` 中数据正确，批次号连续且排序正确；  
2）确保 POS 页面布局与尺寸与原先一致；  
3）根据 `doc/guides/nextjs.instructions.md` 与 `doc/guides/nextjs-tailwind.instructions.md` 的规范检查代码；  
4）在 `doc/agents/features/FEATURES.md` 或相关文档中增加本功能的链接说明，并在 PR 描述中附上关键截图。必要时使用 use context7 查阅 Next.js 与 Drizzle 最新实践。  

## Links
- Next.js 指南：`../../guides/nextjs.instructions.md`  
- Next.js + Tailwind 指南：`../../guides/nextjs-tailwind.instructions.md`  
- POS 点单页面：`components/pos-interface.tsx`、`app/pos/page.tsx`  
- 数据库 DDL：`drizzle/0000_workable_gamora.sql`

