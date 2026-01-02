/**
 * 日结服务模块入口
 *
 * 负责日结相关的业务逻辑处理
 */

import 'server-only'

export {
    DEFAULT_DAILY_CLOSURE_TAX_RATE,
    toIsoString,
    computeClosureSnapshotByRange,
    getCurrentClosurePreview,
    confirmDailyClosure,
    addClosureAdjustment,
    getClosureAdjustments,
    getClosureDetails,
} from './service'

export type { ConfirmClosureInput } from './service'
