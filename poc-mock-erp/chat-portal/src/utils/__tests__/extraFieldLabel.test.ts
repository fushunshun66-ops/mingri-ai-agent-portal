import { describe, it, expect } from "vitest";
import {
  localizeOrderResultExtras,
  resolveExtraFieldLabel,
  shouldHideExtraFieldKey,
} from "../extraFieldLabel";

describe("resolveExtraFieldLabel", () => {
  it("uses profile override when provided", () => {
    expect(resolveExtraFieldLabel("isExitTax", { isExitTax: "出口税标识" })).toBe("出口税标识");
  });

  it("translates known keys from built-in map", () => {
    expect(resolveExtraFieldLabel("isExitTax", {})).toBe("是否出口退税");
    expect(resolveExtraFieldLabel("pk_salesman_name", {})).toBe("业务员");
    expect(resolveExtraFieldLabel("isCreditWarehouseReceipt", {})).toBe("是否信用仓单");
  });

  it("humanizes is/has prefixes", () => {
    expect(resolveExtraFieldLabel("isSecond", {})).toBe("是否二次业务");
    expect(resolveExtraFieldLabel("hasibmto", {})).toBe("IBMTO 标识");
  });

  it("labels dept hierarchy names as 组织 levels", () => {
    expect(resolveExtraFieldLabel("pk_dept_one_name")).toBe("一级组织");
    expect(resolveExtraFieldLabel("pk_dept_two_name")).toBe("二级组织");
    expect(resolveExtraFieldLabel("pk_dept_three_name")).toBe("三级组织");
  });

  it("labels totals, templates and categories without leftover English", () => {
    expect(resolveExtraFieldLabel("totalSendNumSum")).toBe("合计发货数量");
    expect(resolveExtraFieldLabel("totalNum")).toBe("合计数量");
    expect(resolveExtraFieldLabel("pk_contract_tmpl_name")).toBe("合同模板");
    expect(resolveExtraFieldLabel("pk_customer_category_name")).toBe("客户分类");
  });

  it("labels is* flags with full Chinese phrases", () => {
    expect(resolveExtraFieldLabel("isContractUpload")).toBe("是否合同上传");
    expect(resolveExtraFieldLabel("isAddDeposit")).toBe("是否追加定金");
    expect(resolveExtraFieldLabel("isAddDepositSaletype")).toBe("是否追加定金销售类型");
    expect(resolveExtraFieldLabel("isAutoSign")).toBe("是否自动签章");
    expect(resolveExtraFieldLabel("isBatch")).toBe("是否分批");
    expect(resolveExtraFieldLabel("isCancelUpload")).toBe("是否作废上传");
    expect(resolveExtraFieldLabel("isChangeOrder")).toBe("是否变更订单");
    expect(resolveExtraFieldLabel("isCoordinationInside")).toBe("是否内部协同");
    expect(resolveExtraFieldLabel("isCreatePaymentBill")).toBe("是否生成付款单");
    expect(resolveExtraFieldLabel("isFlowCoreBill")).toBe("是否流程核心单据");
    expect(resolveExtraFieldLabel("isKappa")).toBe("是否卡帕");
    expect(resolveExtraFieldLabel("isProxySale")).toBe("是否代理销售");
    expect(resolveExtraFieldLabel("isRemakeOrder")).toBe("是否翻单");
    expect(resolveExtraFieldLabel("isReviseRollback")).toBe("是否修订回滚");
    expect(resolveExtraFieldLabel("isSettlement")).toBe("是否结算");
    expect(resolveExtraFieldLabel("isSettlementGenerate")).toBe("是否生成结算");
    expect(resolveExtraFieldLabel("isShowSurrenderTerms")).toBe("是否显示弃权条款");
    expect(resolveExtraFieldLabel("isSignature")).toBe("是否签章");
    expect(resolveExtraFieldLabel("isSpecialSettle")).toBe("是否特殊结算");
    expect(resolveExtraFieldLabel("isSummary")).toBe("是否汇总");
    expect(resolveExtraFieldLabel("isTentativeMaterial")).toBe("是否暂估物料");
    expect(resolveExtraFieldLabel("isWfControlled")).toBe("是否流程控制");
    expect(resolveExtraFieldLabel("isWhiteCn")).toBe("是否白名单");
  });

  it("fixes businessAssType key (not businessAsstType typo)", () => {
    expect(resolveExtraFieldLabel("businessAssType")).toBe("业务助理类型");
  });

  it("labels common date/amount/party fields in ERP Chinese", () => {
    expect(resolveExtraFieldLabel("billMakeDate")).toBe("制单日期");
    expect(resolveExtraFieldLabel("agreedReturnDate")).toBe("约定退货日期");
    expect(resolveExtraFieldLabel("orderStartDate")).toBe("订单开始日期");
    expect(resolveExtraFieldLabel("deliverDate")).toBe("交货日期");
    expect(resolveExtraFieldLabel("paymentDate")).toBe("付款日期");
    expect(resolveExtraFieldLabel("pk_deliver_mode_name")).toBe("交货方式");
    expect(resolveExtraFieldLabel("pk_settlement_mode_name")).toBe("结算方式");
    expect(resolveExtraFieldLabel("pk_payment_term_name")).toBe("付款协议");
    expect(resolveExtraFieldLabel("pk_bill_maker_name")).toBe("制单人");
    expect(resolveExtraFieldLabel("pk_currency_name")).toBe("币种");
    expect(resolveExtraFieldLabel("pk_cost_field_name")).toBe("成本领域");
    expect(resolveExtraFieldLabel("pk_income_bank_acc_name")).toBe("收款银行账户");
    expect(resolveExtraFieldLabel("pk_pack_taker_name")).toBe("包装承担方");
    expect(resolveExtraFieldLabel("inboundCostBearer_name")).toBe("入库费用承担方");
    expect(resolveExtraFieldLabel("addDepositRatio")).toBe("追加定金比例");
    expect(resolveExtraFieldLabel("depositRatio")).toBe("定金比例");
    expect(resolveExtraFieldLabel("deposit")).toBe("定金");
    expect(resolveExtraFieldLabel("fallRatio")).toBe("付款下跌比例");
    expect(resolveExtraFieldLabel("markupUnival")).toBe("加价单价");
    expect(resolveExtraFieldLabel("approveCredit")).toBe("审批信用");
    expect(resolveExtraFieldLabel("approvalMark")).toBe("审批标识");
    expect(resolveExtraFieldLabel("approvalamount")).toBe("审批金额");
    expect(resolveExtraFieldLabel("approvemny")).toBe("审批金额");
    expect(resolveExtraFieldLabel("availableSettlementSum")).toBe("可结算合计");
    expect(resolveExtraFieldLabel("excludeNumsum")).toBe("排除数量合计");
    expect(resolveExtraFieldLabel("custClassName")).toBe("客户分类名称");
    expect(resolveExtraFieldLabel("custLinkmanNum")).toBe("客户联系人数量");
    expect(resolveExtraFieldLabel("palletNum")).toBe("托盘数量");
    expect(resolveExtraFieldLabel("paymentTermRemark")).toBe("付款协议备注");
    expect(resolveExtraFieldLabel("deliverPlace")).toBe("交货地点");
    expect(resolveExtraFieldLabel("qualityStandard")).toBe("质量标准");
    expect(resolveExtraFieldLabel("specification")).toBe("规格");
    expect(resolveExtraFieldLabel("country")).toBe("国家");
    expect(resolveExtraFieldLabel("capitalOccupy")).toBe("资金占用");
    expect(resolveExtraFieldLabel("createTime")).toBe("创建时间");
    expect(resolveExtraFieldLabel("creationChannel")).toBe("创建渠道");
  });

  it("produces no leftover Latin letters for covered SOP extras keys", () => {
    const keys = [
      "pk_dept_one_name",
      "pk_dept_two_name",
      "pk_dept_three_name",
      "totalSendNumSum",
      "pk_contract_tmpl_name",
      "pk_customer_category_name",
      "isContractUpload",
      "isAddDeposit",
      "businessAssType",
      "billMakeDate",
      "agreedReturnDate",
      "pk_deliver_mode_name",
      "isAutoSign",
      "isSettlementGenerate",
      "paymentTermRemark",
    ];
    for (const key of keys) {
      const label = resolveExtraFieldLabel(key);
      expect(label, key).not.toMatch(/[A-Za-z]/);
    }
  });
});

