# ManosYa — Plan de fases

Cada fase termina con un criterio verificable. No se avanza a la siguiente sin el OK del equipo.

---

## Fase 1 — Auth, perfiles y seguridad base

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
- [ ] Registro completo en iPhone SE físico o emulado en Playwright
- [ ] Email de verificación recibido y funcional
- [ ] Prestador puede cargar foto de DNI (comprimida a <200 KB antes de subir)
- [ ] Rate limiting verificado: 6to intento de login bloqueado con 429
- [ ] Turnstile: el formulario no envía sin token válido (testar con secret de prueba)
- [ ] `pnpm test:e2e --project="iPhone 12 Pro"` pasa

**Complejidad:** Alta (muchas integraciones: Auth.js, R2, Resend, Upstash, Turnstile)

---

## Fase 2 — Catálogo y búsqueda

**Objetivo:** Un cliente puede buscar prestadores por categoría + zona y ver su perfil.

**Features:**
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

**Objetivo:** Cliente y prestador pueden chatear en tiempo real dentro de un pedido.

**Decisión de arquitectura: polling HTTP, no WebSockets**

El chat arranca con polling cada 3 segundos:
```
GET /api/conversations/[id]/messages?after={timestamp}
→ devuelve mensajes nuevos desde ese timestamp
→ el cliente actualiza la UI con los mensajes nuevos
```

**Por qué polling primero:**
- Cero dependencias externas (no Pusher, no WebSocket server)
- Cero costo adicional (solo invocaciones Vercel Functions, cubiertas por el plan)
- Para un marketplace de servicios (no un chat de alta frecuencia), 3s de latencia es aceptable
- Implementación en < 1 día vs varios días para WebSockets + autenticación de canal
- El índice parcial `idx_message_poll` ya está diseñado para esta query

**Threshold para migrar a Pusher:**
Evaluar migración cuando se den DOS de estas condiciones:
1. > 50 conversaciones simultáneamente activas (usuarios escribiendo en tiempo real)
2. Quejas de usuarios sobre latencia en el chat (encuesta NPS o reviews)
3. Costo de polling supera $30/mes en Vercel (estimado: ~500K req/día → plan Pro)

**Estimación de costos Pusher si se migra:**
| Escenario | Mensajes/día | Plan Pusher | Costo |
|---|---|---|---|
| 0-500 chats activos/día | < 200K | Sandbox | $0 |
| 500-2000 chats/día | < 5M | Startup | $49/mes |
| > 5000 chats/día | > 5M | Business | $299/mes |

**Features:**
- UI tipo WhatsApp: burbujas, tilde enviado/leído, input fijo abajo, scroll al final
- Polling de mensajes nuevos (`useEffect` + interval de 3s cuando la pestaña está visible)
- Pause polling cuando la tab está en background (Page Visibility API)
- Contador de no leídos (badge en bottom nav)
- Adjuntar imagen (captura de cámara, subir a R2)
- Mensajes de sistema automáticos ("Presupuesto aceptado", "Trabajo completado")
- Notificaciones por email cuando hay mensaje nuevo y el usuario no está online

**Criterio de listo:**
- [ ] Mensaje enviado aparece en < 3.5s en el otro extremo
- [ ] Badge de no leídos se actualiza correctamente
- [ ] Chat funciona en 3G simulado sin spinners (skeleton + optimistic UI)

**Complejidad:** Media (sin la complejidad de WebSockets)

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
