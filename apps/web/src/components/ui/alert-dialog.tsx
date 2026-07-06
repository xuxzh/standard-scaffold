import * as React from "react"
import { AlertDialog as AlertDialogPrimitive } from "radix-ui"

import { ModalLayerContext } from "@/components/ui/modal-layer-context"
import {
  useWujieBodyPointerEventsFix,
  useWujieContentPointerEventsFix,
} from "@/components/ui/use-wujie-pointer-events-fix"
import {
  useRouteActivityFixedPortalContainer,
  useRouteActivityPortalContainer,
} from "@/components/routing/route-activity-portal-context"
import { cn } from "@/lib/utils"

function AlertDialog({
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Root>) {
  return <AlertDialogPrimitive.Root data-slot="alert-dialog" {...props} />
}

function AlertDialogTrigger({
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Trigger>) {
  return (
    <AlertDialogPrimitive.Trigger data-slot="alert-dialog-trigger" {...props} />
  )
}

function AlertDialogPortal({
  container,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Portal>) {
  // Two portal targets are exposed by the route activity scope:
  //  - `activityContainer` is a `display: contents` wrapper that preserves
  //    the route's flex layout. It is fine for popovers, tooltips, dropdowns
  //    (anything that does not rely on a `position: fixed` containing block).
  //  - `fixedContainer` is a real (but invisible and non-interactive) div
  //    inside the same Activity subtree. It exists so that the AlertDialog's
  //    `position: fixed` overlay still has a normal containing block while
  //    remaining hidden when the route is inactive. Without it, the overlay
  //    would either be moved to the body (escaping the route cache) or sit
  //    inside a `display: contents` element (which silently breaks
  //    `position: fixed` in wujie's degrade iframe, leaving buttons
  //    unclickable).
  const activityContainer = useRouteActivityPortalContainer()
  const fixedContainer = useRouteActivityFixedPortalContainer()

  return (
    <AlertDialogPrimitive.Portal
      container={container ?? fixedContainer ?? activityContainer}
      data-slot="alert-dialog-portal"
      {...props}
    />
  )
}

function AlertDialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Overlay>) {
  return (
    <AlertDialogPrimitive.Overlay
      data-slot="alert-dialog-overlay"
      className={cn(
        "fixed inset-0 z-floating bg-black/50 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0",
        className,
      )}
      {...props}
    />
  )
}

function AlertDialogContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Content>) {
  const contentRef = React.useRef<HTMLDivElement>(null)

  // Skill: `rh-wujie-dialog-select-compat`. Watch the live DOM for the
  // momentary `pointer-events: none` stamp that Radix can apply while a
  // nested floating UI (Select/Popover) opens or closes inside a wujie
  // iframe, and restore interactivity. The CSS layer in `styles.css` is
  // the primary fallback; these hooks cover the cases where the inline
  // style wins the cascade.
  //
  // AlertDialogContent intentionally Omits `onPointerDownOutside` /
  // `onInteractOutside` from its public props (see radix-ui alert-dialog
  // types), so the composedPath outside-click interception from the
  // Dialog branch does not apply here — the two MutationObserver hooks
  // are the layer we own.
  useWujieBodyPointerEventsFix()
  useWujieContentPointerEventsFix(contentRef)

  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Content
        ref={contentRef}
        data-slot="alert-dialog-content"
        className={cn(
          // `z-modal` (one notch above the overlay's `z-floating`) guarantees
          // the dialog body always wins the stacking-context tie-break when
          // running inside a wujie degrade iframe, where react-remove-scroll-bar
          // also pushes the body into `position: relative` and the host's
          // wujie wrapper adds another `overflow: auto` layer. Children are
          // wrapped in `ModalLayerContext.Provider value={60}` below so that
          // any nested Radix floating UI (Popover/Select/DropdownMenu/Tooltip)
          // auto-elevates to `z-modal-nested` via `useModalLayer()`.
          //
          // Centring is done with an explicit `[transform:translate3d(...)]`
          // (instead of the `-translate-x-1/2 -translate-y-1/2` Tailwind
          // utilities) plus `pointer-events: auto`. The 3D translate and
          // the explicit pointer-events both force the browser to promote
          // the content to its own compositor layer and refresh the
          // hit-testing path. Without them Chromium inside wujie's degrade
          // iframe sometimes reports the overlay as the topmost element
          // until the next full repaint (e.g. after switching browser
          // tabs), making the cancel/delete buttons appear unclickable.
          "fixed top-1/2 left-1/2 z-modal grid w-[min(100%-2rem,28rem)] [transform:translate3d(-50%,-50%,0)] pointer-events-auto gap-4 rounded-lg border bg-background p-6 shadow-lg duration-200 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
          className,
        )}
        {...props}
      >
        <ModalLayerContext.Provider value={60}>
          {children}
        </ModalLayerContext.Provider>
      </AlertDialogPrimitive.Content>
    </AlertDialogPortal>
  )
}

function AlertDialogHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-header"
      className={cn("flex flex-col gap-1.5 text-center sm:text-left", className)}
      {...props}
    />
  )
}

function AlertDialogFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className,
      )}
      {...props}
    />
  )
}

function AlertDialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Title>) {
  return (
    <AlertDialogPrimitive.Title
      data-slot="alert-dialog-title"
      className={cn("text-lg font-semibold text-foreground", className)}
      {...props}
    />
  )
}

function AlertDialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Description>) {
  return (
    <AlertDialogPrimitive.Description
      data-slot="alert-dialog-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

function AlertDialogAction({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Action>) {
  return (
    <AlertDialogPrimitive.Action
      data-slot="alert-dialog-action"
      className={cn(
        "inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:bg-destructive/60 dark:focus-visible:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    />
  )
}

function AlertDialogCancel({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Cancel>) {
  return (
    <AlertDialogPrimitive.Cancel
      data-slot="alert-dialog-cancel"
      className={cn(
        "inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    />
  )
}

export {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
}
