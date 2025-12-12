# Phase 1: 基础重构（功能模板 · 任务驱动）

- ID: phase1-refactor
- Owner: Development Team
- Status: proposed

## Summary
对代码库进行基础重构，拆分大文件、提取重复代码、统一常量管理，为后续架构优化奠定基础。

## Scope
- In: 
  - `components/pos-interface.tsx` (600+ 行) 拆分
  - `components/finance-management.tsx` (800+ 行) 拆分
  - 错误码常量提取
  - Toast 提示封装
  - Mock 数据集中管理
- Out: 
  - 不修改现有 UI 页面布局和样式
  - 不引入新的外部依赖库
  - 不变更数据库 schema

## UX Notes
- 本阶段为纯代码重构，不涉及 UI 变更
- 保持所有现有功能正常运行
- 用户无感知的内部代码优化

## API / DB
- API: 不变更
- DB: 不变更

## Workflow
1. 错误码常量提取 → 2. Toast 封装 → 3. Mock 数据集中 → 4. pos-interface 拆分 → 5. finance-management 拆分 → 6. 验收测试

## Acceptance Criteria
- [ ] 所有大文件拆分后单文件行数 ≤ 200 行
- [ ] 错误码映射集中管理在 `lib/constants/` 目录
- [ ] Toast 提示通过统一 hook 调用
- [ ] Mock 数据集中在 `lib/mocks/` 目录
- [ ] `pnpm lint` 无错误
- [ ] `pnpm build` 构建成功
- [ ] 现有功能回归测试通过

## 任务清单（Tasks）

### Task 1: 错误码常量提取
**预计时间**: 1小时
**依赖**: 无

**AI 提示词**:
```
你是一位资深的 TypeScript 工程师，专注于代码重构和可维护性优化。

任务：从 `components/pos-interface.tsx` 中提取错误码映射常量。

具体要求：
1. 在 `lib/constants/` 目录下创建 `error-messages.ts` 文件
2. 将 `errorCodeToMessage` 对象移动到该文件
3. 添加完整的 TypeScript 类型定义
4. 在原文件中导入并使用提取后的常量
5. 确保导出方便其他模块复用

参考当前代码位置：`components/pos-interface.tsx` 第 35-50 行左右的 `errorCodeToMessage` 对象

输出格式：
- 新建文件：`lib/constants/error-messages.ts`
- 同时创建 `lib/constants/index.ts` 作为统一导出入口

保持 UI 页面一致，只做代码提取重构。运行 `pnpm lint` 和 `pnpm build` 确保无错误。
```

---

### Task 2: 业务常量提取
**预计时间**: 1小时
**依赖**: Task 1

**AI 提示词**:
```
你是一位资深的 TypeScript 工程师，专注于代码重构和可维护性优化。

任务：提取散落在各组件中的业务常量到统一位置。

具体要求：
1. 在 `lib/constants/` 目录下创建以下文件：
   - `table-status.ts`：桌台状态枚举（idle, occupied）
   - `order-status.ts`：订单状态枚举（open, paid, cancelled）
   - `payment-methods.ts`：支付方式常量
2. 从以下文件提取相关常量：
   - `components/table-management.tsx` 中的 `statusConfig`
   - `hooks/useRestaurantTables.ts` 中的 `TableStatus` 类型
3. 更新 `lib/constants/index.ts` 统一导出
4. 在原文件中导入并使用提取后的常量

use context7 查阅 TypeScript const 枚举最佳实践。

保持 UI 页面一致，只做代码提取重构。运行 `pnpm lint` 和 `pnpm build` 确保无错误。
```

---

### Task 3: Toast 提示统一封装
**预计时间**: 1.5小时
**依赖**: 无

**AI 提示词**:
```
你是一位资深的 React/TypeScript 工程师，专注于代码复用和 DRY 原则。

任务：封装统一的 Toast 提示 hook，减少各组件重复代码。

具体要求：
1. 在 `hooks/` 目录下创建 `useApiToast.ts`
2. 封装以下方法：
   - `success(title, description?)` - 成功提示
   - `error(title, description?)` - 错误提示
   - `fromApiError(error, fallbackTitle?)` - 从 API 错误自动提取信息
3. 基于现有的 `hooks/use-toast.ts` 进行封装
4. 选择以下一个组件进行改造示例：
   - `components/menu-management.tsx` 中的 toast 调用

参考现有代码：
- `hooks/use-toast.ts` - 基础 toast hook
- `components/pos-interface.tsx` - 大量 toast 调用示例

保持 UI 页面一致，只做代码封装重构。运行 `pnpm lint` 和 `pnpm build` 确保无错误。
```

---

### Task 4: Mock 数据集中管理
**预计时间**: 1.5小时
**依赖**: 无

**AI 提示词**:
```
你是一位资深的 TypeScript 工程师，专注于代码组织和可维护性。

任务：将散落在各组件中的 Mock 数据集中管理。

具体要求：
1. 创建 `lib/mocks/` 目录
2. 创建以下文件：
   - `lib/mocks/tables.ts` - 桌台 mock 数据
   - `lib/mocks/transactions.ts` - 交易记录 mock 数据
   - `lib/mocks/index.ts` - 统一导出
3. 从以下文件提取 mock 数据：
   - `components/pos-interface.tsx` 中的 `mockTables`
   - `components/table-management.tsx` 中的 `mockTables`
   - `components/finance-management.tsx` 中的 `mockTransactions`
4. 添加环境检测变量 `useMockData`
5. 在原文件中导入并使用集中后的 mock 数据

保持 UI 页面一致，只做代码提取重构。运行 `pnpm lint` 和 `pnpm build` 确保无错误。
```

