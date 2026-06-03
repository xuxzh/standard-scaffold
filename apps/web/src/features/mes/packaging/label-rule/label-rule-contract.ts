/** DTO returned by LabelApi/GetLabelRuleAutoQueryDatas. */
export type LabelRuleApiDto = {
  RuleId: string;
  RuleName: string;
};

/** Front-end representation of a label rule option. */
export type LabelRuleOption = {
  ruleId: string;
  ruleName: string;
};

/** Request payload for LabelApi/GetLabelRuleAutoQueryDatas. */
export type LabelRuleQueryDto = {
  LabelBusinessTypeCode: string;
  IsEnable: boolean;
  IsHide: boolean;
  LabelType: string;
  CompanyCode: string;
  FactoryCode: string;
};

/** Default query parameters matching the reference curl. */
export const defaultLabelRuleQuery: LabelRuleQueryDto = {
  LabelBusinessTypeCode: "InWareHouseLabel",
  IsEnable: true,
  IsHide: false,
  LabelType: "MaterialInventoryLabel",
  CompanyCode: "00000",
  FactoryCode: "00000.00001",
};

export function mapLabelRuleDtoToOption(dto: LabelRuleApiDto): LabelRuleOption {
  return {
    ruleId: dto.RuleId,
    ruleName: dto.RuleName,
  };
}
