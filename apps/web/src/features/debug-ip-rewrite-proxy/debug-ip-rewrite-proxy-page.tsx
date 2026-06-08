import { useEffect, useMemo, useState } from "react";
import { CheckIcon, RotateCcwIcon, SaveIcon } from "lucide-react";
import { toast } from "sonner";
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
import { cn } from "@/lib/utils";
import {
  defaultDebugIpRewriteProxyConfig,
  formatDebugIpRewriteProxyPorts,
  getDebugIpRewriteProxyPreview,
  normalizeDebugIpRewriteProxyConfig,
  parseDebugIpRewriteProxyPorts,
  type DebugIpRewriteProxyConfig,
  type DebugIpRewriteProxyMode,
  type DebugIpRewriteProxyPreview,
} from "@/lib/debug-ip-rewrite-proxy/debug-ip-rewrite-proxy";
import {
  getDebugIpRewriteProxyConfig,
  saveDebugIpRewriteProxyConfig,
} from "./debug-ip-rewrite-proxy-service";

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

function configToForm(config: DebugIpRewriteProxyConfig) {
  return {
    enabled: config.enabled,
    targetHost: config.targetHost,
    mode: config.mode,
    portsText: formatDebugIpRewriteProxyPorts(config.ports),
    pattern: config.pattern,
  };
}

export function DebugIpRewriteProxyPage() {
  const [form, setForm] = useState(() =>
    configToForm(defaultDebugIpRewriteProxyConfig),
  );
  const [originalUrl, setOriginalUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const config = await getDebugIpRewriteProxyConfig();
        if (!cancelled) {
          setForm(configToForm(config));
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(
            error instanceof Error ? error.message : "加载调试代理配置失败",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const normalizedConfig = useMemo(() => {
    try {
      const ports =
        form.mode === "ports"
          ? parseDebugIpRewriteProxyPorts(form.portsText)
          : [];
      return normalizeDebugIpRewriteProxyConfig({
        enabled: form.enabled,
        targetHost: form.targetHost,
        mode: form.mode,
        ports,
        pattern: form.pattern,
      });
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

  function updateField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleReset() {
    setForm(configToForm(defaultDebugIpRewriteProxyConfig));
    setOriginalUrl("");
  }

  async function handleSave() {
    if (!normalizedConfig) {
      return;
    }

    setSaving(true);
    try {
      const next = await saveDebugIpRewriteProxyConfig(normalizedConfig);
      setForm(configToForm(next));
      toast.success("调试代理配置已保存");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "调试代理配置保存失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-6">
      <Card>
        <CardContent className="flex flex-col gap-6">
          <FieldGroup>
            <Field orientation="horizontal" className="items-center justify-between gap-4">
              <FieldLabel htmlFor={ENABLED_SWITCH_ID} className="text-sm font-medium">
                启用代理
              </FieldLabel>
              <button
                id={ENABLED_SWITCH_ID}
                type="button"
                role="switch"
                aria-checked={form.enabled}
                aria-label="启用代理"
                className={cn(
                  "relative inline-flex h-6 w-11 items-center rounded-full border transition-colors",
                  form.enabled
                    ? "border-primary bg-primary/20"
                    : "border-border bg-muted",
                )}
                onClick={() => updateField("enabled", !form.enabled)}
              >
                <span
                  className={cn(
                    "inline-block h-5 w-5 rounded-full bg-background shadow transition-transform",
                    form.enabled ? "translate-x-5" : "translate-x-0.5",
                  )}
                />
              </button>
            </Field>

            <Field>
              <FieldLabel htmlFor={TARGET_HOST_INPUT_ID}>替换目标 IP/Host</FieldLabel>
              <Input
                id={TARGET_HOST_INPUT_ID}
                value={form.targetHost}
                onChange={(event) => updateField("targetHost", event.target.value)}
                placeholder="例如 127.0.0.1"
                autoComplete="off"
                disabled={loading}
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
                      disabled={loading}
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
                  disabled={loading}
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
                  disabled={loading}
                />
              </Field>
            ) : null}
          </FieldGroup>

          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
              disabled={loading || saving}
            >
              <RotateCcwIcon data-icon="inline-start" />
              重置配置
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={loading || saving || !normalizedConfig}
            >
              <SaveIcon data-icon="inline-start" />
              保存配置
            </Button>
          </div>
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
                    未命中规则，请求会按当前 Vite dev proxy 的默认 target 转发。
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
