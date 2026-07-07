import { Progress } from "radix-ui";
import {
  ArrowDownToLineIcon,
  CheckCircle2Icon,
  FileSpreadsheetIcon,
  RotateCcwIcon,
  SettingsIcon,
  TriangleAlertIcon,
  XCircleIcon,
  XIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  cancelImportTask,
  dataImportWithProgress,
  downloadTemplateExcel,
  exportErrorExcelDatas,
} from "@/components/data-import/data-import-service";
import { downloadBase64ExcelFile } from "@/components/data-import/file-download";
import { startImportProgressConnection } from "@/components/data-import/signalr-import-client";
import { getDefaultImportHubName, getImportGroupName, getImportListenMethod } from "@/components/data-import/data-import-contract";
import type {
  CommonDataImportDto,
  DataImportRowData,
  DataImportWithProgressResult,
  DownloadTemplateExcelQueryDto,
  ImportModuleKey,
  ImportSignalRReceivedData,
  ImportStatus,
  ImportUiStatus,
} from "@/components/data-import/data-import-contract";

const LOCAL_PROGRESS_STEP = 2;
const LOCAL_PROGRESS_INTERVAL_MS = 300;
const LOCAL_PROGRESS_MAX = 90;

export type DataImportDialogProps = {
  open: boolean;
  moduleKey: ImportModuleKey;
  businessKey: string;
  businessName: string;
  hubName?: string;
  listenMethod?: string;
  serverUrl?: string;
  onOpenChange: (open: boolean) => void;
  onImported?: () => void;
  onConfigureTemplate?: () => void;
};

