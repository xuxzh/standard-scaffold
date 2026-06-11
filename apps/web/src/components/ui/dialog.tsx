import * as React from "react"
import { Maximize2Icon, Minimize2Icon, XIcon } from "lucide-react"
import { Dialog as DialogPrimitive } from "radix-ui"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
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
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
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
        "fixed inset-0 z-50 bg-black/50 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0",
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
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean
  showFullscreenButton?: boolean
}) {
  const [isFullscreen, setIsFullscreen] = React.useState(false)
  const { t } = useTranslation("common")

  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        data-fullscreen={isFullscreen || undefined}
        className={cn(
          "fixed top-1/2 left-1/2 z-50 grid w-[min(100%-2rem,32rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-lg border bg-background p-6 shadow-lg duration-200 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
          className,
          isFullscreen &&
            "inset-0 h-screen w-screen max-h-none max-w-none translate-x-0 translate-y-0 rounded-none",
        )}
        onCloseAutoFocus={(event) => {
          setIsFullscreen(false)
          onCloseAutoFocus?.(event)
        }}
        {...props}
      >
        {children}
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
                  variant="ghost"
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
      className={cn("text-lg font-semibold text-foreground", className)}
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
