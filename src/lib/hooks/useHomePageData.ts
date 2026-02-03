import {useQuery} from '@tanstack/react-query';
import {getHomePageData, HomePageData} from '../getHomepagedata';
import {Content} from '../zustand/contentStore';
import {cacheStorage} from '../storage';
import {
  buildEnhancedMetaKey,
  fetchEnhancedMetadata,
} from '../services/enhancedMeta';

interface UseHomePageDataOptions {
  provider: Content['provider'];
  enabled?: boolean;
}

export const useHomePageData = ({
  provider,
  enabled = true,
}: UseHomePageDataOptions) => {
  return useQuery<HomePageData[], Error>({
    queryKey: ['homePageData', provider.value],
    queryFn: async ({signal}) => {
      // Fetch fresh data - cache is handled by React Query
      const data = await getHomePageData(provider, signal);
      return data;
    },
    enabled: enabled && !!provider?.value,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: (failureCount, error) => {
      if (error.name === 'AbortError') {
        return false;
      }
      return failureCount < 3;
    },
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    // Add initial data from cache for instant loading
    initialData: () => {
      const cache = cacheStorage.getString('homeData' + provider.value);
      if (cache) {
        try {
          return JSON.parse(cache);
        } catch {
          return undefined;
        }
      }
      return undefined;
    },
    // Cache successful responses
    meta: {
      onSuccess: (data: HomePageData[]) => {
        if (data && data.length > 0) {
          cacheStorage.setString(
            'homeData' + provider.value,
            JSON.stringify(data),
          );
        }
      },
    },
  });
};

// Store hero selection per provider to prevent re-randomization on tab switch
const heroSelectionCache = new Map<
  string,
  {postIndex: number; categoryIndex: number}
>();

// Memoized hero selection with stable reference - uses cached index to prevent re-randomization
export const getRandomHeroPost = (
  homeData: HomePageData[],
  providerValue?: string,
) => {
  if (!homeData || homeData.length === 0) {
    return null;
  }

  const lastCategory = homeData[homeData.length - 1];
  if (!lastCategory.Posts || lastCategory.Posts.length === 0) {
    return null;
  }

  const cacheKey = providerValue || 'default';
  const cached = heroSelectionCache.get(cacheKey);

  // If we have a cached index and it's still valid for this data, use it
  if (cached && cached.postIndex < lastCategory.Posts.length) {
    return lastCategory.Posts[cached.postIndex];
  }

  const randomIndex = Math.floor(Math.random() * lastCategory.Posts.length);
  heroSelectionCache.set(cacheKey, {
    postIndex: randomIndex,
    categoryIndex: homeData.length - 1,
  });
  return lastCategory.Posts[randomIndex];
};

// Function to clear hero cache when explicitly refreshing
export const clearHeroCache = (providerValue?: string) => {
  if (providerValue) {
    heroSelectionCache.delete(providerValue);
  } else {
    heroSelectionCache.clear();
  }
};

// New hook for hero metadata with React Query
export const useHeroMetadata = (heroLink: string, providerValue: string) => {
  return useQuery({
    queryKey: ['heroMetadata', heroLink, providerValue],
    queryFn: async () => {
      const {providerManager} = await import('../services/ProviderManager');
      const info = await providerManager.getMetaData({
        link: heroLink,
        provider: providerValue,
      });

      const isMeaningfulValue = (value: unknown) => {
        if (value == null) {
          return false;
        }
        if (typeof value === 'string') {
          return value.trim().length > 0;
        }
        if (Array.isArray(value)) {
          return value.length > 0;
        }
        return true;
      };

      const mergeHeroMeta = (providerInfo: any, enhancedMeta: any) => {
        if (!enhancedMeta || Object.keys(enhancedMeta).length === 0) {
          return providerInfo;
        }

        const merged = {...providerInfo, ...enhancedMeta};
        const pickValue = (primary: unknown, fallback: unknown) =>
          isMeaningfulValue(primary) ? primary : fallback;

        merged.image = pickValue(enhancedMeta.image, providerInfo.image);
        merged.poster = pickValue(
          enhancedMeta.poster,
          providerInfo.poster || providerInfo.image,
        );
        merged.background = pickValue(
          enhancedMeta.background,
          providerInfo.background || providerInfo.image,
        );
        merged.year = pickValue(enhancedMeta.year, providerInfo.year);
        merged.runtime = pickValue(enhancedMeta.runtime, providerInfo.runtime);
        merged.imdbRating = pickValue(
          enhancedMeta.imdbRating,
          providerInfo.rating,
        );
        merged.genres = pickValue(enhancedMeta.genres, providerInfo.genres);
        merged.cast = pickValue(enhancedMeta.cast, providerInfo.cast);

        const providerTags = Array.isArray(providerInfo?.tags)
          ? providerInfo.tags
          : [];
        const enhancedTags = Array.isArray(enhancedMeta?.tags)
          ? enhancedMeta.tags
          : [];
        const enhancedGenres = Array.isArray(enhancedMeta?.genres)
          ? enhancedMeta.genres
          : [];

        if (providerTags.length > 0) {
          merged.tags = providerTags;
          merged.tagKeys = providerInfo.tagKeys;
        } else if (enhancedTags.length > 0) {
          merged.tags = enhancedTags;
        } else if (enhancedGenres.length > 0) {
          merged.tags = enhancedGenres;
        }

        if (!merged.tagKeys) {
          merged.tagKeys = enhancedMeta.tagKeys || providerInfo.tagKeys;
        }

        return merged;
      };

      const metaKey = buildEnhancedMetaKey({
        imdbId: info.imdbId,
        type: info.type,
        malId: info.extra?.ids?.malId,
        anilistId: info.extra?.ids?.anilistId,
      });

      if (metaKey) {
        try {
          const enhancedMeta = await fetchEnhancedMetadata({
            imdbId: info.imdbId,
            type: info.type,
            malId: info.extra?.ids?.malId,
            anilistId: info.extra?.ids?.anilistId,
          });
          if (enhancedMeta && Object.keys(enhancedMeta).length > 0) {
            return mergeHeroMeta(info, enhancedMeta);
          }
        } catch {
          return info;
        }
      }

      return info;
    },
    enabled: !!heroLink && !!providerValue,
    staleTime: 10 * 60 * 1000, // 10 minutes - hero metadata changes less frequently
    gcTime: 60 * 60 * 1000, // 1 hour
    retry: 2,
    // Cache hero metadata separately
    meta: {
      onSuccess: (data: any) => {
        cacheStorage.setString(heroLink, JSON.stringify(data));
      },
    },
    // Use cached data as initial data
    initialData: () => {
      const cached = cacheStorage.getString(heroLink);
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch {
          return undefined;
        }
      }
      return undefined;
    },
  });
};
