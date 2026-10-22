import { describe, expect, it } from "vitest";
import { toIsoDate, toLocalDateTime } from "./marketTime";
import { parseRoutePath } from "./routes";
import { normalizeChainId } from "./chain";

describe("market time helpers", () => {
  it("converts WAT wall-clock input to UTC ISO time", () => {
    expect(toIsoDate("2025-01-15T12:30")).toBe("2025-01-15T11:30:00.000Z");
  });
  it("preserves seconds when converting WAT wall-clock input", () => {
    expect(toIsoDate("2025-01-15T12:30:45")).toBe("2025-01-15T11:30:45.000Z");
  });
  it("rejects invalid wall-clock input", () => {
    expect(toIsoDate("not-a-date")).toBe("");
    expect(toIsoDate("2025-02-30T12:30")).toBe("");
    expect(toIsoDate("2025-01-15T25:30")).toBe("");
  });
  it("formats UTC instants as WAT datetime-local values", () => {
    expect(toLocalDateTime("2025-01-15T11:30:00.000Z")).toBe("2025-01-15T12:30");
  });
  it("returns an empty value for invalid datetime instants", () => {
    expect(toLocalDateTime("not-a-date")).toBe("");
  });
});

describe("route parsing", () => {
  it("parses market detail routes", () => {
    expect(parseRoutePath("/markets/market%201")).toEqual({ page: "Markets", marketId: "market 1", verificationMarketId: null });
  });
  it("parses verification routes", () => {
    expect(parseRoutePath("/verify/market-1")).toEqual({ page: "Markets", marketId: null, verificationMarketId: "market-1" });
  });
  it("falls back to home for unknown routes", () => {
    expect(parseRoutePath("/unknown")).toEqual({ page: "Home", marketId: null, verificationMarketId: null });
  });
});

describe("chain ID normalization", () => {
  it("normalizes decimal and hexadecimal chain IDs", () => {
    expect(normalizeChainId(42421)).toBe("0xa5b5");
    expect(normalizeChainId("42421")).toBe("0xa5b5");
    expect(normalizeChainId("0xA5B5")).toBe("0xa5b5");
  });
  it("handles missing chain IDs", () => {
    expect(normalizeChainId(undefined)).toBeNull();
  });
});
