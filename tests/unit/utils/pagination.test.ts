import { describe, expect, it, vi } from 'vitest';
import { collectAllPages } from '@/utils/pagination';

function pagedSource(total: number) {
  const rows = Array.from({ length: total }, (_, i) => ({ id: `r${i}` }));
  return vi.fn(async (page: number, limit: number) => rows.slice((page - 1) * limit, page * limit));
}

describe('collectAllPages', () => {
  it('returns a single short page as is', async () => {
    const fetchPage = pagedSource(3);
    const rows = await collectAllPages(fetchPage, { pageSize: 10 });
    expect(rows).toHaveLength(3);
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });

  it('keeps fetching while pages come back full', async () => {
    const fetchPage = pagedSource(25);
    const rows = await collectAllPages(fetchPage, { pageSize: 10 });
    expect(rows.map(r => r.id)).toEqual(Array.from({ length: 25 }, (_, i) => `r${i}`));
    expect(fetchPage.mock.calls).toEqual([[1, 10], [2, 10], [3, 10]]);
  });

  it('stops after an exactly-full last page with one empty request', async () => {
    const fetchPage = pagedSource(20);
    const rows = await collectAllPages(fetchPage, { pageSize: 10 });
    expect(rows).toHaveLength(20);
    expect(fetchPage).toHaveBeenCalledTimes(3);
  });

  it('stops at the page cap', async () => {
    const fetchPage = pagedSource(1000);
    const rows = await collectAllPages(fetchPage, { pageSize: 10, maxPages: 2 });
    expect(rows).toHaveLength(20);
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });

  it('drops rows repeated across pages', async () => {
    const fetchPage = vi.fn(async (page: number) =>
      page === 1 ? [{ id: 'a' }, { id: 'b' }] : page === 2 ? [{ id: 'b' }] : [],
    );
    const rows = await collectAllPages(fetchPage, { pageSize: 2 });
    expect(rows.map(r => r.id)).toEqual(['a', 'b']);
  });
});
