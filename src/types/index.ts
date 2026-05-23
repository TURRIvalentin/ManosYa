// Tipos compartidos de ManosYa
// Los tipos de Prisma se importan directamente desde "@prisma/client"
// Acá van tipos derivados, compuestos o de UI

import type {
  User,
  ClientProfile,
  ProviderProfile,
  Category,
  Zone,
  Request,
  Quote,
  Review,
  Message,
  Conversation,
  Plan,
  RequestStatus,
  QuoteStatus,
  ZoneType,
  PriceUnit,
} from "@prisma/client";

// Re-exportar enums de Prisma para uso en cliente sin importar @prisma/client
export type { Plan, RequestStatus, QuoteStatus, ZoneType, PriceUnit };

// Tipo de sesión de usuario autenticado
export type AuthUser = Pick<User, "id" | "name" | "email" | "image" | "role">;

// Provider con rating e info básica para listas de búsqueda
export type ProviderSummary = Pick<
  ProviderProfile,
  "id" | "bio" | "avatarUrl" | "isVerified" | "ratingAvg" | "ratingCount" | "plan" | "isFeatured"
> & {
  user: Pick<User, "name" | "image">;
  zones: Array<Pick<Zone, "id" | "name" | "type">>;
};

// Request con toda la info para la vista de detalle
export type RequestWithDetails = Request & {
  clientProfile: ClientProfile & { user: Pick<User, "name" | "image"> };
  category: Pick<Category, "id" | "name" | "slug" | "iconName">;
  zone: Pick<Zone, "id" | "name" | "type">;
  quotes: Quote[];
  _count: { quotes: number };
};

// Conversación con último mensaje para la lista de chats
export type ConversationPreview = Conversation & {
  request: Pick<Request, "id" | "title" | "status">;
  messages: [Pick<Message, "body" | "type" | "createdAt" | "senderId">] | [];
  participants: Array<{ userId: string; user: Pick<User, "name" | "image"> }>;
  _count: { messages: number };
  unreadCount: number;
};

// Respuesta estándar de Server Actions
export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

// Parámetros de búsqueda de prestadores
export type ProviderSearchParams = {
  q?: string;
  categorySlug?: string;
  zoneSlug?: string;
  minRating?: number;
  verified?: boolean;
  plan?: Plan;
  priceMin?: number;
  priceMax?: number;
  page?: number;
  limit?: number;
};

// Respuesta paginada genérica
export type PaginatedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
};
