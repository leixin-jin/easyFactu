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

// 订单数据访问
export * from './orders'

// 订单项数据访问
export * from './order-items'

// 交易数据访问
export * from './transactions'

// 桌台数据访问
export * from './tables'

// 菜单数据访问
export * from './menu'

// 日结数据访问
export * from './daily-closures'
