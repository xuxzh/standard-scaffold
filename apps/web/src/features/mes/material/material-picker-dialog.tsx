import type { ColumnDef } from "@tanstack/react-table";
import { RotateCcwIcon, SearchIcon } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  DataPickerDialog,
  type DataPickerRenderFiltersContext,
} from "@/components/data-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  mapMaterialPickerDtoToRecord,
  materialPickerDefaultFilters,
  materialPickerPageSize,
  type MaterialPickerFilters,
  type MaterialPickerRecord,
} from "@/features/mes/material/material-picker-contract";
import { getMaterialPickerRecords } from "@/features/mes/material/material-picker-service";

type MaterialPickerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (record: MaterialPickerRecord) => void;
};

function MaterialPickerFilterForm({
  values,
  setValues,
  submit,
  reset,
  loading,
}: DataPickerRenderFiltersContext<MaterialPickerFilters>) {
  const { t } = useTranslation("common");

  return (
    <form
      className="grid gap-4 rounded-md border p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto]"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <Input
        aria-label={t("pages.materialPicker.filters.materialCode")}
        placeholder={t("pages.materialPicker.filters.materialCodePlaceholder")}
        value={values.materialCode}
        onChange={(event) =>
          setValues((current) => ({
            ...current,
            materialCode: event.target.value,
          }))
        }
      />
      <Input
        aria-label={t("pages.materialPicker.filters.materialName")}
        placeholder={t("pages.materialPicker.filters.materialNamePlaceholder")}
        value={values.materialName}
        onChange={(event) =>
          setValues((current) => ({
            ...current,
            materialName: event.target.value,
          }))
        }
      />
      <Button type="submit" disabled={loading}>
        <SearchIcon data-icon="inline-start" />
        {t("pages.materialPicker.actions.search")}
      </Button>
      <Button type="button" variant="outline" onClick={reset}>
        <RotateCcwIcon data-icon="inline-start" />
        {t("pages.materialPicker.actions.reset")}
      </Button>
    </form>
  );
}

export function MaterialPickerDialog({
  open,
  onOpenChange,
  onSelect,
}: MaterialPickerDialogProps) {
  const { t } = useTranslation("common");
  const columns = useMemo<ColumnDef<MaterialPickerRecord>[]>(
    () => [
      {
        accessorKey: "materialCode",
        header: t("pages.materialPicker.table.materialCode"),
      },
      {
        accessorKey: "materialName",
        header: t("pages.materialPicker.table.materialName"),
      },
      {
        accessorKey: "materialType",
        header: t("pages.materialPicker.table.materialType"),
        cell: ({ row }) => row.original.materialType || "-",
      },
    ],
    [t],
  );

  return (
    <DataPickerDialog<MaterialPickerRecord, MaterialPickerFilters>
      open={open}
      title={t("pages.materialPicker.title")}
      queryKey={["mes", "material-picker"]}
      defaultFilters={materialPickerDefaultFilters}
      pageSize={materialPickerPageSize}
      columns={columns}
      getRowId={(record) => record.id}
      search={async ({ filters, pageIndex, pageSize, signal }) => {
        const result = await getMaterialPickerRecords(
          {
            MaterialCode: filters.materialCode,
            MaterialName: filters.materialName,
            IsPaged: true,
            PageIndex: pageIndex,
            PageSize: pageSize,
          },
          { signal },
        );

        return {
          items: (result.Attach ?? []).map(mapMaterialPickerDtoToRecord),
          totalCount: result.TotalCount,
        };
      }}
      renderFilters={(context) => <MaterialPickerFilterForm {...context} />}
      onSelect={onSelect}
      onOpenChange={onOpenChange}
      messages={{
        loading: t("pages.materialPicker.states.loading"),
        empty: t("pages.materialPicker.states.empty"),
        select: t("pages.materialPicker.actions.select"),
        back: t("pages.materialPicker.actions.back"),
        previousPage: t("pages.materialPicker.actions.previousPage"),
        nextPage: t("pages.materialPicker.actions.nextPage"),
        page: (pageIndex) =>
          t("pages.materialPicker.states.page", { page: pageIndex }),
        total: (totalCount) =>
          t("pages.materialPicker.states.total", { count: totalCount }),
        errorTitle: t("pages.materialPicker.states.errorTitle"),
        errorDescription: t("pages.materialPicker.states.errorDescription"),
        retry: t("pages.materialPicker.actions.retry"),
      }}
    />
  );
}

export type { MaterialPickerRecord };
