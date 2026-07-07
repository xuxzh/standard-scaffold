import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { downloadBase64ExcelFile } from "@/components/data-import/file-download";

const base64ForString = (value: string) => {
  const binary = Array.from(value)
    .map((char) => char.charCodeAt(0).toString(16).padStart(2, "0"))
    .join("");

  return btoa(binary);
};

describe("downloadBase64ExcelFile", () => {
  type FakeAnchor = {
    href: string;
    download: string;
    click: ReturnType<typeof vi.fn>;
  };

  let createdAnchors: FakeAnchor[];
  let originalCreateObjectURL: typeof URL.createObjectURL;
  let originalRevokeObjectURL: typeof URL.revokeObjectURL;
  let createObjectURL: ReturnType<typeof vi.fn>;
  let revokeObjectURL: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    createdAnchors = [];
    createObjectURL = vi.fn(() => "blob:mock-url");
    revokeObjectURL = vi.fn();

    originalCreateObjectURL = URL.createObjectURL;
    originalRevokeObjectURL = URL.revokeObjectURL;
    URL.createObjectURL = createObjectURL as unknown as typeof URL.createObjectURL;
    URL.revokeObjectURL = revokeObjectURL as unknown as typeof URL.revokeObjectURL;

    const originalCreateElement = document.createElement.bind(document);

    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      if (tag === "a") {
        const anchor = {
          href: "",
          download: "",
          click: vi.fn(),
        } as unknown as FakeAnchor & HTMLAnchorElement;

        (anchor as unknown as FakeAnchor).click = vi.fn(() => {
          createdAnchors.push(anchor as unknown as FakeAnchor);
        });

        return anchor as unknown as HTMLAnchorElement;
      }

      return originalCreateElement(tag);
    });
  });

  afterEach(() => {
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    vi.restoreAllMocks();
  });

  it("decodes base64 to a Blob with excel mime type", () => {
    downloadBase64ExcelFile(base64ForString("hello"), "template");

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const blob = createObjectURL.mock.calls[0][0] as Blob;
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
  });

  it("appends .xlsx only when missing", () => {
    downloadBase64ExcelFile(base64ForString("a"), "template");
    expect(createdAnchors[0].download).toBe("template.xlsx");

    downloadBase64ExcelFile(base64ForString("a"), "template.xlsx");
    expect(createdAnchors[1].download).toBe("template.xlsx");
  });

  it("revokes the object URL after click", () => {
    downloadBase64ExcelFile(base64ForString("a"), "template");

    expect(createdAnchors).toHaveLength(1);
    expect(createdAnchors[0].click).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
  });
});
