import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { PackagingLevelTreeNode } from "@/features/wms/packaging/packaging-level/packaging-level-contract";

type PackagingLevelTreeDialogProps = {
  open: boolean;
  loading: boolean;
  nodes: PackagingLevelTreeNode[];
  error: boolean;
  onOpenChange: (open: boolean) => void;
  onRetry: () => void;
};

function TreeNodes({ nodes }: { nodes: PackagingLevelTreeNode[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {nodes.map((node) => (
        <li key={node.id} className="flex flex-col gap-2">
          <span>{`${node.levelName} (${node.levelCode})`}</span>
          {node.children.length > 0 ? (
            <div className="ml-6 border-l pl-4">
              <TreeNodes nodes={node.children} />
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export function PackagingLevelTreeDialog({
  open,
  loading,
  nodes,
  error,
  onOpenChange,
  onRetry,
}: PackagingLevelTreeDialogProps) {
  const { t } = useTranslation("common");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[min(100%-2rem,48rem)] max-w-none"
        data-testid="packaging-level-tree-dialog"
      >
        <DialogHeader>
          <DialogTitle>{t("pages.packagingLevel.tree.title")}</DialogTitle>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto">
          {loading ? (
            <p>{t("pages.packagingLevel.tree.loading")}</p>
          ) : error ? (
            <div className="flex flex-col gap-4">
              <p>{t("pages.packagingLevel.tree.error")}</p>
              <div>
                <Button type="button" variant="outline" onClick={onRetry}>
                  {t("pages.packagingLevel.actions.retry")}
                </Button>
              </div>
            </div>
          ) : nodes.length === 0 ? (
            <p>{t("pages.packagingLevel.tree.empty")}</p>
          ) : (
            <TreeNodes nodes={nodes} />
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t("pages.packagingLevel.actions.close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
