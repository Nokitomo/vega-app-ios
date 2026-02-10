import {useEffect, useMemo, useRef, useState} from 'react';
import {useQueries, useQuery} from '@tanstack/react-query';
import {Content} from '../zustand/contentStore';
import {cacheStorage} from '../storage';
import {providerManager} from '../services/ProviderManager';
import {queryClient} from '../client';
import {Post} from '../providers/types';
import {
  buildEnhancedMetaKey,
  fetchEnhancedMetadata,
} from '../services/enhancedMeta';

export interface HomePageData {
  title: string;
  titleKey?: string;
  titleParams?: Record<string, string | number>;
  Posts: Post[];
  filter: string;
  isLoading?: boolean;
  error?: string;
}

interface UseHomePageDataOptions {
  provider: Content['provider'];
  enabled?: boolean;
}

const STREAMINGUNITY_PROVIDER = 'streamingunity';
const HOME_SECTION_STEP_DELAY_MS = 200;
const HIDDEN_STREAMINGUNITY_TYPES = new Set(['movie', 'tv']);
const HOME_CATEGORY_MAX_ITEMS = 30;

const shouldHideHomeCategory = (providerValue: string, filter: string): boolean => {
  if (providerValue !== STREAMINGUNITY_PROVIDER) {
    return false;
  }

  const [pathPart, queryPart = ''] = String(filter || '').split('?', 2);
  if (pathPart.trim().toLowerCase() !== 'archive') {
    return false;
  }

  const params = new URLSearchParams(queryPart);
  const type = (params.get('type') || '').trim().toLowerCase();
  return HIDDEN_STREAMINGUNITY_TYPES.has(type);
};

