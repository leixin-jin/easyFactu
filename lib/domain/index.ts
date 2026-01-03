/**
 * 领域层统一导出
 *
 * 领域层包含所有核心业务逻辑，遵循以下原则：
 * - 纯函数，无副作用
 * - 不依赖 React/Next.js
 * - 不依赖数据库
 * - 不依赖网络
 * - 可独立单元测试
 */

// Money 值对象 - 安全的金额计算
export * from './Money'

// Order 领域模型 - 订单实体和业务规则
export * from './Order'

// Checkout 领域 - 结账计算逻辑
export * from './checkout'
