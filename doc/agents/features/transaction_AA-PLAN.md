# AA 分单结账（transaction_AA）

- ID: transaction_AA
- Owner: TBD
- Status: proposed

## Summary
在现有整单结账流程的基础上，为 POS 点单页面补全“AA 分单结账”能力：当用户在结账弹窗中选择 AA 模式并确认结账时，后端仅对被选中的菜品执行结账，删除对应的 `order_items` 记录，为本次 AA 收款写入一条带有 AA 标记的 `transactions` 收入流水；其他校验逻辑、打印体验与 UI 布局保持与整单结账方式一致。

## Scope
- In:  
  - 前端：  
    - `components/pos-interface.tsx` 中与结账相关的状态与交互，尤其是 `aaMode` / `aaItems` 状态管理、结账弹窗内“订单总结 + AA 分单”区域，以及“确认并打印”按钮在 AA 模式下的行为  
    - 仅在现有布局内补充逻辑：保持 POS 主容器高度 `h-[calc(100vh-8rem)]`、右侧订单/操作区域宽度（例如 `w-96`）与菜单栅格列数不变，不新增全屏弹窗或改变页面尺寸  
  - 后端：  
    - 基于既有的 `app/api/orders/checkout/route.ts`，在不破坏整单结账 (`mode = "full"`) 逻辑的前提下，实现 `mode = "aa"` 分支  
    - 在 `mode = "aa"` 下：  
      - 读取指定订单的全部 `order_items` 行，并根据前端传入的 `aaItems`（菜品 ID + 数量）计算本次 AA 结账的数据库端应收金额  
      - 对应地对 `order_items` 做减量/删除：对于被 AA 支付的菜品，将对应行的 `quantity` 减去已结账数量；若减完为 0，则删除该行  
      - 根据剩余 `order_items` 重新计算订单剩余金额，更新 `orders.subtotal` / `orders.discount` / `orders.total`，并视订单是否还有剩余菜品决定 `orders.status`（仍为 `open` 或变为 `paid`）  
      - 在 `transactions` 表插入一条 `type = 'income'` 的记录，`category` 或 `description` 中明确标识为 “AA 结账”，金额为本次 AA 结账的实收金额，`order_id` 关联到原订单  
      - 根据是否还有未结账菜品决定桌台状态：若订单已经全部结清，则将对应 `restaurant_tables.status` 更新为 `idle`，金额清零；否则保持为 `occupied`，并更新金额为剩余未结账金额  
  - 数据库：  
    - 复用现有 `orders` / `order_items` / `restaurant_tables` / `transactions` 表结构（见 `db/schema.ts` 与 `drizzle/` 现有迁移），不新增字段  
    - 所有 AA 结账逻辑在数据库事务中完成，保证在部分菜品结账过程中不会出现中间状态（如部分删除 `order_items` 但未成功写入 `transactions`）  
- Out:  
  - 不引入新的财务维度字段（如税率、服务费、操作员 ID 等），仍使用当前 `transactions` 结构  
  - 不扩展复杂定价策略（满减、优惠券、会员折扣），AA 场景下继续沿用整单所用的简单百分比折扣逻辑  
  - 不支持跨桌台 AA（如多个桌台一起 AA），仅针对单一桌台、单一订单执行分单结账  
  - 不修改菜单展示区域（菜品卡片、分类 Tabs）的布局尺寸，仅复用现有 `useMenuData` 数据与 UI

## UX Notes
- 布局与尺寸：  
  - POS 主页面整体布局与尺寸保持不变：  
    - 外层容器继续使用 `h-[calc(100vh-8rem)] flex gap-4`  
    - 左侧为菜单分类 + 菜品卡片区域，右侧为“当前订单 + 操作区域”  
  - 结账弹窗继续使用当前三栏布局：左侧订单明细、中间“订单总结 + AA 分单”、右侧金额与支付方式；仅在现有区域内补充逻辑，不改变弹窗宽高（如 `w-[80vw] max-w-[80vw] max-h-[calc(100vh-4rem)]`）  
