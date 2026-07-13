import fs from "node:fs";

const messagePath = "d:/5-智能体研究/1-明日控股AI智能体门户/poc-mock-erp/chat-portal/src/types/message.ts";
let content = fs.readFileSync(messagePath, "utf8");
content = content.replace(
  `    | {
      type: "result";
      schemaKey: string;
      orderNo: string;
      status?: string;
      title?: string;
      message?: string;
    };`,
  `    | {
      type: "result";
      schemaKey: string;
      orderNo: string;
      status?: string;
      title?: string;
      message?: string;
      fieldGroups?: { title: string; fields: { key: string; label: string; value: string; widget?: string }[] }[];
      sections?: { title?: string; columns: string[]; rows: Record<string, unknown>[] }[];
      warnings?: { key: string; label: string; message: string; tone: "warning" | "error" }[];
      extras?: { key: string; label: string; value: string; widget?: string }[];
    };`,
);
fs.writeFileSync(messagePath, content, "utf8");
console.log("message.ts updated");
