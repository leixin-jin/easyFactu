# 结账与交易落库（transaction_backend）

- ID: transaction_backend
- Owner: TBD
- Status: completed

## Summary
为 POS 点单页面增加完整的“结账”后端流程：在用户点击“确认并打印”后，后端自动完成订单收款、交易流水落库与桌台状态更新，前端同步刷新订单状态与桌台列表，同时保持现有 UI 布局与尺寸不变，仅补充必要的结账交互与状态展示。

## Scope
- In:  
  - 前端：`components/pos-interface.tsx` 中与结账相关的状态与交互（结账弹窗、AA 模式、“确认并打印” 按钮行为），以及与桌台列表联动刷新，但不修改整体布局尺寸与菜单区域结构  
  - 后端：基于 `app/api/orders` 下已有接口，新增/扩展结账与交易相关的 API（建议使用 `app/api/transactions` 或 `app/api/orders/checkout` 等专用 Route Handler），遵循 Next.js Route Handlers 最佳实践  
  - 数据库：复用现有 `orders`、`order_items`、`restaurant_tables` 与 `transactions` 表结构（见 `drizzle/0000_workable_gamora.sql` / `0001_youthful_starhawk.sql`），在结账时正确更新订单状态（`open` → `paid`）、订单金额与关闭时间、桌台状态（`occupied` → `idle`）以及交易记录落库  
  - 功能：  
    - 整单结账：基于当前桌台的所有已落库批次与草稿批次，确认收款并生成一条或多条 `transactions` 收入记录  
    - AA 分单结账：支持仅对部分菜品（AA 选择项）生成对应的交易流水，并在后端保证金额计算与订单剩余金额的正确性（可分阶段实现，首版可只实现整单结账）  
    - 打印触发：在结账成功后触发前端打印逻辑（例如打开打印友好视图并调用 `window.print()`），不涉及具体物理打印机驱动配置  
- Out:  
  - 财务统计与报表（按日/周/月汇总 `transactions` 的 BI 报表）  
  - 会员/优惠券/复杂折扣体系，仅支持当前简单百分比折扣逻辑  
  - 真正的物理小票机驱动与串口/USB 通讯，仅在浏览器内触发打印行为  
  - 多币种、多税率场景（当前默认同一税率/币种，金额按欧元显示）  

## UX Notes
- 布局与尺寸：  
  - 保持 POS 页面整体布局与尺寸不变：主容器继续使用 `h-[calc(100vh-8rem)] flex gap-4`，右侧订单与结账区域继续保持现有宽度（例如 `w-96`），不新增全屏弹窗或改变卡片栅格列数  
  - 菜品分类与展示：继续沿用 `Tabs` + `Cards` 的现有网格布局，仅复用已存在的 `useMenuData` 数据，不调整图片尺寸与卡片尺寸（满足“不要修改 UI 页面大小，只需要完成菜品种类的显示”的要求）  
- 结账弹窗：  
  - 触发方式：点击现有底部“结账”按钮或 “AA” 按钮打开结账 Dialog，保持当前弹窗尺寸与大致布局，仅在弹窗内部补充必要的金额信息与提示文案  
  - “确认并打印”按钮：  
    - 点击后禁用按钮并展示加载状态（例如“处理中...”），避免重复提交  
    - 成功后自动关闭弹窗、清空本桌台本地购物车与 AA 选择、刷新当前桌台订单与桌台列表，并触发打印  
    - 失败时保持弹窗开启，展示错误 Toast 与错误提示文案，不清空用户输入  
- 打印体验：  
  - 首版可使用浏览器默认打印：在结账成功后打开一个包含订单摘要（菜品、数量、金额、折扣、支付方式、收款金额、找零）的新窗口/新路由，应用简单的打印样式，并调用 `window.print()`  
  - 打印 UI 本身在布局上尽量复用现有卡片与表格样式，避免新增大面积自定义布局  
- 桌台状态反馈：  
  - 结账成功后，对应桌台在 `/tables` 页应更新为 `idle` 状态，且金额清零  
  - POS 页面返回桌台列表后，用户可以直接看到该桌台已结账完成  

