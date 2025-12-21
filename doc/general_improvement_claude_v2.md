# easyFactu POS 系统优化与待完善功能清单 v2

> 整合 Codex 与 Claude 分析结果，按优先级与模块分类，聚焦一致性、可维护性和业务闭环。

---

## 一、架构与代码质量（高优先级）

### 1.1 API Contract 与类型定义不一致

**问题**：
- `types/api.ts` 中 `CheckoutInput`/`CheckoutResponse`/`TransferOrderInput` 与实际接口字段不匹配
- 涉及文件：`app/api/orders/checkout/route.ts`、`app/api/orders/transfer/route.ts`

**影响**：前后端类型不同步，易导致运行时错误

**建议**：
- 统一 API 响应结构为 `{ data?, error?, code? }`
- 使用 Zod schema 生成 TypeScript 类型，确保前后端一致

### 1.2 错误响应结构不统一

**现状**：
- 部分接口返回 `{ message }`
- 部分返回 `{ error, code }`
- `lib/api/fetcher.ts` 期望统一结构

**建议**：
- 定义标准错误响应格式
- 完善 `lib/constants/error-messages.ts` 错误码覆盖

### 1.3 组件重复与目录分裂

**问题**：
| 根目录组件 | features 目录组件 | 状态 |
|-----------|------------------|------|
| `components/pos-interface.tsx` | `components/features/pos/PosInterface.tsx` | 重复 |
| `components/PosMenuPane.tsx` | `components/features/pos/PosMenuPane.tsx` | 重复 |
| `components/table-management.tsx` | `components/features/tables/TableManagement.tsx` | 重复 |

**建议**：
- 统一迁移至 `components/features/` 目录
- 根目录组件仅保留 re-export 或直接删除
- 目标结构：
```
components/
├── features/
│   ├── pos/           # ✅ 已整理
│   ├── tables/        # ✅ 已整理
│   ├── menu/          # ✅ 已整理
│   ├── daily-closure/ # ✅ 已整理
│   ├── reports/       # 待迁移 reports-view.tsx
│   └── settings/      # 待迁移 settings-view.tsx
├── shared/            # 跨模块共享组件
└── ui/                # shadcn 基础组件
```

### 1.4 数据获取方式不统一

**现状**：
- `lib/api/client.ts` 与 `lib/queries/` 已封装
- 部分组件仍直接 `fetch`：
  - `components/features/pos/PosInterface.tsx`
  - `components/features/tables/TableManagement.tsx`
  - `components/features/menu/MenuManagement.tsx`

**建议**：所有 API 调用统一走 `api` 客户端或 TanStack Query hooks

---

## 二、认证与安全（高优先级）

### 2.1 认证/权限覆盖不完整

**现状**：
- 仅 `app/dashboard/page.tsx` 做了 Supabase 校验
- 其他页面（`app/pos/page.tsx`、`app/menu/page.tsx`）未做鉴权
- 所有 API routes 未做权限校验
- `middleware.ts` 仅更新 session

**建议**：
- 增加角色表（admin/manager/staff）
- 敏感操作（日结确认、报表导出、交易反结算）增加权限校验
- 统一在 middleware 或 API 层做鉴权

### 2.2 输入校验

**现状**：
- 后端使用 Zod 校验 ✅
- 前端表单校验不完整

**建议**：
- 统一使用 `react-hook-form` + `zod` 前端校验
- 金额输入增加范围限制

---

## 三、POS 模块优化（高优先级）

### 3.1 订单金额语义混乱

**问题**：
- `db/schema.ts` 中 `orders.total`、`orders.totalAmount`、`orders.paidAmount` 语义不清
- `app/api/orders/checkout/route.ts` 不同场景写入不同含义

**影响**：长期导致对账/报表偏差

**建议**：
- 明确字段语义并添加注释
- 统一使用 `lib/money.ts` 工具函数计算金额
- 待统一位置：
  - `app/api/orders/checkout/route.ts` - 结账金额计算
  - `app/api/daily-closure/utils.ts` - 日结金额聚合

### 3.2 AA 结账交互优化

**现状**：
- ✅ 已修复：结账前检查草稿批次
- ⚠️ 待优化：
  - AA 数量选择弹窗逻辑分散在 `PosCheckoutDialog` 和 `pos-interface.tsx`
  - 删除 AA 项时 `onClearAAItems` 会清空全部而非单条

