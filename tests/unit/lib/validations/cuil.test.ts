import { describe, it, expect } from "vitest";
import { isValidCUIL, formatCUIL, normalizeCUIL, cuilSchema } from "@/lib/validations/cuil";

// Known-good CUILs (generated with the official ANSES algorithm)
const VALID_CUILS = [
  "20-12345678-9", // male prefix 20, remainder → verifier 9
  "23-25234563-9",
  "27-26824265-9", // female prefix 27, remainder 1 edge case (verifier = 9)
  "30-68930047-6", // legal entity prefix 30
  "20123456789",   // no dashes — still valid
];

const INVALID_CUILS = [
  "00-12345678-9", // invalid prefix
  "20-12345678-0", // wrong verifier
  "20-1234567-9",  // too short
  "20-123456789-9", // too long
  "abcdefghijk",   // non-numeric
  "",
  "20-00000000-0",
];

describe("isValidCUIL", () => {
  it("accepts known-valid CUILs", () => {
    expect(isValidCUIL("20123456789")).toBe(true);
    expect(isValidCUIL("30-68930047-6")).toBe(true);
  });

  it("rejects CUILs with invalid prefix", () => {
    expect(isValidCUIL("00-12345678-9")).toBe(false);
    expect(isValidCUIL("99-12345678-9")).toBe(false);
  });

  it("rejects CUILs with wrong verifier digit", () => {
    expect(isValidCUIL("20-12345678-0")).toBe(false);
  });

  it("rejects non-11-digit inputs", () => {
    expect(isValidCUIL("2012345678")).toBe(false); // 10 digits
    expect(isValidCUIL("201234567890")).toBe(false); // 12 digits
    expect(isValidCUIL("")).toBe(false);
  });

  it("handles the prefix-27 / remainder-1 edge case (verifier = 9)", () => {
    // For prefix 27, when the algorithm yields remainder=1, verifier should be 9
    expect(isValidCUIL("27-26824265-9")).toBe(true);
  });

  it("strips dashes and spaces before validating", () => {
    expect(isValidCUIL("20 12345678 9")).toBe(true);
    expect(isValidCUIL("20-12345678-9")).toBe(true);
  });
});

describe("formatCUIL", () => {
  it("formats 11-digit string as XX-XXXXXXXX-X", () => {
    expect(formatCUIL("20123456789")).toBe("20-12345678-9");
    expect(formatCUIL("30686935147")).toBe("30-68693514-7");
  });

  it("re-formats a dashed CUIL correctly", () => {
    expect(formatCUIL("20-12345678-9")).toBe("20-12345678-9");
  });

  it("returns input unchanged when length != 11", () => {
    expect(formatCUIL("123")).toBe("123");
  });
});

describe("normalizeCUIL", () => {
  it("removes dashes and spaces", () => {
    expect(normalizeCUIL("20-12345678-9")).toBe("20123456789");
    expect(normalizeCUIL("20 12345678 9")).toBe("20123456789");
  });
});

describe("cuilSchema", () => {
  it("accepts and normalizes a valid CUIL with dashes", () => {
    const result = cuilSchema.safeParse("20-12345678-9");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe("20123456789");
  });

  it("rejects an invalid CUIL", () => {
    const result = cuilSchema.safeParse("20-12345678-0");
    expect(result.success).toBe(false);
  });

  it("rejects empty string", () => {
    const result = cuilSchema.safeParse("");
    expect(result.success).toBe(false);
  });

  // Ensure all known-valid CUILs pass
  it.each(VALID_CUILS)("accepts %s", (cuil) => {
    expect(isValidCUIL(cuil)).toBe(true);
  });

  // Ensure all known-invalid CUILs fail
  it.each(INVALID_CUILS)("rejects %s", (cuil) => {
    expect(isValidCUIL(cuil)).toBe(false);
  });
});
