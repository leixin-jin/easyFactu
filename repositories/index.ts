/**
 * Repositories 层入口
 * 
 * Repository 层负责数据访问，封装数据库操作细节。
 * Repository 层是 Service 层的直接调用者，不应被 API 路由或客户端代码直接导入。
 * 
 * 职责：
 * - 封装数据库查询逻辑
 * - 提供类型安全的数据访问接口
 * - 处理数据映射和转换
 * - 不包含业务逻辑
 */

import 'server-only'

// Repositories 将在后续阶段逐步迁移实现
// TODO: Phase 2 迁移后取消以下注释
// export * from './orders'
// export * from './order-items'
// export * from './transactions'
// export * from './menu'
// export * from './tables'
// export * from './daily-closures'

