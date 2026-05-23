import { NextResponse } from "next/server";

// Health check endpoint — usado por Vercel y monitoring externo
export function GET() {
  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: process.env["npm_package_version"] ?? "0.1.0",
  });
}
