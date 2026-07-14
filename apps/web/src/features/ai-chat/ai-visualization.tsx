import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  aiVisualizationV1Schema,
  type AiVisualizationV1,
  type MesMetricBinding,
  type MesScalar,
} from "@repo/ai-visualization-contract";
import embed from "vega-embed";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { compileVegaLiteSpec } from "./vega-lite-spec";

export function AiVisualization({
  visualization,
}: {
  visualization: AiVisualizationV1;
}): React.JSX.Element | null {
  const parsed = aiVisualizationV1Schema.safeParse(visualization);
  const { t, i18n } = useTranslation("common");
  if (!parsed.success) {
    return null;
  }
  const value = visualization;
  const firstRow = value.data.rows[0];

  return (
    <section className="mt-3 flex min-w-0 flex-col gap-3" aria-label={value.title}>
      {value.kpis.length > 0 && firstRow && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {value.kpis.map((kpi) => (
            <div key={kpi.field} className="rounded-md border bg-background px-3 py-2">
              <div className="text-xs text-muted-foreground">{kpi.label}</div>
              <div className="font-mono text-lg font-semibold tabular-nums">
                {formatMetric(firstRow[kpi.field], kpi, i18n.language)}
              </div>
            </div>
          ))}
        </div>
      )}

      {value.chart && <VisualizationChart visualization={value} />}

      {value.data.truncated && (
        <p className="text-xs text-muted-foreground">
          {t("aiChat.visualizationTruncated")}
        </p>
      )}

      <Table containerClassName="max-w-full" aria-label={t("aiChat.visualizationTableLabel")}>
        <TableHeader>
          <TableRow>
            {value.table.columns.map((column) => (
              <TableHead key={column.field}>{column.label}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {value.data.rows.map((row, rowIndex) => (
            <TableRow key={rowIndex}>
              {value.table.columns.map((column) => (
                <TableCell key={column.field}>
                  {"format" in column
                    ? formatMetric(row[column.field], column, i18n.language)
                    : formatScalar(row[column.field])}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  );
}

function VisualizationChart({
  visualization,
}: {
  visualization: AiVisualizationV1;
}) {
  const { t } = useTranslation("common");
  const container = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const compiled = useMemo(() => {
    try {
      return { spec: compileVegaLiteSpec(visualization), failed: false };
    } catch {
      return { spec: undefined, failed: true };
    }
  }, [visualization]);

  useEffect(() => {
    const element = container.current;
    let active = true;
    let finalize: (() => void) | undefined;
    if (!element || !compiled.spec) return;
    void embed(element, compiled.spec, { actions: false, renderer: "svg" })
      .then((result) => {
        if (active) {
          finalize = () => result.view.finalize();
        } else {
          result.view.finalize();
        }
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
      finalize?.();
    };
  }, [compiled.spec]);

  return failed || compiled.failed ? (
    <p className="text-xs text-muted-foreground">
      {t("aiChat.visualizationUnavailable")}
    </p>
  ) : (
    <div
      ref={container}
      className="min-h-[220px] min-w-0 overflow-hidden rounded-md border bg-background p-2"
      role="img"
      aria-label={t("aiChat.visualizationChartLabel", { title: visualization.title })}
    />
  );
}

function formatMetric(
  value: MesScalar | undefined,
  binding: MesMetricBinding,
  locale: string,
): string {
  if (typeof value !== "number") return "—";
  return new Intl.NumberFormat(locale, {
    style: binding.format === "percent" ? "percent" : "decimal",
    maximumFractionDigits: binding.format === "integer" ? 0 : 2,
  }).format(value);
}

function formatScalar(value: MesScalar | undefined): string {
  return value === null || value === undefined ? "—" : String(value);
}
