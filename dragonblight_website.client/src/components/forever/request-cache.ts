// In-memory caches for the Forever character page. Switching tabs, paging back through recipes or
// opening another character re-uses answers already in the browser instead of asking the server
// again. Both caches are bounded so a long browsing session can't grow them without limit.

interface Entry<T> {
  promise: Promise<T>;
  settled?: { value: T };
  createdAt: number;
}

// One promise per key: concurrent callers (a tab prefetched on hover, then opened) share a request.
// Failed requests are forgotten so a retry really retries; answers expire after maxAgeMs.
export class RequestCache {
  private entries = new Map<string, Entry<unknown>>();

  constructor(private maxEntries: number, private maxAgeMs: number, private now: () => number = Date.now) {}

  get<T>(key: string, load: () => Promise<T>): Promise<T> {
    const existing = this.fresh(key);
    if (existing) {
      // Map keeps insertion order, so re-inserting marks the entry most recently used
      this.entries.delete(key);
      this.entries.set(key, existing);
      return existing.promise as Promise<T>;
    }
    const entry: Entry<T> = { promise: load(), createdAt: this.now() };
    entry.promise.then(
      (value) => { entry.settled = { value }; },
      () => { if (this.entries.get(key) === entry) this.entries.delete(key); },
    );
    this.entries.set(key, entry);
    while (this.entries.size > this.maxEntries) {
      this.entries.delete(this.entries.keys().next().value!);
    }
    return entry.promise;
  }

  // An answer that has already arrived, so a revisited tab can render it on the first frame.
  peek<T>(key: string): { value: T } | undefined {
    return this.fresh(key)?.settled as { value: T } | undefined;
  }

  forget(key: string) {
    this.entries.delete(key);
  }

  private fresh(key: string): Entry<unknown> | undefined {
    const entry = this.entries.get(key);
    if (entry && this.now() - entry.createdAt > this.maxAgeMs) {
      this.entries.delete(key);
      return undefined;
    }
    return entry;
  }
}

export interface DetailLoad<T> {
  rows: T[];
  failed: boolean;
}

// Static game data (achievement definitions, recipes) by region and ID. It is the same for every
// character, so each row is fetched once per session. Only complete rows are kept: a row the server
// couldn't fill is asked for again next time.
export class DetailCache<T extends { id: number }> {
  private rows = new Map<string, T>();
  private pending = new Map<string, Promise<T | undefined>>();

  constructor(private maxEntries: number, private isComplete: (row: T) => boolean) {}

  get(region: string, id: number): T | undefined {
    return this.rows.get(`${region}/${id}`);
  }

  // Rows for ids, in order, fetching only the ones not already cached or on their way.
  async load(region: string, ids: number[], fetchBatch: (ids: number[]) => Promise<T[]>, batchSize: number): Promise<DetailLoad<T>> {
    const unique = [...new Set(ids)];
    const missing = unique.filter((id) => !this.rows.has(`${region}/${id}`) && !this.pending.has(`${region}/${id}`));
    for (let start = 0; start < missing.length; start += batchSize) {
      const batch = missing.slice(start, start + batchSize);
      const request = fetchBatch(batch);
      for (const id of batch) {
        const key = `${region}/${id}`;
        const row = request.then((rows) => {
          const found = rows.find((candidate) => candidate.id === id);
          if (found && this.isComplete(found)) this.store(key, found);
          return found;
        }).finally(() => this.pending.delete(key));
        this.pending.set(key, row);
      }
    }
    const results = await Promise.allSettled(unique.map((id) => {
      const key = `${region}/${id}`;
      return this.rows.get(key) ?? this.pending.get(key) ?? Promise.resolve(undefined);
    }));
    return {
      rows: results.flatMap((result) => (result.status === "fulfilled" && result.value ? [result.value] : [])),
      failed: results.some((result) => result.status === "rejected"),
    };
  }

  private store(key: string, row: T) {
    this.rows.delete(key);
    this.rows.set(key, row);
    while (this.rows.size > this.maxEntries) {
      this.rows.delete(this.rows.keys().next().value!);
    }
  }
}
