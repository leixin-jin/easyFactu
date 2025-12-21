# Implementation Plan: 菜单编辑与上下架优化

## Overview

本实现计划基于优化后的任务依赖关系，将 API 开发与类型定义紧密结合，减少等待时间。测试任务作为可选子任务，可根据需要跳过以加快 MVP 交付。

## Tasks

- [ ] 1. 配置 Supabase Storage bucket 和 RLS 策略
  - 在 Supabase Dashboard 或通过 SQL 创建 `menu-images` bucket
  - 配置公开读取和认证写入的 RLS 策略
  - 验证 bucket 配置正确
  - _Requirements: 5.4_

- [ ] 2. 实现菜品编辑 API 与类型定义
  - [ ] 2.1 在 `app/api/menu-items/[id]/route.ts` 增加 `PUT` 方法
    - Zod 校验：name、nameEn、category、price、description、image
    - 校验 id 为 UUID；不存在或 available=false 返回 404
    - 同分类同名冲突返回 409
    - 更新 updatedAt，返回 toMenuItemResponse
    - _Requirements: 1.2, 1.3, 1.5, 7.1, 7.2, 7.3_
  - [ ] 2.2 在 `types/api.ts` 新增 `UpdateMenuItemInput` 类型
    - _Requirements: 1.2_
  - [ ] 2.3 在 `lib/api/client.ts` 新增 `api.menuItems.update` 方法
    - _Requirements: 1.2_
  - [ ] 2.4 在 `lib/queries/use-menu.ts` 新增 `useUpdateMenuItem` hook
    - _Requirements: 1.2_
  - [ ] 2.5 编写 PUT /api/menu-items/[id] 单元测试
    - 测试正常更新、404、409 场景
    - _Requirements: 1.2, 1.3, 7.2, 7.3_
  - [ ] 2.6 编写属性测试：编辑操作数据一致性
    - **Property 1: 编辑操作数据一致性**
    - **Validates: Requirements 1.2, 1.5**

- [ ] 3. 实现已下架菜品列表与恢复上架 API
  - [ ] 3.1 新增 `app/api/menu-items/deleted/route.ts` 实现 GET
    - 返回 available=false 的菜品，按 updatedAt 降序
    - _Requirements: 3.1, 3.2_
  - [ ] 3.2 新增 `app/api/menu-items/[id]/restore/route.ts` 实现 POST
    - 校验 id；不存在或非下架返回 404
    - 恢复冲突返回 409
    - _Requirements: 3.3, 3.4, 7.2, 7.3_
  - [ ] 3.3 在 `types/api.ts` 新增 `DeletedMenuListResponse` 类型
    - _Requirements: 3.1_
  - [ ] 3.4 在 `lib/api/client.ts` 新增 `api.menuItems.listDeleted` 和 `api.menuItems.restore` 方法
    - _Requirements: 3.1, 3.3_
  - [ ] 3.5 在 `lib/queries/use-menu.ts` 新增 `useDeletedMenuQuery` 和 `useRestoreMenuItem` hooks
    - _Requirements: 3.1, 3.3_
  - [ ] 3.6 编写已下架列表和恢复 API 单元测试
    - _Requirements: 3.1, 3.2, 3.3, 3.4_
  - [ ] 3.7 编写属性测试：已下架列表排序
    - **Property 6: 已下架列表排序**
    - **Validates: Requirements 3.2**

- [ ] 4. 实现批量导入 API
  - [ ] 4.1 新增 `app/api/menu-items/batch/route.ts` 实现 POST
    - Zod 校验，每次最多 100 条
    - 同名同分类处理：skipExisting=true 时跳过并统计；否则返回错误
    - 事务插入，返回统计：total/created/skipped/errors[]
    - _Requirements: 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_
  - [ ] 4.2 在 `types/api.ts` 新增 `BatchImportInput` 和 `BatchImportResponse` 类型
    - _Requirements: 4.2_
  - [ ] 4.3 在 `lib/api/client.ts` 新增 `api.menuItems.batchImport` 方法
    - _Requirements: 4.2_
  - [ ] 4.4 在 `lib/queries/use-menu.ts` 新增 `useBatchImportMenuItems` hook
    - _Requirements: 4.2_
  - [ ] 4.5 编写批量导入 API 单元测试
    - 测试正常导入、超限、跳过、重复场景
    - _Requirements: 4.3, 4.4, 4.5, 4.6_
  - [ ] 4.6 编写属性测试：批量导入统计一致性
    - **Property 8: 批量导入统计一致性**
    - **Validates: Requirements 4.6**
  - [ ] 4.7 编写属性测试：批量导入事务原子性
    - **Property 11: 批量导入事务原子性**
    - **Validates: Requirements 4.7**

