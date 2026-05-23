# ManosYa

Marketplace de servicios para Argentina (mercado inicial: CABA y GBA).  
Conecta clientes que necesitan un trabajo con prestadores verificados de oficios y servicios profesionales.

---

## Stack

| Capa | Tecnología | Por qué |
|---|---|---|
| Framework | Next.js 14 (App Router) + TypeScript | SSR/SSG, Server Actions, file-based routing, ecosistema maduro |
| UI | Tailwind CSS + shadcn/ui + vaul + embla-carousel | shadcn da primitivas accesibles; vaul aporta bottom sheets nativos; embla para carruseles touch-friendly |
| Auth | Auth.js v5 (NextAuth) | Soporte nativo Next.js, providers Email + Google out of the box |
| ORM | Prisma + PostgreSQL | Type-safety end-to-end, migraciones, excelente DX |
| Storage | Cloudflare R2 | S3-compatible, sin egress fee, CDN global, ideal para imágenes redimensionadas |
| Realtime | Pusher Channels | WebSocket managed, SDK cliente liviano, reconexión automática |
| Email | Resend | API simple, plantillas React, alta deliverability |
| Pagos | Mercado Pago Checkout Pro | SDK oficial AR, optimizado para mobile, DEBIN/tarjetas locales |
| Hosting | Vercel (Next.js) + Neon (Postgres serverless) | Deploy automático, edge functions, branching de DB por PR |
| Testing | Vitest + Playwright | Vitest para unit/integration, Playwright con device emulation mobile |

### Por qué no Supabase Realtime

Supabase Realtime es excelente, pero introduce una dependencia fuerte de plataforma. Pusher Channels es agnóstico al backend, tiene SDK cliente más liviano (~8 KB gzipped vs ~40 KB de supabase-js), y el plan Sandbox cubre el desarrollo. Si en el futuro se migra a edge functions o se cambia el backend, Pusher no genera lock-in.

### Por qué no un backend separado (Fastify)

Next.js Server Actions + API Routes son suficientes para la fase inicial. Evita el overhead de un segundo proceso, simplifica el deploy, y la co-localización tipo/schema entre frontend y backend es una ventaja real. Si en el futuro se necesita escalar el backend de forma independiente (por carga de WebSockets o procesamiento de imágenes pesado), se extrae como un servicio separado.

---

## Arquitectura

```
┌─────────────────────────────────────────────────────┐
│                   Vercel Edge                        │
│  ┌──────────────────────────────────────────────┐   │
│  │          Next.js 14 (App Router)              │   │
│  │  ┌──────────────┐  ┌─────────────────────┐   │   │
│  │  │  RSC / Pages │  │   Server Actions    │   │   │
│  │  │  (streaming) │  │   (mutations)       │   │   │
│  │  └──────┬───────┘  └──────────┬──────────┘   │   │
│  │         │                     │               │   │
│  │  ┌──────▼─────────────────────▼──────────┐   │   │
│  │  │         API Routes (/api/*)            │   │   │
│  │  │  auth · webhooks · pusher-auth         │   │   │
│  │  └───────────────────┬───────────────────┘   │   │
│  └──────────────────────│───────────────────────┘   │
└─────────────────────────│───────────────────────────┘
                          │
          ┌───────────────┼────────────────┐
          │               │                │
     ┌────▼───┐    ┌──────▼──────┐   ┌────▼──────┐
     │  Neon  │    │  Cloudflare │   │  Pusher   │
     │ Postgres│    │     R2      │   │ Channels  │
     └────────┘    └─────────────┘   └───────────┘
          │
    ┌─────▼──────┐    ┌────────┐    ┌────────────┐
    │   Resend   │    │  MP    │    │  Auth.js   │
    │  (email)   │    │  SDK   │    │  (Google)  │
    └────────────┘    └────────┘    └────────────┘
```

### Patrones clave

- **Server Components por defecto** — solo agregar `"use client"` donde haya interactividad (formularios, realtime, hooks de estado).
- **Server Actions para mutaciones** — evita el boilerplate de API routes para operaciones simples; usa `zod` para validación en el servidor.
- **Zod en todas las fronteras** — cada input de usuario (form, query param, webhook body) se parsea con Zod antes de llegar al ORM.
- **Rate limiting en middleware** — usando `@upstash/ratelimit` + Redis (Upstash) sobre rutas sensibles (auth, quote creation).
- **Imágenes procesadas al subir** — sharp en un API route; se guardan variantes 400w, 800w, original. Nunca se sirven archivos crudos del celular.
- **Optimistic UI** — en mensajes y likes/reseñas para que la app se sienta instantánea en 3G.