function generateRequestId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `req-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = String(reader.result ?? "");
      const commaIndex = result.indexOf(",");

      resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error("FileReader error"));
    reader.readAsDataURL(file);
  });
}

function resolveTerminalStatus(
  status: ImportStatus | null | undefined,
): Extract<ImportUiStatus, "success" | "error" | "cancel"> {
  if (status === "ImportSuccess") {
    return "success";
  }

  if (status === "ImportFail") {
    return "error";
  }

  if (status === "ImportClose") {
    return "cancel";
  }

  return "error";
}

export function DataImportDialog({
  open,
  moduleKey,
  businessKey,
  businessName,
  hubName,
  listenMethod,
  serverUrl,
  onOpenChange,
  onImported,
  onConfigureTemplate,
}: DataImportDialogProps) {
  const { t } = useTranslation("common");
  const [status, setStatus] = useState<ImportUiStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [errorRows, setErrorRows] = useState<DataImportRowData[]>([]);
  const [successQty, setSuccessQty] = useState(0);
  const [errorQty, setErrorQty] = useState(0);
  const [parsedTotal, setParsedTotal] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inFlightRef = useRef<{ requestId: string } | null>(null);
  const hasReportedImportRef = useRef(false);
  const signalRConnectionRef = useRef<Awaited<ReturnType<typeof startImportProgressConnection>> | null>(null);
  const serverProgressRef = useRef(0);

  // listenMethod is part of the public contract; reference it so it appears
  // in the React DevTools dependencies and the linter is satisfied.
  // The actual SignalR wiring is conditional on `serverUrl` being set; when
  // it is not, the dialog falls back to local progress only.
  void listenMethod;
  void hubName;
  void onConfigureTemplate;

  useEffect(() => {
    if (open) {
      return;
    }

    // Clean up timers and reset state on close.
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, [open]);

  function startLocalProgressTimer() {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }

    progressIntervalRef.current = setInterval(() => {
      setProgress((current) =>
        current >= LOCAL_PROGRESS_MAX ? current : current + LOCAL_PROGRESS_STEP,
      );
    }, LOCAL_PROGRESS_INTERVAL_MS);
  }

  function stopLocalProgressTimer() {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }

  function resetLocalState() {
    setProgress(0);
    setErrorRows([]);
    setSuccessQty(0);
    setErrorQty(0);
    setParsedTotal(0);
    setErrorMessage(null);
    hasReportedImportRef.current = false;
  }

  function handleTerminalResult(result: DataImportWithProgressResult) {
    stopLocalProgressTimer();
    setProgress(100);

    const status = result.Attach?.Status;
    const record = result.Record ?? 0;
    const total = result.TotalCount ?? result.TotalQty ?? 0;
    const errorCount = record;
    const successCount = Math.max(0, total - errorCount);

    setErrorRows(result.Attach?.ErrorDatas ?? []);
    setErrorQty(errorCount);
    setSuccessQty(successCount);
    setParsedTotal(total);

    const fullSuccess =
      status === "ImportSuccess" && errorCount === 0 && result.Success;

    if (fullSuccess) {
      setStatus("success");
    } else {
      const next = resolveTerminalStatus(status);
      setStatus(next);
    }

    if (fullSuccess && !hasReportedImportRef.current) {
      hasReportedImportRef.current = true;
      onImported?.();
    }
  }

  async function handleFileSelected(file: File) {
    resetLocalState();
    const newRequestId = generateRequestId();
    setRequestId(newRequestId);
    inFlightRef.current = { requestId: newRequestId };
    setStatus("uploading");
    setProgress(0);
    serverProgressRef.current = 0;
    startLocalProgressTimer();

    try {
      // Start SignalR if a serverUrl is configured. The progress events
      // are listened to and max(serverPercent, localPercent) is displayed.
      if (serverUrl) {
        const connection = await startImportProgressConnection({
          serverUrl,
          hubName: getDefaultImportHubName(),
        });
        signalRConnectionRef.current = connection;

        const methodName = getImportListenMethod(
          moduleKey,
          businessKey,
          listenMethod,
        );
        const groupName = getImportGroupName(moduleKey, businessKey);

        connection.onProgress(methodName, (data: ImportSignalRReceivedData) => {
          if (data.RequestId !== newRequestId) {
            return;
          }

          serverProgressRef.current = Math.max(
            serverProgressRef.current,
            Math.min(100, Math.max(0, data.Progress)),
          );

          setProgress((current) =>
            Math.max(current, serverProgressRef.current),
          );

          if (
            data.Status === "ImportSuccess" ||
            data.Status === "ImportFail" ||
            data.Status === "ImportClose"
          ) {
            if (inFlightRef.current?.requestId === newRequestId) {
              setStatus(resolveTerminalStatus(data.Status));
            }
          }
        });

        await connection.joinGroup(groupName);
      }

      const base64 = await readFileAsBase64(file);
      const dto: CommonDataImportDto = {
        ModuleKey: moduleKey,
        BusinessKey: businessKey,
        FileStreamString: base64,
        RequestId: newRequestId,
      };

      const result = await dataImportWithProgress(dto, moduleKey);

      // The dialog may have been closed/canceled while the request was
      // pending. Only settle if this is still the active request.
      if (inFlightRef.current?.requestId !== newRequestId) {
        return;
      }

      handleTerminalResult(result);
    } catch (error) {
      stopLocalProgressTimer();
      if (inFlightRef.current?.requestId !== newRequestId) {
        return;
      }
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : String(error));
    } finally {
      // The SignalR connection is kept open until the dialog closes so
      // the import progress stream can complete.
    }
  }

  function handleReset() {
    inFlightRef.current = null;
    setRequestId(null);
    resetLocalState();
    setStatus("idle");
  }

  function handleDownloadTemplate() {
    const dto: DownloadTemplateExcelQueryDto = {
      IsConfigureImportTemplateExcel: false,
      ModuleKey: moduleKey,
      BusinessKey: businessKey,
      ErrorDatas: [],
    };

    downloadTemplateExcel(dto, moduleKey)
      .then((result) => {
        if (result.Success && typeof result.Attach === "string") {
          downloadBase64ExcelFile(result.Attach, `${businessKey}_template`);
        }
      })
      .catch((error) => {
        setErrorMessage(error instanceof Error ? error.message : String(error));
      });
  }

  function handleExportErrors() {
    exportErrorExcelDatas(
      {
        ModuleKey: moduleKey,
        BusinessKey: businessKey,
        ErrorDatas: errorRows,
      },
      moduleKey,
    )
      .then((result) => {
        if (result.Success && typeof result.Attach === "string") {
          downloadBase64ExcelFile(result.Attach, `${businessKey}_errors`);
        }
      })
      .catch((error) => {
        setErrorMessage(error instanceof Error ? error.message : String(error));
      });
  }

  async function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen && inFlightRef.current && requestId) {
      const currentStatus = status;

      if (
        currentStatus !== "idle" &&
        currentStatus !== "error" &&
        currentStatus !== "cancel" &&
        currentStatus !== "success"
      ) {
        try {
          await cancelImportTask({ RequestId: requestId }, moduleKey);
        } catch {
          // Best-effort cancel; the dialog is closing regardless.
        }
      }

      inFlightRef.current = null;
      stopLocalProgressTimer();
    }

    if (!nextOpen) {
      if (signalRConnectionRef.current) {
        try {
          await signalRConnectionRef.current.dispose();
        } catch {
          // Best-effort cleanup.
        }
        signalRConnectionRef.current = null;
      }
      resetLocalState();
      setStatus("idle");
      setRequestId(null);
    }

    onOpenChange(nextOpen);
  }

  function handleFileInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    void handleFileSelected(file);
  }

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  // The configure-template button is wired up via the sibling template
  // dialog. We just keep the entry point visible here for v1; the actual
  // dialog is opened by the page that renders this dialog.

  const statusBadge = (() => {
    if (status === "uploading") {
      return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <FileSpreadsheetIcon className="size-4 animate-pulse" />
          {t("pages.dataImport.uploading")}
        </div>
      );
    }

    if (status === "success") {
      return (
        <div className="flex items-center gap-2 text-sm text-emerald-600">
          <CheckCircle2Icon className="size-4" />
          {t("pages.dataImport.importSuccess")}
        </div>
      );
    }

    if (status === "error") {
      return (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <XCircleIcon className="size-4" />
          {t("pages.dataImport.importFailed")}
        </div>
      );
    }

    if (status === "cancel") {
      return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <TriangleAlertIcon className="size-4" />
          {t("pages.dataImport.importCanceled")}
        </div>
      );
    }

    return null;
  })();

  const isUploading = status === "uploading";
  const hasErrorRows = errorRows.length > 0;
  const showStatusSummary =
    status === "success" || status === "error" || status === "cancel";

  return (
    <Dialog open={open} onOpenChange={(value) => void handleOpenChange(value)}>
      <DialogContent
        data-testid="data-import-dialog"
        className="w-[min(100%-2rem,32rem)]"
        showFullscreenButton={false}
      >
        <DialogHeader>
          <DialogTitle>
            {t("pages.dataImport.dialogTitle")} - {businessName}
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          {t("pages.dataImport.instructions")}
        </p>

        {errorMessage ? (
          <p
            role="alert"
            className="text-sm text-destructive"
            data-testid="data-import-error"
          >
            {errorMessage}
          </p>
        ) : null}

        {isUploading ? (
          <Progress.Root
            value={progress}
            max={100}
            className="relative h-2 w-full overflow-hidden rounded-full bg-muted"
          >
            <Progress.Indicator
              className="h-full w-full flex-1 bg-primary transition-transform"
              style={{ transform: `translateX(-${100 - progress}%)` }}
            />
          </Progress.Root>
        ) : null}

        {statusBadge}

        {showStatusSummary ? (
          <div className="rounded-md border p-3 text-sm" data-testid="data-import-summary">
            <div>
              {t("pages.dataImport.parsedTotal")}: {parsedTotal}
            </div>
            <div>
              {t("pages.dataImport.successCount")}: {successQty}
            </div>
            <div>
              {t("pages.dataImport.errorCount")}: {errorQty}
            </div>
          </div>
        ) : null}

        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          data-testid="data-import-file-input"
          onChange={handleFileInputChange}
        />

        <DialogFooter className="flex-wrap">
          {status === "idle" || status === "cancel" || status === "error" ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={openFilePicker}
                disabled={isUploading}
              >
                <FileSpreadsheetIcon data-icon="inline-start" />
                {t("pages.dataImport.selectFile")}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={handleDownloadTemplate}
                disabled={isUploading}
              >
                <ArrowDownToLineIcon data-icon="inline-start" />
                {t("pages.dataImport.downloadTemplate")}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  onConfigureTemplate?.();
                }}
                disabled={isUploading}
              >
                <SettingsIcon data-icon="inline-start" />
                {t("pages.dataImport.configureTemplate")}
              </Button>
            </>
          ) : null}

          {status === "success" || status === "error" || status === "cancel" ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
              >
                <RotateCcwIcon data-icon="inline-start" />
                {t("pages.dataImport.resetUpload")}
              </Button>
              {hasErrorRows ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleExportErrors}
                >
                  <ArrowDownToLineIcon data-icon="inline-start" />
                  {t("pages.dataImport.exportErrorData")}
                </Button>
              ) : null}
            </>
          ) : null}

          <Button
            type="button"
            variant="ghost"
            onClick={() => void handleOpenChange(false)}
            disabled={isUploading}
          >
            <XIcon data-icon="inline-start" />
            {t("pages.dataImport.close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
