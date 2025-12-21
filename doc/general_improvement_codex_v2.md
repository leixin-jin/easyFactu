# General Improvement Notes (Codex v2)

基于 `doc/general_improvement_claude.md` 与 `doc/general_improvement_codex.md` 交叉整理的统一版本，聚焦一致性、可维护性与业务闭环。

---

## 一、需要优化的点（按优先级）

### 高优先级
- 结账流程交互需收敛：AA 结账逻辑分散在 `PosCheckoutDialog` 与 `pos-interface.tsx`，删除 AA 项会清空全部；建议统一到 `hooks/useCheckout.ts`，并补齐单项删除/数量编辑能力。
- 金额计算口径不一致：API 仍存在 `toFixed(2)` 手写逻辑；统一使用 `lib/money.ts`，重点处理 `app/api/orders/checkout/route.ts` 与 `app/api/daily-closure/utils.ts`。
- API contract 与类型定义不一致：`types/api.ts` 的 `CheckoutInput/CheckoutResponse/TransferOrderInput` 与实际路由字段不匹配，易导致前后端误用。
- 鉴权/权限覆盖缺失：多数页面与 API routes 未做鉴权，仅 `middleware.ts` 更新 session；需要补齐页面与敏感 API 的权限校验。
- 错误响应结构不统一：部分返回 `{ message }`，部分返回 `{ error, code }`，导致 `lib/api/fetcher.ts` 处理分支复杂化；需统一规范。
- 订单金额语义混乱：`orders.total`、`orders.totalAmount`、`orders.paidAmount` 语义不清，结账路由写入逻辑不一致，长期易导致对账偏差。
- 组件重复与目录分裂：`components/pos-interface.tsx` 与 `components/features/pos/PosInterface.tsx` 等重复存在，需归并避免维护分叉。

### 中优先级
- 数据获取方式不统一：已有 `lib/api`/`lib/queries`，但多个组件仍直接 `fetch`；需统一入口与错误处理。
- Mock 数据降级未受环境控制：`lib/mocks/index.ts` 未被使用，组件直接 fallback mock；需用环境开关控制。
- 桌台状态模型不一致：`idle/occupied` 与 UI 展示 `reserved/locked` 不匹配，需统一枚举与业务口径。
- 交易反结算直接删除流水：`app/api/transactions/[id]/reverse/route.ts` 直接删除记录，缺少审计痕迹；建议改为标记反冲与保留审计。
- 业务日期与时区处理不一致：`daily-closure/utils.ts` 使用 UTC，`lib/reports/time.ts` 使用本地时区，需统一日切策略。
- 日结功能仅完成预览/确认：历史列表、导出、调整 UI 未补齐；建议补齐列表分页、导出与差额调整入口。
- 报表维度与对比不足：缺少翻台率、时段分析、员工绩效（需员工模块）、同比/环比与多时段对比。
- 报表缓存可优化：`useReportsQuery` staleTime 为 30 秒，建议服务端聚合缓存与预计算热门报表。

### 低优先级
- 设置页未持久化：`components/settings-view.tsx` 仍是本地 state，需接入表与 API。
- 打印机配置缺失：当前依赖 `window.print()`；短期保持，长期考虑 ESC/POS。
- 头部搜索/通知按钮仍为空壳。
- 页面元数据仍为模板文案，建议替换为产品信息。
- 移动端体验欠佳：POS 小屏布局需专项优化，可评估 PWA。

---

## 二、未完善的功能模块

### 核心业务闭环
- 退款/作废流程：日结统计仍为占位，需完善交易模型与统计口径。
- 历史订单查询：仅支持当前 open 订单，需分页与筛选能力。
- 费用/支出管理：`transactions` 支持 `expense`，但缺少 API/UI 模块。
- 多支付方式/分笔支付：AA 结账会覆盖 `orders.paymentMethod`，无法保留多渠道支付记录。
- 菜单管理：缺少编辑/恢复/批量导入/图片上传。
- 桌台管理：缺少桌号/容量/区域编辑、预订/锁台、就餐人数与开台时长管理。
- 菜品备注：`order_items.notes` 未接入 POS 录入入口。

### 经营与运营
- 员工管理/权限体系：角色表与权限校验未落地。
- 库存管理：菜品无库存字段与出入库流程。
- 预约/排队、会员系统、多门店支持均未落地。
- 结算记录“补打发票”未实现。

### 日结与报表
- 日结历史/导出/调整在 UI 端未暴露（虽有部分 API）。
- 报表自定义时间范围与订单明细下钻不足。

---

## 三、测试与质量补强

- 覆盖率要求：`lib/money.ts`、`lib/order-utils.ts`（80%），`hooks/useCheckout.ts`（60%）。
- API 测试缺口：`orders/checkout`、`orders/transfer`、`daily-closures`、`reports/export` 等关键流程。
- UI 测试缺口：POS 与管理端核心操作缺少交互测试；`PosCheckoutDialog`、`reports-view.tsx` 等需补齐。
- Hook 测试缺口：`hooks/usePosOrder.ts`、`hooks/useTableTransfer.ts` 需补齐。

---

## 四、结构与类型整理

- 组件目录归并：统一迁移到 `components/features/`，避免根目录重复。
- API 客户端统一：将散落 `fetch` 调用迁移至 `lib/api` 与 `lib/queries`。
- 类型补齐：补充 `types/daily-closure.ts`、`types/reports.ts` 并统一 API contract。

---

## 五、建议实施节奏

1. **短期（1-2 周）**
   - AA 结账交互收敛与金额口径统一
   - API contract 与错误结构统一
   - 关键鉴权补齐
   - 关键路径测试补齐

2. **中期（1 个月）**
   - 日结历史/导出/调整与报表维度升级
   - 历史订单查询与退款/作废流程
   - 设置持久化与目录结构整理

3. **长期（3 个月+）**
   - 员工/权限与库存模块
   - 会员/预约/多门店
   - 移动端优化与 PWA 评估
