import { type NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Este endpoint solo existe para E2E tests — devuelve 404 en cualquier otro entorno.
// Permite que Playwright lea el token de verificación directamente de DB sin
// necesitar interceptar emails de Resend.
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== "test") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const email = request.nextUrl.searchParams.get("email");
  if (!email) {
    return NextResponse.json({ error: "email param required" }, { status: 400 });
  }

  const { db } = await import("@/lib/db");

  const record = await db.verificationToken.findFirst({
    where: { identifier: email },
    orderBy: { expires: "desc" },
    select: { token: true, expires: true },
  });

  if (!record) {
    return NextResponse.json({ error: "No token found for this email" }, { status: 404 });
  }

  return NextResponse.json({ token: record.token, expires: record.expires });
}
