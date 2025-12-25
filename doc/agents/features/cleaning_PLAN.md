# 功能清理计划（Feature Cleanup Plan）

- ID: cleaning
- Owner: 开发团队
- Status: proposed

## Summary
移除项目规划文档中与'费用/支出管理'、'员工管理'、'库存管理'、'会员系统'、'多门店支持'相关的规划内容，保持文档精简，专注于核心POS业务功能。

> [!NOTE]
> **决策记录**：保留`transactionType`枚举中的`expense`类型，以备将来扩展使用。本次仅清理规划文档。

## Scope
- In: 
  - 文档中关于上述功能的规划描述
- Out: 
  - 不修改任何UI页面的大小和布局
  - 不影响现有已实现的功能
  - **保留`expense`枚举值和相关代码**（mock数据、类型定义、测试）

## UX Notes
本次清理不涉及任何UI更改，仅清理规划文档，用户界面和代码库保持不变。

## 现状分析

### 代码库调查结果

通过对代码库的全面搜索分析，确认以下功能**均未在代码中实现**，仅存在于规划文档中：

| 功能模块 | 代码实现状态 | 发现位置 |
|---------|-------------|---------|
| 费用/支出管理 | ❌ 未实现 | 仅在`transactionType`枚举中有`expense`类型，无对应API/UI |
| 员工管理 | ❌ 未实现 | 无相关代码 |
| 库存管理 | ❌ 未实现 | 无相关代码 |
| 会员系统 | ❌ 未实现 | 无相关代码 |
| 多门店支持 | ❌ 未实现 | 无相关代码 |

### 需要清理的文件

#### 文档清理（唯一任务）

**涉及文件**:
- [general_improvement_claude_v2.md](file:///Users/zhuyuxia/Documents/GitHub/easyFactu/doc/general_improvement_claude_v2.md)
  - 第272-277行: `8.2 费用/支出管理缺失` → 移除
  - 第398行: 待实现功能清单中的"费用/支出管理" → 移除
  - 第402行: 待实现功能清单中的"员工管理" → 移除
  - 第403行: 待实现功能清单中的"库存管理" → 移除
  - 第406行: 待实现功能清单中的"会员系统" → 移除
  - 第407行: 待实现功能清单中的"多门店支持" → 移除
  - 第427-430行: 长期规划中的相关条目 → 移除

#### 保留的代码（不修改）

以下代码将保留，以备将来扩展：

| 文件 | 位置 | 内容 |
|-----|------|------|
| [db/schema.ts](file:///Users/zhuyuxia/Documents/GitHub/easyFactu/db/schema.ts) | 第19行 | `expense`枚举值 |
| [lib/mocks/transactions.ts](file:///Users/zhuyuxia/Documents/GitHub/easyFactu/lib/mocks/transactions.ts) | 多处 | expense类型mock数据 |
| [types/api.ts](file:///Users/zhuyuxia/Documents/GitHub/easyFactu/types/api.ts) | 第184行 | expense类型定义 |
| [types/database.ts](file:///Users/zhuyuxia/Documents/GitHub/easyFactu/types/database.ts) | 第24行 | TransactionType |
| [app/api/__tests__/transactions.test.ts](file:///Users/zhuyuxia/Documents/GitHub/easyFactu/app/api/__tests__/transactions.test.ts) | 第389行 | expense测试用例 |

## API / DB

本次清理仅涉及文档，无数据库变更。

## Workflow
1. 文档清理 → 2. 验证构建 → 3. 代码审查

## Acceptance Criteria
- [ ] 文档中不再包含费用/支出管理、员工管理、库存管理、会员系统、多门店支持的规划内容
- [ ] 项目可正常构建（`pnpm build`通过）
- [ ] 所有现有测试通过（`pnpm test`通过）
- [ ] UI页面大小和布局保持不变
- [ ] `expense`枚举值及相关代码保持不变

## 任务清单（Tasks）

### Task 1: 清理规划文档
**预计时间**: 0.5小时
**依赖**: 无

**AI 提示词**:
```
你是一位资深的技术文档工程师。请更新 `/Users/zhuyuxia/Documents/GitHub/easyFactu/doc/general_improvement_claude_v2.md` 文件，移除以下功能的规划内容：

1. 第272-277行：删除整个"8.2 费用/支出管理缺失"章节
2. 第392-408行：从"待实现功能清单"表格中删除以下行：
   - 费用/支出管理
   - 员工管理
   - 库存管理
   - 会员系统
   - 多门店支持
3. 第426-431行：从"长期规划"列表中删除以下条目：
   - 员工/权限管理
   - 库存管理
   - 费用/支出管理
   - 多门店支持

注意：
- 保持文档结构和编号的完整性和连贯性
- 保留其他所有内容
- 使用中文输出
```

---

### Task 2: 验证构建和测试
**预计时间**: 0.5小时
**依赖**: Task 1

**AI 提示词**:
```
你是一位资深的DevOps工程师。请在 `/Users/zhuyuxia/Documents/GitHub/easyFactu` 目录下执行以下验证：

1. 运行 `pnpm build` 确保项目可正常构建
2. 运行 `pnpm test` 确保所有测试通过

如发现任何错误，请报告错误详情和建议的修复方案。
```

## Verification Plan

### Automated Tests
```bash
# 在项目根目录执行
pnpm build     # 确保构建成功
pnpm test      # 确保测试通过
```

### Manual Verification
1. 检查文档更新后的章节编号是否连贯
2. 确认代码库中`expense`相关代码未被修改
3. 确认UI页面无任何变化

## Links
- 相关文档: [general_improvement_claude_v2.md](file:///Users/zhuyuxia/Documents/GitHub/easyFactu/doc/general_improvement_claude_v2.md)
- 项目架构: [overall.md](file:///Users/zhuyuxia/Documents/GitHub/easyFactu/doc/overall.md)
