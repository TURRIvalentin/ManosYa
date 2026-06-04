# Vercel Deployment Guide

Fecha: 2026-06-04

Objetivo: obtener una URL publica funcional de ManosYa en Vercel sin agregar funcionalidades nuevas.

## Estado de compatibilidad

ManosYa es deployable en Vercel como aplicacion Next.js App Router, condicionado a configurar servicios externos reales.

- Next.js: App Router en `src/app`.
- Build: `pnpm build`.
- Runtime Node: Server Components, Server Actions, Prisma, Auth.js providers y R2.
- Runtime Edge: `src/middleware.ts`.
- Prisma: usa Postgres con `DATABASE_URL` y `DATABASE_DIRECT_URL`.
- Auth.js: split config correcto; `src/auth.config.ts` es Edge-safe y `src/auth.ts` queda en Node.
- Docker: no requerido por Vercel; solo se usa para Postgres local.

Fuentes oficiales revisadas:

- Vercel auto-detecta frameworks como Next.js y aplica defaults de build/instalacion; tambien soporta variables por entorno Preview/Production.
- Prisma recomienda `prisma migrate deploy` para aplicar migraciones versionadas en staging/production.
- Auth.js requiere `AUTH_SECRET` y usa el patron `AUTH_[PROVIDER]_ID` / `AUTH_[PROVIDER]_SECRET` para OAuth.

## Variables requeridas

Configurar estas variables en Vercel para Preview. Para Production, usar valores separados cuando aplique.

### App

- `NEXT_PUBLIC_APP_URL`: URL publica del deploy. En Preview se puede usar la URL de Vercel; para Production usar dominio final.
- `NEXT_PUBLIC_APP_NAME`: `ManosYa`.
- `AUTH_SECRET`: secreto Auth.js de al menos 32 caracteres. Generar con `pnpm exec auth secret` u `openssl rand -base64 32`.

### Base de datos

- `DATABASE_URL`: URL runtime/pooler de Postgres.
- `DATABASE_DIRECT_URL`: URL directa para migraciones Prisma.

Recomendacion:

- Preview: DB separada de Production.
- Production: DB propia sin seed demo.

### Google OAuth

- `AUTH_GOOGLE_ID`
- `AUTH_GOOGLE_SECRET`

Callback URL:

```text
https://<dominio>/api/auth/callback/google
```

Para previews dinamicos de Vercel, Google OAuth puede requerir una estrategia estable:

- usar un dominio fijo para preview, o
- crear OAuth app separada para staging, o
- configurar `AUTH_REDIRECT_PROXY_URL` si se decide usar proxy estable de Auth.js.

### Resend

- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`

Requerido para registro con email y verificacion. El dominio/remitente debe estar validado en Resend para un smoke test real.

### Turnstile

- `CLOUDFLARE_TURNSTILE_SECRET_KEY`
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`

Fuera de `development`, si falta `CLOUDFLARE_TURNSTILE_SECRET_KEY`, el registro falla por diseno.

### Upstash

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

Requerido por:

- middleware Edge (`src/lib/rate-limit-edge.ts`) para rate limiting de credentials callback.
- Server Actions (`src/lib/rate-limit.ts`) para login, registro y reenvio de email.

### R2

- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`
- `R2_PUBLIC_URL`

Importante:

- No setear `USE_R2_MOCK=true` en Production.
- En Preview, si R2 no esta configurado, no smoke-testear documentos del prestador o dejarlo como limitacion explicita.

## Variables opcionales / futuras

- `NEXT_PUBLIC_CHAT_POLL_INTERVAL_MS`: reservado para Fase 4.
- `PUSHER_APP_ID`, `PUSHER_KEY`, `PUSHER_SECRET`, `PUSHER_CLUSTER`, `NEXT_PUBLIC_PUSHER_KEY`, `NEXT_PUBLIC_PUSHER_CLUSTER`: reservado para WebSockets futuro.
- `MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_PUBLIC_KEY`, `MERCADOPAGO_WEBHOOK_SECRET`, `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY`: pendiente para monetizacion.
- `ADMIN_EMAIL`: util si se automatiza un primer admin por seed/manual setup.

## Scripts revisados

Desde `package.json`:

- `pnpm build`: build Next.js.
- `pnpm start`: start production local.
- `pnpm test`: unit tests.
- `pnpm test:integration`: integration tests con Postgres accesible.
- `pnpm type-check`: TypeScript.
- `pnpm db:seed`: seed catalogo/demo.
- `pnpm prisma migrate deploy`: migraciones para Preview/Production.

No usar en Preview/Production:

- `pnpm db:migrate` / `prisma migrate dev`: solo desarrollo.
- `pnpm db:reset`: destructivo.
- `pnpm db:push`: evita historial de migraciones.

## Comandos exactos

### Preview

1. Crear DB Postgres remota separada.
2. Setear env vars de Preview en Vercel.
3. Aplicar migraciones contra DB Preview:

```bash
pnpm prisma migrate deploy
```

4. Opcional: seed demo para smoke test:

```bash
pnpm db:seed
```

5. Deploy:

```bash
vercel
```

O conectar GitHub a Vercel y pushear branch para que Vercel cree Preview Deployment.

### Production

1. Crear DB Production.
2. Setear env vars Production.
3. Aplicar migraciones:

```bash
pnpm prisma migrate deploy
```

4. Deploy:

```bash
vercel --prod
```

O merge/push a la production branch configurada en Vercel.

No ejecutar `pnpm db:seed` en Production salvo decision explicita.

## Configuracion Vercel

- Framework Preset: Next.js.
- Install Command: `pnpm install`.
- Build Command: `pnpm build`.
- Output Directory: default.
- Node.js: >= 20.
- Production branch: `master`, si se mantiene la rama actual como principal.
- Environment Variables: configurar Preview y Production por separado.

## Migraciones necesarias

Migraciones actuales:

- `20260524210616_init`
- `20260530145551_add_last_login_at`
- `20260601183000_make_client_review_rating_optional`

Comando:

```bash
pnpm prisma migrate deploy
```

`migrate deploy` aplica migraciones pendientes versionadas y no crea nuevas migraciones.

## Blockers criticos

1. Sin Postgres remoto no hay deploy funcional.
2. Sin `AUTH_SECRET`, Auth.js no puede operar seguro.
3. Sin `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`, el middleware Edge puede fallar en rutas auth.
4. Sin Resend, el registro con email no completa verificacion real.
5. Sin Turnstile, registro falla fuera de development.
6. Sin Google OAuth callback correcto, login con Google falla.
7. Sin R2, onboarding prestador con documentos puede fallar si se prueba esa parte.

## Blockers menores / limitaciones

- Warnings `react/jsx-sort-props` durante build; no bloquean.
- Fotos en pedidos siguen placeholder.
- Notificaciones de pedidos/presupuestos no implementadas.
- Chat no implementado.
- Mercado Pago no implementado.
- Admin/verificacion manual incompleta para uso operativo.
- Seed demo es apto para Preview, no para Production.

## Riesgos tecnicos especificos

### Dependencias Node

- `@node-rs/argon2` y `sharp` son nativas.
- `next.config.mjs` las externaliza en `serverComponentsExternalPackages`.
- Riesgo: si Vercel cambia comportamiento de bundling, revisar logs de build.

### Middleware Edge

- `src/middleware.ts` no importa Prisma ni `@node-rs/argon2`.
- Usa `@upstash/redis/cloudflare`, compatible con Edge.
- Riesgo principal: env vars Upstash faltantes.

### Prisma runtime

- Prisma corre en Node, no Edge.
- DB remota debe aceptar conexiones desde Vercel.
- Recomendado usar pooler en `DATABASE_URL` y direct URL para `DATABASE_DIRECT_URL`.

### Auth.js

- `AUTH_SECRET` obligatorio.
- Google OAuth debe incluir callback URLs correctas.
- Para previews con URLs dinamicas, considerar dominio preview estable o `AUTH_REDIRECT_PROXY_URL`.

## Checklist final antes de pedir URL publica

- [ ] Crear Postgres Preview.
- [ ] Configurar `DATABASE_URL` y `DATABASE_DIRECT_URL`.
- [ ] Configurar `AUTH_SECRET`.
- [ ] Configurar Google OAuth y callback URL.
- [ ] Configurar Resend y dominio/remitente.
- [ ] Configurar Turnstile.
- [ ] Configurar Upstash.
- [ ] Configurar R2 o excluir documentos del smoke test.
- [ ] Ejecutar `pnpm prisma migrate deploy`.
- [ ] Ejecutar seed demo solo si es Preview.
- [ ] Deploy en Vercel.
- [ ] Smoke test manual segun `docs/deploy-preview-checklist.md`.

## Estimacion

Deployable hoy: si se proveen env vars y servicios externos.

Requiere cambios: no para Deploy Preview basico. Si se exige smoke test completo con documentos reales, hace falta R2 configurado. Si se exige login Google en previews dinamicos, puede hacer falta dominio estable o `AUTH_REDIRECT_PROXY_URL`.

