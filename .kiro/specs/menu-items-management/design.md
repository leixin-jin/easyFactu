# Design Document: 菜单编辑与上下架优化

## Overview

本设计在现有菜单管理系统基础上扩展，新增菜品编辑、上下架管理、批量导入和图片上传功能。设计遵循现有代码架构，使用 Next.js App Router、Drizzle ORM、TanStack Query 和 shadcn/ui。

### 设计原则

1. **增量扩展**: 复用现有 `menuItems` 表结构，不新增数据库表
2. **API 一致性**: 遵循现有 API 错误处理和响应格式
3. **UI 一致性**: 保持页面布局不变，通过 Dialog/Sheet 实现新交互
4. **类型安全**: 使用 Zod 进行运行时校验，TypeScript 提供编译时类型检查

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React)                          │
├─────────────────────────────────────────────────────────────────┤
│  MenuManagement.tsx                                              │
│  ├── EditMenuItemDialog (编辑弹窗)                               │
│  ├── DeletedMenuItemsSheet (已下架抽屉)                          │
│  ├── BatchImportDialog (批量导入弹窗)                            │
│  └── ImageUpload.tsx (图片上传组件)                              │
├─────────────────────────────────────────────────────────────────┤
│                    TanStack Query Hooks                          │
│  lib/queries/use-menu.ts                                         │
│  ├── useMenuQuery (现有)                                         │
│  ├── useUpdateMenuItem (新增)                                    │
│  ├── useDeletedMenuQuery (新增)                                  │
│  ├── useRestoreMenuItem (新增)                                   │
│  ├── useBatchImportMenuItems (新增)                              │
│  └── useUploadMenuImage (新增)                                   │
├─────────────────────────────────────────────────────────────────┤
│                      API Client                                  │
│  lib/api/client.ts                                               │
│  api.menuItems.update / listDeleted / restore / batchImport / uploadImage
├─────────────────────────────────────────────────────────────────┤
│                    API Routes (Next.js)                          │
│  app/api/menu-items/                                             │
│  ├── [id]/route.ts          PUT (编辑)                           │
│  ├── [id]/restore/route.ts  POST (恢复上架)                      │
│  ├── deleted/route.ts       GET (已下架列表)                     │
│  ├── batch/route.ts         POST (批量导入)                      │
│  └── upload/route.ts        POST (图片上传)                      │
├─────────────────────────────────────────────────────────────────┤
│                    Database (Drizzle ORM)                        │
│  db/schema.ts - menuItems 表                                     │
├─────────────────────────────────────────────────────────────────┤
│                    Supabase Storage                              │
│  bucket: menu-images (公开读取)                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### API Endpoints

#### PUT /api/menu-items/[id] - 编辑菜品

```typescript
// Request
interface UpdateMenuItemInput {
  name?: string;        // 英文名称，1-120字符
  nameEn?: string;      // 中文名称，0-120字符
  category?: string;    // 分类，1-120字符
  price?: number;       // 价格，正数，最多2位小数
  description?: string; // 描述，0-500字符
  image?: string;       // 图片URL，0-512字符
}

// Response 200
interface MenuItemResponse {
  id: string;
  name: string;
  nameEn: string;
  category: string;
  price: number;
  description: string | null;
  image: string | null;
  available: boolean;
}

// Error Responses
// 400: { error: "Invalid request body", detail: ZodError }
// 404: { error: "Menu item not found" }
// 409: { error: "Menu item already exists in this category", code: "MENU_ITEM_EXISTS" }
```

#### GET /api/menu-items/deleted - 获取已下架菜品

```typescript
// Response 200
interface DeletedMenuListResponse {
  items: MenuItemResponse[];
}
// 按 updatedAt 降序排列
```

#### POST /api/menu-items/[id]/restore - 恢复上架

```typescript
// Response 200
interface MenuItemResponse { /* 同上 */ }

// Error Responses
// 400: { error: "Invalid menu item id" }
// 404: { error: "Menu item not found or not deleted" }
// 409: { error: "Menu item already exists in this category", code: "MENU_ITEM_EXISTS" }
```

