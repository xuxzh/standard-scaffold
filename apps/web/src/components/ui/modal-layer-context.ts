import { createContext, useContext } from "react";

/**
 * 浮层组件读到的"模态层高度"，用于在自身基础 z-index 之上叠加。
 *
 * Modal 容器（Dialog / AlertDialog / Sheet 的 `Content`）把自己模态本体的
 * z-index 值（当前约定为 `60`，对应 `z-modal`）通过本 context 透出去，
 * 让嵌在 modal 内部的 Radix 浮层（Popover / Select / DropdownMenu / Tooltip）
 * 自动切到 `z-modal-nested`（`layer + 10`），从而始终浮在 modal 本体之上。
 *
 * 默认 `0` 表示"祖先链里没有 modal"，此时浮层使用 `z-floating` 这一基础层。
 *
 * @example
 * ```tsx
 * // dialog.tsx
 * <DialogPrimitive.Content>
 *   <ModalLayerContext.Provider value={60}>
 *     {children}
 *   </ModalLayerContext.Provider>
 * </DialogPrimitive.Content>
 * ```
 */
export const ModalLayerContext = createContext<number>(0);

export function useModalLayer(): number {
  return useContext(ModalLayerContext);
}