**建议**：
```typescript
// hooks/useCheckout.ts 中增强
removeAaItem: (id: string) => void  // ✅ 已实现
editAaItemQuantity: (id: string, quantity: number) => void  // 需要增强
```

### 3.3 多支付方式/分笔支付

**问题**：AA 结账会覆盖 `orders.paymentMethod`，无法记录单一订单内多种支付方式

**建议**：考虑增加 `order_payments` 表记录分笔支付明细

### 3.4 菜品备注未接入

**问题**：`order_items.notes` 字段存在但 POS UI 没有录入入口

**涉及文件**：
- `components/features/pos/PosMenuPane.tsx`
- `components/features/pos/PosOrderSidebar.tsx`

---

## 四、日结功能优化（中优先级）

### 4.1 日结报告导出

**现状**：
- ✅ 已实现：日结预览、确认生成报告
- ❌ 未实现：日结报告导出（PDF/Excel）
- API 已有 `app/api/daily-closures/[id]/export/route.ts`，但 UI 未暴露

**建议**：参考 `app/api/reports/export/route.ts` 实现前端导出功能

### 4.2 历史日结查询

**现状**：
- 仅支持当前区间预览
- 无历史日结列表查看功能

**建议**：
- 增加 `GET /api/daily-closures` 分页查询
- 前端增加历史日结列表页面

### 4.3 日结差额调整

**现状**：
- 后端 `dailyClosureAdjustments` 表已设计
- API 已有 `app/api/daily-closures/[id]/adjustments/route.ts`
- 前端 UI 未实现差额调整输入

**建议**：
- 在日结确认前增加差额调整表单
- 支持现金盘点差异、手续费等调整项

### 4.4 退款/作废统计缺失

**问题**：`app/api/daily-closure/route.ts` 与 `app/api/daily-closures/confirm/route.ts` 中 refund/void 固定返回 0

**建议**：补完交易模型与统计口径

### 4.5 业务日期与时区处理不一致

**问题**：
- `app/api/daily-closure/utils.ts` 使用 `toISOString()` 生成业务日（UTC）
- `lib/reports/time.ts` 使用本地时区

**影响**：易出现日切偏差

**建议**：统一时区处理策略

---

## 五、报表功能增强（中优先级）

### 5.1 报表数据维度

**现状**：
- ✅ 已实现：营业额趋势、热销菜品、支付方式占比
- ❌ 未实现：
  - 桌台翻台率统计
  - 时段销售分析（午市/晚市）
  - 员工绩效统计（需先实现员工模块）

### 5.2 报表自定义时间段与钻取

**问题**：`components/reports-view.tsx` 仅支持固定粒度周期

**建议**：
- 增加自定义时间范围选择
- 支持订单明细下钻
- 增加同比/环比数据对比

### 5.3 报表缓存优化

**现状**：`useReportsQuery` staleTime 为 30 秒

**建议**：
- 可延长至 1-2 分钟
- 增加服务端聚合缓存
- 考虑定时预计算热门报表

---

## 六、桌台管理优化（中优先级）

### 6.1 桌台状态与 UI 不一致

**问题**：
- `db/schema.ts`/`lib/constants/table-status.ts` 仅支持 `idle/occupied`
- `components/dashboard-content.tsx` 展示了 `reserved/locked`

**建议**：对齐状态模型，扩展支持预订/锁台状态

### 6.2 桌台编辑与预订缺失

**现状**：仅支持创建/删除/手动改状态

**缺失功能**：
- 桌号/容量/区域编辑
- 预订/锁台管理
- 就餐人数与开台时长管理

---

## 七、菜单管理优化（中优先级）

### 7.1 菜单编辑与上下架不足

**现状**：仅支持新增与软删除

**缺失功能**：
- 菜品编辑
- 恢复已删除菜品
- 批量导入
- 图片上传

---

## 八、交易与财务（中优先级）

### 8.1 交易反结算缺少审计痕迹

**问题**：`app/api/transactions/[id]/reverse/route.ts` 直接删除 `transactions` 和 `transaction_items`

**影响**：影响报表可追溯性

**建议**：改为软删除或增加反结算记录

### 8.2 费用/支出管理缺失

**问题**：`transactions` 支持 `expense` 类型，但没有对应 API/UI

**建议**：增加 `components/features/finance` 模块

---