## API / DB
- API（建议方案）：  
  - `POST /api/orders/checkout`（或 `POST /api/transactions/checkout`，二选一）  
    - 作用：对指定桌台或订单执行结账，更新订单状态与金额，并写入交易流水  
    - 请求体（整单结账示例）：  
      ```json
      {
        "tableId": "<restaurant_table_id>", 
        "orderId": "<order_uuid>",
        "mode": "full", 
        "paymentMethod": "cash",
        "discountPercent": 10,
        "clientSubtotal": 120.0,
        "clientTotal": 108.0,
        "receivedAmount": 120.0,
        "changeAmount": 12.0
      }
      ```  
    - 请求体（AA 分单结账示例，可作为后续扩展）：  
      ```json
      {
        "tableId": "<restaurant_table_id>",
        "orderId": "<order_uuid>",
        "mode": "aa",
        "paymentMethod": "card",
        "aaItems": [
          { "menuItemId": "<menu_item_uuid>", "quantity": 1, "price": 12.5 },
          { "menuItemId": "<menu_item_uuid>", "quantity": 2, "price": 5.0 }
        ],
        "clientSubtotal": 22.5,
        "clientTotal": 20.25,
        "receivedAmount": 20.25,
        "changeAmount": 0
      }
      ```  
    - 后端逻辑要点：  
      - 通过 `tableId` 和/或 `orderId` 查询当前 `orders` / `order_items`，按最新数据库数据重新计算 `subtotal` / `discount` / `total`，不信任前端传入金额  
      - 对整单结账：  
        - 更新 `orders.status = 'paid'`，写入最终 `subtotal` / `discount` / `total` 与 `payment_method`、`closed_at = now()`  
        - 在 `transactions` 表插入一条记录：  
          - `type = 'income'`  
          - `category`：如 `"dine-in"` 或 `"restaurant"`  
          - `amount = total`  
          - `payment_method`：前端选择的支付方式  
          - `order_id`：关联 `orders.id`  
          - `description`：可记录桌台号、批次数量、支付备注等  
        - 更新 `restaurant_tables.status = 'idle'`，清空或重置与当前订单相关的金额字段  
      - 对 AA 分单结账（后续阶段）：  
        - 根据 `aaItems` 重新计算本次结账金额，并与订单剩余金额进行核对  
        - 生成一条或多条 `transactions` 记录，`amount` 为本次 AA 支付金额  
        - `orders` 可以保持为 `open` 状态，或增加部分支付标记（如新增字段，属于下一阶段扩展）  
      - 返回值：  
        - 成功时返回最新的 `order` 概要（或 `null`，当整单已结清时）、该桌台更新后的批次列表（用于刷新 POS）以及本次生成的 `transaction` 摘要  
  - 现有接口复用：  
    - `GET /api/orders?tableId=<id>`：结账成功后前端可调用一次，用于确保前端状态与后端保持一致  
    - `POST /api/orders`：继续负责加菜/批次新增，结账逻辑不与之混合  
    - `POST /api/orders/clear`：仍用于“清空订单/取消订单”，与“结账并记账”逻辑区分开  
- DB：  
  - 现有结构（节选自 `drizzle/0000_workable_gamora.sql` / `0001_youthful_starhawk.sql`）：  
    - `orders`：  
      - `status order_status`（`open` / `paid` / `cancelled`）  
      - `subtotal numeric(12, 2)`  
      - `discount numeric(12, 2)`  
      - `total numeric(12, 2)`  
      - `payment_method text`  
      - `created_at timestamp` / `closed_at timestamp`  
    - `order_items`：  
      - 与订单明细相关字段，`0001` 迁移中已增加 `batch_no` 支持按批次显示  
    - `restaurant_tables`：  
      - `status table_status`（`idle` / `occupied`）  
      - `number`、`area`、`amount` 等字段  
    - `transactions`：  
      - `type transaction_type`（`income` / `expense`）  
      - `category text`  
      - `amount numeric(12, 2)`  
      - `description text`  
      - `date date`  
      - `payment_method text`  
      - `order_id uuid`（外键关联 `orders.id`）  
  - 首版目标：在不修改现有 Schema 的前提下完成结账与交易落库；如后续需要增加字段（例如结账操作人、税率、service fee），需同步更新 `db/schema.ts` 并执行：  
    - `pnpm drizzle:generate && pnpm drizzle:push`  

## Workflow
1. 交互与数据流设计：梳理整单与 AA 结账的前后端数据流与状态变更  
2. 后端设计：在 `app/api` 中设计结账 Route Handler（路径与请求/响应模型）  
3. 数据库交互实现：使用 Drizzle 在结账 API 中实现订单状态更新与交易流水插入（使用数据库事务）  
4. 前端集成：在 `components/pos-interface.tsx` 中为“确认并打印”增加调用结账 API 的逻辑，并在成功后刷新订单与桌台状态  
5. 打印与 UX 微调：实现打印触发逻辑与打印友好的账单视图，保证 UI 尺寸不变  
6. 联调与回归：在真实/本地环境中验证多桌台、多批次、AA 与整单场景  
7. 文档更新与验收：更新相关文档与 `FEATURES` 索引，完成验收清单  

