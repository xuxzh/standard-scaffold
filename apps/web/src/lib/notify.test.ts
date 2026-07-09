import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { HttpClientError } from "@/lib/api/http-client";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/i18n/config", () => ({
  i18n: {
    t: (key: string) => {
      const map: Record<string, string> = {
        "common:feedback.loadFailed": "加载失败",
        "common:feedback.submitFailed": "提交失败",
        "pages.foo.feedback.created": "已创建",
      };
      return map[key] ?? key;
    },
  },
}));

const { toast } = await import("sonner");
const { notify } = await import("@/lib/notify");

const toastSuccess = toast.success as unknown as ReturnType<typeof vi.fn>;
const toastError = toast.error as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  toastSuccess.mockReset();
  toastError.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("notify.success", () => {
  it("自动添加 [F] 前缀", () => {
    notify.success("保存成功");
    expect(toastSuccess).toHaveBeenCalledWith("[F] 保存成功", {});
  });

  it("description 透传给 sonner", () => {
    notify.success("保存成功", { description: "后端 Message" });
    expect(toastSuccess).toHaveBeenCalledWith("[F] 保存成功", {
      description: "后端 Message",
    });
  });

  it("raw:true 时不再加前缀", () => {
    notify.success("raw 消息", { raw: true });
    expect(toastSuccess).toHaveBeenCalledWith("raw 消息", {});
  });

  it("已带 [F] 前缀时不重复拼接", () => {
    notify.success("[F] 已经处理过");
    expect(toastSuccess).toHaveBeenCalledWith("[F] 已经处理过", {});
  });
});

describe("notify.error", () => {
  it("自动添加 [F] 前缀", () => {
    notify.error("提交失败");
    expect(toastError).toHaveBeenCalledWith("[F] 提交失败", {});
  });

  it("description 透传给 sonner", () => {
    notify.error("提交失败", { description: "后端 Message" });
    expect(toastError).toHaveBeenCalledWith("[F] 提交失败", {
      description: "后端 Message",
    });
  });
});

describe("notify.fromHttpClientError", () => {
  it("HttpClientError 时把后端 message 作为 description", () => {
    const err = new HttpClientError({
      message: "后端报错",
      code: "BUSINESS_ERROR",
    });
    notify.fromHttpClientError(err, "提交失败");
    expect(toastError).toHaveBeenCalledWith("[F] 提交失败", {
      description: "后端报错",
    });
  });

  it("非 HttpClientError 时只显示 fallback", () => {
    notify.fromHttpClientError(new Error("network"), "提交失败");
    expect(toastError).toHaveBeenCalledWith("[F] 提交失败", {});
  });

  it("后端 message 与 fallback 相同时不重复展示 description", () => {
    const err = new HttpClientError({
      message: "提交失败",
      code: "BUSINESS_ERROR",
    });
    notify.fromHttpClientError(err, "提交失败");
    expect(toastError).toHaveBeenCalledWith("[F] 提交失败", {});
  });

  it("error 为 null 时只显示 fallback", () => {
    notify.fromHttpClientError(null, "提交失败");
    expect(toastError).toHaveBeenCalledWith("[F] 提交失败", {});
  });
});

describe("notify.apiSuccess", () => {
  it("后端 Message 非空时作为 description", () => {
    notify.apiSuccess("pages.foo.feedback.created", {
      Success: true,
      Code: null,
      Message: "已新建",
      Attach: null,
      SkipCount: 0,
      TotalCount: 0,
      Record: 0,
    });
    expect(toastSuccess).toHaveBeenCalledWith("[F] 已创建", {
      description: "已新建",
    });
  });

  it("后端 Message 为空时只显示翻译结果", () => {
    notify.apiSuccess("pages.foo.feedback.created", {
      Success: true,
      Code: null,
      Message: "",
      Attach: null,
      SkipCount: 0,
      TotalCount: 0,
      Record: 0,
    });
    expect(toastSuccess).toHaveBeenCalledWith("[F] 已创建", {});
  });

  it("dataResult 为 null 时不展示 description", () => {
    notify.apiSuccess("pages.foo.feedback.created", null);
    expect(toastSuccess).toHaveBeenCalledWith("[F] 已创建", {});
  });
});