#### POST /api/menu-items/batch - 批量导入

```typescript
// Request
interface BatchImportInput {
  items: Array<{
    name: string;
    nameEn?: string;
    category: string;
    price: number;
    description?: string;
    image?: string;
  }>;
  skipExisting?: boolean; // 默认 false
}

// Response 200
interface BatchImportResponse {
  total: number;
  created: number;
  skipped: number;
  errors: Array<{
    index: number;
    name: string;
    reason: string;
  }>;
}

// Error Responses
// 400: { error: "Invalid request body", detail: ZodError }
// 400: { error: "Batch size exceeds limit", detail: "Maximum 100 items allowed" }
// 409: { error: "Duplicate items found", detail: string[] } // 当 skipExisting=false
```

#### POST /api/menu-items/upload - 图片上传

```typescript
// Request: multipart/form-data
// - file: File (jpeg/png/webp/gif, ≤5MB)

// Response 200
interface UploadImageResponse {
  url: string; // 公开访问 URL
}

// Error Responses
// 400: { error: "No file provided" }
// 400: { error: "Invalid file type", detail: "Allowed: jpeg, png, webp, gif" }
// 400: { error: "File too large", detail: "Maximum 5MB allowed" }
// 500: { error: "Upload failed", detail: string }
```

### React Components

#### ImageUpload.tsx

```typescript
interface ImageUploadProps {
  value?: string;           // 当前图片 URL
  onChange: (url: string | null) => void;
  disabled?: boolean;
}

// 功能：
// - 拖拽/点击上传
// - 客户端校验（类型、大小）
// - 上传进度显示
// - 预览已上传图片
// - 清空按钮
```

#### EditMenuItemDialog

```typescript
interface EditMenuItemDialogProps {
  item: MenuItemResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

// 功能：
// - 预填充表单数据
// - 使用 ImageUpload 组件
// - 表单校验与错误显示
// - 提交后刷新列表
```

#### DeletedMenuItemsSheet

```typescript
interface DeletedMenuItemsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRestore: () => void;
}

// 功能：
// - 显示已下架菜品列表
// - 恢复上架按钮
// - 空状态处理
```

#### BatchImportDialog

```typescript
interface BatchImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

// 功能：
// - CSV 文件上传
// - 解析预览（前10条）
// - 校验结果显示
// - 跳过已存在选项
// - 导入结果统计
```

### TanStack Query Hooks

```typescript
// lib/queries/use-menu.ts 新增

export function useUpdateMenuItem() {
  // PUT /api/menu-items/[id]
  // onSuccess: invalidate menuKeys.all
}

export function useDeletedMenuQuery() {
  // GET /api/menu-items/deleted
  // queryKey: [...menuKeys.all, "deleted"]
}

export function useRestoreMenuItem() {
  // POST /api/menu-items/[id]/restore
  // onSuccess: invalidate menuKeys.all
}

export function useBatchImportMenuItems() {
  // POST /api/menu-items/batch
  // onSuccess: invalidate menuKeys.all
}

export function useUploadMenuImage() {
  // POST /api/menu-items/upload
  // 返回上传后的 URL
}
```

## Data Models

### 数据库表（复用现有）

```typescript
// db/schema.ts - menuItems 表
{
  id: uuid,
  name: text,           // 英文名称
  nameEn: text | null,  // 中文名称
  category: text,       // 分类
  price: numeric(12,2), // 价格
  description: text | null,
  image: text | null,   // 图片 URL
  available: boolean,   // true=上架, false=下架
  createdAt: timestamp,
  updatedAt: timestamp,
}

// 现有索引
// - menu_items_category_idx (category)
// - menu_items_name_idx (name)

// 建议新增索引（可选，提升下架列表查询性能）
// - menu_items_available_updated_idx (available, updatedAt DESC)
```

### Supabase Storage 配置

