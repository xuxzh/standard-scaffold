import { useState } from "react";
import { useTranslation } from "react-i18next";
import { BoxIcon, ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { PackagingLevelTreeNode } from "@/features/mes/packaging/packaging-level/packaging-level-contract";

type PackagingLevelTreeDialogProps = {
  open: boolean;
  loading: boolean;
  nodes: PackagingLevelTreeNode[];
  error: boolean;
  onOpenChange: (open: boolean) => void;
  onRetry: () => void;
};

type TreeNodeProps = {
  node: PackagingLevelTreeNode;
  depth: number;
  initiallyExpanded: boolean;
};

function TreeNode({ node, depth, initiallyExpanded }: TreeNodeProps) {
  const hasChildren = node.children.length > 0;
  const [expanded, setExpanded] = useState(initiallyExpanded);

  return (
    <li role="treeitem" aria-expanded={hasChildren ? expanded : undefined}>
      <div
        className={cn(
          "group/tree-node flex items-center gap-2 rounded-md py-1.5 pr-2",
          "hover:bg-muted/50",
        )}
      >
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-label={expanded ? "Collapse" : "Expand"}
          aria-expanded={hasChildren ? expanded : undefined}
          tabIndex={hasChildren ? 0 : -1}
          className={cn(
            "flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground transition-transform",
            "hover:bg-muted hover:text-foreground",
            !hasChildren && "invisible",
            expanded && "rotate-90",
          )}
        >
          <ChevronRightIcon aria-hidden="true" className="h-3.5 w-3.5" />
        </button>
        <BoxIcon
          aria-hidden="true"
          className="h-4 w-4 shrink-0 text-sky-500"
        />
        <span className="text-sm text-foreground">
          {`${node.levelName} (${node.levelCode})`}
        </span>
      </div>
      {hasChildren && expanded ? (
        <ul
          role="group"
          className="ml-[0.6875rem] border-l border-border pl-2"
        >
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              initiallyExpanded={depth + 1 < 2}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function TreeNodes({ nodes }: { nodes: PackagingLevelTreeNode[] }) {
  return (
    <ul role="tree" className="flex flex-col">
      {nodes.map((node) => (
        <TreeNode
          key={node.id}
          node={node}
          depth={0}
          initiallyExpanded
        />
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
