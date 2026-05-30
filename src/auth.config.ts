// auth.config.ts — configuración Edge-safe (sin imports Node.js)
// Usada por el middleware para verificar JWT sin necesitar Prisma ni argon2.
// auth.ts importa y extiende este objeto con providers y PrismaAdapter.
import type { NextAuthConfig } from "next-auth";
import type { JWT } from "next-auth/jwt";
import type { UserRole } from "@prisma/client";

export const authConfig = {
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 días
  },

  // Providers vacíos: los agrega auth.ts. El middleware no los necesita.
  providers: [],

  pages: {
    signIn: "/login",
    error: "/error",
  },

  callbacks: {
    // jwt: copia campos custom del User al token en el primer sign-in.
    // El trigger "update" con consulta DB se maneja en auth.ts (Node.js only).
    jwt({ token, user }) {
      if (user) {
        token.id = user.id ?? token.sub ?? "";
        token.role = (user as { role: UserRole }).role;
        token.emailVerified = (user as { emailVerified: Date | null }).emailVerified ?? null;
      }
      return token;
    },

    // session: expone los campos custom del JWT hacia Server Components y Actions.
    session({ session, token }) {
      const t = token as JWT & { id: string; role: UserRole; emailVerified: Date | null };
      session.user.id = t.id;
      session.user.role = t.role;
      session.user.emailVerified = t.emailVerified;
      return session;
    },

    // authorized: usado por el middleware para decidir si deja pasar la request.
    // La lógica de redirección fina (email verificado, onboarding) va en middleware.ts.
    authorized({ auth }) {
      return !!auth;
    },
  },
} satisfies NextAuthConfig;
