// auth.ts — configuración completa de Auth.js v5 (Node.js runtime)
// NUNCA importar este archivo desde middleware.ts (rompe el Edge Runtime).
// El middleware usa auth.config.ts + NextAuth(authConfig) directamente.
import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import type { UserRole } from "@prisma/client";
import type { JWT } from "next-auth/jwt";

import { authConfig } from "./auth.config";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { loginSchema } from "@/lib/validations/auth";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,

  // PrismaAdapter gestiona Account y User (OAuth). Sessions no se usan (JWT strategy).
  adapter: PrismaAdapter(db),

  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
      authorization: {
        params: {
          // Fuerza la pantalla de selección de cuenta siempre (mejor UX)
          prompt: "select_account",
        },
      },
    }),

    Credentials({
      id: "credentials",
      name: "Email y contraseña",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        // Validar formato antes de ir a la DB
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        const user = await db.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            name: true,
            image: true,
            role: true,
            emailVerified: true,
            passwordHash: true,
            deletedAt: true,
          },
        });

        // Sin usuario, sin hash (usuario OAuth sin password), o soft-deleted → negar
        if (!user || !user.passwordHash || user.deletedAt) return null;

        const isValid = await verifyPassword(password, user.passwordHash);
        if (!isValid) return null;

        // Devolver el objeto user para que los callbacks lo reciban.
        // emailVerified puede ser null → signIn callback lo intercepta.
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          emailVerified: user.emailVerified,
        };
      },
    }),
  ],

  callbacks: {
    // signIn: ejecutado después de authorize() o después del callback OAuth.
    async signIn({ user, account }) {
      if (account?.provider !== "credentials") {
        // Flujo OAuth (Google, etc.)
        if (user.email) {
          const dbUser = await db.user.findUnique({
            where: { email: user.email },
            select: { deletedAt: true, passwordHash: true },
          });

          // Cuenta eliminada → denegar
          if (dbUser?.deletedAt) return false;

          // ACCOUNT CONFLICT: la cuenta ya existe con contraseña (Credentials).
          // Permitir la vinculación automática sería un vector de account takeover:
          // alguien con acceso al email Google podría apropiarse de una cuenta
          // con contraseña sin conocerla. Bloqueamos y mostramos instrucción clara.
          // Resolución manual: el usuario inicia sesión con contraseña y desde
          // Perfil > Seguridad vincula la cuenta OAuth con un botón explícito.
          // Ver docs/auth.md § "Conflicto de providers".
          if (dbUser?.passwordHash) {
            return `/auth/error?code=OAuthAccountConflict&provider=${account.provider}`;
          }
        }
        return true;
      }

      // Flujo Credentials: bloquear si el email no fue verificado.
      // Retornar una URL hace que Auth.js redirija sin crear sesión,
      // evitando el error genérico "CredentialsSignin".
      const emailVerified = (user as { emailVerified: Date | null }).emailVerified;
      if (!emailVerified) {
        return `/auth/verify-email?unverified=${encodeURIComponent(user.email ?? "")}`;
      }

      return true;
    },

    // jwt: extiende el callback de authConfig con la consulta DB en "update".
    async jwt(params) {
      // Ejecutar el callback base (mapea campos del user al token)
      const token = authConfig.callbacks!.jwt!(params) as JWT & {
        id: string;
        role: UserRole;
        emailVerified: Date | null;
      };

      // En trigger "update" (e.g. cliente llama session.update() tras verificar email)
      // refrescar role y emailVerified desde la DB para reflejar cambios inmediatos.
      if (params.trigger === "update" && token.id) {
        const dbUser = await db.user.findUnique({
          where: { id: token.id },
          select: { role: true, emailVerified: true, deletedAt: true },
        });
        // Si el usuario fue soft-deleted, mantener el token como está;
        // el middleware lo invalidará al verificar emailVerified o rol.
        if (dbUser && !dbUser.deletedAt) {
          token.role = dbUser.role;
          token.emailVerified = dbUser.emailVerified;
        }
      }

      return token;
    },

    // session: re-usa el callback base (ya mapea id, role, emailVerified)
    session: authConfig.callbacks!.session!,
  },

  events: {
    // Para futuros: enviar a Sentry/monitoring
    async signIn({ user, account, isNewUser }) {
      if (isNewUser && account?.provider === "google") {
        // Nuevo usuario via Google: crear ClientProfile vacío por default.
        // El onboarding le pedirá que elija su tipo de cuenta.
        const dbUser = await db.user.findUnique({ where: { id: user.id! } });
        if (dbUser && !dbUser.deletedAt) {
          await db.clientProfile.upsert({
            where: { userId: dbUser.id },
            create: { userId: dbUser.id },
            update: {},
          });
        }
      }
    },
  },
});
