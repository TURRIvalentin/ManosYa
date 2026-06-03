# Deploy Preview Checklist

Este checklist prepara un deploy preview de ManosYa sin agregar features nuevas.

## Variables de entorno

Configurar en Vercel para Preview y Production:

- `NEXT_PUBLIC_APP_URL`: URL publica del deploy. En preview usar la URL de Vercel; en produccion usar el dominio final.
- `NEXT_PUBLIC_APP_NAME`: `ManosYa`.
- `AUTH_SECRET`: obligatorio fuera de local. Generar con `openssl rand -base64 32`.
- `AUTH_GOOGLE_ID` y `AUTH_GOOGLE_SECRET`: obligatorias para login con Google.
- `DATABASE_URL`: connection string pooled/runtime de Postgres.
- `DATABASE_DIRECT_URL`: connection string directa para migraciones Prisma.
- `CLOUDFLARE_TURNSTILE_SECRET_KEY`: obligatorio fuera de development.
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`: site key publica de Turnstile.
- `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN`: rate limiting de auth/registro.
- `RESEND_API_KEY` y `RESEND_FROM_EMAIL`: verificacion de email y emails transaccionales.
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`: documentos del prestador e imagenes futuras.
- `USE_R2_MOCK`: debe ser `false` o no estar seteado en produccion.
- `ADMIN_EMAIL`: email del primer admin si se usa seed/manual setup.

Variables no bloqueantes para el MVP actual:

- `NEXT_PUBLIC_CHAT_POLL_INTERVAL_MS`: reservado para Fase 4.
- `PUSHER_*`: reservado para posible WebSockets futuro.
- `MERCADOPAGO_*`: reservado para monetizacion; no bloquear deploy preview del flujo marketplace.

## Vercel

1. Crear proyecto en Vercel conectado al repo GitHub.
2. Framework: Next.js.
3. Install command: `pnpm install`.
4. Build command: `pnpm build`.
5. Output: default de Next.js.
6. Node: >= 20.
7. Configurar todas las env vars anteriores en Preview.
8. Confirmar que el build no depende de Docker local. Docker solo se usa para Postgres local; Vercel debe apuntar a una DB remota.

## Base de datos

Usar Postgres remoto para preview, por ejemplo Neon/Supabase/Railway.

Pasos:

1. Crear DB remota.
2. Configurar `DATABASE_URL` y `DATABASE_DIRECT_URL` en Vercel.
3. Ejecutar migraciones:

```bash
pnpm prisma migrate deploy
```

`prisma migrate deploy` es el comando correcto para entornos deployables porque aplica migraciones ya versionadas sin crear migraciones nuevas.

## Seed demo

No ejecutar seed demo automaticamente en produccion.

Para preview/staging se puede ejecutar manualmente:

```bash
pnpm db:seed
```

Reglas:

- Preview: seed demo permitido si se quiere smoke test con catalogo cargado.
- Production: no ejecutar seed demo salvo decision explicita; podria mezclar usuarios/prestadores ficticios con datos reales.
- El seed actual es idempotente para catalogo/demo, pero no debe formar parte del build de Vercel.

## Seguridad antes del deploy

- Confirmar que perfiles publicos y busqueda no exponen email, telefono, CUIL, DNI, matricula, documentos, plan, suscripciones ni Mercado Pago.
- Turnstile debe estar configurado fuera de development; si falta `CLOUDFLARE_TURNSTILE_SECRET_KEY`, el registro debe fallar.
- `AUTH_SECRET` debe ser real y secreto.
- Upstash debe estar configurado para rate limiting.
- Resend debe estar configurado para registro/verificacion. Si no, documentar que el preview necesita flujo manual de tokens y no es smoke test completo.
- R2 debe estar configurado o la carga de documentos/fotos debe quedar deshabilitada claramente. No usar `USE_R2_MOCK=true` en produccion.
- Mercado Pago queda pendiente y no forma parte del smoke test MVP.
- Revisar Google OAuth callback URLs para dominio preview/final.

## Smoke test manual

Usar dos usuarios reales de prueba, uno cliente y uno prestador. Si el preview tiene seed demo, puede usarse un prestador demo para busqueda, pero el flujo de presupuesto requiere cuenta prestador autenticada.

1. Registro/login:
   - Ir a `/register`.
   - Crear usuario cliente.
   - Verificar email.
   - Login en `/login`.

2. Onboarding cliente:
   - Completar `/onboarding`.
   - Confirmar que accede a `/pedidos` y `/buscar`.

3. Onboarding prestador:
   - Crear segundo usuario.
   - Completar perfil prestador: CUIL, zonas, servicio, documentos si R2 esta activo.
   - Confirmar que aparece en `/buscar`.

4. Busqueda:
   - Ir a `/buscar`.
   - Buscar por categoria/zona.
   - Probar filtros basicos: categoria, zona, verificado, precio/rating si hay datos.

5. Perfil publico:
   - Abrir `/prestadores/[id]`.
   - Confirmar que muestra bio, servicios, zonas, rating y CTA.
   - Confirmar que no muestra email/telefono/documentos.

6. Crear pedido:
   - Como cliente, abrir `/pedidos/nuevo?providerId=[id]`.
   - Crear pedido dirigido.
   - Confirmar redirect/listado en `/pedidos`.

7. Presupuesto:
   - Como prestador destinatario, abrir `/pedidos`.
   - Entrar al detalle `/pedidos/[id]`.
   - Enviar presupuesto.

8. Aceptar presupuesto:
   - Como cliente, abrir detalle del pedido.
   - Aceptar presupuesto.
   - Confirmar estado `HIRED`.

9. Completar pedido:
   - Como cliente, marcar como completado.
   - Confirmar estado `COMPLETED`.

10. Resenas:
    - Como cliente, dejar resena al prestador.
    - Como prestador, dejar resena al cliente.
    - Confirmar que ambas se ven en el detalle.
    - Confirmar que el rating del prestador se actualiza.

## Validacion local antes de pedir review

```bash
pnpm test
pnpm test:integration
pnpm type-check
pnpm build
git status
```

