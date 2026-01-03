/**
 * 桌台服务模块入口
 */

import 'server-only'

export {
    getAllTables,
    getTableById,
    createTable,
    updateTable,
    updateTableStatus,
    deleteTable,
    type TableResponse,
} from './service'
