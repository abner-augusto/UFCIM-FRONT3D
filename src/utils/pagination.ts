/**
 * Walk a page/limit endpoint until a page comes back short, so client-side
 * sorting and filtering see the whole collection rather than its first page.
 * `maxPages` bounds the walk; rows repeated across pages (unstable server
 * ordering) are dropped by id.
 */
export async function collectAllPages<T extends { id: string }>(
  fetchPage: (page: number, limit: number) => Promise<T[]>,
  { pageSize, maxPages = 50 }: { pageSize: number; maxPages?: number },
): Promise<T[]> {
  const seen = new Set<string>();
  const rows: T[] = [];

  for (let page = 1; page <= maxPages; page++) {
    const batch = await fetchPage(page, pageSize);
    for (const row of batch) {
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      rows.push(row);
    }
    if (batch.length < pageSize) break;
  }

  return rows;
}
