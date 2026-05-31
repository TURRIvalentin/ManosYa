# ManosYa — Plan de fases

Cada fase termina con un criterio verificable. No se avanza a la siguiente sin el OK del equipo.

---

## Fase 1 — Auth, perfiles y seguridad base ✅ COMPLETA (2026-05-30)

**Objetivo:** Un usuario puede registrarse, verificar su email, completar su perfil (como cliente o prestador) y el sistema es seguro desde el día uno.

**Features:**
- Registro con email + contraseña (argon2 para hashing vía Auth.js)
- Registro con Google OAuth
- Verificación de email obligatoria antes de acceder a features protegidas
- Onboarding paso a paso mobile-first: una pantalla por paso, barra de progreso
- Perfil cliente: nombre, barrio, foto de perfil
- Perfil prestador: bio, foto, categorías, zonas de cobertura, disponibilidad
- Carga de documentos de verificación (DNI, CUIL, matrícula) → R2
- **Cloudflare Turnstile en el formulario de registro** (bloquea bots sin CAPTCHA visible)
- **Rate limiting en /api/auth/* y /api/register con Upstash Redis**
  - Límite: 5 intentos de login / 10 min / IP
  - Límite: 3 registros / hora / IP
- Middleware de rutas protegidas (redirect a login si no autenticado)
- Validación CUIL/CUIT con dígito verificador (src/lib/validations/cuil.ts)

**Criterio de listo:**
- [x] Registro completo — verificado en local (email + contraseña con Turnstile)
- [x] Email de verificación recibido y funcional (Resend)
- [x] Carga de documentos vía R2 (onboarding prestador: paso documentos)
- [x] Rate limiting verificado: bloqueo tras 3 intentos de registro / 5 de login
- [x] Turnstile: widget real con sitekey de prueba 1x00000000000000000000AA
- [x] TopBar/BottomNav reactivos a sesión (useSession + Radix Avatar + DropdownMenu)
- [x] Datos persisten en Postgres — User + ClientProfile verificados
- [x] Build limpio (`pnpm build` sin errores, solo warnings pre-existentes de jsx-sort-props)
- [ ] `pnpm test:e2e --project="iPhone 12 Pro"` — diferido a CI (Playwright configurado, suite pendiente)

**Complejidad:** Alta (muchas integraciones: Auth.js, R2, Resend, Upstash, Turnstile)

---

## Fase 2 — Catálogo y búsqueda

### Fase 2A — /perfil CRUD ✅ COMPLETA (2026-05-31)

**Features entregadas:**
- `/perfil` landing con avatar, miembro desde, último acceso, banner prestador incompleto con CTA inteligente
- `/perfil/datos` — editar nombre/teléfono (con session refresh via window.location.reload), cambio de contraseña, bio/CUIL del prestador
- `/perfil/servicios` — CRUD completo: agregar, editar inline expandible, toggle activo/inactivo, eliminar con confirmación. Anti-IDOR en todas las mutaciones
- `/perfil/zonas` — chip selector editable, replace-all al guardar
- `/perfil/documentos` — upload DNI/matrícula con dev bypass de R2 (isInvalid detecta "placeholder")
- `/perfil/eliminar-cuenta` — soft delete: email anonimizado, Account OAuth liberado, re-registro permitido
- Seed de 20 categorías + 48 barrios CABA + 24 partidos GBA (idempotente)
- `USE_R2_MOCK` + detección de valores placeholder para bypass de R2 en dev
- `lastLoginAt` en schema de User, actualizado en events.signIn
- JWT trigger="update" refresca name, image, role, emailVerified mid-session

**Pendiente:**
- [ ] Subir cambios a GitHub remoto

---

## Fase 2B + 2C — Catálogo y búsqueda

**Objetivo:** Un cliente puede buscar prestadores por categoría + zona y ver su perfil.

**Features:**
- **`/perfil` con CRUD de servicios, zonas y documentos del prestador** ← no mover, depende de gap de Fase 1 (usuarios BOTH que completaron onboarding de cliente pero no configuraron su perfil de prestador)
- Seed de ~20 categorías (con subcategorías) y 72 zonas (48 barrios CABA + 24 partidos GBA)
- CRUD de servicios del prestador (título, descripción, precio desde/hasta, fotos)
- Pantalla de búsqueda:
  - Input sticky arriba
  - Chips de categorías scrolleables
  - Filtros en bottom sheet (zona, verificado, rating, precio)
  - Cards de prestador con foto, rating, badge verificado, precio orientativo
  - Scroll infinito (cursor-based pagination)
- Geolocalización: pedir permiso → autocompletar zona; fallback a selector manual
- Perfil público del prestador:
  - JSON-LD `LocalBusiness` para SEO
  - Fotos de servicios con carrusel (embla-carousel)
  - Botón "click to call" + "WhatsApp"
  - Rating y reseñas visibles
- Índices GIN full-text (prisma/indexes.sql) aplicados

**Criterio de listo:**
- [ ] Búsqueda "gasista CABA Palermo" retorna resultados relevantes
- [ ] LCP < 2.5s en 3G simulado en Lighthouse CI
- [ ] Perfil de prestador tiene structured data válido (Rich Results Test)

**Complejidad:** Alta

---

## Fase 3 — Pedidos y presupuestos

**Objetivo:** Un cliente puede pedir un presupuesto y un prestador puede responder.

**Features:**
- Crear pedido: descripción + hasta 5 fotos (captura directa de cámara mobile)
  - Compresión de imágenes al subir (sharp, max 800px, WebP)
- Pedido abierto (subasta inversa): visible a prestadores de la zona/categoría
- Pedido dirigido: a un prestador específico
- Vista de prestador: bandeja de pedidos abiertos en sus zonas
- Enviar presupuesto: precio (Decimal ARS), plazo estimado, comentario
- Flujo del cliente: ver presupuestos, aceptar uno → estado HIRED
- Estado HIRED: muestra botón "Trabajo completado" al cliente
- Notificaciones por email (Resend) en cada cambio de estado

**Criterio de listo:**
- [ ] Flujo completo cliente→presupuesto→aceptar en Playwright mobile (< 3 min)
- [ ] Imágenes subidas pesan < 200 KB y se sirven en WebP
- [ ] Email de notificación recibido en < 30s

**Complejidad:** Media

---

## Fase 4 — Mensajería (polling-first)

**Objetivo:** Cliente y prestador pueden chatear dentro de un pedido con latencia aceptable y sin introducir infraestructura WebSocket antes de que haya demanda real.

### Decisión de arquitectura: short polling HTTP configurable

```
GET /api/conversations/[id]/messages?after={ISO_timestamp}

→ Retorna array de mensajes nuevos desde ese timestamp
→ Si vacío, retorna [] (no es un error)
→ El cliente scheduling el próximo poll al recibir la respuesta
```

**Por qué polling, no long polling, no WebSockets:**
- Cero dependencias externas, cero configuración de infraestructura
- Implementación en <1 día vs días para WebSockets + auth de canal + manejo de reconexión
- Para un marketplace de servicios, 5s de latencia percibida es aceptable: los usuarios
  no están en tiempo real en el mismo segundo; mandan un mensaje y esperan la respuesta
- El índice `idx_message_poll` en `indexes.sql` ya cubre exactamente esta query

**Long polling descartado:** aunque reduce el número de requests, en Vercel Functions es
prohibitivamente caro porque el costo se calcula por **GB-hora** (duración × memoria).
Una función que espera 15s promedio en lugar de 50ms ocupa ~300× más GB-horas.
Ver tabla de costos abajo.

---

### (a) Intervalo configurable por variable de entorno

```bash
# .env.local — arranca en 5s, no 3s
NEXT_PUBLIC_CHAT_POLL_INTERVAL_MS=5000
```

```ts
// src/hooks/useChat.ts (Fase 4)
const POLL_INTERVAL = Number(
  process.env.NEXT_PUBLIC_CHAT_POLL_INTERVAL_MS ?? "5000"
);
```

El intervalo de **5 segundos** es el default porque:
- El costo mensual a 50 screens activos es ~$30 (dentro del plan Pro)
- 5s de latencia en un chat de marketplace es invisible para el usuario
- Si se detectan quejas de latencia, bajar a 3s es un cambio de una variable, no un deploy

---

### (b) Page Visibility API — pausar polling con tab oculta

```ts
// Pausa automática cuando el usuario cambia de pestaña o minimiza el navegador
// Economiza requests en segundo plano; retoma inmediatamente al volver
useEffect(() => {
  const handleVisibility = () => {
    if (document.visibilityState === "visible") {
      startPolling();   // poll inmediato al volver + rearrancar interval
    } else {
      stopPolling();
    }
  };
  document.addEventListener("visibilitychange", handleVisibility);
  return () => document.removeEventListener("visibilitychange", handleVisibility);
}, []);
```

Esto reduce el número de requests ~40-60% asumiendo que los usuarios tienen otras
pestañas abiertas o usan el celular con la pantalla apagada mientras esperan respuesta.

---

### (c) Estimación de costos — Vercel Pro (short polling vs long polling vs Pusher)

**Supuestos:**
- Vercel Pro: $20/mes base + $0.60/1M invocaciones + $0.18/GB-hora (100 GB-hora free)
- Función de poll: 50ms ejecución, 128 MB RAM
- Uso activo: 16 h/día, 30 días/mes

| Escenario | Concurrent screens | Req/día (5s) | Req/mes | Costo polling/mes | Long polling (15s avg) | Pusher |
|---|---|---|---|---|---|---|
| **Temprano** | 50 | 576 K | 17.3 M | **~$30** | ~$195 ⚠️ | Sandbox $0 |
| **Crecimiento** | 200 | 2.3 M | 69 M | **~$65** | ~$780 🚫 | Startup $49 |
| **Escala** | 500 | 5.76 M | 173 M | **~$159** | ~$1.950 🚫 | Startup $49 |

> **Long polling es 4-12× más caro que short polling en Vercel Functions** porque
> el costo por GB-hora domina. Solo tiene sentido en un servidor persistente (EC2, Railway).

**Cálculo detallado escenario "Crecimiento" (200 screens, 5s):**
```
req/mes = 200 screens × 720 polls/h × 16h × 30 días = 69.12M
invocaciones: (69.12M - 1M free) × $0.60/M = $40.87
GB-horas: 69.12M × 0.05s / 3600 × 0.125 GB = 120 GB-h
duración: (120 - 100 free) × $0.18 = $3.65
Total: $20 + $40.87 + $3.65 ≈ $65/mes
```

---

### Threshold para migrar a Pusher

Evaluar la migración cuando se cumplan **al menos dos** de estas condiciones:

1. **Costo:** bill mensual de Vercel atribuible a chat > $45/mes (~180 screens simultáneos)
2. **Latencia:** usuarios reportan demoras en el chat (NPS o Play Store reviews)
3. **Escala:** más de 200 conversaciones simultáneamente activas de forma sostenida (>3 semanas)

El gatillo económico (\#1) es el más objetivo. Con 200 screens, polling cuesta ~$65/mes
y Pusher Startup cuesta $49/mes + gastos mínimos de envío de eventos. La diferencia ya
justifica la migración.

**Estimación Pusher al migrar:**

| Daily active chats | Mensajes enviados/día (est.) | Plan Pusher | Costo total (Pusher + Vercel envío) |
|---|---|---|---|
| < 500 | < 50 K | Sandbox (gratis) | ~$20 (base Vercel) |
| 500–3.000 | 50 K–500 K | Startup $49/mes | ~$70/mes |
| > 3.000 | > 500 K | Business $299/mes | ~$320/mes |

---

### Features de Fase 4

- UI tipo WhatsApp: burbujas con tail, timestamp, tilde enviado/leído, input fijo abajo,
  scroll automático al último mensaje, skeleton loader en carga inicial
- Tombstone en mensajes borrados: `[Mensaje eliminado]` (patrón `isDeleted` del schema)
- Optimistic UI: el mensaje aparece en la burbuja del sender inmediatamente (antes del ACK),
  con estado "enviando…" que se reemplaza por el timestamp al confirmar
- Pause/resume por Page Visibility API
- Contador de no leídos en badge de bottom nav (se actualiza en cada poll)
- Adjuntar imagen desde cámara (compresión antes de subir a R2)
- Mensajes de sistema automáticos: "Presupuesto aceptado", "Trabajo completado"
- Notificación por email vía Resend cuando hay mensaje nuevo y el receptor no está activo
  (definición de "activo": no hizo poll en los últimos 30s)

**Criterio de listo:**
- [ ] Mensaje aparece en el otro extremo en ≤ `CHAT_POLL_INTERVAL_MS + 500ms`
- [ ] Polling se pausa al ocultar la pestaña y rearrancan al volver (verificar en DevTools Network)
- [ ] Mensaje eliminado por el sender muestra `[Mensaje eliminado]` en ambos lados
- [ ] Optimistic UI: burbuja aparece antes del ACK del servidor
- [ ] Badge de no leídos se actualiza correctamente
- [ ] Chat funciona en 3G simulado sin spinners (skeleton + optimistic UI)

**Complejidad:** Media (sin la complejidad de WebSockets)

**Variable de entorno a agregar antes de Fase 4:**
```bash
# .env.example
NEXT_PUBLIC_CHAT_POLL_INTERVAL_MS=5000
```

---

## Fase 5 — Reputación y reseñas

**Objetivo:** Tras completar un trabajo, ambas partes pueden calificarse.

**Features:**
- Botón "Marcar como completado" (cliente) → estado COMPLETED → habilita reseñas
- Formulario de reseña: 1-5 estrellas + comentario (cliente → prestador, obligatorio)
- Reseña inversa: prestador puede calificar al cliente (opcional, 7 días de ventana)
- `ratingAvg` y `ratingCount` en ProviderProfile se actualizan tras cada reseña
- Reseñas visibles en perfil público del prestador
- Solo se puede reseñar una vez por trabajo (constraint @unique en Review.requestId)

**Criterio de listo:**
- [ ] Rating del prestador actualizado inmediatamente tras reseña
- [ ] Intento de reseñar un trabajo no completado retorna error 400
- [ ] Vista de reseñas en perfil público con paginación

**Complejidad:** Baja

---

## Fase 6 — Pagos y suscripciones

**Objetivo:** Monetizar la plataforma con el modelo Free/Pro para prestadores.

**Modelo de monetización:**
- **Plan FREE:** hasta 3 contactos/mes sin costo. "Contacto" = cuando un cliente envía un pedido al prestador (o el prestador responde a un pedido abierto). El contador `monthlyContactCount` se incrementa en ese evento, no al cerrar el trabajo.
- **Plan PRO:** contactos ilimitados + badge "Destacado" en búsquedas ($XX ARS/mes)
- La plataforma **NO procesa el pago del trabajo** (el usuario paga al prestador directamente, en efectivo o transferencia). Esto evita la complejidad regulatoria de ser un procesador de pagos.
- El **chat NO bloquea el intercambio de teléfonos o WhatsApp** entre usuario y prestador. Intentar hacerlo generaría desconfianza y llevaría a los usuarios a abandonar la app. La monetización es por visibilidad y volumen de contactos, no por control del canal.

**Features:**
- Contador de contactos mensuales para FREE (con reset el día 1)
- Bloqueo suave al llegar al límite: "Actualizá a Pro para seguir recibiendo pedidos"
- Mercado Pago Checkout Pro: generar preferencia, webhook de confirmación
- Activar plan PRO tras pago confirmado (webhook HMAC-validado)
- Badge "Destacado" aparece en búsqueda (el índice ya lo soporta con `isFeatured`)

**Criterio de listo:**
- [ ] Pago de prueba con tarjeta sandbox de MP activa el plan Pro
- [ ] Webhook de MP validado con HMAC (no procesa sin firma correcta)
- [ ] Prestador FREE bloqueado al 4to contacto del mes

**Complejidad:** Alta (integración MP, manejo de webhooks, estados de suscripción)

---

## Fase 7 — Panel admin

**Objetivo:** Admins pueden moderar la plataforma sin tocar la base de datos directamente.

**Features (desktop-first):**
- Dashboard con métricas: usuarios activos, pedidos creados, conversión, ingresos
- Tabla de usuarios con filtros (nombre, email, rol, estado, fecha)
- Acciones bulk: suspender, verificar, resetear contraseña
- Cola de verificaciones pendientes (DNI + matrícula para revisar)
- Moderación de reseñas reportadas (soft-delete)
- AuditLog: todo lo que hace un admin queda registrado

**Criterio de listo:**
- [ ] Admin puede aprobar verificación de prestador (isVerified = true) y el badge aparece en búsqueda
- [ ] Toda acción admin queda en AuditLog con userId + IP
- [ ] Rutas /admin/* inaccesibles para role USER (403)

**Complejidad:** Media

---

## Fase 8 — PWA, performance y push notifications

**Objetivo:** La app funciona offline en lo básico y se puede instalar en el celular.

> Nota: manifest.json, apple-touch-icon y theme-color ya están desde el scaffolding inicial.
> Esta fase agrega el Service Worker y la lógica de push.

**Features:**
- Service Worker con Workbox: cache de assets estáticos, stale-while-revalidate para API
- Offline: últimas conversaciones y perfil propio accesibles sin conexión
- Web Push Notifications (via VAPID): mensajes nuevos, presupuestos nuevos
- Lighthouse CI integrado en CI: bloquea merge si LCP > 2.5s o CLS > 0.1
- Bundle analysis (`@next/bundle-analyzer`) y optimización de chunks
- Lazy loading de componentes pesados (mapa, carrusel de fotos)

**Criterio de listo:**
- [ ] Lighthouse score Performance ≥ 90 en mobile en CI
- [ ] Push notification recibida en Android Chrome sin tener la app abierta
- [ ] App instalable: el banner "Agregar a pantalla de inicio" aparece en Android

**Complejidad:** Alta