## Acceptance Criteria
- [x] 点击结账弹窗中的“确认并打印”按钮后，会调用后端结账 API，并在数据库中：  
  - 将对应订单的 `status` 更新为 `paid`（整单结账场景）  
  - 正确写入 `subtotal` / `discount` / `total` / `payment_method` / `closed_at`  
  - 在 `transactions` 表插入至少一条 `type = 'income'` 的记录，`amount` 等于订单实收金额，`order_id` 正确关联  
- [x] 结账成功后，对应桌台在 `restaurant_tables` 中状态更新为 `idle`，用户在 `/tables` 页重新加载后可以看到状态变化，金额已清空或更新为最新值  
- [x] POS 结账弹窗在整单结账成功后会自动关闭，并通过 Toast/提示提示“结账成功，已打印小票/可打印小票”；失败时不会清空用户填写内容并给出错误提示  
- [x] `components/pos-interface.tsx` 中主容器高度 `h-[calc(100vh-8rem)]`、右侧订单区域宽度与菜单网格列数保持不变，菜品类别与卡片展示与当前实现一致  
- [x] 同一桌台多次加菜与结账不会产生金额错乱：结账金额以数据库重新计算为准，前端显示的汇总金额与数据库 `orders` / `transactions` 一致  
- [x] （可选）在 AA 模式下，允许仅对部分菜品执行结账并生成对应的 `transactions` 记录，订单剩余部分仍保持为 `open`，可继续加菜或执行下一次结账  
- [x] 关键错误与异常（如订单不存在、已结账、金额不一致）会返回明确的错误码与错误信息，前端通过 Toast 或轻量提示展示给收银员  

## 任务清单（Tasks）

### Task 1: 梳理结账数据模型与场景
**预计时间**: 1小时  
**依赖**: 无  

**AI 提示词**:  
你是一位资深全栈工程师，请根据 `drizzle/0000_workable_gamora.sql` 与 `drizzle/0001_youthful_starhawk.sql` 的 DDL，以及 `app/api/orders` 现有实现，梳理“整单结账”与“AA 分单结账”涉及的核心数据模型与场景。  
输出：  
1）列出整单结账与 AA 结账分别需要读/写的表字段（`orders`、`order_items`、`restaurant_tables`、`transactions`）；  
2）给出结账状态流转图（文字描述即可），包括：下单 → 多次加菜 → 结账 → 桌台变为空闲；  
3）明确哪些金额必须由后端重新计算，不可直接信任前端。  
必要时使用 `use context7` 查阅 Next.js Route Handlers 与 Drizzle 事务的最佳实践。  

### Task 2: 设计结账 API 接口协议（后端）
**预计时间**: 1小时  
**依赖**: Task 1  

**AI 提示词**:  
你是一位熟悉 Next.js App Router 与 Drizzle 的后端工程师，请在 `app/api` 下设计一个用于结账的 Route Handler（建议路径为 `app/api/orders/checkout/route.ts` 或 `app/api/transactions/checkout/route.ts`）。  
要求：  
1）给出完整的接口设计（URL、HTTP 方法、Request/Response JSON 结构），分别覆盖“整单结账”和“AA 分单”的请求体；  
2）在 TypeScript 中定义对应的 Zod 校验 Schema；  
3）明确错误码与错误信息设计（例如：订单不存在、桌台不存在、订单已结账、金额不一致、并发冲突等）。  
请参考 `app/api/orders/route.ts` 与 `app/api/orders/clear/route.ts` 的风格，并在必要时使用 `use context7` 查阅 Next.js Route Handlers 文档。  

### Task 3: 实现结账 API 与交易落库（后端）
**预计时间**: 2小时  
**依赖**: Task 2  

**AI 提示词**:  
你是一位资深后端工程师，请在上一步设计的结账 Route Handler 中实现具体逻辑，使用 Drizzle 的事务能力完成：  
1）从 `orders` 与 `order_items` 中读取当前订单与明细，基于数据库数据重新计算 `subtotal` / `discount` / `total`；  
2）对整单结账：更新 `orders.status = 'paid'`、`closed_at = now()`、`payment_method` 等字段，并插入一条 `transactions` 记录（`type = 'income'`，`amount = total`，`payment_method` 为前端选择，`order_id` 关联当前订单）；  
3）更新 `restaurant_tables.status = 'idle'` 并同步相关金额字段；  
4）合理处理 AA 模式（可先留 TODO 或返回 501，后续再实现），避免与整单逻辑混淆；  
5）返回包含最新订单概要、批次列表与本次 `transaction` 摘要的 JSON。  
实现时请参考 `app/api/orders/route.ts` 中事务与金额处理方式，并使用 `use context7` 查阅 Drizzle 与 Next.js 最新文档。  

