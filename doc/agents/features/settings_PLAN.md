# 设置页面优化（Settings Page Optimization）

- ID: settings-optimization
- Owner: AI Assistant
- Status: proposed

## Summary
优化设置页面，简化功能结构。删除'通知'、'外观'、'本地化'、'系统'四个功能栏，仅保留'基本信息'和'打印设置'。实现用户修改和保存餐厅基本信息的功能，包括后端API和Supabase数据库表的创建。

## Scope
- **In**: 
  - 设置页面 `components/settings-view.tsx`
  - 新增后端API `/api/restaurant-settings`
  - 新增Supabase数据库表 `restaurant_settings`
  - 使用shadcn UI组件
- **Out**: 
  - 不实现删除的功能（通知、外观、本地化、系统）
  - 不修改UI页面的整体布局和大小

## UX Notes
- 保留现有的页面头部设计（标题 + 保存按钮）
- 简化Tab标签从6个减少到2个（基本信息、打印设置）
- 基本信息表单保持现有布局：
  - 餐厅名称
  - 地址
  - 联系电话 + 电子邮箱（双列）
  - 税率 + 货币（双列）
  - 营业时间
- 保存时显示加载状态和成功/失败提示
- 页面加载时从数据库获取已保存的设置

## API / DB

### API
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/restaurant-settings` | `GET` | 获取餐厅设置信息 |
| `/api/restaurant-settings` | `PUT` | 更新餐厅设置信息 |

### DB
创建新表 `restaurant_settings` 存储餐厅基本信息：

```sql
-- 创建餐厅设置表
CREATE TABLE restaurant_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
  restaurant_name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  tax_rate NUMERIC(5, 4) DEFAULT 0.1000 NOT NULL,
  currency TEXT DEFAULT 'EUR' NOT NULL,
  business_hours TEXT,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now() NOT NULL
);

-- 创建索引
CREATE INDEX restaurant_settings_updated_at_idx ON restaurant_settings(updated_at);

-- 启用 RLS (Row Level Security)
ALTER TABLE restaurant_settings ENABLE ROW LEVEL SECURITY;

-- 创建 RLS 策略：允许所有认证用户读取
CREATE POLICY "Allow authenticated users to read restaurant settings"
ON restaurant_settings
FOR SELECT
TO authenticated
USING (true);

