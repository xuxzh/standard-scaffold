import * as React from "react"
import { Maximize2Icon, Minimize2Icon, XIcon } from "lucide-react"
import { Dialog as DialogPrimitive } from "radix-ui"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { ModalLayerContext } from "@/components/ui/modal-layer-context"
import {
  useWujieBodyPointerEventsFix,
  useWujieContentPointerEventsFix,
} from "@/components/ui/use-wujie-pointer-events-fix"
import {
  useRouteActivityFixedPortalContainer,
  useRouteActivityPortalContainer,
} from "@/components/routing/route-activity-portal-context"
import { isRunningInWujie } from "@/lib/host-context/host-context-source"
import { cn } from "@/lib/utils"

function Dialog({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({
  container,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  // See the matching comment in alert-dialog.tsx: we use the dedicated
  // fixed-position container inside the route activity scope, falling back
  // to the `display: contents` activity container, so that the dialog
  // overlay's `position: fixed` works inside wujie's degrade iframe
  // while the route cache still hides it when the route is inactive.
  const activityContainer = useRouteActivityPortalContainer()
  const fixedContainer = useRouteActivityFixedPortalContainer()

  return (
    <DialogPrimitive.Portal
      container={container ?? fixedContainer ?? activityContainer}
      data-slot="dialog-portal"
      {...props}
    />
  )
}

function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 z-floating bg-black/50 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0",
        className,
      )}
      {...props}
    />
  )
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  showFullscreenButton = true,
  onCloseAutoFocus,
  onPointerDownOutside,
  onInteractOutside,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean
  showFullscreenButton?: boolean
}) {
  const [isFullscreen, setIsFullscreen] = React.useState(false)
  const { t } = useTranslation("common")
  const contentRef = React.useRef<HTMLDivElement>(null)
  const wujie = isRunningInWujie()

  // Skill: `rh-wujie-dialog-select-compat`. Watch the live DOM for the
  // momentary `pointer-events: none` stamp that Radix can apply while a
  // nested floating UI (Select/Popover) opens or closes inside a wujie
  // iframe, and restore interactivity. The CSS layer in `styles.css` is
  // the primary fallback; these hooks cover the cases where the inline
  // style wins the cascade.
  useWujieBodyPointerEventsFix()
  useWujieContentPointerEventsFix(contentRef)

  // Skill: `rh-wujie-dialog-select-compat`. Wujie proxies the iframe DOM
  // through a shadow boundary, so `event.target` is retargeted to the
  // shadow host by the time Radix's dismissable-layer handler sees it.
  // That can cause the layer to think a click inside the dialog content
  // happened "outside" and close the dialog. `composedPath()` preserves
  // the real hit-test path; we use it to short-circuit the close.
  const wrapOutside = React.useCallback(
    <T,>(handler: T | undefined) => {
      if (!handler || !wujie) {
        return handler
      }
      type OutsideEvent = { preventDefault(): void; detail?: { originalEvent?: Event } }
      return ((event: OutsideEvent) => {
        const original = event.detail?.originalEvent
        const path =
          original && typeof (original as Event).composedPath === "function"
            ? (original as Event).composedPath()
            : []
        if (contentRef.current && path.includes(contentRef.current)) {
          event.preventDefault()
          return
        }
        return (handler as (e: OutsideEvent) => void)(event)
      }) as T
    },
    [wujie],
  )

  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={contentRef}
        data-slot="dialog-content"
        data-fullscreen={isFullscreen || undefined}
        className={cn(
          // `z-modal` keeps the dialog body above the `z-floating` overlay when
          // the app is running inside a wujie degrade iframe (see the matching
          // comment in alert-dialog.tsx for the full reasoning). Children
          // wrapped in `ModalLayerContext.Provider value={60}` below so that
          // any nested Radix floating UI (Popover/Select/DropdownMenu/Tooltip)
          // auto-elevates to `z-modal-nested` via `useModalLayer()`.
          //
          // `translate3d` + `pointer-events-auto` force the content onto
          // its own compositor layer; see alert-dialog.tsx for why this
          // matters for hit-testing inside the wujie degrade iframe.
          "fixed top-1/2 left-1/2 z-modal grid w-[min(100%-2rem,32rem)] [transform:translate3d(-50%,-50%,0)] pointer-events-auto gap-4 rounded-lg border bg-background p-6 shadow-lg duration-200 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=closed]:slide-out-to-top-[48%] data-[state=closed]:slide-out-to-left-1/2 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:slide-in-from-top-[48%] data-[state=open]:slide-in-from-left-1/2",
          className,
          isFullscreen &&
            "inset-0 h-screen w-screen max-h-none max-w-none [transform:none] rounded-none",
        )}
        onCloseAutoFocus={(event) => {
          setIsFullscreen(false)
          onCloseAutoFocus?.(event)
        }}
        onPointerDownOutside={wrapOutside(onPointerDownOutside)}
        onInteractOutside={wrapOutside(onInteractOutside)}
        {...props}
      >
        <ModalLayerContext.Provider value={60}>
          {children}
        </ModalLayerContext.Provider>
        {showFullscreenButton || showCloseButton ? (
          <div className="absolute top-3 right-3 flex items-center gap-1">
            {showFullscreenButton ? (
              <Button
                type="button"
                aria-label={
                  isFullscreen
                    ? t("dialog.exitFullscreen")
                    : t("dialog.enterFullscreen")
                }
                aria-pressed={isFullscreen}
                onClick={() => setIsFullscreen((current) => !current)}
                size="icon-lg"
                variant="ghost"
              >
                {isFullscreen ? <Minimize2Icon /> : <Maximize2Icon />}
              </Button>
            ) : null}
            {showCloseButton ? (
              <DialogPrimitive.Close asChild>
                <Button
                  type="button"
                  aria-label={t("dialog.close")}
                  onClick={() => setIsFullscreen(false)}
                  size="icon-lg"
                  variant="destructive"
                >
                  <XIcon />
                </Button>
              </DialogPrimitive.Close>
            ) : null}
          </div>
        ) : null}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

function DialogHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-1.5", className)}
      {...props}
    />
  )
}

function DialogFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)}
      {...props}
    />
  )
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-base font-semibold text-foreground", className)}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogTrigger,
  DialogPortal,
  DialogClose,
  DialogOverlay,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
