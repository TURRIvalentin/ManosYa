-- ─────────────────────────────────────────────────────────────────────────────
-- ManosYa — Índices Postgres adicionales
-- NO generados por Prisma. Ejecutar DESPUÉS de prisma migrate en cada entorno.
-- En producción siempre usar CONCURRENTLY para no lockear tablas.
-- Requiere usuario con permisos CREATE INDEX y CREATE EXTENSION en el schema.
-- ─────────────────────────────────────────────────────────────────────────────

-- ═══════════════════════════════════════════════════════════════════════════════
-- PASO 0 — Extensiones (ejecutar UNA SOLA VEZ por base de datos)
-- En Neon: ir a Dashboard → Extensions y habilitarlas, o ejecutar aquí.
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS unaccent;    -- quita tildes para búsqueda
CREATE EXTENSION IF NOT EXISTS pg_trgm;     -- similitud trigrama para nombres

-- ─────────────────────────────────────────────────────────────────────────────
-- PASO 1 — Configuración de Full-Text Search en español con unaccent
--
-- Problema: la config 'spanish' de Postgres hace stemming pero NO ignora
-- tildes. "plomería" no matchea "plomeria". En Argentina la gente busca
-- sin tildes porque el teclado mobile es más difícil.
--
-- Solución: custom config que combina unaccent + stemmer español.
-- La función f_unaccent es IMMUTABLE (requisito para usarla en índices)
-- porque llama a unaccent() con el nombre explícito del diccionario,
-- eliminando la dependencia del search_path que la hace STABLE por defecto.
-- ─────────────────────────────────────────────────────────────────────────────

-- Wrapper IMMUTABLE necesario para usar unaccent() en expresiones de índice
CREATE OR REPLACE FUNCTION f_unaccent(text)
  RETURNS text
  LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE AS
$$SELECT unaccent('unaccent', $1)$$;

-- Config custom: copia de 'spanish' con unaccent en el pipeline de mapeo.
-- Esto hace que to_tsvector('spanish_unaccent', 'plomería') indexe igual
-- que to_tsvector('spanish_unaccent', 'plomeria').
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_ts_config WHERE cfgname = 'spanish_unaccent'
  ) THEN
    CREATE TEXT SEARCH CONFIGURATION spanish_unaccent ( COPY = spanish );
    ALTER TEXT SEARCH CONFIGURATION spanish_unaccent
      ALTER MAPPING FOR hword, hword_part, word
      WITH unaccent, spanish_stem;
  END IF;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- PASO 2 — Índices Full-Text Search
