import { FLOW_META } from "../flowMeta";

const DEFAULT_MESSAGE = "销售订单已完成，可在ERP中查看详情。";

export function OrderResultCard({
  schemaKey,
  orderNo,
  title,
  message,
}: {
  schemaKey: string;
  orderNo: string;
  title?: string;
  message?: string;
}) {
  const meta = FLOW_META[schemaKey] ?? FLOW_META.sales_order;
  const displayTitle = title?.trim() || "销售订单已生成";
  const displayMessage = message?.trim() || DEFAULT_MESSAGE;

  return (
    <div className="doc-card cap-accent-success doc-result-card">
      <div className="doc-card-head">
        <div className="doc-card-head-left">
          <span className="doc-card-module">{meta.module}</span>
          <h3 className="doc-card-title">{displayTitle}</h3>
        </div>
        <span className="doc-card-badge doc-card-badge-success">已完成</span>
      </div>
      <div className="doc-order-result-no" aria-label={`订单号 ${orderNo}`}>
        <span className="doc-order-result-no-value">{orderNo}</span>
        <button type="button" className="doc-order-result-copy" aria-label={`查看订单 ${orderNo}`}>
          查看
        </button>
      </div>
      <p className="doc-order-result-message">{displayMessage}</p>
    </div>
  );
}