- AA 模式交互：  
  - 触发方式：  
    - 用户点击底部操作区的 “AA” 按钮时：  
      - 打开结账 Dialog  
      - 将 `aaMode` 设为 `true`，清空上一次的 `aaItems`、已输入 AA 数量，并将已收金额重置为 0  
    - 用户点击 “结账” 按钮时：  
      - 打开结账 Dialog  
      - 将 `aaMode` 设为 `false`，AA 区域仅作为说明，不允许选菜  
  - 菜品选择：  
    - 中间栏的“订单总结”区域继续按菜品聚合展示“菜品 × 数量”，并在 `aaMode = true` 时允许点击每一行，将菜品加入 AA 分单  
    - 对于数量大于 1 的菜品，点击后弹出数量选择小窗（现有 `aaQuantityDialogOpen` + `aaQuantityTarget` 交互），用户可选择本次 AA 的数量（不超过剩余数量）  
    - 已加入 `aaItems` 的菜品在列表中以浅色高亮（如粉色边框/背景）标识，点击“清空”可清除本次所有 AA 选择  
  - 结账行为：  
    - 整单模式（`aaMode = false`）：  
      - 行为与当前实现一致：结清整桌订单，订单状态变为 `paid`，桌台变为 `idle`，并触发整单打印  
    - AA 模式（`aaMode = true`）：  
      - 点击“确认并打印”后，仅对 `aaItems` 中的菜品执行结账，计算应付金额与找零；剩余菜品仍保留在订单中，状态保持 `open`  
      - 前端结账弹窗在成功后关闭，右侧订单区域刷新为“剩余未结账菜品 + 金额”，底部操作区可继续发起下一次 AA 或整单结账  
      - 打印小票内容仅包含本次 AA 所选菜品与对应金额，并在小票上以文案标明“AA 分单结账”，不改变打印视图的整体版式  
- 错误与提示：  
  - 保持与整单结账一致的错误提示方式：使用 Toast 展示“金额不一致”“订单不存在”“AA 结账菜品数量超过剩余数量”等错误  
  - 在 AA 模式下，若用户未选择任何菜品就点击“确认并打印”，前端直接提示“请先选择要 AA 的菜品”，并阻止请求发出  

## API / DB
- 现状：  
  - 路由：`POST /api/orders/checkout`（`app/api/orders/checkout/route.ts`）  
  - 请求体校验：  
    - 使用 Zod 定义的 `checkoutBodySchema`，包含：  
      - `tableId: uuid`  
      - `orderId: uuid`  
      - `mode: "full" | "aa"`（当前 code 分支中 `mode = "aa"` 直接返回 501）  
      - `paymentMethod: string`  
      - `discountPercent?: number`  
      - `clientSubtotal: number`  
      - `clientTotal: number`  
      - `receivedAmount?: number`  
      - `aaItems?: { menuItemId: uuid; quantity: number; price: number }[]`  
  - 整单结账（`mode = "full"`）逻辑：  
    - 从 `orders` / `order_items` / `restaurant_tables` 中加载当前订单与明细，并根据数据库中的 `price` 与 `quantity` 重新计算 `dbSubtotal` 与 `calculatedTotal`  
    - 校验 `clientSubtotal` / `clientTotal` 与数据库计算结果是否一致（容差 `epsilon = 0.01`）  
    - 校验 `receivedAmount` 是否大于等于应付金额  
    - 在单个数据库事务中完成：更新 `orders` 为 `paid`、更新金额并设置 `closedAt`、插入一条 `transactions`（`category = "POS checkout"`）、将 `restaurant_tables` 标记为 `idle` 并清零金额，最后返回订单概要、批次明细、交易记录与桌台信息  
