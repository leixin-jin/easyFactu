"use client"

/**
 * PosFooter 组件 Props
 */
export interface PosFooterProps {
    children?: React.ReactNode
}

/**
 * POS 底部组件
 * 轻量封装组件，作为底部操作区的占位容器
 * 当前版本仅作为容器使用，可在移动端布局中扩展
 */
export function PosFooter({ children }: PosFooterProps) {
    if (!children) {
        return null
    }

    return (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border md:hidden">
            {children}
        </div>
    )
}