```sql
-- 创建 menu-images bucket（公开读）
INSERT INTO storage.buckets (id, name, public)
VALUES ('menu-images', 'menu-images', true)
ON CONFLICT (id) DO NOTHING;

-- RLS 策略
CREATE POLICY "public read menu-images"
ON storage.objects FOR SELECT
USING (bucket_id = 'menu-images');

CREATE POLICY "authenticated upload menu-images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'menu-images' AND auth.role() = 'authenticated');

CREATE POLICY "authenticated update menu-images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'menu-images' AND auth.role() = 'authenticated');

CREATE POLICY "authenticated delete menu-images"
ON storage.objects FOR DELETE
USING (bucket_id = 'menu-images' AND auth.role() = 'authenticated');
```

### 类型定义扩展

```typescript
// types/api.ts 新增

export interface UpdateMenuItemInput {
  name?: string;
  nameEn?: string;
  category?: string;
  price?: number;
  description?: string;
  image?: string;
}

export interface BatchImportInput {
  items: Array<{
    name: string;
    nameEn?: string;
    category: string;
    price: number;
    description?: string;
    image?: string;
  }>;
  skipExisting?: boolean;
}

export interface BatchImportResponse {
  total: number;
  created: number;
  skipped: number;
  errors: Array<{
    index: number;
    name: string;
    reason: string;
  }>;
}

export interface UploadImageResponse {
  url: string;
}

export interface DeletedMenuListResponse {
  items: MenuItemResponse[];
}
```



## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: 编辑操作数据一致性

*For any* 有效的菜品编辑请求，更新后的菜品数据应与请求中的字段值完全一致，且 `updatedAt` 时间戳应大于编辑前的值。

**Validates: Requirements 1.2, 1.5**

### Property 2: 名称冲突检测

*For any* 菜品编辑或恢复操作，如果目标名称与同分类下其他上架菜品重复，系统应返回 409 状态码和 `MENU_ITEM_EXISTS` 错误码。

**Validates: Requirements 1.3, 3.4, 7.3**

### Property 3: 输入校验错误响应

*For any* 无效的请求参数（空名称、负价格、超长字符串等），系统应返回 400 状态码和包含具体字段错误的响应体。

**Validates: Requirements 1.4, 5.5, 7.1**

### Property 4: 下架操作状态变更

*For any* 上架状态的菜品，执行下架操作后，该菜品的 `available` 应为 `false`，且不应出现在主菜单列表中。

**Validates: Requirements 2.1**

### Property 5: 恢复操作状态变更

*For any* 下架状态的菜品，执行恢复操作后，该菜品的 `available` 应为 `true`，且应出现在主菜单列表中。

**Validates: Requirements 3.3**

### Property 6: 已下架列表排序

*For any* 已下架菜品列表，列表应按 `updatedAt` 降序排列，即第 i 项的 `updatedAt` 应大于等于第 i+1 项。

**Validates: Requirements 3.2**

### Property 7: 分类计数一致性

*For any* 菜品操作（新增、编辑、下架、恢复、批量导入），操作后各分类的计数应等于该分类下 `available=true` 的菜品数量。

**Validates: Requirements 2.2, 3.5, 6.1, 6.2, 6.3, 6.4, 6.5**

### Property 8: 批量导入统计一致性

*For any* 批量导入操作，返回的统计信息应满足：`total = created + skipped + errors.length`。

**Validates: Requirements 4.6**

### Property 9: 批量导入跳过逻辑

*For any* 启用 `skipExisting=true` 的批量导入，如果导入项与已存在菜品同名同分类，该项应被跳过且计入 `skipped` 计数。

**Validates: Requirements 4.4**

### Property 10: 批量导入重复检测

*For any* 未启用 `skipExisting` 的批量导入，如果存在与已有菜品同名同分类的项，系统应返回 409 错误并列出所有重复项。

**Validates: Requirements 4.5**

### Property 11: 批量导入事务原子性

*For any* 批量导入操作，如果任一项插入失败，整个导入应回滚，数据库状态应与导入前一致。

**Validates: Requirements 4.7**

### Property 12: 图片类型校验