describe("shouldHideExtraFieldKey", () => {
  it("hides pk_* without _name suffix", () => {
    expect(shouldHideExtraFieldKey("pk_sign_ver")).toBe(true);
    expect(shouldHideExtraFieldKey("pk_contract_tmpl")).toBe(true);
    expect(shouldHideExtraFieldKey("pk_dept_one")).toBe(true);
    expect(shouldHideExtraFieldKey("pk_contract_tmpl_code")).toBe(true);
  });

  it("hides bare inboundCostBearer id but keeps _name", () => {
    expect(shouldHideExtraFieldKey("inboundCostBearer")).toBe(true);
    expect(shouldHideExtraFieldKey("inboundCostBearer_name")).toBe(false);
  });

  it("keeps pk_*_name fields visible", () => {
    expect(shouldHideExtraFieldKey("pk_dept_one_name")).toBe(false);
    expect(shouldHideExtraFieldKey("pk_contract_tmpl_name")).toBe(false);
  });
});

describe("localizeOrderResultExtras", () => {
  it("relabels stored English extras but keeps values unchanged", () => {
    const localized = localizeOrderResultExtras([
      { key: "isExitTax", label: "isExitTax", value: "N" },
      { key: "pk_salesman_name", label: "pk_salesman_name", value: "兰岚" },
      { key: "pk_sign_ver", label: "pk_sign_ver", value: "2274258251927808" },
      { key: "pk_contract_type_name", label: "pk_contract_type_name", value: "我方合同" },
    ]);
    expect(localized).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "isExitTax", label: "是否出口退税", value: "N" }),
        expect.objectContaining({ key: "pk_salesman_name", label: "业务员", value: "兰岚" }),
        expect.objectContaining({
          key: "pk_contract_type_name",
          label: "合同类型",
          value: "我方合同",
        }),
      ]),
    );
    expect(localized.some((f) => f.key === "pk_sign_ver")).toBe(false);
  });

  it("relabels messy token-split keys to full Chinese", () => {
    const localized = localizeOrderResultExtras([
      { key: "pk_dept_one_name", label: "pk_dept_one_name", value: "PP公司" },
      { key: "totalSendNumSum", label: "totalSendNumSum", value: "0" },
      { key: "businessAssType", label: "businessAssType", value: "1" },
      { key: "isAddDeposit", label: "isAddDeposit", value: "N" },
      { key: "pk_deliver_mode_name", label: "pk_deliver_mode_name", value: "自提" },
    ]);
    expect(localized).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "pk_dept_one_name", label: "一级组织", value: "PP公司" }),
        expect.objectContaining({ key: "totalSendNumSum", label: "合计发货数量", value: "0" }),
        expect.objectContaining({ key: "businessAssType", label: "业务助理类型", value: "1" }),
        expect.objectContaining({ key: "isAddDeposit", label: "是否追加定金", value: "N" }),
        expect.objectContaining({ key: "pk_deliver_mode_name", label: "交货方式", value: "自提" }),
      ]),
    );
  });

  it("drops bare inboundCostBearer id and keeps only _name", () => {
    const localized = localizeOrderResultExtras([
      { key: "inboundCostBearer", label: "inboundCostBearer", value: "10001" },
      { key: "inboundCostBearer_name", label: "inboundCostBearer_name", value: "卖方" },
    ]);
    expect(localized).toEqual([
      expect.objectContaining({
        key: "inboundCostBearer_name",
        label: "入库费用承担方",
        value: "卖方",
      }),
    ]);
    expect(localized.some((f) => f.key === "inboundCostBearer")).toBe(false);
  });

  it("drops hidden pk_contract_tmpl_code", () => {
    const localized = localizeOrderResultExtras([
      { key: "pk_contract_tmpl_code", label: "pk_contract_tmpl_code", value: "TMPL01" },
      { key: "pk_contract_tmpl_name", label: "pk_contract_tmpl_name", value: "标准模板" },
    ]);
    expect(localized.some((f) => f.key === "pk_contract_tmpl_code")).toBe(false);
    expect(localized).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "pk_contract_tmpl_name",
          label: "合同模板",
          value: "标准模板",
        }),
      ]),
    );
  });
});