### Task 4: 前端集成结账 API 与状态刷新
**预计时间**: 2小时  
**依赖**: Task 3  

**AI 提示词**:  
你是一位负责 POS 前端的资深工程师，请在 `components/pos-interface.tsx` 中完成以下工作：  
1）找到当前结账弹窗与“确认并打印”按钮的实现（包括 `handleOpenCheckout` 与 `handleCheckout` 等函数）；  
2）在 `handleCheckout` 中调用新建的结账 API，传入必要参数（桌台 ID、订单 ID、支付方式、折扣、AA 模式标记、实收金额等），并根据返回结果：  
   - 更新 `currentOrder` 与 `batches`  
   - 清空本地 `cart`、AA 选择与输入  
   - 关闭结账弹窗  
3）在结账成功后调用一个新的打印触发函数（可在本组件内实现），在不改变整体布局尺寸的前提下展示打印信息或打开打印视图；  
4）所有界面修改必须保持现有 `h-[calc(100vh-8rem)]` 高度与菜单/订单区域宽度不变，仅在已有弹窗与区域内补充逻辑与提示文案。  
请参考现有的下单与清空 API 调用风格，并在需要时使用 `use context7` 查阅 Next.js Fetch 与客户端组件最佳实践。  

### Task 5: 打印视图与 AA 结账扩展
**预计时间**: 2小时  
**依赖**: Task 4  

**AI 提示词**:  
你是一位熟悉前端打印与 UX 的工程师，请基于已有数据完成：  
1）设计并实现一个适合打印的小票视图（可以是新的轻量组件或路由），展示桌台号、时间、菜品明细、数量、金额、折扣、支付方式、实收与找零；  
2）在结账成功后触发该视图并调用 `window.print()`，打印完成后自动关闭或返回 POS 主界面；  
3）在不改变主页面整体布局与尺寸的前提下完成上述逻辑；  
4）（可选扩展）为 AA 模式实现部分结账的打印内容：仅打印本次 AA 分单涉及的菜品与金额，并在 UI 中清晰标记为“AA 分单小票”。  
实现时请参考 Tailwind 打印媒体支持与 Next.js 相关文档，必要时使用 `use context7` 查阅 Next.js + Tailwind 的打印最佳实践。  

### Task 6: 联调、回归与文档更新
**预计时间**: 1.5小时  
**依赖**: Task 3, Task 4, Task 5  

**AI 提示词**:  
你是一位负责交付质量的全栈工程师，请在本地或测试环境中完成：  
1）针对不同桌台、多次加菜、多批次下单与整单/AA 结账等场景进行联调，验证 `orders` / `order_items` / `restaurant_tables` / `transactions` 中数据一致性；  
2）检查 POS 页面布局与尺寸是否与实现前保持一致（特别是主容器高度与左右区域宽度），菜单分类与菜品展示是否无回归；  
3）根据 `doc/guides/nextjs.instructions.md` 与 `doc/guides/nextjs-tailwind.instructions.md` 的规范审查代码质量；  
4）在 `doc/agents/features/FEATURES.md` 或相关文档中增加对本功能的引用/链接说明，并在 PR 描述中附上关键截图（结账前、结账后、打印视图）。  
必要时使用 `use context7` 查阅 Next.js 与 Drizzle 最新最佳实践。  

## Links
- Next.js 指南：`../../guides/nextjs.instructions.md`  
- Next.js + Tailwind 指南：`../../guides/nextjs-tailwind.instructions.md`  
- POS 点单页面：`components/pos-interface.tsx`  
- 订单相关 API：`app/api/orders/route.ts`、`app/api/orders/[id]/route.ts`、`app/api/orders/clear/route.ts`  
- 桌台相关 API：`app/api/restaurant-tables/route.ts`、`app/api/restaurant-tables/[id]/route.ts`  
- 菜品与分类 API：`app/api/menu-items/route.ts`  
- 数据库 DDL：`drizzle/0000_workable_gamora.sql`、`drizzle/0001_youthful_starhawk.sql`  