---

### Task 5: PosReceiptPreview 组件拆分
**预计时间**: 1小时
**依赖**: Task 1

**AI 提示词**:
```
你是一位资深的 React/TypeScript 工程师，专注于组件化和代码可维护性。

任务：从 `pos-interface.tsx` 中拆分 `PosReceiptPreview` 组件。

具体要求：
1. 创建 `components/PosReceiptPreview.tsx` 文件
2. 将 `PosReceiptPreview` 组件及其相关类型移动到新文件
3. 包含组件内的 `<style jsx global>` 样式
4. 在 `pos-interface.tsx` 中导入并使用拆分后的组件
5. 确保 Props 类型定义完整导出

参考当前代码位置：`components/pos-interface.tsx` 文件末尾约 100 行

ultrathink - 仔细检查组件依赖和样式隔离。

保持 UI 页面完全一致，只做组件拆分。运行 `pnpm lint` 和 `pnpm build` 确保无错误。
```

---

### Task 6: pos-interface 业务逻辑提取
**预计时间**: 2小时
**依赖**: Task 1, Task 5

**AI 提示词**:
```
你是一位资深的 React/TypeScript 工程师，专注于代码重构和关注点分离。

ultrathink

任务：从 `pos-interface.tsx` 中提取业务逻辑到专用 hooks。

具体要求：
1. 创建 `hooks/usePosCart.ts`：
   - 购物车状态管理（cart, addToCart, updateQuantity, removeFromCart）
   - 从 POSInterface 组件中提取相关 useState 和方法
2. 创建 `hooks/usePosCheckoutFlow.ts`：
   - 结账流程逻辑（handleCheckout 主函数）
   - 打印状态管理（printData, isPrinting）
3. 在 `pos-interface.tsx` 中使用提取后的 hooks
4. 确保组件内 useState 数量减少

参考代码：
- `components/pos-interface.tsx` - 主组件，约 600 行
- `hooks/usePosOrder.ts` - 现有订单 hook 结构参考
- `hooks/useCheckout.ts` - 现有结账 hook 结构参考

目标：将 `pos-interface.tsx` 从 600+ 行减少到 300 行以内。

保持 UI 页面完全一致，只做逻辑提取。运行 `pnpm lint` 和 `pnpm build` 确保无错误。
```

---

### Task 7: finance-management Dialog 组件拆分
**预计时间**: 2小时
**依赖**: Task 3

**AI 提示词**:
```
你是一位资深的 React/TypeScript 工程师，专注于组件化和代码可维护性。

ultrathink

任务：拆分 `finance-management.tsx` 中的 Dialog 组件。

具体要求：
1. 创建 `components/finance/` 目录
2. 拆分以下 Dialog 组件为独立文件：
   - `ExpenseDialog.tsx` - 支出记录对话框
   - `ShiftDialog.tsx` - 班次管理对话框
   - `SettlementDialog.tsx` - 日结对话框
   - `InvoiceDialog.tsx` - 发票对话框
   - `RefundDialog.tsx` - 退款对话框
3. 每个 Dialog 组件应包含：
   - 完整的 Props 类型定义
   - 必要的状态和处理函数
   - `open` 和 `onOpenChange` props
4. 在 `finance-management.tsx` 中导入并使用拆分后的组件
5. 使用 Task 3 创建的 `useApiToast` hook

参考代码：
- `components/finance-management.tsx` - 约 800 行
- `components/PosCheckoutDialog.tsx` - Dialog 组件结构参考

目标：将 `finance-management.tsx` 从 800+ 行减少到 400 行以内。

保持 UI 页面完全一致，只做组件拆分。运行 `pnpm lint` 和 `pnpm build` 确保无错误。
```

---

### Task 8: 回归测试与文档更新
**预计时间**: 1小时
**依赖**: Task 1-7

**AI 提示词**:
```
你是一位资深的 QA 工程师和技术文档编写者。

任务：验证 Phase 1 重构结果并更新相关文档。

具体要求：
1. 运行验证命令：
   - `pnpm lint` - 检查代码规范
   - `pnpm build` - 确保构建成功
2. 手动验证以下页面功能正常：
   - `/pos` - POS 点单页面
   - `/finance` - 财务管理页面
   - `/tables` - 桌台管理页面
3. 更新 `AGENTS.md` 文件，添加新目录结构说明：
   - `lib/constants/` - 常量定义
   - `lib/mocks/` - Mock 数据
   - `components/finance/` - 财务模块组件
4. 在 `doc/agents/` 下创建 `phase1_completion_report.md`，记录：
   - 完成的任务列表
   - 代码行数变化统计
   - 遇到的问题和解决方案

保持文档简洁清晰，便于团队成员理解代码变更。
```

## Links
- 优化方案：`doc/opus_improve_plan.md`
- 编码规范：`doc/guides/nextjs.instructions.md`
- 样式规范：`doc/guides/nextjs-tailwind.instructions.md`
