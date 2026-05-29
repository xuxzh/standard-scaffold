import { expect, type Locator, type Page } from "@playwright/test";
import { appRoutes } from "../../../helpers/routes";

type FilterValues = {
  typeCode?: string;
  typeName?: string;
  isRecyclable?: "all" | "true" | "false";
};

type FormValues = {
  typeCode?: string;
  typeName?: string;
  isRecyclable?: boolean;
  description?: string;
};

export class PackagingTypePage {
  readonly heading: Locator;
  readonly createButton: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole("heading", { name: "包装类型维护" });
    this.createButton = page.getByRole("button", { name: "新增类型" });
  }

  async goto() {
    await this.page.goto(appRoutes.packagingType);
    await expect(this.heading).toBeVisible();
  }

  async expectRowVisible(text: string) {
    await expect(this.page.getByRole("cell", { name: text })).toBeVisible();
  }

  async filter(values: FilterValues) {
    if (values.typeCode !== undefined) {
      await this.page.getByLabel("类型编码").fill(values.typeCode);
    }

    if (values.typeName !== undefined) {
      await this.page.getByLabel("类型名称").fill(values.typeName);
    }

    if (values.isRecyclable !== undefined) {
      await this.page.getByRole("combobox", { name: "循环包装" }).selectOption(values.isRecyclable);
    }

    await this.page.getByRole("button", { name: "查询" }).click();
  }

  async openCreateSheet() {
    await this.createButton.click();
    await expect(this.page.getByTestId("packaging-type-form-sheet")).toBeVisible();
  }

  async openEditSheet(typeCode: string) {
    const row = this.page.getByRole("row").filter({ hasText: typeCode });
    await row.getByRole("button", { name: "编辑" }).click();
    await expect(this.page.getByTestId("packaging-type-form-sheet")).toBeVisible();
  }

  async fillForm(values: FormValues) {
    if (values.typeCode !== undefined) {
      await this.page.getByTestId("packaging-type-form-type-code").fill(values.typeCode);
    }

    if (values.typeName !== undefined) {
      await this.page.getByTestId("packaging-type-form-type-name").fill(values.typeName);
    }

    if (values.isRecyclable !== undefined) {
      const recyclableSwitch = this.page.getByRole("switch", { name: "循环包装" });
      const checked = (await recyclableSwitch.getAttribute("aria-checked")) === "true";

      if (checked !== values.isRecyclable) {
        await recyclableSwitch.click();
      }
    }

    if (values.description !== undefined) {
      await this.page.getByTestId("packaging-type-form-description").fill(values.description);
    }
  }

  async submitForm() {
    await this.page.getByTestId("packaging-type-form-submit").click();
  }

  async expectRowHidden(text: string) {
    await expect(this.page.getByRole("cell", { name: text })).toHaveCount(0);
  }

  async expectTextVisible(text: string) {
    await expect(this.page.getByText(text, { exact: true })).toBeVisible();
  }

  async deleteRow(typeCode: string) {
    await this.page.getByTestId(`packaging-type-delete-${typeCode}`).click();
  }

  async selectRow(typeCode: string) {
    await this.page.getByTestId(`packaging-type-select-${typeCode}`).check();
  }

  async deleteSelected() {
    await this.page.getByRole("button", { name: "批量删除" }).click();
  }
}