- 目标：完善 `mode = "aa"` 的实现，使其满足以下要求：  
  - 仅对 `aaItems` 指定的菜品执行收款与落库  
  - 对应的 `order_items` 记录减量或删除  
  - 为本次 AA 收款写入一条新的 `transactions` 记录，并在 `category` 或 `description` 中清晰标记为 AA 结账  
  - 保持整单结账模式的所有金额校验与错误处理逻辑不变  

- 请求体（AA 分单结账示例）：  
  ```json
  {
    "tableId": "<restaurant_table_id>",
    "orderId": "<order_uuid>",
    "mode": "aa",
    "paymentMethod": "card",
    "discountPercent": 0,
    "clientSubtotal": 36.0,
    "clientTotal": 36.0,
    "receivedAmount": 40.0,
    "aaItems": [
      { "menuItemId": "<menu_item_uuid>", "quantity": 1, "price": 12.5 },
      { "menuItemId": "<another_menu_item_uuid>", "quantity": 2, "price": 11.75 }
    ]
  }
  ```  

- `mode = "aa"` 实现要点：  
  - 基础校验：  
    - 要求 `aaItems` 存在且非空，否则返回 400（`AA_ITEMS_REQUIRED`）  
    - 校验 `paymentMethod` / `clientSubtotal` / `clientTotal` / `receivedAmount` 等字段有效性，与整单模式保持一致  
  - 从数据库读取并构建数据结构：  
    - 查询当前订单的全部 `order_items` 行，按 `createdAt` / `batchNo` 排序（与现有整单逻辑一致）  
    - 以 `menuItemId` 为键构建可变结构，用于分配本次 AA 要结账的数量：  
      - 对于每个 `aaItem`：  
        - 汇总该 `menuItemId` 在所有批次中的总数量，若总数量小于 `aaItem.quantity`，则返回 400（`AA_QUANTITY_EXCEEDS_ORDER`），并附带当前可用数量信息  
        - 按批次顺序“扣减”数量：例如有两行数量分别为 2 和 1，AA 请求数量为 2，则先从第一行减 2，若行数量为 0 则标记为待删除  
  - 金额计算与校验：  
    - 基于实际被扣减的行（含原始 `price` 与实际扣减数量），计算数据库端的 `aaDbSubtotal`  
    - 按照传入的 `discountPercent`（如有）计算本次 AA 的折扣金额与应付总额：`aaCalculatedTotal = aaDbSubtotal - aaDiscountAmount`  
    - 使用与整单结账相同的容差逻辑，校验：  
      - `clientSubtotal` 与 `aaDbSubtotal` 的差异是否在允许范围内  
      - `clientTotal` 与 `aaCalculatedTotal` 的差异是否在允许范围内  
    - 校验 `receivedAmount` 不小于 `aaCalculatedTotal`，并计算找零金额  
  - 更新 `order_items`：  
    - 在事务内，根据“扣减计划”对 `order_items` 表执行：  
      - 若某行的扣减数量等于其原有数量：直接删除该行  
      - 若某行仅部分数量被 AA 结账：更新该行的 `quantity = 原数量 - 扣减数量`  
    - 完成后再次查询该订单所有剩余 `order_items` 行，用于计算订单剩余金额与构建返回的批次结构  
  - 更新 `orders` 与 `restaurant_tables`：  
    - 计算剩余 `order_items` 的 `remainingSubtotal`，作为订单剩余金额基础  
    - 若 `remainingSubtotal > 0`：  
      - 保持 `orders.status = 'open'`，`closedAt` 继续为 `null`  
      - 设置 `orders.subtotal = remainingSubtotal`，`orders.discount` 与 `orders.total` 可简化为：  
        - 本阶段可将折扣视为针对每次结账单独计算，不对剩余部分继续持久化折扣；因此剩余订单可采用 `discount = 0`，`total = remainingSubtotal`  
      - 将对应桌台在 `restaurant_tables` 中保持为 `occupied`，并将 `amount` 字段更新为 `remainingSubtotal`  
    - 若 `remainingSubtotal = 0`（即本次 AA 实际结清了全部菜品）：  
      - 将 `orders.status` 更新为 `paid`，`orders.subtotal` / `discount` / `total` 记录为本次 AA 结账的最终金额（与整单结账一致），并设置 `closedAt = now()`  
      - 将 `restaurant_tables.status` 更新为 `idle`，`amount` 清零，`currentGuests` 与 `startedAt` 清空，与现有整单结账逻辑保持一致  
  - 写入 `transactions`：  
    - 插入一条新的收入记录：  
      - `type = 'income'`  
      - `category = 'POS checkout - AA'`（与整单使用的 `"POS checkout"` 区分开，方便后续报表）  
      - `amount = aaCalculatedTotal`  
      - `description = 'POS AA 结账 - 桌台 ' + table.number`  
      - `paymentMethod = 请求体中的 paymentMethod`  
      - `orderId = order.id`  
    - 同一订单的多次 AA 结账会产生多条 `transactions` 记录（每次一条），方便后续做细粒度统计  
  - 返回结构：  
    - 为保持与现有前端集成的一致性，返回结构建议与整单模式保持一致：  
      - `order`: 更新后的订单概要（若订单仍为 `open`，则金额为剩余部分；若已结清则为最终金额与 `paid` 状态）  
      - `batches`: 剩余 `order_items` 按批次分组后的结构（若已结清则为空数组）  
      - `transaction`: 本次 AA 结账对应的 `transactions` 记录摘要  
      - `table`: 当前桌台基础信息（`id` / `number`）  
      - `meta`: `{ receivedAmount, changeAmount, mode: "aa" }`，前端可用于打印与提示  

