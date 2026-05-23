# Contribuir a ManosYa

## Branches

```
main          → producción (protegida, solo merge via PR)
develop       → integración (base para feature branches)
feat/xxx      → nueva feature
fix/xxx       → bugfix
chore/xxx     → infra, deps, tooling
docs/xxx      → documentación
```

No hacer push directo a `main` ni `develop`. Todo va por PR.

## Commits

Usamos [Conventional Commits](https://www.conventionalcommits.org/):

```
<tipo>(<scope>): <descripción en minúsculas, imperativo>

feat(auth): agregar login con Google
fix(search): corregir filtro de zona en GBA
chore(deps): actualizar prisma a 5.x
docs(readme): actualizar guía de setup
perf(images): agregar resize en upload
refactor(chat): extraer hook useMessages
test(quotes): agregar tests e2e de presupuesto
```

**Tipos válidos:** `feat` · `fix` · `docs` · `style` · `refactor` · `perf` · `test` · `chore` · `revert`

**Scopes sugeridos:** `auth` · `search` · `quotes` · `chat` · `reviews` · `payments` · `admin` · `profiles` · `images` · `notifications` · `mobile` · `deps` · `ci`

Mensajes en **español** (este proyecto es para el mercado argentino, el equipo habla español).

## Pull Requests

- Título en el mismo formato que los commits.
- Descripción: qué cambió, por qué, cómo testearlo.
- Todo PR debe pasar el **checklist mobile-first** (ver abajo).
- Mínimo 1 approval antes de mergear a `develop`.
- Squash merge a `develop`; merge commit a `main` (para que el historial de releases quede limpio).

### Template de PR

El template está en `.github/PULL_REQUEST_TEMPLATE.md`.

## Code style

**Formateo:** Prettier (auto en pre-commit via lint-staged).  
**Linting:** ESLint con reglas de Next.js + TypeScript strict.  
**No commitear código sin formatear** — el pre-commit hook lo rechaza.

```bash
# Correr manualmente antes de commitear
pnpm lint
pnpm format:check
```

### TypeScript

- `strict: true` siempre. No usar `any` salvo casos extremos documentados con `// TODO: type this properly`.
- Exportar tipos desde `src/types/index.ts` o co-localizados con el componente.
- Preferir `type` sobre `interface` para shapes de datos; `interface` solo para contratos que se extienden.

### Componentes React

```tsx
// ✅ Named exports siempre
export function ProviderCard({ provider }: ProviderCardProps) { ... }

// ❌ No default exports en componentes
export default function ProviderCard() { ... }

// ✅ Props tipadas con type local
type ProviderCardProps = {
  provider: ProviderWithRating
  className?: string
}

// ✅ "use client" solo cuando es necesario (formularios, hooks, eventos)
// No agregar "use client" "por las dudas"
```

### Server Actions

```ts
// Siempre validar con Zod antes de tocar la DB
// Siempre verificar la sesión antes de cualquier mutación
// Retornar { success, data?, error? } consistentemente
```

### CSS / Tailwind

- Clases base = mobile. Breakpoints `md:` y `lg:` solo para ajustes.
- Extraer clases repetidas a `@layer components` en `globals.css`, no a archivos CSS separados.
- No usar `!important` salvo para overrides de librerías externas.

---

## Setup local

```bash
# 1. Clonar e instalar
git clone https://github.com/tu-org/manosya.git
cd manosya
pnpm install

# 2. Variables de entorno
cp .env.example .env.local
# completar los valores (ver .env.example para referencias)

# 3. Base de datos local
docker-compose up -d

# 4. Migraciones y cliente Prisma
pnpm db:migrate
pnpm db:generate

# 5. Dev server
pnpm dev
```

### Comandos disponibles

```bash
pnpm dev              # servidor de desarrollo
pnpm build            # build de producción
pnpm start            # servidor de producción
pnpm lint             # ESLint
pnpm format           # Prettier
pnpm format:check     # verificar formato sin escribir
pnpm type-check       # tsc --noEmit
pnpm test             # Vitest (unit)
pnpm test:e2e         # Playwright
pnpm test:e2e:ui      # Playwright con UI
pnpm db:generate      # prisma generate
pnpm db:migrate       # prisma migrate dev
pnpm db:push          # prisma db push (para prototipar schema sin migración)
pnpm db:studio        # Prisma Studio
pnpm db:seed          # correr seeds
```

---

## Checklist Mobile-First para PRs

Todo PR que toque UI **debe** pasar este checklist antes de solicitar review.

### Layout y responsive

- [ ] Se ve correctamente a 375 px (iPhone SE) sin scroll horizontal
- [ ] Se ve correctamente a 768 px (tablet)
- [ ] Se ve correctamente a 1280 px (desktop)
- [ ] Las clases Tailwind siguen el patrón `base md:ajuste lg:ajuste` (nunca al revés)

### Touch y accesibilidad

- [ ] Todos los botones/links tienen `min-h-[44px]`
- [ ] Touch targets separados ≥ 8 px entre sí
- [ ] Todo elemento interactivo es accesible por teclado (Tab + Enter/Space)
- [ ] Íconos sin texto tienen `aria-label`
- [ ] Inputs tienen `<label>` asociado con `htmlFor`
- [ ] Contraste de texto ≥ 4.5:1 (verificar con DevTools → Accessibility)
- [ ] No hay `tabindex` positivos

### Formularios

- [ ] Inputs son `w-full` y tienen `min-h-[44px]` (o `h-11`)
- [ ] `inputMode` correcto (`numeric`, `email`, `tel`, `url`)
- [ ] Label arriba del input, nunca al costado

### Modals y overlays

- [ ] En mobile (< 768 px) se usa `<Drawer>` (bottom sheet) en lugar de `<Dialog>` centrado
- [ ] El bottom sheet cubre el notch (`pb-safe` o `pb-[env(safe-area-inset-bottom)]`)

### Imágenes

- [ ] Imágenes con `loading="lazy"` (excepto LCP image que tiene `priority`)
- [ ] `alt` descriptivo en todas las imágenes
- [ ] `srcSet` con variantes o usando `next/image`

### Performance

- [ ] No se importan librerías pesadas sin `dynamic()` en Client Components
- [ ] Sin `console.log` en producción
- [ ] Skeleton loaders en lugar de spinners para contenido asíncrono

### Seguridad

- [ ] Inputs validados con Zod en el servidor (Server Action o API route)
- [ ] No se exponen datos sensibles en Client Components (`password`, tokens, etc.)
- [ ] Rutas protegidas verifican sesión en el servidor

### Playwright (si hay cambios en flujos críticos)

- [ ] Test corrido en emulación iPhone 12 Pro (`pnpm test:e2e`)
- [ ] Test corrido en emulación Pixel 5

---

## Estructura del proyecto

Ver árbol completo en la sección correspondiente del README.
