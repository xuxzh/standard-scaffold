import {
  MutationCache,
  QueryCache,
  QueryClient,
} from "@tanstack/react-query";

import { i18n } from "@/i18n/config";
import { notify } from "@/lib/notify";

// 全局统一的 React Query 错误处理：把 HttpClientError 统一交给 notify 包装，
// 让任意 useQuery/useMutation 抛出的业务错误都自动变成顶部居中带 [F] 前缀的提示。
// 页面只需要显式调用 notify.success / notify.apiSuccess 处理成功反馈。
export function createAppQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error) => {
        notify.fromHttpClientError(
          error,
          i18n.t("common:feedback.loadFailed"),
        );
      },
    }),
    mutationCache: new MutationCache({
      onError: (error) => {
        notify.fromHttpClientError(
          error,
          i18n.t("common:feedback.submitFailed"),
        );
      },
    }),
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 30_000,
      },
    },
  });
}
