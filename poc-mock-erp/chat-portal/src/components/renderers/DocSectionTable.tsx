import { formatCellValue, isMoneyColumn } from "../../utils/fieldValue";
import {
  formatAuditResult,
  isAuditResultColumn,
  isRawComparisonColumn,
  orderContractReviewColumns,
  parseRawComparisonData,
} from "../../utils/contractReview";

function isProductTable(columns: string[]): boolean {
  return columns.includes("商品名称") && columns.includes("数量");
}

function isContractReviewTable(columns: string[]): boolean {
  return columns.some((c) => c === "审核规则名称" || isAuditResultColumn(c) || isRawComparisonColumn(c));
}

function RawComparisonCell({ value }: { value: unknown }) {
  const items = parseRawComparisonData(value);
  if (!items?.length) return <>{formatCellValue(value)}</>;
  return (
    <div className="doc-raw-compare">
      {items.map((item, i) => (
        <div className="doc-raw-compare-row" key={`${item.label}-${i}`}>
          <span className="doc-raw-compare-label">{item.label}</span>
          <span className="doc-raw-compare-value">{item.value}</span>
        </div>
      ))}
    </div>
  );
}

export function DocSectionTable({
  title,
  columns,
  rows,
  highlightAuditResult,
}: {
  title?: string;
  columns: string[];
  rows: Record<string, unknown>[];
  highlightAuditResult?: boolean;
}) {
  const rawCols = columns.length > 0 ? columns : [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const contractLayout = highlightAuditResult || isContractReviewTable(rawCols);
  const cols = contractLayout ? orderContractReviewColumns(rawCols) : rawCols;
  const productLayout = isProductTable(cols);
  const auditHighlight = contractLayout || cols.some((c) => isAuditResultColumn(c));

  return (
    <section className={`doc-card-section${productLayout ? " doc-section--product" : ""}${contractLayout ? " doc-section--audit" : ""}`}>
      {title && <div className="doc-section-head">{title}</div>}
      <div className="doc-section-table-wrapper">
        <div className="doc-section-table-wrap">
          <table className="doc-section-table">
            {productLayout && (
              <colgroup>
                <col className="col-name" />
                <col className="col-qty" />
                <col className="col-price" />
                <col className="col-amount" />
              </colgroup>
            )}
            <thead>
              <tr>
                {cols.map((col) => (
                  <th key={col} className={isMoneyColumn(col) ? "doc-num" : undefined}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i}>
                  {cols.map((col) => (
                    <td
                      key={col}
                      className={`${isMoneyColumn(col) ? "doc-num" : ""}${auditHighlight && isAuditResultColumn(col) ? " doc-audit-cell" : ""}${isRawComparisonColumn(col) ? " doc-raw-cell" : ""}`}
                    >
                      {auditHighlight && isAuditResultColumn(col) ? (
                        (() => {
                          const { text, tone } = formatAuditResult(row[col]);
                          return <span className={`doc-audit-result doc-audit-result--${tone}`}>{text}</span>;
                        })()
                      ) : isRawComparisonColumn(col) ? (
                        <RawComparisonCell value={row[col]} />
                      ) : (
                        formatCellValue(row[col])
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
