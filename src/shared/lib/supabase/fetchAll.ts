import type { PostgrestError } from "@supabase/supabase-js";

const PAGE_SIZE = 1000;

/**
 * PostgREST caps every response at 1000 rows (Supabase "Max Rows" setting).
 * Any table that can grow past that (predictions, players, match_events)
 * must be fetched in pages, otherwise rows are silently dropped.
 *
 * The supplied `fetchPage` MUST apply a stable `.order()` so pages don't
 * overlap or skip rows between requests.
 */
export async function fetchAllRows<T>(
  fetchPage: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: T[] | null; error: PostgrestError | null }>,
): Promise<T[]> {
  const rows: T[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await fetchPage(from, from + PAGE_SIZE - 1);

    if (error) {
      throw new Error(`fetchAllRows failed: ${error.message}`);
    }

    const page = data ?? [];
    rows.push(...page);

    if (page.length < PAGE_SIZE) {
      return rows;
    }
  }
}
