import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ReactHookFormExample } from "@/components/examples/react-hook-form-example";

describe("ReactHookFormExample", () => {
  it("shows validation errors for empty required fields", async () => {
    render(<ReactHookFormExample />);

    fireEvent.click(screen.getByRole("button", { name: "提交" }));

    expect(await screen.findByText("标题至少需要 5 个字符。")).toBeInTheDocument();
    expect(screen.getByText("描述至少需要 20 个字符。")).toBeInTheDocument();
    expect(screen.getByLabelText("标题")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("描述")).toHaveAttribute("aria-invalid", "true");
  });

  it("submits valid form values", async () => {
    render(<ReactHookFormExample />);

    fireEvent.change(screen.getByLabelText("标题"), {
      target: { value: "移动端登录按钮无响应" }
    });
    fireEvent.change(screen.getByLabelText("描述"), {
      target: { value: "用户在移动端点击登录按钮后没有任何反馈，需要检查表单提交状态。" }
    });
    fireEvent.click(screen.getByRole("button", { name: "提交" }));

    await waitFor(() => {
      expect(screen.getByText("表单已提交")).toBeInTheDocument();
    });
    expect(screen.getByText("移动端登录按钮无响应")).toBeInTheDocument();
  });
});
