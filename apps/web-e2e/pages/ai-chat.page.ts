import { expect, type Page } from "@playwright/test";

export class AiChatPage {
  constructor(private readonly page: Page) {}

  async open(): Promise<void> {
    await this.page.getByRole("button", { name: "AI 助手" }).click();
    await expect(this.page.getByRole("dialog", { name: "MES AI 助手" })).toBeVisible();
  }

  async ask(question: string): Promise<void> {
    const dialog = this.page.getByRole("dialog", { name: /MES AI/ });
    await dialog.getByPlaceholder("询问 MES 数据").fill(question);
    await dialog.getByRole("button", { name: "发送" }).click();
  }

  dialog() {
    return this.page.getByRole("dialog", { name: /MES AI/ });
  }
}
