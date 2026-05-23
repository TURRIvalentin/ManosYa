import { handlers } from "@/auth";

// Exportar GET y POST para que Next.js App Router maneje el callback OAuth,
// el endpoint de sesión y los magic links de Auth.js.
export const { GET, POST } = handlers;