*For any* 图片上传请求，只有 MIME 类型为 `image/jpeg`、`image/png`、`image/webp`、`image/gif` 的文件应被接受，其他类型应返回 400 错误。

**Validates: Requirements 5.2**

### Property 13: 图片上传 URL 有效性

*For any* 成功的图片上传，返回的 URL 应以 Supabase Storage 公开 URL 前缀开头，且 URL 应可公开访问。

**Validates: Requirements 5.4**

### Property 14: 404 错误响应

*For any* 针对不存在菜品 ID 的请求（编辑、删除、恢复），系统应返回 404 状态码。

**Validates: Requirements 7.2**

### Property 15: 错误响应格式一致性

*For any* API 错误响应，响应体应包含 `error` 字段（字符串类型），可选包含 `detail` 和 `code` 字段。

**Validates: Requirements 7.5**

## Error Handling

### 错误码定义

| 场景 | HTTP 状态码 | 错误码 | 错误信息 |
|------|------------|--------|----------|
| JSON 解析失败 | 400 | - | Invalid JSON body |
| 参数校验失败 | 400 | - | Invalid request body |
| 文件类型无效 | 400 | INVALID_FILE_TYPE | Invalid file type |
| 文件过大 | 400 | FILE_TOO_LARGE | File too large |
| 批量导入超限 | 400 | BATCH_SIZE_EXCEEDED | Batch size exceeds limit |
| 菜品不存在 | 404 | - | Menu item not found |
| 菜品未下架 | 404 | - | Menu item not found or not deleted |
| 名称冲突 | 409 | MENU_ITEM_EXISTS | Menu item already exists in this category |
| 批量导入重复 | 409 | DUPLICATE_ITEMS | Duplicate items found |
| 上传失败 | 500 | - | Upload failed |
| 数据库错误 | 500 | - | Failed to [operation] menu item |

### 错误日志

所有 500 错误应记录完整错误堆栈：
```typescript
console.error(`${method} ${path} error`, err);
```

## Testing Strategy

### 测试框架

- **单元测试**: Vitest + React Testing Library
- **属性测试**: fast-check (需新增依赖)
- **API 测试**: MSW (Mock Service Worker)

### 测试文件结构

```
__tests__/
├── api/
│   ├── menu-items-update.test.ts      # PUT /api/menu-items/[id]
│   ├── menu-items-deleted.test.ts     # GET /api/menu-items/deleted
│   ├── menu-items-restore.test.ts     # POST /api/menu-items/[id]/restore
│   ├── menu-items-batch.test.ts       # POST /api/menu-items/batch
│   └── menu-items-upload.test.ts      # POST /api/menu-items/upload
├── components/
│   ├── ImageUpload.test.tsx
│   ├── EditMenuItemDialog.test.tsx
│   ├── DeletedMenuItemsSheet.test.tsx
│   └── BatchImportDialog.test.tsx
└── properties/
    └── menu-items.property.test.ts    # 属性测试
```

### 属性测试配置

```typescript
// vitest.config.ts 中配置
test: {
  // 属性测试需要更多迭代
  testTimeout: 30000,
}

// 属性测试示例
import * as fc from 'fast-check';

describe('Menu Items Properties', () => {
  it('Property 8: 批量导入统计一致性', () => {
    fc.assert(
      fc.property(
        fc.array(menuItemArbitrary, { minLength: 1, maxLength: 100 }),
        fc.boolean(),
        async (items, skipExisting) => {
          const result = await batchImport({ items, skipExisting });
          return result.total === result.created + result.skipped + result.errors.length;
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### 单元测试与属性测试分工

| 测试类型 | 覆盖内容 |
|---------|---------|
| 单元测试 | UI 交互、边界条件（100条限制、5MB限制）、错误状态显示 |
| 属性测试 | 数据一致性、冲突检测、排序规则、统计计算、类型校验 |

### 测试覆盖率目标

- API 路由: > 80%
- 核心组件: > 70%
- 属性测试: 每个属性 100 次迭代
