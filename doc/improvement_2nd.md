# POS 现状优化待办（第二轮）

基于当前代码与 `doc/pos_improvement.md` 方案/`doc/agents/features/pos_improvement-PLAN.md`，发现仍需优化的重点问题：

- **结账入口仍允许草稿自动下单**：`components/pos-interface.tsx:737-748` 中直接打开结账弹窗；`handleCheckout` 内在 `cart.length > 0` 时会隐式 POST `/api/orders`（同文件 535-559 行），与“有草稿不允许结账、不做隐式下单”的约束冲突，存在服务员不知情的入库风险。
- **AA 数量弹窗重复实现**：`components/pos-interface.tsx:897-972` 与 `components/PosCheckoutDialog.tsx:446-483` 维护两套 AA 数量对话框，共用同一状态，容易出现双弹窗或状态撕裂，需合并为单一组件/入口。
- **AA 列表交互错误**：在 `components/PosCheckoutDialog.tsx:278-299`，删除按钮调用 `onClearAAItems` 会清空全部 AA 选择而非单条；“修改数量”仅设置输入值不绑定目标/不弹出选择框，用户看不到变化，需改为逐项删除/编辑。
- **POSInterface 未按计划拆分逻辑 hook**：订单加载/提交/结账状态仍集中在 `components/pos-interface.tsx`，未抽离 `usePosOrder`、`useCheckout` 等 Hook，组件仍 1000+ 行，重复 fetch/金额计算/错误处理，维护和测试成本高。
- **金额与批次计算未完全复用 util**：`app/api/orders/checkout/route.ts:338-518` 等处继续手写金额 toFixed 及批次聚合，未统一使用 `lib/money.ts`/`lib/order-utils.ts`，可能与其他接口存在舍入或字段不一致风险，需收口到工具函数。
