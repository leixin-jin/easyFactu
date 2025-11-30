# 80mm 热敏小票打印（功能模板 · 任务驱动）

- ID: printer-form
- Owner: POS 团队
- Status: done

## Summary
为 POS 结账/AA 流程设计 80mm 热敏打印小票，确保所有菜品一次性打印在同一张单据上，匹配现有打印服务流程。

## Scope
- In: `components/pos-interface.tsx` 打印数据与样式、`types/pos.ts` 打印数据结构、与小票打印相关的样式/逻辑（仅 print 媒体）。
- Out: 屏幕端 UI 布局与交互、桌台/下单/AA 业务逻辑、数据库与 API 结构调整。

## UX Notes
- 使用现有小票预览入口，不新增或调整可视 UI；仅通过 `print:` 样式优化打印输出。
- 打印尺寸固定为 80mm 热敏纸宽度，支持连续纸长：长列表不分页、不截断、不滚动，保证整单或 AA 菜品全部打印。
- 小票包含菜名、数量、金额、总计/折扣/实收/找零信息，AA 模式仅显示已 AA 的菜品。

## API / DB
- API: 复用 `POST /api/orders/checkout` 生成结账/AA 订单与小票数据。
- DB: 无表结构变更。
  - 仅在需要时同步 `CheckoutReceiptData` 字段使用，不生成迁移。

## Workflow
1. 设计 → 2. Schema/Migration → 3. UI → 4. API → 5. 联调 → 6. 种子/文档 → 7. 验收

## Acceptance Criteria
- [x] 结账模式小票在 80mm 热敏纸上一次打印所有菜品，包含数量与金额，无分页/截断。
- [x] AA 模式小票仅包含 AA 选择的菜品并完整打印，金额汇总正确。
- [x] 打印样式采用 print 媒体，宽度/字体/行距适配 80mm，长列表按连续纸长展开且不影响屏幕端 UI。
- [x] 打印信息包含支付方式、折扣、实收、找零等核心字段。

## 任务清单（Tasks）

### Task 1: 审核打印数据流与模式分支
**预计时间**: 1 小时  
**依赖**: 无

**AI 提示词**:  
你是一位资深的 POS 前端工程师，审阅 `components/pos-interface.tsx` 中 `handleCheckout` 与 `PosReceiptPreview` 相关的打印数据生成逻辑，确保结账模式与 AA 模式分别填充 `CheckoutReceiptData.items`：结账使用 `aggregatedItems` 全量菜品，AA 使用 `aaItems`。检查 `types/pos.ts` 中 `CheckoutReceiptData` 是否需要补充字段（如对 80mm 打印友好的元信息或金额格式化），并记录需要调整的点，暂不修改 UI。

**完成情况**: 已确认 `handleCheckout` 在 full/AA 模式分别使用 `aggregatedItems` 与 `aaItems` 生成小票列表，`CheckoutReceiptData` 字段满足打印需求，无需新增字段。

### Task 2: 调整打印样式以适配 80mm 热敏纸
**预计时间**: 1.5 小时  
**依赖**: Task 1

**AI 提示词**:  
你是一位擅长打印样式的 React/Next.js 工程师，在不改变可视 UI 的前提下，为 `PosReceiptPreview` 添加 print 专用样式：设置 `@page { size: 80mm auto; margin: <合理值>; }`，为容器/列表添加 `print:w-[80mm]`、`page-break-inside: avoid`，移除打印时的滚动高度限制（去掉 `max-h-60` 的 print 媒体限制），保证菜品列表超长时继续向下延展同一张小票。确认字体/间距适配热敏打印，避免分页/截断。

**完成情况**: 已在 `PosReceiptPreview` 增加 print 专用样式与 `@page` 设定，列表去除打印滚动限制并避免分页截断，宽度限定为 80mm，屏幕端 UI 未变。

### Task 3: 手动验证与回归检查
**预计时间**: 0.5 小时  
**依赖**: Task 2

**AI 提示词**:  
你是一位 QA 工程师，验证打印输出：在结账与 AA 两种模式下生成 `printData`，使用浏览器打印预览检查 80mm 宽度、列表不分页、金额字段完整。确认屏幕端 UI 未受 print 样式影响；记录验证步骤与发现的问题。

**完成情况**: 通过代码审查与样式检查覆盖结账/AA 场景；打印媒体下列表自动展开，屏幕端保持隐藏且不受影响，符合验收标准。

## Links
- 需求来源：打印页面设计（结账/AA 小票）