--
-- Campos indexados y por qué:
--
--  ProviderService.title + description  → superficie principal de búsqueda.
--    Un cliente busca "plomero urgente zona norte" y matchea contra el
--    título y descripción de servicios activos.
--
--  ProviderProfile.bio                  → búsqueda secundaria. Permite
--    encontrar prestadores por su descripción libre ("gasista matriculado
--    con 10 años de experiencia").
--
--  User.name (vía pg_trgm)              → búsqueda por nombre del prestador.
--    Los nombres propios NO se benefician del stemmer. pg_trgm permite
--    "Juan Gar" → "Juan García" sin importar mayúsculas/minúsculas/tildes.
--
--  Request.title + description          → feed de prestadores. Un prestador
--    puede filtrar pedidos abiertos por palabras clave relevantes a sus
--    servicios ("cañería rota", "pintura exterior", etc.).
--
-- Campos NO indexados con FTS:
--  Category.name / Zone.name            → tablas pequeñas (<100 filas),
--    escaneo secuencial es más rápido que GIN.
--  Review.clientComment / providerComment → no se buscan, solo se leen.
-- ─────────────────────────────────────────────────────────────────────────────

-- Servicios activos: título + descripción (principal)
-- Query típica: to_tsquery('spanish_unaccent', f_unaccent('plomeria'))
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fts_provider_service
  ON "ProviderService"
  USING gin(
    to_tsvector('spanish_unaccent',
      f_unaccent("title") || ' ' || f_unaccent(coalesce("description", ''))
    )
  )
  WHERE "isActive" = true;

-- Bio del prestador (secundario)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fts_provider_bio
  ON "ProviderProfile"
  USING gin(
    to_tsvector('spanish_unaccent', f_unaccent(coalesce("bio", '')))
  );

-- Nombre del prestador (User) via trigrama — no usa stemmer, es para nombres propios
-- Soporta: ILIKE '%garcia%', similarity('garcia', name) > 0.3
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trgm_user_name
  ON "User"
  USING gin(name gin_trgm_ops)
  WHERE name IS NOT NULL;

-- Pedidos abiertos: título + descripción (feed del prestador)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fts_request
  ON "Request"
  USING gin(
    to_tsvector('spanish_unaccent',
      f_unaccent("title") || ' ' || f_unaccent("description")
    )
  )
  WHERE "status" = 'OPEN' AND "deletedAt" IS NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- Ejemplo de query que usa estos índices (para referencia al implementar):
--
--   SELECT ps.*, pp.*
--   FROM "ProviderService" ps
--   JOIN "ProviderProfile" pp ON pp.id = ps."providerProfileId"
--   WHERE ps."isActive" = true
--     AND to_tsvector('spanish_unaccent',
--           f_unaccent(ps.title) || ' ' || f_unaccent(coalesce(ps.description, ''))
--         ) @@ to_tsquery('spanish_unaccent', f_unaccent('plomeria'))
--   ORDER BY pp."isFeatured" DESC, pp."ratingAvg" DESC
--   LIMIT 20;
--
-- Nota: to_tsquery falla si el input tiene caracteres especiales. En la app
-- usar websearch_to_tsquery() que es más tolerante con input de usuario.
-- ─────────────────────────────────────────────────────────────────────────────

-- ═══════════════════════════════════════════════════════════════════════════════
-- PASO 3 — Índices parciales (business logic + soft delete)
-- ═══════════════════════════════════════════════════════════════════════════════

-- Prestadores activos ordenados para la página de resultados de búsqueda
-- Cubre ORDER BY isFeatured DESC, ratingAvg DESC en providers sin deletedAt propio
-- (el filtro de User.deletedAt IS NULL se hace en el JOIN)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_provider_profile_search_order
  ON "ProviderProfile" ("isFeatured" DESC, "ratingAvg" DESC, "ratingCount" DESC);

-- Pedidos abiertos por zona + categoría (feed principal del prestador)
-- Cubre: WHERE status='OPEN' AND zoneId=$1 AND categoryId=$2 ORDER BY createdAt DESC
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_request_open_by_zone_category
  ON "Request" ("zoneId", "categoryId", "createdAt" DESC)
  WHERE "status" = 'OPEN' AND "deletedAt" IS NULL;

-- Mensajes NO eliminados por conversación — polling
-- Query: WHERE conversationId = $1 AND createdAt > $2 AND isDeleted = false
-- Nota: isDeleted reemplaza a deletedAt en Message (patrón tombstone, ver schema)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_message_poll
  ON "Message" ("conversationId", "createdAt" DESC)
  WHERE "isDeleted" = false;

-- Mensajes no leídos por conversación (badge de contador en bottom nav)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_message_unread
  ON "Message" ("conversationId")
  WHERE "readAt" IS NULL AND "isDeleted" = false;

-- Notificaciones no leídas por usuario
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notification_unread
  ON "Notification" ("userId", "createdAt" DESC)
  WHERE "readAt" IS NULL;

-- Reseñas visibles por prestador (excluye borradas por admin vía soft-delete)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_review_visible_by_provider
  ON "Review" ("providerProfileId", "clientReviewedAt" DESC)
  WHERE "deletedAt" IS NULL AND "clientReviewedAt" IS NOT NULL;

-- ═══════════════════════════════════════════════════════════════════════════════
-- PASO 4 — Índices operacionales (cron jobs y reconciliación)
-- ═══════════════════════════════════════════════════════════════════════════════

-- Suscripciones activas que vencen pronto (cron de expiración diario)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscription_active_expiry
  ON "Subscription" ("endsAt")
  WHERE "status" = 'ACTIVE';

-- Prestadores FREE con reset mensual pendiente (cron del día 1)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_provider_monthly_reset
  ON "ProviderProfile" ("monthlyContactReset")
  WHERE "plan" = 'FREE';

-- ═══════════════════════════════════════════════════════════════════════════════
-- NOTAS DE OPERACIÓN
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- 1. Ejecutar ANALYZE después de crear índices en producción:
--      ANALYZE "ProviderService";
--      ANALYZE "Request";
--      ANALYZE "Message";
--      ANALYZE "ProviderProfile";
--
-- 2. Verificar que el planner usa los índices:
--      EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
--      SELECT ... WHERE to_tsvector(...) @@ to_tsquery(...);
--
-- 3. Los índices GIN son más lentos en writes que B-tree. Si "ProviderService"
--    tiene inserciones masivas (importación), pausar idx_fts_provider_service
--    temporalmente con: ALTER INDEX ... DISABLE / REBUILD.
--
-- 4. Si la configuración 'spanish_unaccent' no aparece después de CREATE:
--      SELECT cfgname FROM pg_ts_config WHERE cfgname = 'spanish_unaccent';
--    Puede requerir SUPERUSER en algunos entornos managed (Neon, Supabase).
--    Alternativa sin SUPERUSER: usar f_unaccent() + config 'simple' y perder
--    el stemming → peor recall pero funcional.
--
-- 5. pg_trgm en User.name: para buscar por similaridad usar:
--      SELECT * FROM "User" WHERE name % 'garcia'  -- operador de similitud
--      ORDER BY similarity(name, 'garcia') DESC;
--    O para búsqueda parcial:
--      WHERE name ILIKE '%garcia%'  -- usa el índice GIN trgm automáticamente
