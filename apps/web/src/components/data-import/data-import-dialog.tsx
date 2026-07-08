import { Progress } from "radix-ui";
import {
  ArrowDownToLineIcon,
  CheckCircle2Icon,
  FileSpreadsheetIcon,
  InfoIcon,
  RotateCcwIcon,
  SettingsIcon,
  TriangleAlertIcon,
  XCircleIcon,
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
import {
  getDefaultImportHubName,
  getImportGroupName,
  getImportListenMethod,
} from "@/components/data-import/data-import-contract";
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
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
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
    reader.onerror = () =>
      reject(reader.error ?? new Error("FileReader error"));
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
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const inFlightRef = useRef<{ requestId: string } | null>(null);
  const hasReportedImportRef = useRef(false);
  const signalRConnectionRef = useRef<Awaited<
    ReturnType<typeof startImportProgressConnection>
  > | null>(null);
  const serverProgressRef = useRef(0);

  // listenMethod is part of the public contract; reference it so it appears
  // in the React DevTools dependencies and the linter is satisfied.
  // The actual SignalR wiring is conditional on `serverUrl` being set; when
  // it is not, the dialog falls back to local progress only.
  void listenMethod;
  void hubName;

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
  void businessName;

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
  const canSelectFile =
    status === "idle" || status === "cancel" || status === "error";

  return (
    <Dialog open={open} onOpenChange={(value) => void handleOpenChange(value)}>
      <DialogContent
        data-testid="data-import-dialog"
        className="grid h-[min(calc(100vh-1.5rem),600px)] max-h-[min(calc(100vh-1.5rem),600px)] w-[min(calc(100vw-1.5rem),800px)] max-w-[min(calc(100vw-1.5rem),800px)] grid-rows-[auto_1fr_auto] gap-0 overflow-hidden rounded-[3px] border border-[#d9d9d9] bg-white p-0 shadow-2xl [&>div.absolute]:top-6 [&>div.absolute]:right-7 [&>div.absolute]:gap-2 [&>div.absolute>button]:size-9 [&>div.absolute>button]:rounded-none [&>div.absolute>button]:bg-transparent [&>div.absolute>button]:shadow-none [&>div.absolute>button>svg]:!size-8 [&>div.absolute>button[data-variant=destructive]]:text-[#ff0000] [&>div.absolute>button[data-variant=destructive]:hover]:bg-transparent [&>div.absolute>button[data-variant=ghost]]:text-[#278aff] [&>div.absolute>button[data-variant=ghost]:hover]:bg-transparent"
      >
        <DialogHeader className="justify-center border-b border-[#eeeeee] px-7 py-5 pr-28">
          <DialogTitle className="text-[28px] leading-9 font-semibold text-[#2f343b]">
            {t("pages.dataImport.dialogTitle")}
          </DialogTitle>
        </DialogHeader>

        <div className="flex min-h-0 flex-col px-7 pt-4 pb-4">
          <div className="flex min-h-[70px] items-center gap-3 rounded-lg bg-[#f7fbff] px-8 text-[17px] leading-7 font-semibold text-[#7a808a]">
            <InfoIcon className="size-5 shrink-0 fill-[#3b82f6] text-white" />
            <span>{t("pages.dataImport.instructions")}</span>
          </div>

          <div className="flex min-h-[116px] items-center justify-end gap-10 text-[16px] font-semibold text-[#1e88ff]">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                onConfigureTemplate?.();
              }}
              disabled={isUploading}
              className="h-10 px-0 text-[16px] font-semibold text-[#1e88ff] hover:bg-transparent hover:text-[#1e88ff]"
            >
              <SettingsIcon className="size-5" data-icon="inline-start" />
              {t("pages.dataImport.configureTemplate")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={handleDownloadTemplate}
              disabled={isUploading}
              className="h-10 px-0 text-[16px] font-semibold text-[#1e88ff] hover:bg-transparent hover:text-[#1e88ff]"
            >
              <ArrowDownToLineIcon
                className="size-5"
                data-icon="inline-start"
              />
              {t("pages.dataImport.downloadTemplate")}
            </Button>
          </div>

          {errorMessage ? (
            <p
              role="alert"
              className="mb-3 text-sm text-destructive"
              data-testid="data-import-error"
            >
              {errorMessage}
            </p>
          ) : null}

          {isUploading ? (
            <Progress.Root
              value={progress}
              max={100}
              className="relative mb-3 h-2 w-full overflow-hidden rounded-full bg-[#eef3f8]"
            >
              <Progress.Indicator
                className="h-full w-full flex-1 bg-[#1e88ff] transition-transform"
                style={{ transform: `translateX(-${100 - progress}%)` }}
              />
            </Progress.Root>
          ) : null}

          {statusBadge ? <div className="mb-3">{statusBadge}</div> : null}

          {showStatusSummary ? (
            <div
              className="mb-3 grid gap-1 rounded-md border border-[#e5e7eb] bg-[#fafafa] p-3 text-sm text-[#4b5563]"
              data-testid="data-import-summary"
            >
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

          <div className="flex min-h-0 flex-1 items-center justify-center rounded-lg border border-[#e4e8ef] bg-white">
            <div className="flex flex-col items-center">
              <div
                aria-hidden="true"
                className="relative mb-10 size-24 drop-shadow-[0_28px_26px_rgba(30,136,255,0.24)]"
              >
                <div className="absolute top-5 left-3 h-14 w-16 rounded-[5px] bg-linear-to-br from-[#1765e8] to-[#25a2ff]" />
                <div className="absolute top-4 left-3 h-4 w-11 rounded-t-[5px] bg-[#1976ef]" />
                <div className="absolute top-8 left-5 h-1.5 w-7 rounded-full bg-white/70" />
                <div className="absolute right-2 bottom-4 flex size-12 rotate-[-12deg] items-center justify-center rounded-[12px] bg-linear-to-br from-[#7cc7ff] to-[#3b8dff] text-sm font-bold text-white shadow-lg">
                  v
                </div>
              </div>
              <p className="mb-5 text-[17px] leading-7 font-semibold text-[#777f8b]">
                {t("pages.dataImport.uploadHint")}
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={openFilePicker}
                disabled={!canSelectFile || isUploading}
                className="h-10 min-w-[160px] border-[#1e88ff] px-6 text-[18px] font-semibold text-[#1e88ff] hover:bg-[#f0f7ff] hover:text-[#1e88ff]"
              >
                {t("pages.dataImport.selectFile")}
              </Button>
            </div>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          data-testid="data-import-file-input"
          onChange={handleFileInputChange}
        />

        <DialogFooter className="mt-4 flex-row justify-end border-t border-[#eeeeee] bg-[#fafafa] px-7 py-4 sm:justify-end">
          {status === "success" || status === "error" || status === "cancel" ? (
            <>
              <Button type="button" variant="outline" onClick={handleReset}>
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
            variant="outline"
            onClick={() => void handleOpenChange(false)}
            disabled={isUploading}
            className="h-10 min-w-[110px] border-[#d9d9d9] bg-white px-6 text-[17px] font-normal text-[#2f343b] hover:bg-[#f5f5f5]"
          >
            {t("pages.dataImport.close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
