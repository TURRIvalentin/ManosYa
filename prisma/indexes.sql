-- ─────────────────────────────────────────────────────────────────────────────
-- ManosYa — Índices Postgres adicionales
-- Estos índices NO son generados por Prisma. Aplicar después de cada migrate
-- en producción y en la CI antes de los tests de integración.
-- Usar CONCURRENTLY en producción para no lockear tablas.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Full-text search en español ───────────────────────────────────────────

-- Título + descripción de servicios (búsqueda por texto libre)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_provider_service_fts
  ON "ProviderService"
  USING gin(
    to_tsvector('spanish', "title" || ' ' || coalesce("description", ''))
  )
  WHERE "isActive" = true;

-- Bio del prestador
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_provider_profile_bio_fts
  ON "ProviderProfile"
  USING gin(
    to_tsvector('spanish', coalesce("bio", ''))
  );

-- ── 2. Índices parciales (filtran filas deletadas en WHERE, sin costo extra) ──

-- Prestadores activos ordenados para la página de resultados
-- Cubre: WHERE deletedAt IS NULL ORDER BY isFeatured DESC, ratingAvg DESC
-- (La columna deletedAt en User aplica; ProviderProfile no tiene deletedAt propio,
--  pero su User sí. Se filtra en la query JOIN. Este índice es para el ORDER BY.)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_provider_profile_search_order
  ON "ProviderProfile" ("isFeatured" DESC, "ratingAvg" DESC, "ratingCount" DESC);

-- Pedidos abiertos por zona + categoría (feed de prestadores buscando trabajo)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_request_open_by_zone_category
  ON "Request" ("zoneId", "categoryId", "createdAt" DESC)
  WHERE "status" = 'OPEN' AND "deletedAt" IS NULL;

-- Mensajes no leídos por conversación (badge de contador)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_message_unread
  ON "Message" ("conversationId", "createdAt")
  WHERE "readAt" IS NULL AND "deletedAt" IS NULL;

-- Notificaciones no leídas por usuario (badge en campana / bottom nav)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notification_unread
  ON "Notification" ("userId", "createdAt" DESC)
  WHERE "readAt" IS NULL;

-- Reseñas visibles por prestador (excluye borradas por admin)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_review_visible_by_provider
  ON "Review" ("providerProfileId", "clientReviewedAt" DESC)
  WHERE "deletedAt" IS NULL AND "clientReviewedAt" IS NOT NULL;

-- ── 3. Índice para el polling de chat ────────────────────────────────────────

-- Carga mensajes de una conversación después de un timestamp dado
-- Query: WHERE conversationId = $1 AND createdAt > $2 AND deletedAt IS NULL
-- Nota: Prisma crea (conversationId, deletedAt, createdAt) como B-tree.
-- Este índice parcial es más eficiente para el polling frecuente.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_message_poll
  ON "Message" ("conversationId", "createdAt")
  WHERE "deletedAt" IS NULL;

-- ── 4. Índice para suscripciones activas ─────────────────────────────────────

-- Cron job de expiración: encuentra planes que vencen hoy
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscription_active_expiry
  ON "Subscription" ("endsAt")
  WHERE "status" = 'ACTIVE';

-- ── 5. Índice para reset mensual de contactos ────────────────────────────────

-- Cron job del 1° de cada mes: resetea monthlyContactCount de prestadores FREE
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_provider_monthly_reset
  ON "ProviderProfile" ("monthlyContactReset")
  WHERE "plan" = 'FREE';

-- ─────────────────────────────────────────────────────────────────────────────
-- NOTAS PARA EL EQUIPO
-- ─────────────────────────────────────────────────────────────────────────────
-- • Ejecutar ANALYZE después de crear índices en producción:
--     ANALYZE "ProviderService";
--     ANALYZE "Request";
--     ANALYZE "Message";
-- • Para verificar que el planner usa los índices:
--     EXPLAIN (ANALYZE, BUFFERS) SELECT ...
-- • Los índices GIN de FTS son más pesados. Si la tabla supera 1M filas,
--   evaluar pg_trgm con índice GIN en su lugar para mayor flexibilidad.
-- • Ejecutar este script con un usuario con permisos CREATE INDEX en el schema.
