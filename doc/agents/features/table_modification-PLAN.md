# 桌台增删与 API 完善（功能模板 · 任务驱动）

- ID: table_modification
- Owner: TBD
- Status: in-progress

## Summary
在保持桌台管理页面尺寸与布局不变的前提下，新增桌台增删入口与弹窗，并完善后端 API 将操作落库，确保桌台状态实时同步。

## Scope
- In: 桌台管理组件 `components/table-management.tsx`、相关 hooks；`app/api/restaurant-tables` 路由的新增 POST/DELETE 行为。
- Out: POS 点单流程、订单/支付逻辑、非桌台模块的 UI 版式调整。

## UX Notes
- 页面整体尺寸不变，右上角新增「增加桌台（+）」与「删除桌台（-）」按钮。
- 创建弹窗：中等宽度 Dialog，字段包含桌号（必填）、区域（可选）、容纳人数（必填正整数）；提交后保持页面尺寸不变。
- 删除弹窗：下拉选择目标桌台，提示需先结账再删除，操作结果通过 toast 反馈。

## API / DB
- API: `POST /api/restaurant-tables`（创建桌台，默认 idle）；`DELETE /api/restaurant-tables/[id]`（存在 open 订单返回 409）；`GET /api/restaurant-tables` 继续提供展示数据。
- DB: 复用 `restaurant_tables` 现有字段，无新增迁移；遵循 `db/schema.ts` 定义。

## Workflow
1. 设计 → 2. Schema/Migration → 3. UI → 4. API → 5. 联调 → 6. 种子/文档 → 7. 验收

## Acceptance Criteria
- [ ] 桌台管理页右上新增带 + / - 图标的「增加桌台」「删除桌台」按钮，未改变原有布局和尺寸。
- [ ] 创建弹窗校验桌号与容纳人数，提交成功后新桌台持久化到 `restaurant_tables` 并出现在列表。
- [ ] 删除弹窗可选择现有桌台，若存在 open 订单返回 409 并提示用户；删除成功后列表刷新。
- [ ] API 返回结构化 `error/code`，前端 toast 反馈；`useRestaurantTables.reload` 可拉取最新数据。
- [ ] 可观测性：API 失败时记录服务端日志，便于排查。

## 任务清单（Tasks）

### Task 1: 桌台管理页增加增删入口与弹窗
**预计时间**: 1 小时  
**依赖**: 无

**AI 提示词**:  
你是一位熟悉 Next.js App Router 与 Tailwind 的前端工程师。保持 `components/table-management.tsx` 的页面尺寸与栅格不变，在右上角新增「增加桌台（+）」和「删除桌台（-）」按钮。为两者各自添加 Dialog：创建弹窗包含桌号（必填）、区域（可选）、容纳人数（必填正整数），删除弹窗使用下拉选择桌台。成功/失败用 toast 提示，不要调整现有列表布局。必要时 use context7 查阅最新 Next.js + shadcn Dialog 示例。

### Task 2: 实现桌台新增/删除 API
**预计时间**: 1 小时  
**依赖**: Task 1

**AI 提示词**:  
你是一位资深全栈工程师。参考 `doc/guides/nextjs.instructions.md` 与 `doc/guides/nextjs-tailwind.instructions.md`，在 `app/api/restaurant-tables/route.ts` 添加 `POST`，校验桌号/容纳人数，避免重复桌号并默认 `status=idle`。在 `app/api/restaurant-tables/[id]/route.ts` 添加 `DELETE`，当桌台存在 open 订单时返回 409（含错误码），否则删除并返回被删记录。使用 Drizzle 与 `db/schema.ts`，必要时 use context7 获取最新 Next.js Route Handler 文档。

### Task 3: 联调与验证
**预计时间**: 0.5 小时  
**依赖**: Task 2

**AI 提示词**:  
你是一位 QA 倾向的前端工程师。联调新的增删桌台流程：创建后列表刷新并可在 POS 跳转，删除时验证存在 open 订单会提示阻止。检查弹窗/按钮未改变页面尺寸，toast 文案清晰。必要时使用 use context7 查阅 Next.js fetch/错误处理最佳实践。

## Links
暂无
