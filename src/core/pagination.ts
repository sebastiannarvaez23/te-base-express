export const MAX_PAGE_SIZE = 100;
export const DEFAULT_PAGE_SIZE = 20;

export function pageWindow(pageRaw?: string, sizeRaw?: string): { page: number; limit: number; offset: number } {
  const page = Math.max(1, Number.parseInt(pageRaw || '1', 10) || 1);
  const configured = Number(process.env.LIST_PAGINATION_LIMIT || DEFAULT_PAGE_SIZE);
  const requested = sizeRaw ? Number.parseInt(sizeRaw, 10) : configured;
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, requested || DEFAULT_PAGE_SIZE));
  return { page, limit, offset: (page - 1) * limit };
}

export function toPage<T>(result: { rows: T[]; count: number }, window: { page: number; limit: number }) {
  return {
    items: result.rows,
    total: result.count,
    page: window.page,
    page_size: window.limit,
  };
}
