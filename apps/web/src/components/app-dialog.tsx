import { CheckIcon, ChevronLeftIcon, RotateCcwIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type AppDialogActionBase = {
  label?: ReactNode;
  disabled?: boolean;
  testId?: string;
};

export type AppDialogBackAction =
  | false
  | (AppDialogActionBase & {
      onClick?: () => void | Promise<void>;
    });

export type AppDialogResetAction =
  | false
  | (AppDialogActionBase & {
      onClick: () => void | Promise<void>;
    });

export type AppDialogConfirmAction =
  | false
  | (AppDialogActionBase & {
      formId: string;
      onClick?: never;
    })
  | (AppDialogActionBase & {
      formId?: never;
      onClick: () => void | Promise<void>;
    });

export type AppDialogSize = "sm" | "md" | "lg" | "xl";

export type AppDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  size?: AppDialogSize;
  bodyClassName?: string;
  testId?: string;
  backAction?: AppDialogBackAction;
  resetAction: AppDialogResetAction;
  confirmAction: AppDialogConfirmAction;
  showCloseButton?: boolean;
  showFullscreenButton?: boolean;
};

const dialogSizeClassNames: Record<AppDialogSize, string> = {
  sm: "w-[min(100%-2rem,32rem)] max-w-none",
  md: "w-[min(100%-2rem,56rem)] max-w-none",
  lg: "w-[min(100%-2rem,72rem)] max-w-none",
  xl: "w-[min(100%-2rem,85rem)] max-w-none",
};

export function AppDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  size = "md",
  bodyClassName,
  testId,
  backAction,
  resetAction,
  confirmAction,
  showCloseButton = true,
  showFullscreenButton = true,
}: AppDialogProps) {
  const { t } = useTranslation("common");
  const hasVisibleAction =
    backAction !== false ||
    resetAction !== false ||
    confirmAction !== false;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-testid={testId}
        className={cn(
          "grid max-h-[90vh] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0",
          dialogSizeClassNames[size],
        )}
        showCloseButton={showCloseButton}
        showFullscreenButton={showFullscreenButton}
      >
        <DialogHeader className="border-b px-8 py-6">
          <DialogTitle>{title}</DialogTitle>
          {description !== undefined && description !== null ? (
            <DialogDescription>{description}</DialogDescription>
          ) : null}
        </DialogHeader>

        <div
          data-slot="app-dialog-body"
          className={cn(
            "min-h-0 overflow-auto px-8 py-6",
            bodyClassName,
          )}
        >
          {children}
        </div>

        {hasVisibleAction ? (
          <DialogFooter className="border-t px-8 py-6 sm:flex-row sm:justify-end">
            {backAction !== false ? (
              <Button
                type="button"
                variant="outline"
                data-testid={backAction?.testId}
                disabled={backAction?.disabled}
                onClick={() => {
                  if (backAction?.onClick) {
                    void backAction.onClick();
                    return;
                  }
                  onOpenChange(false);
                }}
              >
                <ChevronLeftIcon data-icon="inline-start" />
                {backAction?.label ?? t("dialog.actions.back")}
              </Button>
            ) : null}

            {resetAction !== false ? (
              <Button
                type="button"
                variant="outline"
                className="border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive"
                data-testid={resetAction.testId}
                disabled={resetAction.disabled}
                onClick={() => {
                  void resetAction.onClick();
                }}
              >
                <RotateCcwIcon data-icon="inline-start" />
                {resetAction.label ?? t("dialog.actions.reset")}
              </Button>
            ) : null}

            {confirmAction !== false ? (
              <Button
                type={confirmAction.formId ? "submit" : "button"}
                form={confirmAction.formId}
                data-testid={confirmAction.testId}
                disabled={confirmAction.disabled}
                onClick={
                  confirmAction.onClick
                    ? () => {
                        void confirmAction.onClick?.();
                      }
                    : undefined
                }
              >
                <CheckIcon data-icon="inline-start" />
                {confirmAction.label ?? t("dialog.actions.confirm")}
              </Button>
            ) : null}
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
