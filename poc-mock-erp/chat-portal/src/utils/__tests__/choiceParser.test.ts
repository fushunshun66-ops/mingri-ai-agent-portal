import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock 子解析器模块
vi.mock("../shipmentChoiceParser", () => ({
  tryParseShipmentChoiceBlocks: vi.fn(),
}));

vi.mock("../salesOrderChoiceParser", () => ({
  tryParseSalesOrderChoiceBlocks: vi.fn(),
}));

import { parseChoiceBlocksFromText, parseChoiceFromText } from "../choiceParser";
import { tryParseShipmentChoiceBlocks } from "../shipmentChoiceParser";
import { tryParseSalesOrderChoiceBlocks } from "../salesOrderChoiceParser";

const mockShipment = vi.mocked(tryParseShipmentChoiceBlocks);
const mockSalesOrder = vi.mocked(tryParseSalesOrderChoiceBlocks);

beforeEach(() => {
  vi.clearAllMocks();
});

// ============================================================
// parseChoiceBlocksFromText
// ============================================================
describe("parseChoiceBlocksFromText", () => {
  it("flowKey === 'sales_order' 时调用 tryParseSalesOrderChoiceBlocks", () => {
    const mockResult = { blocks: [{ type: "choice" as const, label: "测试", options: [] }] };
    mockSalesOrder.mockReturnValue(mockResult);

    const result = parseChoiceBlocksFromText("测试文本", "sales_order");

    expect(mockSalesOrder).toHaveBeenCalledWith("测试文本");
    expect(result).toBe(mockResult);
  });

  it("flowKey === 'shipment' 时调用 tryParseShipmentChoiceBlocks", () => {
    const mockResult = { blocks: [{ type: "choice" as const, label: "发货", options: [] }] };
    mockShipment.mockReturnValue(mockResult);

    const result = parseChoiceBlocksFromText("发货测试", "shipment");

    expect(mockShipment).toHaveBeenCalledWith("发货测试");
    expect(result).toBe(mockResult);
  });

  it("不传 flowKey 走通用解析（先尝试 shipment 再 bracket/legacy）", () => {
    // shipment mock 返回 null，让通用解析回退到 bracket/legacy
    mockShipment.mockReturnValue(null);

    const result = parseChoiceBlocksFromText("① 选项A\n② 选项B");

    expect(mockShipment).toHaveBeenCalled();
    // 回退到 legacy 解析应该能匹配到
    expect(result).not.toBeNull();
    expect(result!.blocks).toHaveLength(1);
  });

  it("空字符串返回 null", () => {
    const result = parseChoiceBlocksFromText("");
    expect(result).toBeNull();
  });
});

// ============================================================
// parseChoiceFromText（别名）
// ============================================================
describe("parseChoiceFromText", () => {
  it("是 parseChoiceBlocksFromText 的别名，行为一致", () => {
    const mockResult = { blocks: [{ type: "choice" as const, label: "别名测试", options: [] }] };
    mockSalesOrder.mockReturnValue(mockResult);

    const result = parseChoiceFromText("别名文本", "sales_order");

    expect(mockSalesOrder).toHaveBeenCalledWith("别名文本");
    expect(result).toBe(mockResult);
  });

  it("空文本返回 null", () => {
    expect(parseChoiceFromText("")).toBeNull();
    expect(parseChoiceFromText(null as unknown as string)).toBeNull();
  });
});
