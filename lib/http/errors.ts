/**
 * 统一错误类型层
 * 
 * 提供标准化的错误类型，用于 API 路由的错误处理
 */

/**
 * 基础应用错误类
 * 所有业务错误都应继承此类
 */
export class AppError extends Error {
    constructor(
        public code: string,
        public statusCode: number,
        message: string,
        public detail?: unknown
    ) {
        super(message)
        this.name = 'AppError'
    }
}

/**
 * 资源未找到错误 (404)
 */
export class NotFoundError extends AppError {
    constructor(resource: string, id?: string | number) {
        super('NOT_FOUND', 404, id ? `${resource} ${id} 不存在` : `${resource}不存在`)
    }
}

/**
 * 请求验证错误 (400)
 */
export class ValidationError extends AppError {
    constructor(message: string, detail?: unknown) {
        super('VALIDATION_ERROR', 400, message, detail)
    }
}

/**
 * 数据冲突错误 (409)
 * 用于唯一约束冲突等场景
 */
export class ConflictError extends AppError {
    constructor(message: string = '数据已存在') {
        super('DUPLICATE_ENTRY', 409, message)
    }
}

/**
 * 无法处理的实体错误 (422)
 * 用于业务规则验证失败
 */
export class UnprocessableError extends AppError {
    constructor(message: string, detail?: unknown) {
        super('UNPROCESSABLE_ENTITY', 422, message, detail)
    }
}

/**
 * 未授权错误 (401)
 */
export class UnauthorizedError extends AppError {
    constructor(message: string = '未授权访问') {
        super('UNAUTHORIZED', 401, message)
    }
}

/**
 * 禁止访问错误 (403)
 */
export class ForbiddenError extends AppError {
    constructor(message: string = '禁止访问') {
        super('FORBIDDEN', 403, message)
    }
}
