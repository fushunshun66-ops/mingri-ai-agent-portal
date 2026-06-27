import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeOutputItem, setFormSchemas } from "../src/normalizers/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
setFormSchemas(JSON.parse(fs.readFileSync(path.join(__dirname, "..", "config", "formSchemas.json"), "utf8")));

const data = {
  order_info: {
    单号: "SD202606151104506269",
    日期: "2026-05-25",
    客户编号: "C019",
    收货单位名称: "淮安共创人造草坪制造有限公司",
    收货单位详细地址: "上海市宝山区罗泾镇沪太路8419号",
    总金额: 7425,
  },
  items: [
    {
      物料: "埃克森 聚乙烯 LLDPE LLD1018",
      仓库属地: "浙江杭州仓前仓库",
      发货数量: "24.75 吨",
    },
  ],
};

const cases = [
  ["object", data],
  ["array-wrap", [data]],
  ["json-string", JSON.stringify(data)],
  ["fence", "```json\n" + JSON.stringify(data, null, 2) + "\n```"],
  ["text+fence", "已生成发货申请单：\n```json\n" + JSON.stringify(data) + "\n```"],
];

for (const [name, val] of cases) {
  const r = normalizeOutputItem({ id: "x", name: "reply", type: "TEXT", currentValue: val }, "shipment");
  const summary = r.blocks.map((b) => `${b.type}${b.schemaKey ? ":" + b.schemaKey : ""}${b.title ? ":" + b.title : ""}`).join(", ");
  console.log(name, "->", summary || "(empty)");
}
