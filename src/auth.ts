// auth.ts — configuración completa de Auth.js v5 (Node.js runtime)
// NUNCA importar este archivo desde middleware.ts (rompe el Edge Runtime).
// El middleware usa auth.config.ts + NextAuth(authConfig) directamente.
import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";

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
            // account puede ser undefined si llegamos aquí desde credentials
            // (account?.provider !== "credentials" es true cuando account === null/undefined).
            return `/error?code=OAuthAccountConflict&provider=${account?.provider ?? "unknown"}`;
          }
        }
        return true;
      }

      // Flujo Credentials: bloquear si el email no fue verificado.
      // Retornar una URL hace que Auth.js redirija sin crear sesión,
      // evitando el error genérico "CredentialsSignin".
      const emailVerified = (user as { emailVerified: Date | null }).emailVerified;
      if (!emailVerified) {
        return `/verify-email?unverified=${encodeURIComponent(user.email ?? "")}`;
      }

      return true;
    },

    // jwt: extiende el callback de authConfig con la consulta DB en "update".
    async jwt(params) {
      // Ejecutar el callback base (mapea campos del user al token)
      const token = authConfig.callbacks.jwt(params);

      // BUG KNOWN en Auth.js v5 (handle-login.ts:279):
      //   createUser({ ...profile, emailVerified: null })
      // Para OAuth, emailVerified se sobreescribe explícitamente a null sin importar
      // lo que el provider devuelva (Google devuelve email_verified: true).
      // El jwt callback recibe el user post-createUser → token.emailVerified = null.
      // Sin este guard, requireVerifiedEmail() bloquearía a todos los usuarios de Google.
      // Solución: confiar en el proveedor OAuth y setear emailVerified = now, corrigiendo
      // el token y la DB en el mismo paso.
      if (
        params.trigger === "signIn" &&
        params.account?.provider !== "credentials" &&
        !token.emailVerified
      ) {
        const now = new Date();
        token.emailVerified = now;
        if (token.id) {
          try {
            await db.user.update({
              where: { id: token.id },
              data: { emailVerified: now },
            });
          } catch {
            // Non-fatal: el token ya tiene emailVerified=now, la sesión es válida.
            // El próximo trigger="update" corregirá la fila si persiste el error.
          }
        }
      }

      // En trigger "update" (e.g. session.update() tras cambiar nombre, rol, emailVerified)
      // refrescar todos los campos mutables desde la DB para reflejar cambios mid-session.
      if (params.trigger === "update" && token.id) {
        const dbUser = await db.user.findUnique({
          where: { id: token.id },
          select: { role: true, emailVerified: true, deletedAt: true, name: true, image: true },
        });
        // Si el usuario fue soft-deleted, mantener el token como está;
        // el middleware lo invalidará al verificar emailVerified o rol.
        if (dbUser && !dbUser.deletedAt) {
          token.role = dbUser.role;
          token.emailVerified = dbUser.emailVerified;
          token.name = dbUser.name;
          token.picture = dbUser.image; // Auth.js mapea token.picture → session.user.image
        }
      }

      return token;
    },

    // session: re-usa el callback base (ya mapea id, role, emailVerified)
    session: (p) => authConfig.callbacks.session(p),
  },

  events: {
    async signIn({ user, account, isNewUser }) {
      // Registrar timestamp del último login para mostrar en /perfil
      if (user.id) {
        db.user
          .update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
          .catch(() => {}); // Non-fatal: el login no debe romperse por esto
      }

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