- Schema 与迁移：  
  - 不修改 `db/schema.ts` 中任何表的字段定义  
  - 不生成新的 Drizzle 迁移文件，本功能完全基于现有结构实现  

## Workflow
1. 复查现有整单结账实现与 AA 前端交互（`components/pos-interface.tsx` + `app/api/orders/checkout/route.ts`），梳理目前 `aaMode` 与 `aaItems` 的使用方式  
2. 设计并实现 `mode = "aa"` 分支下的 Zod 校验逻辑与错误码约定（如 AA 菜品数量超出订单、金额不一致等）  
3. 在 `app/api/orders/checkout/route.ts` 中实现 AA 模式的数据库事务逻辑：扣减/删除 `order_items`、更新 `orders` 和 `restaurant_tables`、写入标记为 AA 的 `transactions` 记录  
4. 在 `components/pos-interface.tsx` 中接入新的 AA 结账接口：在 AA 模式下发送 `mode = "aa"` 与 `aaItems`，并根据返回结果刷新当前订单与桌台列表，同时保持页面布局与尺寸不变  
5. 优化打印与用户反馈：AA 结账成功后仅打印所选菜品与金额，并添加 AA 说明文案；联调多次 AA + 整单结账的组合场景，确认金额与状态正确  
6. 更新相关文档与索引（如 `doc/agents/features/FEATURES.md`），标记 AA 结账功能已设计并可实施  

## Acceptance Criteria
- [ ] 在 AA 模式下点击“确认并打印”，前端会调用 `POST /api/orders/checkout`，请求体包含 `mode = "aa"` 与非空的 `aaItems` 数组  
- [ ] 对于一份包含多道菜品的订单：  
  - 仅被选中用于 AA 结账的菜品（及对应数量）在 `order_items` 中被扣减或删除，未选择的菜品仍然存在  
  - 订单剩余部分在数据库中仍为 `open` 状态，`orders.subtotal` / `orders.total` 与剩余 `order_items` 的金额一致  
  - 对应桌台在 `restaurant_tables` 中保持为 `occupied`，`amount` 字段更新为剩余未结账金额  
