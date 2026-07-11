import { useState } from "react";
import { ShipmentDoc } from "../ShipmentDoc";
import { unwrapDocArray, tryParseShipmentDocFromMarkdown } from "../../../utils/structuredDocMarkdown";

function tryParseShipmentDocFromJsonData(data: unknown) {
  const unwrapped = unwrapDocArray(data);
  if (typeof unwrapped === "string") return tryParseShipmentDocFromMarkdown(unwrapped);
  if (!unwrapped || typeof unwrapped !== "object") return null;
  return tryParseShipmentDocFromMarkdown(JSON.stringify(unwrapped));
}

export function JsonBlock({
  data,
  collapsed,
  flowKey,
  messageId,
  blockIndex,
  choiceDisabled,
}: {
  data: unknown;
  collapsed?: boolean;
  flowKey?: string | null;
  messageId?: string;
  blockIndex?: number;
  choiceDisabled?: boolean;
}) {
  const [open, setOpen] = useState(!collapsed);
  const shipmentDoc = flowKey === "shipment" ? tryParseShipmentDocFromJsonData(data) : null;
  if (shipmentDoc && messageId != null && blockIndex != null) {
    return (
      <div className="block-primary">
        <ShipmentDoc
          messageId={messageId}
          blockIndex={blockIndex}
          title="发货申请单"
          fields={shipmentDoc.fields}
          sections={shipmentDoc.sections}
          disabled={choiceDisabled}
        />
      </div>
    );
  }

  return (
    <div className="block-json">
      <button className="block-json-toggle" onClick={() => setOpen((v) => !v)}>
        {open ? "▾ 收起" : "▸ 展开"} 原始数据
      </button>
      {open && <pre className="block-json-pre">{JSON.stringify(data, null, 2)}</pre>}
    </div>
  );
}
