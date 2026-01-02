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

// 订单服务
export * from './orders'

// 日结服务
export * from './daily-closures'

// 报表服务
export * from './reports'

// 交易服务
export * from './transactions'

// 菜单服务
export * from './menu'

// 桌台服务
export * from './tables'

// 结账历史服务
export * from './checkout-history'

// 餐厅设置服务
export * from './restaurant-settings'