- [ ] 若用户通过 AA 模式将当前订单的所有菜品全部结清：  
  - `orders.status` 更新为 `paid`，金额与折扣字段与整单结账场景保持一致  
  - `order_items` 中不再有该订单的记录  
  - `restaurant_tables.status` 更新为 `idle`，金额清零，桌台状态在 `/tables` 页面刷新后正确展示  
- [ ] 每次 AA 结账都会在 `transactions` 表插入一条新的收入记录，`category = 'POS checkout - AA'` 或 `description` 中包含“AA 结账”字样，且 `amount` 等于本次 AA 实收金额，`order_id` 正确关联  
- [ ] `components/pos-interface.tsx` 中的结账 Dialog 在 UI 上保持与整单结账一致的布局与尺寸：三栏结构不变，主页面 `h-[calc(100vh-8rem)]` 与菜品展示区域宽高不变  
- [ ] 打印小票：  
  - 整单结账打印包含整桌所有菜品与金额（保持现有实现）  
  - AA 结账打印仅包含本次 AA 的菜品与金额，并在文案上明确标注为“AA 分单小票”或等效说明  
- [ ] 关键错误场景（如订单不存在、订单非 `open` 状态、AA 数量超出剩余数量、金额不一致）会返回明确的错误码与错误文案，前端通过 Toast 轻量提示，不影响主页面布局  

## 任务清单（Tasks）

### Task 1: 梳理 AA 结账数据流与边界场景
**预计时间**: 1小时  
**依赖**: 无  

**AI 提示词**:  
你是一位资深全栈工程师。ultrathink use context7。  
请阅读以下文件与文档：  
- `components/pos-interface.tsx`（AA 模式相关状态与交互）  
- `app/api/orders/route.ts` 与 `app/api/orders/checkout/route.ts`（订单创建与整单结账逻辑）  
- `db/schema.ts`（`orders` / `order_items` / `restaurant_tables` / `transactions` 结构）  
- `doc/agents/features/transaction_backend-PLAN.md`（整体结账方案）  
输出：  
1）分别列出“整单结账”和“AA 分单结账”涉及的读写表字段与主要状态流转；  
2）给出 AA 结账的主要边界场景（多次 AA、AA 后再整单、AA 数量超出剩余数量等）的文字说明；  
3）明确哪些金额必须以数据库为准计算，前端金额仅用于提示与幂等校验。  

### Task 2: 扩展结账 API Schema 与错误码，支持 `mode = "aa"`
**预计时间**: 1–1.5小时  
**依赖**: Task 1  

**AI 提示词**:  
你是一位熟悉 Next.js Route Handlers 与 Zod 的后端工程师。use context7。  
请在 `app/api/orders/checkout/route.ts` 中：  
1）完善 `checkoutBodySchema` 与 `aaItemInputSchema`，确保 `mode = "aa"` 时 `aaItems` 必须存在且非空，字段类型严格；  
2）补充/调整错误码设计，包含但不限于：`AA_ITEMS_REQUIRED`、`AA_QUANTITY_EXCEEDS_ORDER`、金额不一致等；  
3）保留现有 `mode = "full"` 分支逻辑不变，仅为后续 AA 实现提供健壮的输入校验与错误返回；  
4）参考 `doc/guides/nextjs.instructions.md` 对 Route Handlers 的最佳实践进行必要整理。  

### Task 3: 实现 `mode = "aa"` 的数据库事务逻辑（扣减 order_items + 写入 AA 交易）
**预计时间**: 2小时  
**依赖**: Task 2  

