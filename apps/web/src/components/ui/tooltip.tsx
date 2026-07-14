"use client"

import * as React from "react"
import { Tooltip as TooltipPrimitive } from "radix-ui"

import { useModalLayer } from "@/components/ui/modal-layer-context"
import { useRouteActivityPortalContainer } from "@/components/routing/route-activity-portal-context"
import { cn } from "@/lib/utils"

function TooltipProvider({
  delayDuration = 0,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delayDuration={delayDuration}
      {...props}
    />
  )
}

function Tooltip({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  return <TooltipPrimitive.Root data-slot="tooltip" {...props} />
}

function TooltipTrigger({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />
}

function TooltipContent({
  className,
  sideOffset = 0,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  const activityContainer = useRouteActivityPortalContainer()
  // 嵌在 Dialog / AlertDialog / Sheet 内部时由 `ModalLayerContext` 提供
  // 模态层高度，让本浮层自动切到 `z-modal-nested`；否则用 `z-floating`。
  // 箭头跟随内容同步切层，避免出现一道缝。
  const modalLayer = useModalLayer()
  const zClass = modalLayer > 0 ? "z-modal-nested" : "z-floating"

  return (
    <TooltipPrimitive.Portal container={activityContainer}>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        className={cn(
          "w-fit origin-(--radix-tooltip-content-transform-origin) animate-in rounded-sm bg-foreground px-3 py-1.5 text-xs text-balance text-background fade-in-0 zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
          zClass,
          className
        )}
        {...props}
      >
        {children}
        <TooltipPrimitive.Arrow className={cn("size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-[2px] bg-foreground fill-foreground", zClass)} />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  )
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
