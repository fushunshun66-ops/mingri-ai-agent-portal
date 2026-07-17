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
  businessAssType: "业务助理类型",
  pk_salesman_name: "业务员",
  pk_sign_ver_name: "签章版本",
  pk_sale_type_name: "销售类型",
  pk_contract_type_name: "合同类型",
  pk_effect_mode_name: "生效方式",
  pk_dept_one_name: "一级组织",
  pk_dept_two_name: "二级组织",
  pk_dept_three_name: "三级组织",
  totalSendNumSum: "合计发货数量",
  totalNum: "合计数量",
  excludeNumsum: "排除数量合计",
  pk_contract_tmpl_name: "合同模板",
  pk_customer_category_name: "客户分类",
  custClassName: "客户分类名称",
  isContractUpload: "是否合同上传",
  isCancelUpload: "是否作废上传",
  isAddDeposit: "是否追加定金",
  isAddDepositSaletype: "是否追加定金销售类型",
  isAutoSign: "是否自动签章",
  isBatch: "是否分批",
  isChangeOrder: "是否变更订单",
  isCoordinationInside: "是否内部协同",
  isCreatePaymentBill: "是否生成付款单",
  isFlowCoreBill: "是否流程核心单据",
  isKappa: "是否卡帕",
  isProxySale: "是否代理销售",
  isRemakeOrder: "是否翻单",
  isReviseRollback: "是否修订回滚",
  isSettlement: "是否结算",
  isSettlementGenerate: "是否生成结算",
  isShowSurrenderTerms: "是否显示弃权条款",
  isSignature: "是否签章",
  isSpecialSettle: "是否特殊结算",
  isSummary: "是否汇总",
  isTentativeMaterial: "是否暂估物料",
  isWfControlled: "是否流程控制",
  isWhiteCn: "是否白名单",
  addDepositRatio: "追加定金比例",
  deposit: "定金",
  depositRatio: "定金比例",
  fallRatio: "付款下跌比例",
  agreedReturnDate: "约定退货日期",
  orderStartDate: "订单开始日期",
  deliverDate: "交货日期",
  paymentDate: "付款日期",
  billMakeDate: "制单日期",
  createTime: "创建时间",
  creationChannel: "创建渠道",
  pk_deliver_mode_name: "交货方式",
  deliverPlace: "交货地点",
  pk_settlement_mode_name: "结算方式",
  pk_payment_term_name: "付款协议",
  paymentTermRemark: "付款协议备注",
  pk_bill_maker_name: "制单人",
  pk_currency_name: "币种",
  pk_cost_field_name: "成本领域",
  pk_income_bank_acc_name: "收款银行账户",
  pk_pack_taker_name: "包装承担方",
  inboundCostBearer_name: "入库费用承担方",
  markupUnival: "加价单价",
  approveCredit: "审批信用",
  approvalMark: "审批标识",
  approvalamount: "审批金额",
  approvemny: "审批金额",
  availableSettlementSum: "可结算合计",
  capitalOccupy: "资金占用",
  custLinkmanNum: "客户联系人数量",
  palletNum: "托盘数量",
  qualityStandard: "质量标准",
  specification: "规格",
  country: "国家",
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
  one: "一",
  two: "二",
  three: "三",
  material: "物料",
  stock: "仓库",
  measdoc: "计量单位",
  currtype: "币种",
  balatype: "结算方式",
  payterm: "付款协议",
  contract: "合同",
  tmpl: "模板",
  category: "分类",
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
  bill: "单据",
  make: "制单",
  approver: "审批",
  approve: "审批",
  approval: "审批",
  print: "打印",
  count: "次数",
  total: "合计",
  send: "发货",
  sum: "合计",
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
  ass: "助理",
  asst: "助理",
  business: "业务",
  upload: "上传",
  add: "追加",
  deposit: "定金",
  auto: "自动",
  batch: "分批",
  cancel: "作废",
  change: "变更",
  order: "订单",
  coordination: "协同",
  inside: "内部",
  create: "生成",
  payment: "付款",
  flow: "流程",
  core: "核心",
  kappa: "卡帕",
  proxy: "代理",
  remake: "翻",
  revise: "修订",
  rollback: "回滚",
  settlement: "结算",
  generate: "生成",
  show: "显示",
  surrender: "弃权",
  terms: "条款",
  signature: "签章",
  special: "特殊",
  settle: "结算",
  summary: "汇总",
  tentative: "暂估",
  wf: "流程",
  controlled: "控制",
  white: "白名单",
  cn: "",
  deliver: "交货",
  agreed: "约定",
  start: "开始",
  term: "协议",
  ratio: "比例",
  fall: "下跌",
  markup: "加价",
  unival: "单价",
  available: "可",
  cust: "客户",
  class: "分类",
  linkman: "联系人",
  pallet: "托盘",
  place: "地点",
  quality: "质量",
  standard: "标准",
  specification: "规格",
  country: "国家",
  capital: "资金",
  occupy: "占用",
  creation: "创建",
  channel: "渠道",
  time: "时间",
  currency: "币种",
  cost: "成本",
  field: "领域",
  income: "收款",
  bank: "银行",
  acc: "账户",
  pack: "包装",
  taker: "承担方",
  inbound: "入库",
  bearer: "承担方",
  packer: "包装",
  saletype: "销售类型",
  exclude: "排除",
  numsum: "数量合计",
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
  const parts = tokens.map((t) => TOKEN_ZH[t] ?? t).filter((p) => p !== "");
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
  if (key === "inboundCostBearer") return true;
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
