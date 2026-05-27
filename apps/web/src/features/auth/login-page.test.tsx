import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "@/i18n/config";
import { App } from "@/root-app";
import {
  resetAppTransportForTests,
  setAppTransportForTests,
} from "@/lib/api/app-client";
import type { DataResult, Transport } from "@/lib/api/http-client";

function tokenResult(): DataResult<{
  TokenType: string;
  AccessToken: string;
  ExpiresIn: number;
  RefreshToken: string;
}> {
  return {
    Success: true,
    Code: null,
    Message: "ok",
    Record: 1,
    SkipCount: 0,
    TotalCount: 1,
    Attach: {
      TokenType: "Bearer",
      AccessToken: "access-1",
      ExpiresIn: 604800,
      RefreshToken: "refresh-1",
    },
  };
}

beforeEach(async () => {
  localStorage.clear();
  await i18n.changeLanguage("zh-CN");
});

afterEach(() => {
  resetAppTransportForTests();
});

describe("LoginPage", () => {
  it("submits UserCode and Password then returns to the redirect target", async () => {
    const transport = vi.fn<Transport>(async () => ({
      status: 200,
      data: tokenResult(),
    }));
    setAppTransportForTests(transport);

    render(<App initialEntries={["/login?redirect=/packaging/packaging-type"]} />);

    fireEvent.change(await screen.findByLabelText("用户编码"), {
      target: { value: "DemoAdmin" },
    });
    fireEvent.change(screen.getByLabelText("密码"), {
      target: { value: "Icpt1357!!" },
    });
    fireEvent.click(screen.getByRole("button", { name: "登录" }));

    await waitFor(() => {
      expect(transport).toHaveBeenCalledWith(
        expect.objectContaining({
          method: "POST",
          path: "/account/login",
          body: {
            UserCode: "DemoAdmin",
            Password: "Icpt1357!!",
          },
        }),
      );
    });
    expect(await screen.findByRole("heading", { name: "包装类型维护" })).toBeInTheDocument();
    expect(localStorage.getItem("accessToken")).toBe("access-1");
    expect(localStorage.getItem("refreshToken")).toBe("refresh-1");
  });

  it("falls back to dashboard when redirect is missing", async () => {
    setAppTransportForTests(async () => ({
      status: 200,
      data: tokenResult(),
    }));

    render(<App initialEntries={["/login"]} />);

    fireEvent.change(await screen.findByLabelText("用户编码"), {
      target: { value: "DemoAdmin" },
    });
    fireEvent.change(screen.getByLabelText("密码"), {
      target: { value: "Icpt1357!!" },
    });
    fireEvent.click(screen.getByRole("button", { name: "登录" }));

    expect(await screen.findByRole("heading", { name: "仪表盘" })).toBeInTheDocument();
  });

  it("shows validation errors without submitting empty credentials", async () => {
    const transport = vi.fn<Transport>();
    setAppTransportForTests(transport);

    render(<App initialEntries={["/login"]} />);

    fireEvent.click(await screen.findByRole("button", { name: "登录" }));

    expect(await screen.findByText("请输入用户编码。")).toBeInTheDocument();
    expect(screen.getByText("请输入密码。")).toBeInTheDocument();
    expect(transport).not.toHaveBeenCalled();
  });
});
