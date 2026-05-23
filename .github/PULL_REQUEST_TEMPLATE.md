## ¿Qué cambió?

<!-- Describir el cambio en 2-3 líneas. Qué problema resuelve y cómo. -->

## Tipo de cambio

- [ ] feat — nueva feature
- [ ] fix — bugfix
- [ ] refactor — refactoring sin cambio de comportamiento
- [ ] perf — mejora de performance
- [ ] chore — dependencias, infra, tooling
- [ ] docs — documentación

## Cómo testear

<!-- Pasos para reproducir y verificar el cambio manualmente -->

1. 
2. 

## Checklist Mobile-First

> Obligatorio para cualquier PR que toque UI. Ver guía completa en CONTRIBUTING.md.

### Layout
- [ ] Se ve correctamente a 375 px (iPhone SE)
- [ ] Se ve correctamente a 768 px (tablet)
- [ ] Se ve correctamente a 1280 px (desktop)
- [ ] Clases Tailwind: base mobile → `md:` → `lg:` (nunca al revés)

### Touch y accesibilidad
- [ ] Botones/links con `min-h-[44px]`
- [ ] Íconos sin texto tienen `aria-label`
- [ ] Inputs tienen `<label>` asociado
- [ ] Navegable por teclado (Tab + Enter/Space)
- [ ] Contraste ≥ 4.5:1

### Formularios
- [ ] Inputs `w-full` con altura ≥ 44px
- [ ] `inputMode` correcto por tipo
- [ ] Label arriba (nunca al costado)

### Modals / overlays
- [ ] En mobile: `<Drawer>` (bottom sheet), no `<Dialog>` centrado

### Performance / seguridad
- [ ] Sin `console.log` en producción
- [ ] Inputs validados con Zod en servidor
- [ ] Sin datos sensibles expuestos en Client Components

### Tests
- [ ] Playwright corrido en iPhone 12 Pro
- [ ] Playwright corrido en Pixel 5

## Screenshots

<!-- Opcional pero muy útil: captura en mobile (375px) y desktop (1280px) -->