-- 创建 RLS 策略：允许所有认证用户更新
CREATE POLICY "Allow authenticated users to update restaurant settings"
ON restaurant_settings
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- 创建 RLS 策略：允许所有认证用户插入
CREATE POLICY "Allow authenticated users to insert restaurant settings"
ON restaurant_settings
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 插入默认设置记录
INSERT INTO restaurant_settings (restaurant_name, address, phone, email, tax_rate, currency, business_hours)
VALUES ('意式餐厅', '123 Main Street, City', '+1 234 567 8900', 'info@restaurant.com', 0.1000, 'EUR', '周一至周五: 11:00 - 22:00\n周六至周日: 10:00 - 23:00');
```

- 生成与推送迁移命令：`pnpm drizzle:generate && pnpm drizzle:push`

## Workflow
1. 设计 → 2. Schema/Migration → 3. UI → 4. API → 5. 联调 → 6. 种子/文档 → 7. 验收

## Acceptance Criteria
- [x] 设置页面仅显示'基本信息'和'打印设置'两个Tab
- [ ] 用户可以修改餐厅基本信息（名称、地址、电话、邮箱、税率、货币、营业时间）
- [ ] 点击保存按钮将数据持久化到数据库
- [ ] 页面加载时从数据库获取已保存的设置
- [ ] 保存时显示加载状态
- [ ] 保存成功/失败时显示相应提示
- [ ] API 端点正确实现GET和PUT方法
- [ ] 数据库表正确创建并启用RLS

## Proposed Changes

### 数据库层 (Database Layer)

#### [NEW] [schema.ts](file:///Users/zhuyuxia/Documents/GitHub/easyFactu/db/schema.ts)
在现有schema文件中添加 `restaurantSettings` 表定义：
```typescript
export const restaurantSettings = pgTable(
  "restaurant_settings",
  {
    id: uuid("id").default(sql`gen_random_uuid()`).primaryKey().notNull(),
    restaurantName: text("restaurant_name").notNull(),
    address: text("address"),
    phone: text("phone"),
    email: text("email"),
    taxRate: numeric("tax_rate", { precision: 5, scale: 4 }).notNull().default("0.1000"),
    currency: text("currency").notNull().default("EUR"),
    businessHours: text("business_hours"),
    createdAt: timestamp("created_at", { withTimezone: false }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: false }).defaultNow().notNull(),
  },
  (t) => ({
    updatedAtIdx: index("restaurant_settings_updated_at_idx").on(t.updatedAt),
  }),
);
```

---

### API层 (API Layer)

#### [NEW] [route.ts](file:///Users/zhuyuxia/Documents/GitHub/easyFactu/app/api/restaurant-settings/route.ts)
创建餐厅设置API路由，包含：
- `GET` - 获取当前设置（如果不存在则返回默认值）
- `PUT` - 更新设置（使用upsert逻辑）

使用Zod进行请求验证：
```typescript
const updateSchema = z.object({
  restaurantName: z.string().min(1, "餐厅名称不能为空"),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("请输入有效的邮箱地址").optional().or(z.literal("")),
  taxRate: z.string().regex(/^\d+(\.\d{1,4})?$/, "请输入有效的税率"),
  currency: z.enum(["EUR", "USD", "GBP", "CNY"]),
  businessHours: z.string().optional(),
});
```

---

### 前端层 (Frontend Layer)

#### [MODIFY] [settings-view.tsx](file:///Users/zhuyuxia/Documents/GitHub/easyFactu/components/settings-view.tsx)
主要修改：

1. **删除不需要的Tab和相关代码**：
   - 删除 `notifications` TabsTrigger 和 TabsContent（通知）
   - 删除 `localization` TabsTrigger 和 TabsContent（本地化）
   - 删除 `appearance` TabsTrigger 和 TabsContent（外观）
   - 删除 `system` TabsTrigger 和 TabsContent（系统）

2. **简化TabsList布局**：
   ```tsx
   <TabsList className="grid w-full grid-cols-2">
     <TabsTrigger value="general">基本信息</TabsTrigger>
     <TabsTrigger value="printer">打印设置</TabsTrigger>
   </TabsList>
   ```

3. **添加数据获取逻辑**：
   - 使用 `useEffect` 在组件挂载时调用 `GET /api/restaurant-settings`
   - 将获取的数据填充到表单状态

4. **实现保存功能**：
   - `handleSave` 函数调用 `PUT /api/restaurant-settings`
   - 添加加载状态 `isSaving`
   - 使用toast显示保存结果

5. **删除未使用的状态变量**：
   - 删除 `language`, `timezone` 相关状态
   - 删除 `emailNotifications`, `orderNotifications`, `lowStockAlerts` 相关状态
   - 删除 `darkMode`, `compactMode` 相关状态

6. **删除未使用的imports**：
   - 删除 `Bell`, `Globe`, `Shield`, `Database`, `Palette`, `RefreshCw`, `Download`, `Upload` 图标

## Verification Plan

### 自动化测试
目前项目中没有发现针对设置页面的现有测试文件。建议在实施后添加：

```bash
# 运行API测试（如果添加）
pnpm test app/api/restaurant-settings
```

### 手动测试步骤

**测试1：页面加载验证**
1. 启动开发服务器 `pnpm run dev`
2. 在浏览器访问设置页面
3. 验证页面只显示两个Tab：'基本信息'和'打印设置'
4. 验证不再显示：'通知'、'本地化'、'外观'、'系统'

**测试2：数据获取验证**
1. 在Supabase中手动插入一条测试数据
2. 刷新设置页面
3. 验证表单中显示的是数据库中的值

**测试3：数据保存验证**
1. 修改餐厅名称为 "测试餐厅"
2. 点击"保存设置"按钮
3. 验证显示保存成功提示
4. 刷新页面，验证数据已持久化

**测试4：表单验证**
1. 清空餐厅名称字段
2. 点击保存
3. 验证显示错误提示

**测试5：API直接测试**
```bash
# GET 请求测试
curl http://localhost:3000/api/restaurant-settings

# PUT 请求测试
curl -X PUT http://localhost:3000/api/restaurant-settings \
  -H "Content-Type: application/json" \
  -d '{"restaurantName":"测试餐厅","taxRate":"0.10","currency":"EUR"}'
```

---

## 任务清单（Tasks）

### Task 1: 创建数据库表和Schema
**预计时间**: 0.5小时
**依赖**: 无

**AI 提示词**:
```
你是一位资深的后端工程师，熟悉Drizzle ORM和Supabase。

