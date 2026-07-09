import { toast, type ExternalToast } from "sonner";

import { HttpClientError, type DataResult } from "@/lib/api/http-client";
import { i18n } from "@/i18n/config";

// 前端消息统一前缀。前端文案自动加 `[F]`，与后端 res.Message 区分。
// 调用方已传入 `[F]` 前缀或显式 raw:true 时不重复拼接。
const FRONTEND_PREFIX = "[F]";

type NotifyOptions = ExternalToast & {
  // 跳过自动加 `[F]` 前缀，用于已经把文案拼接好的场景（例如直接透传后端 Message）。
  raw?: boolean;
};

function withFrontendPrefix(message: string, options?: NotifyOptions) {
  if (options?.raw) {
    return message;
  }

  if (message.startsWith(FRONTEND_PREFIX)) {
    return message;
  }

  return `${FRONTEND_PREFIX} ${message}`;
}

function extractBackendMessage(error: unknown): string | null {
  // 仅当错误来自 HttpClientError 时才把 message 当作后端提示透出。
  // 其他类型（普通 Error、字符串等）可能是网络层或前端内部错误，文案不可控，
  // 因此统一回退到 fallback i18n。
  if (error instanceof HttpClientError) {
    return error.message || null;
  }

  return null;
}

// `notify.success` 把消息作为主标题，自动加 `[F]` 前缀。
// `options.description` 直接作为 sonner 副标题，常用于展示后端 res.Message。
export function notifySuccess(message: string, options?: NotifyOptions) {
  const { raw: _raw, ...rest } = options ?? {};
  return toast.success(withFrontendPrefix(message, options), rest);
}

// `notify.error` 把消息作为主标题，自动加 `[F]` 前缀。
// `options.description` 直接作为 sonner 副标题，常用于展示后端 res.Message。
export function notifyError(message: string, options?: NotifyOptions) {
  const { raw: _raw, ...rest } = options ?? {};
  return toast.error(withFrontendPrefix(message, options), rest);
}

// 从 HttpClientError 中提取后端 Message，作为副标题展示。
// `fallback` 通常是 i18n 文案，作为主标题；后端 Message 缺失时回退到仅展示 fallback。
export function notifyFromHttpClientError(
  error: unknown,
  fallback: string,
  options?: Omit<NotifyOptions, "description">,
) {
  const backendMessage = extractBackendMessage(error);
  const description = backendMessage && backendMessage !== fallback ? backendMessage : undefined;

  return notifyError(fallback, { ...options, ...(description ? { description } : {}) });
}

// 接口成功路径：i18nKey 作为主标题，dataResult.Message 作为副标题（若有）。
// `dataResult.Message` 与 i18nKey 翻译结果重复时只显示翻译结果。
export function notifyApiSuccess<T>(
  i18nKey: string,
  dataResult: DataResult<T> | null | undefined,
  options?: NotifyOptions,
) {
  const translated = i18n.t(i18nKey);
  const backendMessage = dataResult?.Message?.trim() ?? "";
  const description = backendMessage && backendMessage !== translated ? backendMessage : undefined;

  return notifySuccess(translated, {
    ...options,
    ...(description ? { description } : {}),
  });
}

export const notify = {
  success: notifySuccess,
  error: notifyError,
  fromHttpClientError: notifyFromHttpClientError,
  apiSuccess: notifyApiSuccess,
};