/** In-flight + TTL cache. Concurrent callers with the same key share one request. */
export function createRequestCache(ttlMs = 60_000) {
  const map = new Map();

  function run(key, fetcher, { force = false } = {}) {
    const entry = map.get(key);

    if (!force) {
      if (entry?.data !== undefined && Date.now() - entry.at < ttlMs) {
        return Promise.resolve(entry.data);
      }
      if (entry?.promise) return entry.promise;
    } else if (entry?.promise) {
      // Coalesce overlapping forced fetches onto the in-flight request.
      return entry.promise;
    } else {
      map.delete(key);
    }

    // Token so an invalidated / superseded in-flight fetch cannot reseed stale data.
    const token = {};
    const promise = fetcher()
      .then((data) => {
        const current = map.get(key);
        if (current?.token === token) {
          map.set(key, { data, at: Date.now() });
          return data;
        }
        // Superseded (seed / force restart / invalidate) — never return old fetcher data.
        if (current?.data !== undefined) return current.data;
        if (current?.promise) return current.promise;
        return run(key, fetcher);
      })
      .catch((error) => {
        const current = map.get(key);
        if (current?.token === token) map.delete(key);
        throw error;
      });

    map.set(key, { promise, token });
    return promise;
  }

  function seed(key, data) {
    map.set(key, { data, at: Date.now() });
  }

  function deleteKey(key) {
    map.delete(key);
  }

  function invalidate(predicate) {
    if (!predicate) {
      map.clear();
      return;
    }
    for (const key of map.keys()) {
      if (predicate(key)) map.delete(key);
    }
  }

  return { run, seed, deleteKey, invalidate, clear: () => map.clear() };
}
