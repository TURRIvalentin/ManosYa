# Auth — Decisiones de diseño

## Estrategia de sesión

JWT-only (`strategy: "jwt"`, maxAge 30 días). PrismaAdapter está activo para gestionar
las tablas `Account` y `User` que OAuth necesita, pero **no** se crean filas en `Session`.
Esto es obligatorio porque el provider `Credentials` es incompatible con la estrategia
de sesiones de base de datos en Auth.js v5.

## Flujo de registro + verificación de email (Credentials)

```
1. POST /api/register (Server Action registerAction)
   ├─ Rate limit: 3 registros/h por IP (Upstash sliding window)
   ├─ Turnstile server-side verification
   ├─ Zod registerSchema (password mínimo 8 chars, 1 mayúscula, 1 número, max 72)
   └─ hashPassword (Argon2id, params OWASP 2024)

2. Email de verificación (Resend)
   └─ Token: 32 randomBytes → 64 hex chars, 256 bits de entropía, expira 24 h

3. Usuario hace clic en el link → /auth/verify-email?token=X&email=Y
   └─ verifyEmailAction: consumeVerificationToken (single-use) → emailVerified = now()
   └─ Página redirige a /auth/login?verified=true

4. Usuario inicia sesión → authorize() devuelve user con emailVerified:<Date>
   └─ JWT creado con emailVerified correcto desde DB
   └─ No hay sesión con emailVerified=null: el signIn callback intercepta antes
      de crear la sesión y redirige a la pantalla de verificación.
```

**Por qué no hay JWT con emailVerified=null:** el callback `signIn` en `auth.ts` recibe
el user de `authorize()` *antes* de que Auth.js emita el JWT. Si `emailVerified` es null,
retorna un string URL en lugar de `true`. Auth.js interpreta ese string como redirección
y no crea sesión. Es decir, la condición de "sesión activa con email sin verificar" no
puede existir para usuarios Credentials.

## Refresco de campos en JWT mid-session (trigger "update")

El JWT se firma al momento del login y no se actualiza automáticamente. Para propagar
cambios (promoción de rol, re-verificación de email) sin obligar al usuario a re-loguear:

```typescript
// Client Component
const { update } = useSession();
await serverAction(); // e.g., admin promueve a ADMIN
await update();       // dispara jwt callback con trigger: "update"
```

El callback `jwt` en `auth.ts` con `trigger === "update"` hace un `db.user.findUnique`
y sobreescribe `token.role` y `token.emailVerified` con los valores actuales de la DB.

## Conflicto de providers — Decisión de diseño

### Problema

Un usuario puede intentar autenticarse con un provider diferente al que usó para registrarse:

| Registro original | Intento de login | Riesgo |
|---|---|---|
| Credentials (email+pass) | Google OAuth | Account takeover: alguien con acceso al email Google podría apropiarse de la cuenta sin conocer la contraseña |
| Google OAuth | Credentials (email+pass) | El usuario simplemente no tiene `passwordHash` — no hay takeover, pero la UX es confusa |

### Decisión

**`allowDangerousEmailAccountLinking` permanece desactivado** (default de Auth.js).
No se vinculan cuentas automáticamente aunque el email coincida.

### Flujo bloqueado (Credentials → intento OAuth)

```
Usuario con cuenta Credentials intenta entrar con Google
  → signIn callback: dbUser.passwordHash !== null
  → retorna "/auth/error?code=OAuthAccountConflict&provider=google"
  → /auth/error muestra:
      "Ya tenés una cuenta con contraseña para este email.
       Iniciá sesión normalmente. Desde Perfil > Seguridad podés
       vincular tu cuenta de Google si querés."
```

### Flujo bloqueado (OAuth → intento Credentials)

```
Usuario con cuenta Google intenta entrar con email+contraseña
  → authorize(): user.passwordHash es null → retorna null
  → Auth.js genera error "CredentialsSignin"
  → Formulario de login detecta el error y muestra:
      "¿Te registraste con Google? Usá el botón 'Continuar con Google'."
```

### Vinculación manual (futura — Fase 6)

Desde **Perfil > Seguridad** el usuario autenticado puede:

- **Cuenta Credentials:** "Vincular Google" → OAuth flow, callback verifica que el
  email Google coincide, crea fila en `Account` sin tocar `passwordHash`.
- **Cuenta OAuth:** "Agregar contraseña" → Server Action con Turnstile + hashPassword,
  escribe `passwordHash` en `User`.

Ambas acciones requieren sesión activa y NO son reversibles automáticamente (requieren
confirmación explícita con la contraseña actual o re-auth OAuth).

## Rate limiting

| Endpoint | Límite | Ventana | Almacenamiento |
|---|---|---|---|
| `/api/auth/callback/credentials` | 5 intentos | 10 min sliding | Upstash Redis (middleware Edge) |
| `registerAction` | 3 registros | 1 hora | Upstash Redis |
| `resendVerificationAction` | 5 reenvíos | 1 hora | Upstash Redis |

La respuesta 429 incluye `Retry-After` en segundos calculado desde `rl.reset`.

## Anti-enumeración de emails

- `registerAction`: si el email ya existe y está verificado, devuelve el error.
  Si existe pero no verificado, re-envía el token y responde `ok: true` (igual que registro exitoso).
- `resendVerificationAction`: siempre responde `ok: true` independientemente de si el email existe.
- `authorize()`: no distingue entre "usuario no existe" y "contraseña incorrecta" — ambos retornan `null`.

## Soft delete

Los usuarios eliminados (`deletedAt !== null`) son denegados en todos los flows:
- `authorize()`: `if (user.deletedAt) return null`
- `signIn` callback OAuth: `if (dbUser?.deletedAt) return false`
- `jwt` callback trigger="update": no actualiza tokens de usuarios eliminados