## 九、Mock 与环境控制（中优先级）

**问题**：
- `lib/mocks/index.ts` 的 `useMockData` 未被使用
- 组件直接 fallback 到 mock，生产环境下易掩盖真实故障

**建议**：增加环境开关控制 mock 数据降级策略

---

## 十、设置功能落地（低优先级）

### 10.1 设置项持久化

**现状**：`components/settings-view.tsx` 仅保存在本地 state

**需要实现**：
- 设置数据表设计（`settings` 或 `restaurant_config`）
- 设置 CRUD API
- 前端对接真实数据

### 10.2 打印机配置

**现状**：打印使用 `window.print()` 浏览器原生

**建议**：
- 短期：保持现状
- 长期：考虑接入 ESC/POS 打印协议

---

## 十一、用户体验优化（低优先级）

### 11.1 加载状态

**待优化**：
- 结账按钮增加 loading 状态
- 日结确认增加进度提示

### 11.2 移动端适配

**现状**：基础响应式布局，POS 界面在小屏幕体验欠佳

**建议**：
- POS 增加移动端专用布局
- 考虑 PWA 支持

### 11.3 占位功能未落地

- 头部搜索与通知按钮未绑定业务逻辑
- 结算记录补打发票按钮被禁用
- 元数据仍为 Next.js 模板文案

---

## 十二、测试覆盖率提升

### 12.1 当前覆盖要求

| 文件 | 覆盖率要求 |
|------|-----------|
| `lib/money.ts` | 80% |
| `lib/order-utils.ts` | 80% |
| `hooks/useCheckout.ts` | 60% |

### 12.2 待增加测试

**API 路由测试**：
- `app/api/orders/checkout/route.ts`
- `app/api/orders/transfer/route.ts`
- `app/api/daily-closure/route.ts`
- `app/api/daily-closures/confirm/route.ts`
- `app/api/daily-closures/[id]/export/route.ts`
- `app/api/reports/route.ts`
- `app/api/reports/export/route.ts`

**组件测试**：
- `components/reports-view.tsx`
- `components/PosCheckoutDialog.tsx`

**Hook 测试**：
- `hooks/usePosOrder.ts`
- `hooks/useTableTransfer.ts`

---

## 十三、类型定义整理

**建议增加**：
- `types/daily-closure.ts` - 日结相关类型
- `types/reports.ts` - 报表相关类型

---

## 十四、性能优化

### 14.1 查询优化

**问题**：`GET /api/orders` 一次加载全部 order_items

**建议**：历史订单查询增加分页

### 14.2 Bundle 优化

**建议**：
- 检查 `recharts` 按需引入
- 考虑 `date-fns` tree-shaking

---

## 十五、待实现功能清单

| 功能模块 | 优先级 | 状态 | 备注 |
|---------|--------|------|------|
| 退款/作废流程 | 高 | ❌ | 日结中 refund/void 固定返回 0 |
| 历史订单查询 | 高 | ❌ | 仅支持当前 open 订单 |
| 日结导出 | 中 | ❌ | API 已有，UI 未暴露 |
| 日结差额调整 | 中 | ❌ | 表已设计，UI 未实现 |
| 费用/支出管理 | 中 | ❌ | 无对应 API/UI |
| 菜品编辑 | 中 | ❌ | 仅支持新增/删除 |
| 桌台编辑/预订 | 中 | ❌ | 仅支持创建/删除 |
| 菜品备注录入 | 中 | ❌ | 字段存在，UI 未接入 |
| 员工管理 | 中 | ❌ | 当前无员工概念 |
| 库存管理 | 中 | ❌ | 菜品无库存字段 |
| 设置持久化 | 低 | ❌ | 仅本地 state |
| 预约/排队 | 低 | ❌ | 桌台无预约状态 |
| 会员系统 | 低 | ❌ | 无客户表 |
| 多门店支持 | 低 | ❌ | 单店架构 |

---

## 总结

### 短期（1-2 周）
- 统一 API 响应结构与类型定义
- 清理重复组件
- 完善 AA 结账交互
- 提升测试覆盖率

### 中期（1 个月）
- 实现退款/作废流程
- 历史订单查询
- 日结导出与差额调整 UI
- 设置功能落地
- 统一数据获取方式

### 长期（3 个月+）
- 员工/权限管理
- 库存管理
- 费用/支出管理
- 移动端优化
- 多门店支持
