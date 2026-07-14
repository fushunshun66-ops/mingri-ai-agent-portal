import type { OrderResultField } from "./orderResultEnricher";

/** 更多字段：英文字段 key → 中文标签（精确匹配优先） */
const EXTRA_LABEL_OVERRIDES: Record<string, string> = {
  implementation: "实施方式",
  hasibmto: "IBMTO 标识",
  isExitTax: "是否出口退税",
  stamp: "是否盖章",
  isCreditWarehouseReceipt: "是否信用仓单",
  isFuturesWarehouseReceipt: "是否期货仓单",
  isSecond: "是否二次业务",
  isRiskTips: "是否风险提示",
  businessAsstType: "业务助理类型",
  pk_salesman_name: "业务员",
  pk_sign_ver_name: "签章版本",
  pk_sale_type_name: "销售类型",
  pk_contract_type_name: "合同类型",
  pk_effect_mode_name: "生效方式",
  ctrantypeid: "交易类型编码",
  vtrantypecode: "交易类型代码",
  billmaker: "制单人",
  approver: "审批人",
  approvestatus: "审批状态",
  busitype: "业务类型",
  fstatusflag: "状态标识",
  bislatest: "是否最新版本",
  breturn: "是否退货",
  bfreecust: "是否散户",
  boffset: "是否对冲",
  iprintcount: "打印次数",
  ntotalnum: "总数量",
  ntotalpiece: "总件数",
  ntotalvolume: "总体积",
  ntotalweight: "总重量",
};

/** 英文片段 → 中文（用于 camelCase / snake_case 拆分） */
const TOKEN_ZH: Record<string, string> = {
  exit: "出口",
  tax: "税",
  credit: "信用",
  warehouse: "仓库",
  receipt: "仓单",
  futures: "期货",
  second: "二次",
  stamp: "盖章",
  sign: "签章",
  ver: "版本",
  salesman: "业务员",
  implementation: "实施",
  ibmto: "IBMTO",
  org: "组织",
  customer: "客户",
  dept: "部门",
  material: "物料",
  stock: "仓库",
  measdoc: "计量单位",
  currtype: "币种",
  balatype: "结算方式",
  payterm: "付款协议",
  contract: "合同",
  address: "地址",
  person: "人员",
  phone: "电话",
  date: "日期",
  code: "编码",
  name: "名称",
  status: "状态",
  type: "类型",
  flag: "标识",
  amount: "金额",
  price: "单价",
  num: "数量",
  mny: "金额",
  remark: "备注",
  note: "备注",
  maker: "制单",
  approver: "审批",
  print: "打印",
  count: "次数",
  total: "合计",
  weight: "重量",
  volume: "体积",
  piece: "件数",
  return: "退货",
  offset: "对冲",
  free: "散户",
  latest: "最新",
  busi: "业务",
  tran: "交易",
  sale: "销售",
  effect: "生效",
  mode: "方式",
  risk: "风险",
  tips: "提示",
  asst: "助理",
  business: "业务",
};

function splitFieldTokens(key: string): string[] {
  return key
    .replace(/_/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .split(/\s+/)
    .map((t) => t.toLowerCase())
    .filter(Boolean);
}

function translateTokens(tokens: string[]): string {
  const parts = tokens.map((t) => TOKEN_ZH[t] ?? t);
  if (parts.every((p) => /^[\u4e00-\u9fff]+$/.test(p))) {
    return parts.join("");
  }
  return parts.join(" ");
}

/** 将 ERP 字段 key 转为可读中文标签 */
export function resolveExtraFieldLabel(
  key: string,
  profileLabels?: Record<string, string>,
): string {
  if (profileLabels?.[key]) return profileLabels[key];
  if (EXTRA_LABEL_OVERRIDES[key]) return EXTRA_LABEL_OVERRIDES[key];

  const pkName = key.match(/^pk_(.+)_name$/i);
  if (pkName) {
    const zh = translateTokens(splitFieldTokens(pkName[1]));
    if (/[\u4e00-\u9fff]/.test(zh)) return zh;
  }

  if (/^is[A-Z]/.test(key)) {
    return `是否${translateTokens(splitFieldTokens(key.slice(2)))}`;
  }
  if (/^has[A-Z]/i.test(key)) {
    return `是否有${translateTokens(splitFieldTokens(key.slice(3)))}`;
  }
  if (/^b[A-Z]/.test(key)) {
    return `是否${translateTokens(splitFieldTokens(key.slice(1)))}`;
  }

  const tokens = splitFieldTokens(key);
  const zh = translateTokens(tokens);
  if (/[\u4e00-\u9fff]/.test(zh)) return zh;

  return key;
}

/** 更多字段中应隐藏的技术性 key（无展示价值的 pk 主键等） */
export function shouldHideExtraFieldKey(key: string): boolean {
  if (!key) return true;
  if (/^pk_[a-z0-9_]+$/i.test(key) && !/_name$/i.test(key)) return true;
  if (/^(creator|modifier|creationtime|modifiedtime|ts|dr|tenant|ytenant|pubts|id)$/i.test(key)) {
    return true;
  }
  return false;
}

/** 渲染前：更多字段标签转中文，值保持原样（动态业务数据不翻译） */
export function localizeOrderResultExtras(
  extras: OrderResultField[],
  profileLabels?: Record<string, string>,
): OrderResultField[] {
  return extras
    .filter((f) => f.key && !shouldHideExtraFieldKey(f.key))
    .map((f) => ({
      ...f,
      label: resolveExtraFieldLabel(f.key, profileLabels),
      value: String(f.value ?? "").trim(),
    }))
    .filter((f) => f.value)
    .sort((a, b) => a.label.localeCompare(b.label, "zh-CN"));
}
