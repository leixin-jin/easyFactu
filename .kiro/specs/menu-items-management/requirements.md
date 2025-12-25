# Requirements Document

## Introduction

本功能在现有菜单管理页面基础上，补齐菜品编辑、下架/上架（软删除/恢复）、批量导入（含图片字段）与图片上传能力。图片公开访问，前端使用 shadcn/ui，保持现有页面尺寸与布局。

## Glossary

- **Menu_Management_System**: 菜单管理系统，负责菜品的增删改查、上下架、批量导入和图片管理
- **Menu_Item**: 菜品实体，包含名称、分类、价格、描述、图片等属性
- **Available_Status**: 菜品可用状态，`available=true` 表示上架，`available=false` 表示下架
- **Image_Upload_Service**: 图片上传服务，负责将图片上传到 Supabase Storage 并返回公开 URL
- **Batch_Import_Service**: 批量导入服务，负责解析 CSV 并批量创建菜品
- **Category_Counter**: 分类计数器，统计各分类下的菜品数量

## Requirements

### Requirement 1: 菜品编辑

**User Story:** As a 餐厅管理员, I want to 编辑现有菜品信息, so that I can 及时更新菜品名称、价格、描述和图片。

#### Acceptance Criteria

1. WHEN 管理员点击菜品卡片的编辑按钮 THEN THE Menu_Management_System SHALL 打开编辑弹窗并预填充当前菜品数据
2. WHEN 管理员提交编辑表单且数据有效 THEN THE Menu_Management_System SHALL 更新菜品信息并刷新列表
3. WHEN 管理员提交的菜品名称与同分类下其他上架菜品重复 THEN THE Menu_Management_System SHALL 返回 409 冲突错误并显示明确提示
4. WHEN 管理员提交的表单数据校验失败 THEN THE Menu_Management_System SHALL 显示具体的字段错误信息
5. THE Menu_Management_System SHALL 在编辑成功后更新 `updatedAt` 时间戳

### Requirement 2: 菜品下架

**User Story:** As a 餐厅管理员, I want to 下架不再供应的菜品, so that I can 让顾客只看到当前可点的菜品。

#### Acceptance Criteria

1. WHEN 管理员点击下架按钮并确认 THEN THE Menu_Management_System SHALL 将菜品 `available` 设为 `false` 并从主列表隐藏
2. WHEN 菜品被下架 THEN THE Category_Counter SHALL 正确减少对应分类的计数
3. THE Menu_Management_System SHALL 将"删除"按钮文案改为"下架"以明确语义

### Requirement 3: 已下架菜品查看与恢复上架

**User Story:** As a 餐厅管理员, I want to 查看已下架菜品并恢复上架, so that I can 重新启用之前下架的菜品。

#### Acceptance Criteria

1. WHEN 管理员点击"已下架菜品"按钮 THEN THE Menu_Management_System SHALL 打开侧边抽屉显示所有已下架菜品
2. THE Menu_Management_System SHALL 按 `updatedAt` 降序排列已下架菜品列表
3. WHEN 管理员点击"恢复上架"按钮 THEN THE Menu_Management_System SHALL 将菜品 `available` 设为 `true` 并刷新主列表
4. WHEN 恢复的菜品名称与同分类下已上架菜品重复 THEN THE Menu_Management_System SHALL 返回 409 冲突错误并显示明确提示
5. WHEN 菜品恢复上架成功 THEN THE Category_Counter SHALL 正确增加对应分类的计数

### Requirement 4: 批量导入菜品

**User Story:** As a 餐厅管理员, I want to 通过 CSV 文件批量导入菜品, so that I can 快速添加大量菜品而无需逐个录入。

#### Acceptance Criteria

