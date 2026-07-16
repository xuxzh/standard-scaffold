import { useMemo, useState } from "react";
import { CheckIcon, RotateCcwIcon, SaveIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { notify } from "@/lib/notify";
import {
  loadDebugIpRewriteProxyConfigFromStorage,
  saveDebugIpRewriteProxyConfigToStorage,
} from "@/lib/debug-ip-rewrite-proxy/debug-ip-rewrite-proxy-config-store";
import {
  defaultDebugIpRewriteProxyConfig,
  formatDebugIpRewriteProxyPorts,
  getDebugIpRewriteProxyPreview,
  getDefaultDebugIpRewriteProxyBaseUrls,
  isAbsoluteHttpUrl,
  normalizeDebugIpRewriteProxyConfig,
  parseDebugIpRewriteProxyPorts,
  type DebugIpRewriteProxyConfig,
  type DebugIpRewriteProxyMode,
  type DebugIpRewriteProxyPreview,
} from "@/lib/debug-ip-rewrite-proxy/debug-ip-rewrite-proxy";

type ModeOption = {
  value: DebugIpRewriteProxyMode;
  label: string;
};

const MODE_OPTIONS: ModeOption[] = [
  { value: "ports", label: "端口拦截" },
  { value: "regex", label: "正则匹配" },
  { value: "all", label: "全部拦截" },
];

const TARGET_HOST_INPUT_ID = "debug-ip-rewrite-proxy-target-host";
const PORTS_INPUT_ID = "debug-ip-rewrite-proxy-ports";
const PATTERN_INPUT_ID = "debug-ip-rewrite-proxy-pattern";
const ORIGINAL_URL_INPUT_ID = "debug-ip-rewrite-proxy-original-url";
const ENABLED_SWITCH_ID = "debug-ip-rewrite-proxy-enabled";
const BASE_URL_INPUT_IDS = {
  app: "debug-ip-rewrite-proxy-base-url-app",
  wms: "debug-ip-rewrite-proxy-base-url-wms",
  mes: "debug-ip-rewrite-proxy-base-url-mes",
  print: "debug-ip-rewrite-proxy-base-url-print",
} as const;
type BaseUrlKey = keyof typeof BASE_URL_INPUT_IDS;

function configToForm(config: DebugIpRewriteProxyConfig) {
  return {
    enabled: config.enabled,
    targetHost: config.targetHost,
    mode: config.mode,
    portsText: formatDebugIpRewriteProxyPorts(config.ports),
    pattern: config.pattern,
    baseUrls: { ...config.baseUrls },
  };
}

function formToConfig(form: ReturnType<typeof configToForm>): DebugIpRewriteProxyConfig {
  const ports =
    form.mode === "ports" ? parseDebugIpRewriteProxyPorts(form.portsText) : [];

  return normalizeDebugIpRewriteProxyConfig({
    enabled: form.enabled,
    targetHost: form.targetHost,
    mode: form.mode,
    ports,
    pattern: form.pattern,
    baseUrls: form.baseUrls,
  });
}

export function DebugIpRewriteProxyPage() {
  const { t } = useTranslation("common");

  const [form, setForm] = useState(() =>
    configToForm(loadDebugIpRewriteProxyConfigFromStorage()),
  );
  const [originalUrl, setOriginalUrl] = useState("");
  const [saving, setSaving] = useState(false);

  const normalizedConfig = useMemo(() => {
    try {
      return formToConfig(form);
    } catch {
      return null;
    }
  }, [form]);

  const preview: DebugIpRewriteProxyPreview | null = useMemo(() => {
    if (!normalizedConfig || !originalUrl.trim()) {
      return null;
    }
    return getDebugIpRewriteProxyPreview(normalizedConfig, originalUrl);
  }, [normalizedConfig, originalUrl]);

  const baseUrlsInvalid = useMemo(
    () =>
      (Object.keys(BASE_URL_INPUT_IDS) as BaseUrlKey[]).some(
        (key) => !isAbsoluteHttpUrl(form.baseUrls[key]),
      ),
    [form.baseUrls],
  );

  function updateField<K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateBaseUrl(key: BaseUrlKey, value: string) {
    setForm((prev) => ({
      ...prev,
      baseUrls: { ...prev.baseUrls, [key]: value },
    }));
  }

  function handleReset() {
    const defaults: DebugIpRewriteProxyConfig = {
      ...defaultDebugIpRewriteProxyConfig,
      baseUrls: getDefaultDebugIpRewriteProxyBaseUrls(),
    };
    setForm(configToForm(defaults));
    setOriginalUrl("");
  }

  function handleSave() {
    if (!normalizedConfig) {
      return;
    }

    setSaving(true);
    try {
      const saved = saveDebugIpRewriteProxyConfigToStorage(normalizedConfig);
      setForm(configToForm(saved));
      notify.success(t("pages.debugIpRewriteProxy.feedback.saved"));
    } catch (error) {
      notify.error(
        error instanceof Error
          ? error.message
          : t("pages.debugIpRewriteProxy.feedback.loadFailed"),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-6">
      <Card>
        <CardContent className="flex flex-col gap-6">
          <FieldGroup>
            <Field
              orientation="horizontal"
              className="items-center justify-between gap-4"
            >
              <FieldLabel htmlFor={ENABLED_SWITCH_ID} className="text-sm font-medium">
                启用代理
              </FieldLabel>
              <Switch
                id={ENABLED_SWITCH_ID}
                checked={form.enabled}
                onCheckedChange={(checked) => updateField("enabled", checked)}
                aria-label="启用代理"
              />
            </Field>

            <Field>
              <FieldLabel htmlFor={TARGET_HOST_INPUT_ID}>替换目标 IP/Host</FieldLabel>
              <Input
                id={TARGET_HOST_INPUT_ID}
                value={form.targetHost}
                onChange={(event) => updateField("targetHost", event.target.value)}
                placeholder="例如 127.0.0.1"
                autoComplete="off"
              />
            </Field>

            <Field>
              <FieldLabel>匹配模式</FieldLabel>
              <div className="flex flex-wrap gap-2" role="group" aria-label="匹配模式">
                {MODE_OPTIONS.map((option) => {
                  const selected = form.mode === option.value;
                  return (
                    <Button
                      key={option.value}
                      type="button"
                      variant={selected ? "default" : "outline"}
                      onClick={() => updateField("mode", option.value)}
                    >
                      {selected ? <CheckIcon data-icon="inline-start" /> : null}
                      {option.label}
                    </Button>
                  );
                })}
              </div>
            </Field>

            {form.mode === "ports" ? (
              <Field>
                <FieldLabel htmlFor={PORTS_INPUT_ID}>端口列表</FieldLabel>
                <Input
                  id={PORTS_INPUT_ID}
                  value={form.portsText}
                  onChange={(event) => updateField("portsText", event.target.value)}
                  placeholder="例如 8288,8283"
                  autoComplete="off"
                />
              </Field>
            ) : null}

            {form.mode === "regex" ? (
              <Field>
                <FieldLabel htmlFor={PATTERN_INPUT_ID}>正则表达式</FieldLabel>
                <Input
                  id={PATTERN_INPUT_ID}
                  value={form.pattern}
                  onChange={(event) => updateField("pattern", event.target.value)}
                  placeholder="例如 ^http://192\\.168\\.1\\.20:8288/api/order/.*"
                  autoComplete="off"
                />
              </Field>
            ) : null}
          </FieldGroup>

          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
              disabled={saving}
            >
              <RotateCcwIcon data-icon="inline-start" />
              重置配置
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={saving || !normalizedConfig}
            >
              <SaveIcon data-icon="inline-start" />
              保存配置
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("pages.debugIpRewriteProxy.baseUrlsCardTitle")}</CardTitle>
          <CardDescription>
            {t("pages.debugIpRewriteProxy.fields.baseUrlsDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <FieldGroup>
            {(Object.keys(BASE_URL_INPUT_IDS) as BaseUrlKey[]).map((key) => (
              <Field key={key}>
                <FieldLabel htmlFor={BASE_URL_INPUT_IDS[key]}>
                  {t(`pages.debugIpRewriteProxy.fields.${key}BaseUrl`)}
                </FieldLabel>
                <Input
                  id={BASE_URL_INPUT_IDS[key]}
                  value={form.baseUrls[key]}
                  onChange={(event) => updateBaseUrl(key, event.target.value)}
                  placeholder="例如 http://192.168.0.135:8282"
                  autoComplete="off"
                />
              </Field>
            ))}
          </FieldGroup>

          {form.enabled && baseUrlsInvalid ? (
            <p
              role="alert"
              className="text-sm text-destructive"
              data-testid="debug-ip-rewrite-proxy-base-urls-warning"
            >
              {t("pages.debugIpRewriteProxy.warnings.baseUrlsRequired")}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>命中预览</CardTitle>
          <CardDescription>
            输入完整 URL，查看代理在当前配置下生成的请求目标。
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor={ORIGINAL_URL_INPUT_ID}>原始 URL</FieldLabel>
            <Input
              id={ORIGINAL_URL_INPUT_ID}
              value={originalUrl}
              onChange={(event) => setOriginalUrl(event.target.value)}
              placeholder="例如 http://192.168.1.20:8288/api/users?id=1"
              autoComplete="off"
            />
          </Field>

          {preview ? (
            preview.ok ? (
              <div
                data-testid="debug-ip-rewrite-proxy-preview-result"
                className="rounded-md border bg-muted/30 p-4 text-sm"
              >
                {preview.matched ? (
                  <p className="flex flex-col gap-1">
                    <span className="text-muted-foreground">命中，替换为：</span>
                    <code className="break-all font-mono text-base">
                      {preview.rewrittenUrl}
                    </code>
                  </p>
                ) : (
                  <p className="text-muted-foreground">
                    未命中规则，请求会按当前 baseUrl 配置直接发出。
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-destructive" role="alert">
                {preview.error}
              </p>
            )
          ) : (
            <p className="text-sm text-muted-foreground">
              填写完整 URL 即可查看命中结果。
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
