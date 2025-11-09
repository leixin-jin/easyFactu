# <Feature Name>（功能模板 · 任务驱动）

- ID: <slug>
- Owner: <name>
- Status: proposed | in-progress | done

## Summary
一句话说明目标与业务价值。

## Scope
- In: 覆盖范围、页面、用户群
- Out: 明确不做的内容

## UX Notes
关键界面、交互与空状态。可附草图/设计稿链接。

## API / DB
- API: 列出端点与方法（示例：`POST /api/<slug>`）
- DB: 需要的表/字段变更；更新 `db/schema.ts` 并生成迁移
  - 生成与推送：`pnpm drizzle:generate && pnpm drizzle:push`
  - 如需种子：更新 `seed/` 并在 PR 中说明

## Workflow
1. 设计 → 2. Schema/Migration → 3. UI → 4. API → 5. 联调 → 6. 种子/文档 → 7. 验收

## Acceptance Criteria
- [ ] 条件A
- [ ] 条件B
- [ ] 可观测性（log / metrics）

## 任务清单（Tasks）
按“技术依赖优先、≤2小时/任务、独立可提交 PR”的原则拆分并排序任务。建议 3–8 个任务。

### 任务清单要求
- 独立可执行：每个任务可单独提交与回滚。
- 时间约束：控制在 2 小时内完成。
- 顺序与依赖：按技术依赖与业务优先级排序。
- 清晰命名：包含清晰标题与可复制的 AI 提示词。

### 提示词编写建议
- 开头定义角色：如“你是一位资深的[领域]工程师…”。
- 必要时在提示词中提供参考代码/接口定义。
- 明确涉及的项目/目录路径（前端在 `app/`, `components/`, `hooks/`, `lib/`；后端/API 在 `app/api/` 或 `db/`）。
- 复杂任务在提示词中加入关键字：`ultrathink`。
- 需要参考外部文档/库时加入关键字：`use context7`。

### 任务输出格式
将每个任务用以下结构编写，直接复制给Codex或者Claude Code可执行：

```markdown
### Task [N]: [任务标题]
**预计时间**: [X]小时
**依赖**: Task [M] 或 无

**AI 提示词**:
[可直接复制给 Claude Code 的完整提示词]
```

> 提示：若任务涉及数据库变更，请在任务提示词中明确：
> - 需修改的表/字段；同步更新 `db/schema.ts`
> - 生成与推送迁移命令：`pnpm drizzle:generate && pnpm drizzle:push`
> - 若需种子数据：更新 `seed/` 并说明导入方式

## Links
相关 Issue / PR / 设计稿 / 讨论记录