---

## Mobile-first guidelines

> Estas reglas son **obligatorias** para todo el equipo. Ver checklist de PR en CONTRIBUTING.md.

### 1. Diseñar desde 375 px

El baseline es iPhone SE (375 × 667 px). Toda pantalla se ve correctamente a ese ancho antes de agregar breakpoints.

```tsx
// ✅ Correcto: base mobile, escala a desktop
<div className="px-4 md:px-8 lg:px-16">

// ❌ Incorrecto: empieza desde desktop
<div className="px-16 md:px-8 sm:px-4">
```

### 2. Navegación

- **Mobile (< 768 px):** `BottomNav` fija con 5 ítems máximo.
- **Desktop (≥ 768 px):** `TopBar` con los mismos ítems en horizontal.
- Nunca un hamburger menu en mobile si caben 5 ítems en la bottom nav.

### 3. Touch targets

- `min-height: 44px` en todos los botones interactivos (`min-h-[44px]`).
- Separación mínima de 8 px entre targets (`gap-2` o `space-y-2`).

### 4. Formularios

```tsx
// Labels siempre arriba, nunca al costado
<label className="block text-sm font-medium mb-1">Teléfono</label>
<input inputMode="numeric" className="w-full h-11 px-3 rounded-lg border" />

// ✅ Inputs grandes (h-11 = 44px)
// ✅ inputMode correcto por tipo de campo
// ✅ Ancho completo (w-full) en mobile
```

### 5. Modals → Bottom Sheets en mobile

Usar `vaul` (`<Drawer>`) para cualquier overlay que en mobile aparezca desde abajo. Los `Dialog` centrados solo en desktop.

```tsx
// ❌ No en mobile
<Dialog> ... </Dialog>

// ✅ En mobile
<Drawer> ... </Drawer>
```

### 6. Listas

- Scroll infinito o paginación tipo "Ver más", **nunca tablas** en mobile.
- Cards verticales con skeleton loader mientras carga (no spinners).

### 7. Imágenes

```tsx
<img
  loading="lazy"
  srcSet="foto-400.avif 400w, foto-800.avif 800w"
  sizes="(max-width: 768px) 100vw, 400px"
  alt="..."
/>
```

### 8. Features nativas mobile

```tsx
// Captura desde cámara
<input type="file" accept="image/*" capture="environment" />

// Geolocalización
navigator.geolocation.getCurrentPosition(...)

// Click-to-call
<a href="tel:+5491112345678">Llamar</a>

// Compartir por WhatsApp
<a href="https://wa.me/5491112345678?text=...">WhatsApp</a>
```

### 9. Performance (objetivos Core Web Vitals en 3G simulado)

| Métrica | Target |
|---|---|
| LCP | < 2.5 s |
| CLS | < 0.1 |
| INP | < 200 ms |

- Code splitting por ruta (automático en Next.js App Router).
- Componentes pesados con `dynamic(() => import(...), { ssr: false })`.
- Fuentes con `next/font` (no Google Fonts externo → ahorra RTT).
- `priority` solo en el LCP image de cada página.

### 10. Safe areas (notch / Dynamic Island)

```css
/* globals.css */
.safe-top    { padding-top: env(safe-area-inset-top); }
.safe-bottom { padding-bottom: env(safe-area-inset-bottom); }
```

El `<BottomNav>` siempre incluye `pb-[env(safe-area-inset-bottom)]`.

### 11. Accesibilidad (WCAG AA)

- Contraste mínimo 4.5:1 en texto normal, 3:1 en texto grande.
- Todo elemento interactivo accesible por teclado (`focus-visible`).
- `aria-label` en íconos sin texto visible.
- Orden de focus lógico (no romper con `tabindex` positivos).
- Inputs siempre con `<label>` asociado (htmlFor / aria-labelledby).

### 12. SEO

- `generateMetadata()` en cada page con title, description, OG image.
- Structured data `LocalBusiness` / `Service` (JSON-LD) en perfiles de prestadores.
- Sitemap dinámico en `/app/sitemap.ts`.
- `robots.ts` configurado.
