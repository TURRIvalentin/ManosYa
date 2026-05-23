import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/password";

describe("hashPassword / verifyPassword", () => {
  it("produces a hash that verifies correctly", async () => {
    const password = "MySecurePass1";
    const hash = await hashPassword(password);

    expect(typeof hash).toBe("string");
    expect(hash.length).toBeGreaterThan(0);
    // Argon2id PHC string starts with $argon2id$
    expect(hash.startsWith("$argon2id$")).toBe(true);

    const isValid = await verifyPassword(password, hash);
    expect(isValid).toBe(true);
  });

  it("returns false for the wrong password", async () => {
    const hash = await hashPassword("CorrectPassword1");
    const isValid = await verifyPassword("WrongPassword1", hash);
    expect(isValid).toBe(false);
  });

  it("produces a different hash each call (random salt)", async () => {
    const password = "SamePassword1";
    const hash1 = await hashPassword(password);
    const hash2 = await hashPassword(password);
    expect(hash1).not.toBe(hash2);
    // But both should verify correctly
    expect(await verifyPassword(password, hash1)).toBe(true);
    expect(await verifyPassword(password, hash2)).toBe(true);
  });

  it("returns false for a malformed hash string", async () => {
    const isValid = await verifyPassword("password", "not-a-valid-hash");
    expect(isValid).toBe(false);
  });
});
