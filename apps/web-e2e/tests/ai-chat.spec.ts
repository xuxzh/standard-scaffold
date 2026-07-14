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
  const terminalResponse = page.waitForResponse((response) =>
    /\/api\/ai\/runs\/[^/]+\/events$/.test(response.url()),
  );
  await chat.ask("今日产量");

  await expect(chat.dialog().getByText("今日产量")).toBeVisible();
  await expect(chat.dialog().getByText("128 件")).toBeVisible();
  await expect(chat.dialog().getByRole("img", { name: /图表/ })).toBeVisible();
  await expect(chat.dialog().getByRole("table", { name: "AI 查询结果表格" })).toBeVisible();
  await expect(chat.dialog()).not.toContainText(/tool_call_id|messages|password|api key/i);
  await chat.dialog().getByRole("button", { name: "查询依据" }).click();
  await expect(chat.dialog().getByText(/SUM\(Quantity\) AS dailyOutput/)).toBeVisible();
  expect(await (await terminalResponse).text()).not.toMatch(
    /tool_call_id|"messages"|unauthorizedColumn|must-not-reach-browser|e2e-hermes-key/i,
  );
  await expectNoHorizontalOverflow(page);

  await page.reload();
  await chat.open();
  await expect(chat.dialog().getByText("128 件")).toBeVisible();
  await expect(chat.dialog().getByRole("img", { name: /图表/ })).toBeVisible();
  await expect(chat.dialog().getByRole("table", { name: "AI 查询结果表格" })).toBeVisible();
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

test("renders a single aggregate as KPI and table without inventing a chart", async ({ page }) => {
  const chat = new AiChatPage(page);
  await chat.open();
  await chat.ask("单值今日产量");

  await expect(chat.dialog().getByRole("table", { name: "AI 查询结果表格" })).toBeVisible();
  await expect(chat.dialog().getByText("Daily output").first()).toBeVisible();
  await expect(chat.dialog().getByRole("img", { name: /图表/ })).toHaveCount(0);
  await expect(chat.dialog()).not.toContainText(/unauthorizedColumn|must-not-reach-browser/i);
  await expectNoHorizontalOverflow(page);
});

test("renders an allowed categorical aggregation as a bar chart", async ({ page }) => {
  const chat = new AiChatPage(page);
  await chat.open();
  await chat.ask("分类柱状图");

  await expect(
    chat.dialog().getByRole("img", { name: "图表：Completed work orders by category" }),
  ).toBeVisible();
  await expect(chat.dialog().getByRole("table", { name: "AI 查询结果表格" })).toBeVisible();
  await expect(chat.dialog().getByText("Completed work orders")).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("keeps a truncated result as a table and removes its chart", async ({ page }) => {
  const chat = new AiChatPage(page);
  await chat.open();
  await chat.ask("截断结果");

  await expect(chat.dialog().getByText("展示数据已按安全上限截断。")).toBeVisible();
  await expect(chat.dialog().getByRole("table", { name: "AI 查询结果表格" })).toBeVisible();
  await expect(chat.dialog().getByRole("img", { name: /图表/ })).toHaveCount(0);
  await expect(chat.dialog()).not.toContainText("运行失败");
});

test("falls back to a table after an unsupported chart request", async ({ page }) => {
  const chat = new AiChatPage(page);
  await chat.open();
  await chat.ask("不支持图表");

  await expect(chat.dialog().getByText("128 件")).toBeVisible();
  await expect(chat.dialog().getByRole("table", { name: "AI 查询结果表格" })).toBeVisible();
  await expect(chat.dialog().getByRole("img", { name: /图表/ })).toHaveCount(0);
  await expect(chat.dialog()).not.toContainText("运行失败");
});

for (const question of ["展示工具缺失", "畸形转录"]) {
  test(`keeps the answer when visualization input degrades: ${question}`, async ({ page }) => {
    const chat = new AiChatPage(page);
    await chat.open();
    await chat.ask(question);

    await expect(chat.dialog().getByText("128 件")).toBeVisible();
    await expect(chat.dialog().getByRole("table", { name: "AI 查询结果表格" })).toHaveCount(0);
    await expect(chat.dialog().getByRole("img", { name: /图表/ })).toHaveCount(0);
    await expect(chat.dialog()).not.toContainText("运行失败");
  });
}

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

async function expectNoHorizontalOverflow(page: import("@playwright/test").Page) {
  expect(
    await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]');
      return (
        document.documentElement.scrollWidth <= window.innerWidth &&
        dialog !== null &&
        dialog.scrollWidth <= dialog.clientWidth
      );
    }),
  ).toBe(true);
}