- [ ] 5. 实现图片上传 API
  - [ ] 5.1 新增 `app/api/menu-items/upload/route.ts` 实现 POST
    - 接收 multipart/form-data，用 formData() 解析
    - 校验类型：jpeg/png/webp/gif；大小 ≤ 5MB
    - 生成文件名 menu-{timestamp}-{random}.{ext} 并上传到 menu-images bucket
    - 返回公开访问 URL
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  - [ ] 5.2 在 `types/api.ts` 新增 `UploadImageResponse` 类型
    - _Requirements: 5.4_
  - [ ] 5.3 在 `lib/api/client.ts` 新增 `api.menuItems.uploadImage` 方法
    - _Requirements: 5.4_
  - [ ] 5.4 在 `lib/queries/use-menu.ts` 新增 `useUploadMenuImage` hook
    - _Requirements: 5.4_
  - [ ] 5.5 编写图片上传 API 单元测试
    - 测试正常上传、类型错误、大小超限场景
    - _Requirements: 5.2, 5.3, 5.5_
  - [ ] 5.6 编写属性测试：图片类型校验
    - **Property 12: 图片类型校验**
    - **Validates: Requirements 5.2**

- [ ] 6. Checkpoint - API 层完成验证
  - 确保所有 API 测试通过
  - 验证类型定义完整
  - 如有问题请询问用户

- [ ] 7. 创建图片上传组件
  - [ ] 7.1 新增 `components/features/menu/ImageUpload.tsx`
    - 支持拖拽/点击上传、预览、清空
    - 客户端校验类型与大小（jpeg/png/webp/gif，≤5MB）
    - 调用 POST /api/menu-items/upload，成功后回传公开 URL
    - 错误态与 loading 状态清晰，使用 shadcn/ui
    - _Requirements: 5.1, 5.6, 5.7_
  - [ ] 7.2 编写 ImageUpload 组件单元测试
    - _Requirements: 5.1, 5.7_

- [ ] 8. 实现菜品编辑弹窗与下架语义调整
  - [ ] 8.1 在 `components/features/menu/MenuManagement.tsx` 中添加编辑功能
    - 菜品卡片右上角新增编辑按钮（Pencil）
    - 编辑弹窗预填充，字段与新增一致，图片字段使用 ImageUpload
    - 提交调用 PUT /api/menu-items/[id]，成功后刷新列表并 toast
    - _Requirements: 1.1, 1.2, 1.4, 5.6, 8.2, 8.3, 8.5_
  - [ ] 8.2 将"删除"按钮文案改为"下架"
    - 下架按钮文案与提示改为"下架"，仍调用现有删除 API
    - _Requirements: 2.1, 2.3_
  - [ ] 8.3 编写编辑弹窗组件测试
    - _Requirements: 1.1, 1.4_

- [ ] 9. 实现已下架菜品抽屉与恢复上架
  - [ ] 9.1 在 `components/features/menu/MenuManagement.tsx` 中添加已下架菜品抽屉
    - 头部新增按钮"已下架菜品"（Archive），点击打开右侧 Sheet
    - 列表展示名称/分类/下架时间（updatedAt）
    - 点击"恢复上架"调用 POST /api/menu-items/[id]/restore 并刷新主列表
    - 空状态与加载状态使用 shadcn/ui 样式
    - _Requirements: 3.1, 3.2, 3.3, 8.4, 8.5_
  - [ ] 9.2 编写已下架菜品抽屉组件测试
    - _Requirements: 3.1, 3.3_

- [ ] 10. 实现批量导入 UI
  - [ ] 10.1 在 `components/features/menu/MenuManagement.tsx` 中添加批量导入功能
    - 头部新增"批量导入"按钮（Upload）
    - 批量导入弹窗：CSV 格式 name,nameEn,category,price,description,image
    - CSV 解析使用 papaparse（需新增依赖）
    - 支持预览（前 10 条）/统计/跳过已存在
    - 校验必填与价格格式，超 100 条提示并阻止导入
    - 导入完成显示成功/跳过/失败统计
    - _Requirements: 4.1, 4.2, 4.3, 4.6, 8.2, 8.3, 8.5_
  - [ ] 10.2 提供 CSV 模板下载功能
    - _Requirements: 4.2_
  - [ ] 10.3 编写批量导入 UI 组件测试
    - _Requirements: 4.1, 4.6_

- [ ] 11. Checkpoint - 前端功能完成验证
  - 确保所有组件测试通过
  - 验证 UI 交互流程正确
  - 如有问题请询问用户

- [ ] 12. 分类计数一致性验证
  - [ ] 12.1 编写属性测试：分类计数一致性
    - **Property 7: 分类计数一致性**
    - **Validates: Requirements 2.2, 3.5, 6.1, 6.2, 6.3, 6.4, 6.5**
  - [ ] 12.2 编写属性测试：名称冲突检测
    - **Property 2: 名称冲突检测**
    - **Validates: Requirements 1.3, 3.4, 7.3**

- [ ] 13. Final Checkpoint - 全功能验收
  - 确保所有测试通过
  - 验证端到端流程
  - 如有问题请询问用户

## Notes

- 所有任务都是必须完成的，包括测试任务
- 每个任务都引用了具体的需求条款以便追溯
- Checkpoints 用于阶段性验证，确保增量开发的稳定性
- 属性测试验证通用正确性属性，单元测试验证具体场景和边界条件
- 建议按顺序执行，但 Task 2-5 的 API 开发可以并行进行
