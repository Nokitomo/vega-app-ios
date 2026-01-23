import {create} from 'zustand';

const MAX_CACHE_ENTRIES = 10;

export interface SearchCacheEntry {
  searchData: Array<{
    title: string;
    Posts: any[];
    filter: string;
    providerValue: string;
    value: string;
    name: string;
  }>;
  emptyResults: Array<{
    title: string;
    Posts: any[];
    filter: string;
    providerValue: string;
    value: string;
    name: string;
  }>;
}

interface SearchCacheState {
  cache: Record<string, SearchCacheEntry>;
  cacheOrder: string[];
  getCache: (key: string) => SearchCacheEntry | undefined;
  setCache: (key: string, entry: SearchCacheEntry) => void;
  clearCache: () => void;
}

const useSearchCacheStore = create<SearchCacheState>((set, get) => ({
  cache: {},
  cacheOrder: [],
  getCache: key => {
    const {cache, cacheOrder} = get();
    const entry = cache[key];
    if (!entry) {
      return undefined;
    }
    if (cacheOrder[cacheOrder.length - 1] !== key) {
      const nextOrder = cacheOrder.filter(item => item !== key);
      nextOrder.push(key);
      set({cacheOrder: nextOrder});
    }
    return entry;
  },
  setCache: (key, entry) =>
    set(state => {
      const nextOrder = state.cacheOrder.filter(item => item !== key);
      nextOrder.push(key);

      const nextCache = {...state.cache, [key]: entry};
      if (nextOrder.length > MAX_CACHE_ENTRIES) {
        const excess = nextOrder.splice(
          0,
          nextOrder.length - MAX_CACHE_ENTRIES,
        );
        excess.forEach(item => {
          delete nextCache[item];
        });
      }

      return {cache: nextCache, cacheOrder: nextOrder};
    }),
  clearCache: () => set({cache: {}, cacheOrder: []}),
}));

export default useSearchCacheStore;
