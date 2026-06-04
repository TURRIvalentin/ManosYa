# Deployment Readiness

Fecha: 2026-06-02

Estado corto: ManosYa esta tecnicamente cerca de estar listo para un Deploy Preview, pero el deploy publico depende de configurar servicios externos reales. El build local no depende de Docker; Docker solo se usa para Postgres local. En Vercel se necesita una base Postgres remota y variables de entorno completas.

## Configuracion revisada

- Next.js 14 App Router.
- `package.json`
  - install: `pnpm install`
  - build: `pnpm build`
  - start: `pnpm start`
  - migrations: `pnpm prisma migrate deploy`
  - seed: `pnpm db:seed`
- `next.config.mjs`
  - usa defaults de Vercel para Next.js.
  - externaliza `@node-rs/argon2` y `sharp` para Server Components.
  - headers de seguridad basicos.
- Prisma
  - datasource usa `DATABASE_URL` y `DATABASE_DIRECT_URL`.
  - migraciones versionadas presentes.
  - `prisma` esta en `devDependencies`; Vercel instala devDependencies durante build, pero si se ejecutan migraciones fuera del build, la CLI debe estar disponible en ese entorno.
- Auth.js
  - `src/auth.ts` usa PrismaAdapter y providers en runtime Node.
  - `src/auth.config.ts` es Edge-safe.
  - `src/middleware.ts` usa `auth.config.ts`, no importa Prisma ni argon2.
- Middleware
  - existe en `src/middleware.ts`.
  - corre en Edge.
  - usa Upstash Redis Edge-safe para rate limiting del callback credentials.

## Checklist de env vars

Criticas para Preview/Production:

- `NEXT_PUBLIC_APP_URL`: URL del deploy preview o dominio final.
- `AUTH_SECRET`: obligatorio.
- `AUTH_GOOGLE_ID`
- `AUTH_GOOGLE_SECRET`
- `DATABASE_URL`: runtime/pooler de Postgres.
- `DATABASE_DIRECT_URL`: conexion directa para migraciones Prisma.
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `CLOUDFLARE_TURNSTILE_SECRET_KEY`
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`
- `R2_PUBLIC_URL`

Variables a no usar en produccion:

- `USE_R2_MOCK=true`: no permitido en produccion; el codigo de R2 lanza error fuera de development.

No bloqueantes para MVP actual:

- `MERCADOPAGO_*`: pendiente para monetizacion.
- `PUSHER_*`: reservado para chat/WebSockets futuro.
- `NEXT_PUBLIC_CHAT_POLL_INTERVAL_MS`: reservado para Fase 4.

## Posibles blockers

1. Upstash faltante rompe middleware/rate limiting.
   - `src/lib/rate-limit-edge.ts` crea Redis con `UPSTASH_REDIS_REST_URL!` y `UPSTASH_REDIS_REST_TOKEN!`.
   - En deploy preview deben existir.

2. Turnstile faltante rompe registro fuera de development.
   - `verifyTurnstile()` exige `CLOUDFLARE_TURNSTILE_SECRET_KEY` si `NODE_ENV !== "development"`.

3. Resend faltante rompe registro/verificacion.
   - `registerAction()` envia email de verificacion.
   - Sin `RESEND_API_KEY`, el smoke test de registro real no es completo.

4. R2 faltante rompe carga de documentos si se prueba onboarding prestador con documentos reales.
   - `USE_R2_MOCK=true` no debe usarse en produccion.
   - Para preview se recomienda configurar R2 real o aclarar que documentos no se smoke-testean.

5. Google OAuth callback URLs.
   - Agregar la URL de preview y dominio final en Google Cloud.

6. Migraciones no deben correr contra production desde un preview branch accidentalmente.
   - Usar DB separada para Preview.

7. Prisma en Edge.
   - Actualmente no hay import de Prisma en `src/middleware.ts`; mantener esta separacion.

## Pasos exactos de deploy

1. Crear Postgres remoto para Preview.
   - Recomendado: Neon/Supabase/Railway.
   - Usar DB separada de production.

2. Configurar Vercel.
   - Importar repo desde GitHub.
   - Framework: Next.js.
   - Install command: `pnpm install`.
   - Build command: `pnpm build`.
   - Node: >= 20.
   - Agregar env vars de Preview.

3. Migraciones.
   - Ejecutar contra la DB de Preview:

```bash
pnpm prisma migrate deploy
```

   - Este es el comando correcto para aplicar migraciones versionadas en entornos deployables. No usar `prisma migrate dev` en preview/production.

4. Seed.
   - Preview: opcional, solo para tener catalogo/demo durante smoke test:

```bash
pnpm db:seed
```

   - Production: no ejecutar seed demo automaticamente.

5. Deploy.
   - Push a GitHub dispara preview si Vercel esta conectado.
   - Alternativa CLI:

```bash
vercel
```

6. Smoke test manual.
   - Seguir `docs/deploy-preview-checklist.md`.

## Migraciones necesarias

Migraciones presentes:

- `20260524210616_init`
- `20260530145551_add_last_login_at`
- `20260601183000_make_client_review_rating_optional`

Comando:

```bash
pnpm prisma migrate deploy
```

## Dependencias externas

Postgres:
- Obligatorio.
- Debe estar accesible desde Vercel.
- Usar `DATABASE_URL` para runtime y `DATABASE_DIRECT_URL` para migraciones.

Resend:
- Obligatorio para registro/verificacion real.
- Sin Resend, el usuario no puede completar verificacion por email de forma normal.

Turnstile:
- Obligatorio fuera de development.
- Configurar secret y site key.

Upstash:
- Obligatorio para rate limiting en middleware y server actions.
- Faltante puede romper rutas auth o registro.

R2:
- Recomendado/obligatorio si se smoke-testea onboarding prestador con documentos.
- No usar mock en produccion.

## Riesgos de deploy

- Warnings actuales de build: muchos `react/jsx-sort-props` preexistentes. No bloquean build.
- Email verification depende de Resend y dominio/remitente validado.
- OAuth depende de callback URLs correctas.
- Document upload depende de R2 real.
- No hay Mercado Pago implementado para monetizacion.
- Fotos en pedidos siguen placeholder.
- Chat/notificaciones de pedidos no estan implementados.
- Seed demo no debe ejecutarse en production real.
- Admin/verificacion manual esta incompleta; perfiles verificados dependen de datos existentes/manuales.

## Veredicto

ManosYa esta listo para intentar Deploy Preview hoy si se configuran:

1. Postgres remoto separado para Preview.
2. Env vars completas en Vercel.
3. Migraciones con `pnpm prisma migrate deploy`.
4. Resend, Turnstile, Upstash y R2 reales o limitaciones documentadas para el smoke test.

No esta listo para production publica sin smoke test preview exitoso y sin decidir estrategia de seed/demo, verificacion admin y documentos R2.

