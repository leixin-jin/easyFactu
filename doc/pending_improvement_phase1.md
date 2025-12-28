# Phase 1 Pending Improvement: 强制统一 `{ data }` 包裹

- ID: pending-improvement-phase1
- Status: pending
- Owner: 待分配

## 目标
- 所有成功响应统一 `{ data }` 结构
- 客户端只依赖统一结构，不再兼容裸数据
- 测试与 mocks 同步更新，避免隐性兼容

## 范围
- In:
  - API 路由统一返回 `{ data }`，错误结构保持 `{ error, code, detail }`
  - `lib/api/fetcher.ts` 只读取 `payload.data`
  - 直接 `fetch` 的组件与 hooks 统一解包或改用 `fetcher`
  - MSW mocks 与单测断言统一 `{ data }`
- Out:
  - 不新增业务逻辑
  - 不修改 UI 布局与交互
  - 不改数据库 schema

## 任务清单
- [ ] 盘点所有 API 路由，确认返回结构（含 `/api/**/[id]`、`deleted`、`restore` 等分支）
- [ ] 统一 API 返回：
  - [ ] 将仍返回裸数据的路由改为 `jsonOk` 或显式 `{ data }`
  - [ ] 明确创建类接口状态码策略（是否保留 201，或改由 `withHandler` 支持返回 `NextResponse`）
- [ ] 更新 `lib/api/fetcher.ts`：
  - [ ] 移除 `payload?.data ?? payload` 兼容逻辑，仅返回 `payload.data`
  - [ ] 确认错误解析仍兼容 `{ error, code, detail }`
- [ ] 客户端调用迁移：
  - [ ] 直接 `fetch` 的组件/ hooks 改为解包 `data` 或改用 `fetcher`
  - [ ] 确认 toast/状态更新读取新结构
- [ ] 测试与 mocks 同步：
  - [ ] MSW handlers 返回 `{ data }`
  - [ ] 单测断言更新为 `json.data`
- [ ] 文档与验收：
  - [ ] 更新相关验收文档，注明破坏性变更
  - [ ] 添加扫描基线：`rg "fetch\\(" components hooks`

## 风险与回滚
- 风险：旧的裸数据读取会导致 UI 为空或 toast 文案缺失
- 回滚：保留 `fetcher` 兼容逻辑、或在 API 端临时双写 `{ data, ...old }`

## 验收标准
- [ ] 所有 API 成功响应均为 `{ data }`
- [ ] 客户端无裸数据读取（或明确解包）
- [ ] `fetcher` 只读取 `payload.data`
- [ ] MSW 与单测覆盖通过
