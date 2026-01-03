/**
 * 菜单服务模块入口
 */

import 'server-only'

export {
    getAllMenuItems,
    getDeletedMenuItems,
    getMenuItemById,
    createMenuItem,
    updateMenuItem,
    deleteMenuItem,
    restoreMenuItem,
    toMenuItemResponse,
    type MenuItemResponse,
} from './service'
