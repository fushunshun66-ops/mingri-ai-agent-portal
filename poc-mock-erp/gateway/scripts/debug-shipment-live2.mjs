import { parseChoiceBlocksFromText } from "../src/normalizers/choiceParser.js";
import { isShipmentClarifyFormat, parseShipmentClarifySections } from "../src/normalizers/shipmentChoiceParser.js";

const numbered = `收到。根据您提供的发货单信息，系统对【客户名称】和【商品名称】进行了复核，发现存在匹配歧义，需您确认

客户名称：

请确认是否为该客户？单据中蓝本为「宁波 聚火能 1100N」，系统库中匹配项为：该值与您填写内容高度一致，可直接确认。

1. 余姚市化一贸易有限公司（客户编码：C017）
2. 商品名称:
3. 聚丙烯宁煤1100N（商品编码：SKU003）
4. 请您点击确认客户名称是否应为「余姚市化一贸易有限公司」？`;

console.log("clarify?", isShipmentClarifyFormat(numbered));
console.log("clarify parse", JSON.stringify(parseShipmentClarifySections(numbered), null, 2));
console.log("full", JSON.stringify(parseChoiceBlocksFromText(numbered, "shipment"), null, 2));
