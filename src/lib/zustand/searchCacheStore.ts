import {create} from 'zustand';

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
  getCache: (key: string) => SearchCacheEntry | undefined;
  setCache: (key: string, entry: SearchCacheEntry) => void;
  clearCache: () => void;
}

const useSearchCacheStore = create<SearchCacheState>((set, get) => ({
  cache: {},
  getCache: key => get().cache[key],
  setCache: (key, entry) =>
    set(state => ({cache: {...state.cache, [key]: entry}})),
  clearCache: () => set({cache: {}}),
}));

export default useSearchCacheStore;
