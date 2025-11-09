# Waitlist
- ID: waitlist
- Owner: <owner>
- Status: proposed

## Summary
前厅等位队列：添加、叫号、过号、取消，支持人数与联系方式记录。

## Scope
- In: 新建/更新/完成等位；桌台就绪提醒；基本统计
- Out: 外呼短信网关集成（后续迭代）

## UX Notes
- 入口：Dashboard → 等位面板（支持搜索、筛选状态）
- 操作：添加（姓名/人数/手机号）→ 叫号 → 就座/取消 → 过号

## API / DB
- API
  - `POST /api/waitlist` 新增
  - `PATCH /api/waitlist/:id` 更新状态 `awaiting|called|seated|cancelled`
  - `GET /api/waitlist?status=active` 列表
- DB（Drizzle）
  - 表：`waitlist(id uuid pk, name text not null, party_size int not null, phone text, status text, notes text)`
  - 操作：更新 `db/schema.ts` → `pnpm drizzle:generate && pnpm drizzle:push`

## Workflow
1. 设计 → 2. Schema/Migration → 3. UI → 4. API → 5. 联调 → 6. 文档/种子 → 7. 验收

## Acceptance Criteria
- [ ] 可添加/编辑/叫号/过号/取消等位
- [ ] 列表实时刷新，状态切换正确
- [ ] 基础校验与错误提示

## Links
Issue/PR/设计稿链接