**AI 提示词**:  
你是一位资深后端工程师。ultrathink use context7。  
请在 `app/api/orders/checkout/route.ts` 中实现 `mode = "aa"` 分支，使用 Drizzle 事务完成：  
1）从 `orders` / `order_items` / `restaurant_tables` 中读取当前订单与明细，按菜品 ID 与批次构建用于扣减的结构，并基于数据库价格计算 `aaDbSubtotal` 与 `aaCalculatedTotal`；  
2）对每个 `aaItem` 执行安全的数量扣减：数量完全匹配时删除对应 `order_items` 行，部分匹配时更新 `quantity`；  
3）根据剩余 `order_items` 计算订单剩余金额，更新 `orders` 的金额字段与状态（`open` 或 `paid`），并更新桌台状态与金额；  
4）向 `transactions` 插入一条新的收入记录，`category = 'POS checkout - AA'` 且 `description` 中包含“AA 结账”；  
5）返回更新后的订单概要、剩余批次、当前桌台信息与本次 `transaction` 摘要。  
实现过程中，请严格依赖数据库计算金额，并为出现并发/状态异常时返回合适的错误码与信息。  

### Task 4: 前端接入 AA 结账 API 与打印逻辑
**预计时间**: 2小时  
**依赖**: Task 3  

**AI 提示词**:  
你是一位负责 POS 前端的资深工程师。ultrathink use context7。  
请在 `components/pos-interface.tsx` 中：  
1）在 `handleCheckout` 中根据 `aaMode` 决定调用结账 API 时的 `mode` 字段（`"full"` 或 `"aa"`），并在 `aaMode = true` 时将 `aaItems` 映射为请求体中的 `aaItems`；  
2）调整金额计算逻辑：  
   - 整单模式下，继续使用现有 `subtotal` / `discount` / `total` 计算；  
   - AA 模式下，`clientSubtotal`/`clientTotal` 仅基于 `aaItems` 的金额（现有 `aaSubtotal` / `checkoutSubtotal` 已具备基础）；  
3）根据结账响应更新前端状态：  
   - 整单模式：保持当前“订单清空 + 桌台状态刷新”的行为；  
   - AA 模式：根据返回的 `order` / `batches` 更新当前订单与批次列表，保留桌台选择，但清空本次 `aaItems` 与收款输入；  
4）调整打印数据构建逻辑：AA 模式下打印仅包含 `aaItems` 的菜品与金额，并在小票上增加“AA 分单小票”文案；整单模式保持现有行为不变；  
5）确保所有 UI 修改仅发生在现有结账 Dialog 与右侧订单区域内部，不改变主容器高度与左右布局宽度。  

### Task 5: 联调、多次 AA 场景验证与文档更新
**预计时间**: 1.5小时  
**依赖**: Task 3, Task 4  

**AI 提示词**:  
你是一位负责交付质量的全栈工程师。use context7。  
请在本地或测试环境中完成以下工作：  
1）验证下列场景：  
   - 单次 AA（结账部分菜品，订单仍为 `open`）  
   - 多次 AA（多次对同一桌台执行 AA，`transactions` 中产生多条 AA 收入记录）  
   - 先多次 AA、最后整单结账的组合场景  
2）在每个场景下检查数据库中 `orders` / `order_items` / `restaurant_tables` / `transactions` 的数据一致性与金额正确性；  
3）确认 POS 页面主布局与结账 Dialog 在视觉上与实现前保持一致，菜单分类与菜品展示无回归；  
4）根据 `doc/guides/nextjs.instructions.md` 与 `doc/guides/nextjs-tailwind.instructions.md` 自查代码风格；  
5）更新 `doc/agents/features/FEATURES.md` 或相关文档，为本功能添加索引条目，并在 PR 描述中附上关键截图（AA 前后订单状态、transactions 截图、AA 打印小票）。  

## Links
- Next.js 指南：`../../guides/nextjs.instructions.md`  
- Next.js + Tailwind 指南：`../../guides/nextjs-tailwind.instructions.md`  
- POS 点单页面：`components/pos-interface.tsx`、`app/pos/page.tsx`  
- 订单相关 API：`app/api/orders/route.ts`、`app/api/orders/checkout/route.ts`  
- 桌台相关 API：`app/api/restaurant-tables/route.ts`  
- 数据库 Schema：`db/schema.ts`  
- 结账后端总体方案：`doc/agents/features/transaction_backend-PLAN.md`  