export const useHomePageData = ({
  provider,
  enabled = true,
}: UseHomePageDataOptions) => {
  const providerValue = provider?.value || '';
  const categories = useMemo(
    () =>
      providerValue
        ? (providerManager.getCatalog({providerValue}) || []).filter(
            category => !shouldHideHomeCategory(providerValue, category.filter),
          )
        : [],
    [providerValue],
  );

  type CategoryQueryData = {
    Posts: Post[];
    signature: string;
    updatedAt: number;
  };

  const buildCategoryCacheKey = (filter: string) =>
    `homeCategoryData:${providerValue}:${filter}`;

  const readCategoryCache = (filter: string): CategoryQueryData | undefined => {
    const raw = cacheStorage.getString(buildCategoryCacheKey(filter));
    if (!raw) {
      return undefined;
    }
    try {
      const parsed = JSON.parse(raw) as CategoryQueryData;
      if (!Array.isArray(parsed?.Posts)) {
        return undefined;
      }
      return {
        Posts: parsed.Posts.slice(0, HOME_CATEGORY_MAX_ITEMS),
        signature: typeof parsed.signature === 'string' ? parsed.signature : '',
        updatedAt:
          typeof parsed.updatedAt === 'number' && Number.isFinite(parsed.updatedAt)
            ? parsed.updatedAt
            : Date.now(),
      };
    } catch {
      return undefined;
    }
  };

  const writeCategoryCache = (filter: string, data: CategoryQueryData) => {
    cacheStorage.setString(buildCategoryCacheKey(filter), JSON.stringify(data));
  };

  const getCategoryStaleTime = (filter: string, catalogStaleTimeMs?: number) => {
    if (
      typeof catalogStaleTimeMs === 'number' &&
      Number.isFinite(catalogStaleTimeMs) &&
      catalogStaleTimeMs > 0
    ) {
      return catalogStaleTimeMs;
    }

    const normalized = filter.toLowerCase();

    if (
      normalized.includes('latest') ||
      normalized.includes('recent') ||
      normalized.includes('calendar') ||
      normalized.includes('top10') ||
      normalized.includes('trending')
    ) {
      return 10 * 60 * 1000;
    }

    if (
      normalized.includes('popular') ||
      normalized.includes('favorites') ||
      normalized.includes('most_viewed') ||
      normalized.includes('upcoming') ||
      normalized.includes('ongoing')
    ) {
      return 30 * 60 * 1000;
    }

    if (normalized.includes('archive') || normalized.includes('catalog/all')) {
      return 6 * 60 * 60 * 1000;
    }

    return 60 * 60 * 1000;
  };

  const buildPostsSignature = (posts: Post[]) => {
    if (!Array.isArray(posts) || posts.length === 0) {
      return 'empty';
    }

    return posts
      .map(post =>
        [
          post?.link || '',
          post?.episodeId ?? '',
          post?.episodeLabel ?? '',
          post?.title ?? '',
          post?.image ?? '',
        ].join('|'),
      )
      .join('||');
  };

  const queryResults = useQueries({
    queries: categories.map(category => {
      const queryKey = [
        'homeCategoryData',
        providerValue,
        category.filter,
      ] as const;
      const cached = readCategoryCache(category.filter);
      const staleTime = getCategoryStaleTime(
        category.filter,
        category.staleTimeMs,
      );
      return {
        queryKey,
        enabled: false,
        staleTime,
        gcTime: 30 * 60 * 1000,
        refetchOnMount: false,
        refetchOnReconnect: false,
        refetchOnWindowFocus: false,
        queryFn: async ({signal}: {signal: AbortSignal}) => {
          const posts = await providerManager.getPosts({
            filter: category.filter,
            page: 1,
            providerValue,
            signal,
          });
          const nextPosts = Array.isArray(posts)
            ? posts.slice(0, HOME_CATEGORY_MAX_ITEMS)
            : [];
          const nextSignature = buildPostsSignature(nextPosts);
          const previous = queryClient.getQueryData<CategoryQueryData>(queryKey);

          if (previous && previous.signature === nextSignature) {
            const sameData = {
              ...previous,
              updatedAt: Date.now(),
            };
            writeCategoryCache(category.filter, sameData);
            return sameData;
          }

          const payload = {
            Posts: nextPosts,
            signature: nextSignature,
            updatedAt: Date.now(),
          };
          writeCategoryCache(category.filter, payload);
          return payload;
        },
        initialData: cached,
        initialDataUpdatedAt: cached?.updatedAt,
        retry: (failureCount: number, error: Error) => {
          if (error.name === 'AbortError') {
            return false;
          }
          return failureCount < 3;
        },
        retryDelay: (attemptIndex: number) =>
          Math.min(1000 * 2 ** attemptIndex, 30000),
      };
    }),
  });

  const staleCategoryIndexes = useMemo(() => {
    return categories
      .map((category, index) => {
        const cached = readCategoryCache(category.filter);
        const staleTime = getCategoryStaleTime(
          category.filter,
          category.staleTimeMs,
        );
        const isStale = !cached || Date.now() - cached.updatedAt >= staleTime;
        return isStale ? index : -1;
      })
      .filter(index => index >= 0);
  }, [categories]);

  const staleCategoryFingerprint = useMemo(
    () => `${providerValue}:${staleCategoryIndexes.join(',')}`,
    [providerValue, staleCategoryIndexes],
  );

  const [activeFetchIndex, setActiveFetchIndex] = useState<number | null>(null);
  const requestedCategoryIndexesRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    requestedCategoryIndexesRef.current = new Set();
  }, [staleCategoryFingerprint]);

  useEffect(() => {
    if (!enabled || !providerValue || staleCategoryIndexes.length === 0) {
      setActiveFetchIndex(null);
      return;
    }

    setActiveFetchIndex(current => {
      if (current != null && staleCategoryIndexes.includes(current)) {
        return current;
      }
      return staleCategoryIndexes[0];
    });
  }, [enabled, providerValue, staleCategoryFingerprint, staleCategoryIndexes]);

  useEffect(() => {
    if (activeFetchIndex == null || !enabled || !providerValue) {
      return;
    }

    const currentPosition = staleCategoryIndexes.indexOf(activeFetchIndex);
    if (currentPosition < 0) {
      setActiveFetchIndex(staleCategoryIndexes[0] ?? null);
      return;
    }

    const currentResult = queryResults[activeFetchIndex];
    if (!currentResult) {
      return;
    }

    if (!requestedCategoryIndexesRef.current.has(activeFetchIndex)) {
      requestedCategoryIndexesRef.current.add(activeFetchIndex);
      currentResult.refetch();
      return;
    }

    const isCurrentFetching =
      currentResult.isLoading ||
      currentResult.isPending ||
      currentResult.isFetching ||
      currentResult.fetchStatus === 'fetching';

    if (!isCurrentFetching) {
      const nextIndex = staleCategoryIndexes[currentPosition + 1];
      if (typeof nextIndex !== 'number') {
        setActiveFetchIndex(null);
        return;
      }

      const timeout = setTimeout(
        () => setActiveFetchIndex(nextIndex),
        HOME_SECTION_STEP_DELAY_MS,
      );

      return () => clearTimeout(timeout);
    }
  }, [
    activeFetchIndex,
    enabled,
    providerValue,
    queryResults,
    staleCategoryIndexes,
  ]);

  const homeData = useMemo<HomePageData[]>(
    () =>
      categories.map((category, index) => {
        const result = queryResults[index];
        const queryData = result?.data as CategoryQueryData | undefined;

        return {
          title: category.title,
          titleKey: category.titleKey,
          titleParams: category.titleParams,
          Posts: queryData?.Posts || [],
          filter: category.filter,
          isLoading:
            !!result &&
            (result.isLoading || result.isPending || result.isFetching),
          error:
            result?.error instanceof Error ? result.error.message : undefined,
        };
      }),
    [categories, queryResults],
  );

  const isLoading = queryResults.some(
    result => result.isLoading || result.isPending,
  );
  const isRefetching = queryResults.some(result => result.isRefetching);
  const firstError =
    queryResults.find(result => result.error)?.error || null;

  return {
    data: homeData,
    isLoading,
    isRefetching,
    error: firstError as Error | null,
    refetch: async () => {
      for (let index = 0; index < queryResults.length; index += 1) {
        await queryResults[index].refetch();
      }
      return {data: homeData};
    },
    refetchCategory: async (filter: string) => {
      const index = categories.findIndex(item => item.filter === filter);
      if (index < 0 || !queryResults[index]) {
        return;
      }
      await queryResults[index].refetch();
    },
  };
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

  const heroCategoryIndex = [...homeData]
    .map((category, index) => ({category, index}))
    .reverse()
    .find(item => Array.isArray(item.category.Posts) && item.category.Posts.length > 0);

  if (!heroCategoryIndex) {
    return null;
  }

  const {category: heroCategory, index: categoryIndex} = heroCategoryIndex;

  const cacheKey = providerValue || 'default';
  const cached = heroSelectionCache.get(cacheKey);

  // If we have a cached index and it's still valid for this data, use it
  if (cached && cached.postIndex < heroCategory.Posts.length) {
    return heroCategory.Posts[cached.postIndex];
  }

  const randomIndex = Math.floor(Math.random() * heroCategory.Posts.length);
  heroSelectionCache.set(cacheKey, {
    postIndex: randomIndex,
    categoryIndex,
  });
  return heroCategory.Posts[randomIndex];
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
      const {providerManager: importedProviderManager} = await import(
        '../services/ProviderManager'
      );
      const info = await importedProviderManager.getMetaData({
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
        merged.providerLogo = providerInfo.logo;
        merged.cinemetaLogo = enhancedMeta.logo;
        merged.logo = pickValue(providerInfo.logo, enhancedMeta.logo);

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