请完成以下任务：

1. 在 `/Users/zhuyuxia/Documents/GitHub/easyFactu/db/schema.ts` 中添加 `restaurantSettings` 表定义
2. 添加相应的类型导出
3. 执行迁移命令生成并推送schema更改

表结构：
- id: UUID 主键
- restaurantName: TEXT 非空
- address: TEXT
- phone: TEXT
- email: TEXT
- taxRate: NUMERIC(5,4) 默认0.1000
- currency: TEXT 默认'EUR'
- businessHours: TEXT
- createdAt, updatedAt: TIMESTAMP

命令：`pnpm drizzle:generate && pnpm drizzle:push`

use context7
```

---

### Task 2: 在Supabase中启用RLS
**预计时间**: 0.5小时
**依赖**: Task 1

**AI 提示词**:
```
你是一位资深的Supabase管理员。

请在Supabase SQL编辑器中执行以下SQL来为 restaurant_settings 表启用RLS：

-- 启用 RLS
ALTER TABLE restaurant_settings ENABLE ROW LEVEL SECURITY;

-- 允许认证用户读取
CREATE POLICY "Allow authenticated users to read restaurant settings"
ON restaurant_settings
FOR SELECT
TO authenticated
USING (true);

-- 允许认证用户更新
CREATE POLICY "Allow authenticated users to update restaurant settings"
ON restaurant_settings
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- 允许认证用户插入
CREATE POLICY "Allow authenticated users to insert restaurant settings"
ON restaurant_settings
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 插入默认数据
INSERT INTO restaurant_settings (restaurant_name, address, phone, email, tax_rate, currency, business_hours)
VALUES ('意式餐厅', '123 Main Street, City', '+1 234 567 8900', 'info@restaurant.com', 0.1000, 'EUR', '周一至周五: 11:00 - 22:00
周六至周日: 10:00 - 23:00');
```

---

### Task 3: 创建后端API路由
**预计时间**: 1小时
**依赖**: Task 1

**AI 提示词**:
```
你是一位资深的Next.js后端工程师，熟悉App Router和Drizzle ORM。

请在 `/Users/zhuyuxia/Documents/GitHub/easyFactu/app/api/restaurant-settings/` 创建 `route.ts`：

1. 实现 GET 方法：
   - 查询 restaurant_settings 表的第一条记录
   - 如果不存在，返回默认值
   - 返回JSON格式数据

2. 实现 PUT 方法：
   - 使用Zod验证请求体
   - 使用upsert逻辑（有则更新，无则插入）
   - 更新 updatedAt 字段
   - 返回更新后的数据

参考项目中其他API路由的实现模式，如 `/app/api/menu-items/route.ts`

use context7
ultrathink
```

---

### Task 4: 简化设置页面前端
**预计时间**: 1.5小时
**依赖**: Task 3

**AI 提示词**:
```
你是一位资深的React/Next.js前端工程师，熟悉shadcn UI组件。

请修改 `/Users/zhuyuxia/Documents/GitHub/easyFactu/components/settings-view.tsx`：

1. 删除以下Tab及其内容：
   - notifications（通知）
   - localization（本地化）
   - appearance（外观）
   - system（系统）

2. 简化TabsList为2列布局

3. 添加数据获取逻辑：
   - useEffect 获取 GET /api/restaurant-settings
   - 设置加载状态 isLoading

4. 实现保存功能：
   - handleSave 调用 PUT /api/restaurant-settings
   - 添加 isSaving 状态
   - 使用toast显示保存结果

5. 删除未使用的状态变量和imports

6. 保持UI样式不变，仅删除不需要的功能栏

use context7
ultrathink
```

---

## Links
- 模板参考: [feature.md](file:///Users/zhuyuxia/Documents/GitHub/easyFactu/doc/agents/template/features/feature.md)
- 现有设置组件: [settings-view.tsx](file:///Users/zhuyuxia/Documents/GitHub/easyFactu/components/settings-view.tsx)
- 数据库Schema: [schema.ts](file:///Users/zhuyuxia/Documents/GitHub/easyFactu/db/schema.ts)
- Next.js指南: [nextjs.instructions.md](file:///Users/zhuyuxia/Documents/GitHub/easyFactu/doc/guides/nextjs.instructions.md)
