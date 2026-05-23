import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Testea el guard del jwt callback que corrige emailVerified=null para OAuth.
 *
 * Auth.js v5 issue: handle-login.ts:279 llama createUser({ ...profile, emailVerified: null })
 * para todos los providers OAuth, ignorando lo que el provider devuelve (Google devuelve
 * email_verified: true). Sin el guard, token.emailVerified = null → requireVerifiedEmail()
 * bloquea a todos los usuarios de Google.
 */

// Extraemos la lógica del guard para testearla de forma aislada
// sin necesitar instanciar NextAuth completo
function applyOAuthEmailVerifiedGuard(params: {
  trigger: string | undefined;
  account: { provider: string } | null;
  token: { id?: string; emailVerified: Date | null };
}): { emailVerified: Date | null; dbUpdateCalled: boolean } {
  let dbUpdateCalled = false;

  if (
    params.trigger === "signIn" &&
    params.account?.provider !== "credentials" &&
    !params.token.emailVerified
  ) {
    const now = new Date();
    params.token.emailVerified = now;
    if (params.token.id) {
      dbUpdateCalled = true; // en auth.ts esto dispara db.user.update() en background
    }
  }

  return {
    emailVerified: params.token.emailVerified,
    dbUpdateCalled,
  };
}

describe("OAuth emailVerified guard (jwt callback)", () => {
  it("setea emailVerified = now para nuevo usuario Google con emailVerified=null", () => {
    const before = Date.now();
    const result = applyOAuthEmailVerifiedGuard({
      trigger: "signIn",
      account: { provider: "google" },
      token: { id: "user-1", emailVerified: null },
    });
    const after = Date.now();

    expect(result.emailVerified).not.toBeNull();
    expect(result.emailVerified!.getTime()).toBeGreaterThanOrEqual(before);
    expect(result.emailVerified!.getTime()).toBeLessThanOrEqual(after);
    expect(result.dbUpdateCalled).toBe(true);
  });

  it("dispara DB update solo cuando token.id está presente", () => {
    const resultWithId = applyOAuthEmailVerifiedGuard({
      trigger: "signIn",
      account: { provider: "google" },
      token: { id: "user-1", emailVerified: null },
    });
    expect(resultWithId.dbUpdateCalled).toBe(true);

    const resultWithoutId = applyOAuthEmailVerifiedGuard({
      trigger: "signIn",
      account: { provider: "google" },
      token: { emailVerified: null }, // sin id
    });
    expect(resultWithoutId.dbUpdateCalled).toBe(false);
  });

  it("NO modifica emailVerified cuando ya está seteado (Google user existente)", () => {
    const existingDate = new Date("2024-01-01");
    const result = applyOAuthEmailVerifiedGuard({
      trigger: "signIn",
      account: { provider: "google" },
      token: { id: "user-1", emailVerified: existingDate },
    });

    expect(result.emailVerified).toBe(existingDate); // sin cambio
    expect(result.dbUpdateCalled).toBe(false);
  });

  it("NO actúa en trigger=update (solo refresh desde DB)", () => {
    const result = applyOAuthEmailVerifiedGuard({
      trigger: "update",
      account: { provider: "google" },
      token: { id: "user-1", emailVerified: null },
    });

    // El trigger "update" tiene su propio path en el jwt callback
    expect(result.emailVerified).toBeNull(); // guard no corre
    expect(result.dbUpdateCalled).toBe(false);
  });

  it("NO actúa para provider=credentials (Credentials tiene su propio flujo)", () => {
    const result = applyOAuthEmailVerifiedGuard({
      trigger: "signIn",
      account: { provider: "credentials" },
      token: { id: "user-1", emailVerified: null },
    });

    expect(result.emailVerified).toBeNull(); // guard no corre para credentials
    expect(result.dbUpdateCalled).toBe(false);
  });

  it("NO actúa en refresh normal del JWT (trigger=undefined)", () => {
    const result = applyOAuthEmailVerifiedGuard({
      trigger: undefined,
      account: null,
      token: { id: "user-1", emailVerified: null },
    });

    expect(result.emailVerified).toBeNull();
    expect(result.dbUpdateCalled).toBe(false);
  });
});
