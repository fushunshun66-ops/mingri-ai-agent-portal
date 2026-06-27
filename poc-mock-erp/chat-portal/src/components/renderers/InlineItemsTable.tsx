import { DocSectionTable } from "./DocSectionTable";

/** 兜底：卡片字段内嵌 JSON 数组时使用与主单据一致的明细表样式 */
export function InlineItemsTable({ rows }: { rows: Record<string, unknown>[] }) {
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  return <DocSectionTable columns={columns} rows={rows} />;
}
