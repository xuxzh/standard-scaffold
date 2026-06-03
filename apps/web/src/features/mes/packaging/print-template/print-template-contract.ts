/** DTO returned by LabelTemplateFile/findLabelTemplateFileWithSimple. */
export type PrintTemplateApiDto = {
  TemplateCode: string;
  TemplateName: string;
};

/** Front-end representation of a print template option. */
export type PrintTemplateOption = {
  templateCode: string;
  templateName: string;
};

/** Request payload for LabelTemplateFile/findLabelTemplateFileWithSimple. */
export type PrintTemplateQueryDto = {
  TemplateCode: string | null;
  FactoryCode: string;
  SceneType: string;
  LabelType: string | null;
  FuzzyQueryStr: string;
  DesignMode: string | null;
  IsPaged: boolean;
  PageSize: number;
  PageIndex: number;
};

/** Default query parameters matching the reference API call. */
export const defaultPrintTemplateQuery: PrintTemplateQueryDto = {
  TemplateCode: null,
  FactoryCode: "00000.00001",
  SceneType: "InWareHouseLabel",
  LabelType: null,
  FuzzyQueryStr: "",
  DesignMode: null,
  IsPaged: true,
  PageSize: 100,
  PageIndex: 1,
};

export function mapPrintTemplateDtoToOption(
  dto: PrintTemplateApiDto,
): PrintTemplateOption {
  return {
    templateCode: dto.TemplateCode,
    templateName: dto.TemplateName,
  };
}
