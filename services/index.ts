/**
 * Services 层入口
 * 
 * 服务层负责封装业务逻辑，协调多个 repository 完成复杂操作。
 * 服务层是 API 路由的直接调用者，不应被客户端代码直接导入。
 * 
 * 职责：
 * - 封装业务规则和验证
 * - 协调多个数据访问操作
 * - 处理事务边界
 * - 转换数据格式
 */

import 'server-only'

// Services 将在后续阶段逐步迁移实现
// TODO: Phase 2 迁移后取消以下注释
// export * from './orders'
// export * from './daily-closures'
// export * from './menu'
// export * from './tables'
// export * from './reports'
// export * from './transactions'

