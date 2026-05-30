import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM_EMAIL ?? "ManosYa <noreply@manosya.ar>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function sendVerificationEmail(email: string, token: string): Promise<void> {
  const verifyUrl = `${APP_URL}/verify-email?token=${token}&email=${encodeURIComponent(email)}`;

  await resend.emails.send({
    from: FROM,
    to: email,
    subject: "Verificá tu email en ManosYa",
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111827">
        <h1 style="color:#2563EB;margin-bottom:8px">ManosYa</h1>
        <p style="margin-top:0">Gracias por registrarte. Hacé clic en el botón para verificar tu email:</p>
        <a href="${verifyUrl}"
           style="display:inline-block;background:#2563EB;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">
          Verificar email
        </a>
        <p style="color:#6B7280;font-size:14px">
          Este enlace expira en 24 horas. Si no creaste una cuenta en ManosYa, ignorá este mensaje.
        </p>
        <hr style="border:none;border-top:1px solid #E5E7EB;margin:24px 0" />
        <p style="color:#9CA3AF;font-size:12px;word-break:break-all">
          Si el botón no funciona, copiá y pegá este enlace en tu navegador:<br />
          ${verifyUrl}
        </p>
      </div>
    `,
  });
}

export async function sendWelcomeEmail(email: string, name: string): Promise<void> {
  const displayName = name || "ahí";

  await resend.emails.send({
    from: FROM,
    to: email,
    subject: "¡Bienvenido/a a ManosYa!",
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111827">
        <h1 style="color:#2563EB;margin-bottom:8px">ManosYa</h1>
        <p style="margin-top:0">¡Hola, ${displayName}!</p>
        <p>Tu cuenta quedó verificada. Ya podés buscar servicios o publicar los tuyos.</p>
        <a href="${APP_URL}"
           style="display:inline-block;background:#2563EB;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">
          Ir a ManosYa
        </a>
        <p style="color:#6B7280;font-size:14px">
          ¿Necesitás un plomero, electricista o pintor? Encontralo en minutos.
        </p>
      </div>
    `,
  });
}
