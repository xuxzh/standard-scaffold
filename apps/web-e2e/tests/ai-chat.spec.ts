import { expect } from "@playwright/test";

import { test } from "../fixtures/test";
import { AiChatPage } from "../pages/ai-chat.page";

test.beforeEach(async ({ page }) => {
  await page.evaluate(async () => {
    const headers = {
      "x-company-code": "RUIHUI",
      "x-factory-code": "FACTORY-01",
      "x-user-id": "424242",
    };
    const response = await fetch("/api/ai/conversations", { headers });
    const payload = (await response.json()) as { data?: Array<{ id: string }> };
    await Promise.all(
      (payload.data ?? []).map((conversation) =>
        fetch(`/api/ai/conversations/${conversation.id}`, {
          method: "DELETE",
          headers,
        }),
      ),
    );
  });
  await page.reload();
  await page.getByTestId("admin-shell").waitFor();
});

test("streams MES evidence, restores it after refresh, switches language, and deletes history", async ({ page }) => {
  const chat = new AiChatPage(page);
  await chat.open();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
  await chat.ask("今日产量");

  await expect(chat.dialog().getByText("今日产量")).toBeVisible();
  await expect(chat.dialog().getByText("128 件")).toBeVisible();
  await chat.dialog().getByRole("button", { name: "查询依据" }).click();
  await expect(chat.dialog().getByText(/SELECT SUM\(Quantity\)/)).toBeVisible();

  await page.reload();
  await chat.open();
  await expect(chat.dialog().getByText("128 件")).toBeVisible();
  await chat.dialog().getByRole("button", { name: "查询依据" }).click();
  await expect(chat.dialog().getByText(/FactoryCode = @factoryCode/)).toBeVisible();

  await chat.dialog().getByRole("button", { name: "关闭" }).click();
  await page.getByRole("button", { name: "切换语言" }).click();
  await page.getByRole("menuitemradio", { name: "English" }).click();
  await expect(page.getByRole("button", { name: "AI Assistant" })).toBeVisible();

  await page.getByRole("button", { name: "AI Assistant" }).click();
  const englishDialog = page.getByRole("dialog", { name: "MES AI Assistant" });
  await englishDialog.getByRole("button", { name: /Delete/ }).click();
  await page.getByRole("button", { name: "Delete" }).click();
  await expect(englishDialog.getByText("128 件")).not.toBeVisible();
});

test("stops a slow stream without rendering later tokens", async ({ page }) => {
  const chat = new AiChatPage(page);
  await chat.open();
  await chat.ask("慢速回答");
  await expect(chat.dialog().getByText("first-token")).toBeVisible();
  await chat.dialog().getByRole("button", { name: "停止" }).click();
  await page.waitForTimeout(2_200);
  await expect(chat.dialog().getByText(/late-token/)).not.toBeVisible();
});

test("shows a retryable error when the Hermes stream fails", async ({ page }) => {
  const chat = new AiChatPage(page);
  await chat.open();
  await chat.ask("查询失败");
  await expect(
    chat.dialog().getByText("连接已中断，已重新读取已保存的消息。"),
  ).toBeVisible();
  await expect(chat.dialog().getByRole("button", { name: "重试" })).toBeVisible();
  await expect(chat.dialog()).not.toContainText(/password|e2e-hermes-key/i);
});

test("shows service unavailable when Hermes health fails", async ({ page }) => {
  await page.request.post("http://127.0.0.1:8660/__fake__/health/fail");
  try {
    const chat = new AiChatPage(page);
    await chat.open();
    await expect(chat.dialog().getByText("AI 服务暂不可用，请稍后重试。")).toBeVisible();
  } finally {
    await page.request.post("http://127.0.0.1:8660/__fake__/reset");
  }
});

test("keeps the question and offers retry after an abrupt SSE disconnect", async ({ page }) => {
  const chat = new AiChatPage(page);
  await chat.open();
  await chat.ask("连接中断");
  await expect(chat.dialog().getByText("连接中断", { exact: true })).toBeVisible();
  await expect(
    chat.dialog().getByText("连接已中断，已重新读取已保存的消息。"),
  ).toBeVisible();
  await expect(chat.dialog().getByRole("button", { name: "重试" })).toBeVisible();
});
