import { DocSectionTable } from "../DocSectionTable";

export function TableBlock({
  title,
  columns,
  rows,
}: {
  title?: string;
  columns: string[];
  rows: Record<string, unknown>[];
}) {
  return (
    <div className="block-table">
      <DocSectionTable title={title} columns={columns} rows={rows} />
    </div>
  );
}