1. WHEN 管理员上传 CSV 文件 THEN THE Batch_Import_Service SHALL 解析文件并显示前 10 条预览数据
2. THE Batch_Import_Service SHALL 支持 CSV 格式：`name,nameEn,category,price,description,image`
3. WHEN CSV 包含超过 100 条记录 THEN THE Batch_Import_Service SHALL 阻止导入并显示数量限制提示
4. WHEN 管理员选择"跳过已存在" THEN THE Batch_Import_Service SHALL 跳过同名同分类的菜品并统计跳过数量
5. WHEN 管理员未选择"跳过已存在"且存在重复 THEN THE Batch_Import_Service SHALL 返回错误并列出重复项
6. WHEN 导入完成 THEN THE Batch_Import_Service SHALL 显示统计信息：总数、成功创建数、跳过数、失败数及失败原因
7. THE Batch_Import_Service SHALL 使用数据库事务确保导入的原子性

### Requirement 5: 图片上传

**User Story:** As a 餐厅管理员, I want to 上传菜品图片, so that I can 让菜单展示更加直观美观。

#### Acceptance Criteria

1. WHEN 管理员拖拽或点击上传图片 THEN THE Image_Upload_Service SHALL 接收文件并开始上传
2. THE Image_Upload_Service SHALL 仅接受 jpeg、png、webp、gif 格式的图片
3. THE Image_Upload_Service SHALL 限制单个图片大小不超过 5MB
4. WHEN 图片上传成功 THEN THE Image_Upload_Service SHALL 返回公开访问的 URL
5. WHEN 图片格式或大小不符合要求 THEN THE Image_Upload_Service SHALL 返回 400 错误并说明具体原因
6. THE Menu_Management_System SHALL 在新增/编辑弹窗中使用图片上传组件替代 URL 输入框
7. THE Image_Upload_Service SHALL 支持预览已上传图片和清空操作

### Requirement 6: 分类计数一致性

**User Story:** As a 餐厅管理员, I want to 看到准确的分类菜品数量, so that I can 了解各分类的菜品分布情况。

#### Acceptance Criteria

1. WHEN 菜品被新增 THEN THE Category_Counter SHALL 正确增加对应分类的计数
2. WHEN 菜品被编辑且分类改变 THEN THE Category_Counter SHALL 正确更新原分类和新分类的计数
3. WHEN 菜品被下架 THEN THE Category_Counter SHALL 正确减少对应分类的计数
4. WHEN 菜品被恢复上架 THEN THE Category_Counter SHALL 正确增加对应分类的计数
5. WHEN 批量导入完成 THEN THE Category_Counter SHALL 正确反映所有新增菜品的分类计数

### Requirement 7: API 错误处理

**User Story:** As a 开发者, I want to 获得一致的 API 错误响应, so that I can 正确处理各种错误情况。

#### Acceptance Criteria

1. WHEN 请求参数校验失败 THEN THE Menu_Management_System SHALL 返回 400 状态码和具体的校验错误信息
2. WHEN 请求的菜品不存在 THEN THE Menu_Management_System SHALL 返回 404 状态码
3. WHEN 操作导致数据冲突 THEN THE Menu_Management_System SHALL 返回 409 状态码和冲突原因
4. WHEN 服务器内部错误 THEN THE Menu_Management_System SHALL 返回 500 状态码并记录错误日志
5. THE Menu_Management_System SHALL 保持错误响应格式与现有 API 一致：`{ error: string, detail?: unknown, code?: string }`

### Requirement 8: UI 一致性

**User Story:** As a 餐厅管理员, I want to 在熟悉的界面中使用新功能, so that I can 无需重新学习即可高效操作。

#### Acceptance Criteria

1. THE Menu_Management_System SHALL 保持现有页面尺寸和布局不变
2. THE Menu_Management_System SHALL 使用 shadcn/ui 组件实现所有新增交互
3. THE Menu_Management_System SHALL 通过 Dialog 实现编辑和批量导入功能
4. THE Menu_Management_System SHALL 通过 Sheet 实现已下架菜品抽屉
5. WHEN 操作成功或失败 THEN THE Menu_Management_System SHALL 通过 toast 通知用户结果
