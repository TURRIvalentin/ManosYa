import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// Utility para combinar clases Tailwind (requerido por shadcn/ui)
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Formatear precios en ARS
export function formatARS(amount: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(amount);
}

// Formatear fechas en español Argentina
export function formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    ...options,
  }).format(d);
}

// Formatear tiempo relativo ("hace 5 minutos")
export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);

  if (diffSeconds < 60) return "hace un momento";
  if (diffSeconds < 3600) return `hace ${Math.floor(diffSeconds / 60)} min`;
  if (diffSeconds < 86400) return `hace ${Math.floor(diffSeconds / 3600)} h`;
  if (diffSeconds < 604800) return `hace ${Math.floor(diffSeconds / 86400)} días`;
  return formatDate(d);
}

// Capitalizar primera letra
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

// Generar URL de whatsapp con mensaje
export function whatsappUrl(phone: string, message: string): string {
  const cleaned = phone.replace(/\D/g, "");
  return `https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`;
}
