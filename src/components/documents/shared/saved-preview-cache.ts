import type { QueryClient } from "@tanstack/react-query";

const configuredClients = new WeakSet<QueryClient>();
const MAX_PREVIEWS = 10;
const MAX_HTML_BYTES = 8 * 1024 * 1024;

/** Bound retained HTML across revisions, templates and languages; never evict a mounted preview. */
export function configureSavedPreviewCache(client: QueryClient) {
  if (configuredClients.has(client)) return;
  configuredClients.add(client);
  const cache = client.getQueryCache();
  let pruning = false;
  const prune = () => {
    if (pruning) return;
    pruning = true;
    try {
      const previews = cache
        .findAll({ queryKey: ["document-preview-html"] })
        .filter((query) => typeof query.state.data === "string")
        .sort((a, b) => a.state.dataUpdatedAt - b.state.dataUpdatedAt);
      let count = previews.length;
      let bytes = previews.reduce((sum, query) => sum + String(query.state.data).length * 2, 0);
      for (const query of previews) {
        if (count <= MAX_PREVIEWS && bytes <= MAX_HTML_BYTES) break;
        if (query.getObserversCount() > 0 || query.state.fetchStatus !== "idle") continue;
        bytes -= String(query.state.data).length * 2;
        count--;
        cache.remove(query);
      }
    } finally {
      pruning = false;
    }
  };
  // The subscription shares the QueryClient's lifetime, including periods with no mounted preview.
  cache.subscribe((event) => {
    if (
      event.query.queryKey[0] === "document-preview-html" &&
      (event.type === "updated" || event.type === "observerRemoved")
    ) {
      prune();
    }
  });
  prune();
}
