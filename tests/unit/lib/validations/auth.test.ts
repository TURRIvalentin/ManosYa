import { describe, it, expect } from "vitest";
import {
  loginSchema,
  registerSchema,
  verifyEmailSchema,
  resendVerificationSchema,
} from "@/lib/validations/auth";

describe("loginSchema", () => {
  it("accepts valid credentials", () => {
    const result = loginSchema.safeParse({ email: "user@example.com", password: "secret" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = loginSchema.safeParse({ email: "not-an-email", password: "secret" });
    expect(result.success).toBe(false);
  });

  it("rejects empty password", () => {
    const result = loginSchema.safeParse({ email: "user@example.com", password: "" });
    expect(result.success).toBe(false);
  });
});

describe("registerSchema", () => {
  const valid = {
    name: "María García",
    email: "maria@example.com",
    password: "SecurePass1",
    confirmPassword: "SecurePass1",
    turnstileToken: "test-token",
  };

  it("accepts valid registration data", () => {
    const result = registerSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("lowercases the email", () => {
    const result = registerSchema.safeParse({ ...valid, email: "Maria@EXAMPLE.COM" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.email).toBe("maria@example.com");
  });

  it("trims the name", () => {
    const result = registerSchema.safeParse({ ...valid, name: "  Juan  " });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.name).toBe("Juan");
  });

  it("rejects name shorter than 2 characters", () => {
    const result = registerSchema.safeParse({ ...valid, name: "A" });
    expect(result.success).toBe(false);
  });

  it("rejects password shorter than 8 characters", () => {
    const result = registerSchema.safeParse({ ...valid, password: "Short1", confirmPassword: "Short1" });
    expect(result.success).toBe(false);
  });

  it("rejects password longer than 72 characters", () => {
    const long = "A1" + "a".repeat(71);
    const result = registerSchema.safeParse({ ...valid, password: long, confirmPassword: long });
    expect(result.success).toBe(false);
  });

  it("rejects password without uppercase letter", () => {
    const result = registerSchema.safeParse({
      ...valid,
      password: "nouppercase1",
      confirmPassword: "nouppercase1",
    });
    expect(result.success).toBe(false);
  });

  it("rejects password without number", () => {
    const result = registerSchema.safeParse({
      ...valid,
      password: "NoNumber!",
      confirmPassword: "NoNumber!",
    });
    expect(result.success).toBe(false);
  });

  it("rejects mismatched passwords", () => {
    const result = registerSchema.safeParse({ ...valid, confirmPassword: "Different1" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path[0]);
      expect(paths).toContain("confirmPassword");
    }
  });

  it("rejects missing turnstile token", () => {
    const result = registerSchema.safeParse({ ...valid, turnstileToken: "" });
    expect(result.success).toBe(false);
  });
});

describe("verifyEmailSchema", () => {
  it("accepts valid email + 64-char hex token", () => {
    const token = "a".repeat(64);
    const result = verifyEmailSchema.safeParse({ email: "user@example.com", token });
    expect(result.success).toBe(true);
  });

  it("rejects token that is not 64 chars", () => {
    const result = verifyEmailSchema.safeParse({ email: "user@example.com", token: "short" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email", () => {
    const result = verifyEmailSchema.safeParse({ email: "bad", token: "a".repeat(64) });
    expect(result.success).toBe(false);
  });
});

describe("resendVerificationSchema", () => {
  it("accepts valid email + turnstile token", () => {
    const result = resendVerificationSchema.safeParse({
      email: "user@example.com",
      turnstileToken: "cf-token",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing turnstile token", () => {
    const result = resendVerificationSchema.safeParse({
      email: "user@example.com",
      turnstileToken: "",
    });
    expect(result.success).toBe(false);
  });
});
