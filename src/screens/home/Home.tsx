import {
  SafeAreaView,
  ScrollView,
  RefreshControl,
  View,
  Text,
} from 'react-native';
import Slider from '../../components/Slider';
import React, {useCallback, useMemo, useRef, useState} from 'react';
import HeroOptimized from '../../components/Hero';
import {cacheStorage, mainStorage} from '../../lib/storage';
import useContentStore from '../../lib/zustand/contentStore';
import useHeroStore from '../../lib/zustand/herostore';
import {
  useHomePageData,
  getRandomHeroPost,
  clearHeroCache,
} from '../../lib/hooks/useHomePageData';
import useThemeStore from '../../lib/zustand/themeStore';
import ProviderDrawer from '../../components/ProviderDrawer';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {HomeStackParamList} from '../../App';
import {Drawer} from 'react-native-drawer-layout';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import ContinueWatching from '../../components/ContinueWatching';
import {providerManager} from '../../lib/services/ProviderManager';
import Tutorial from '../../components/Touturial';
import {QueryErrorBoundary} from '../../components/ErrorBoundary';
import {StatusBar} from 'expo-status-bar';
import {useTranslation} from 'react-i18next';
import {Post} from '../../lib/providers/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'Home'>;

const HERO_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const HERO_HISTORY_LIMIT = 5;
const HERO_MAX_ATTEMPTS = 3;
const HERO_IMAGE_RETRY_LIMIT = 3;

const ARCHIVE_HERO_PROVIDERS = new Set([
  'animeunity',
  'altadefinizionez',
  'streamingunity',
]);
const getHeroBadLinkKey = (providerValue: string) =>
  `heroBadLink:${providerValue}`;

const getArchiveHeroFilter = (providerValue: string) =>
  providerValue === 'animeunity' || providerValue === 'streamingunity'
    ? 'archive?random=true'
    : 'catalog/all?random=true';

const parseHeroHistory = (raw: string | null): string[] => {
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(item => typeof item === 'string' && item.trim().length > 0);
  } catch {
    return [];
  }
};

const readHeroHistory = (providerValue: string): string[] => {
  const key = `heroHistory:${providerValue}`;
  return parseHeroHistory(cacheStorage.getString(key));
};

const writeHeroHistory = (providerValue: string, link: string) => {
  const key = `heroHistory:${providerValue}`;
  const history = readHeroHistory(providerValue).filter(item => item !== link);
  const nextHistory = [link, ...history].slice(0, HERO_HISTORY_LIMIT);
  cacheStorage.setString(key, JSON.stringify(nextHistory));
};

const pickRandomPost = (
  posts: Post[],
  history: string[],
  allowDuplicate: boolean,
): Post | null => {
  const validPosts = posts.filter(post => post?.link);
  if (validPosts.length === 0) {
    return null;
  }
  const uniquePosts = validPosts.filter(post => !history.includes(post.link));
  const pool =
    uniquePosts.length > 0 ? uniquePosts : allowDuplicate ? validPosts : [];
  if (pool.length === 0) {
    return null;
  }
  const index = Math.floor(Math.random() * pool.length);
  return pool[index];
};

const fetchArchiveHero = async ({
  providerValue,
  history,
  signal,
}: {
  providerValue: string;
  history: string[];
  signal: AbortSignal;
}): Promise<Post | null> => {
  const filter = getArchiveHeroFilter(providerValue);
  let lastPosts: Post[] = [];

  for (let attempt = 0; attempt < HERO_MAX_ATTEMPTS; attempt += 1) {
    const posts = await providerManager.getPosts({
      filter,
      page: 1,
      providerValue,
      signal,
    });
    lastPosts = posts || [];
    const candidate = pickRandomPost(lastPosts, history, false);
    if (candidate) {
      return candidate;
    }
  }

  return pickRandomPost(lastPosts, history, true);
};

const Home = ({}: Props) => {
  const {primary} = useThemeStore(state => state);
  const {t} = useTranslation();
  const [backgroundColor, setBackgroundColor] = useState('transparent');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [heroRetryNonce, setHeroRetryNonce] = useState(0);
  const heroImageErrorCountRef = useRef(0);

  // Memoize static values
  const disableDrawer = useMemo(
    () => mainStorage.getBool('disableDrawer') || false,
    [],
  );

  const {provider, installedProviders} = useContentStore(state => state);
  const {setHero} = useHeroStore(state => state);
  const heroCacheTtlMs = HERO_CACHE_TTL_MS;

  const resolveCatalogTitle = useCallback(
    (item: {title: string; titleKey?: string; titleParams?: Record<string, string | number>}) =>
      item.titleKey ? t(item.titleKey, item.titleParams) : item.title,
    [t],
  );

  // React Query for home page data with better error handling
  const {
    data: homeData = [],
    isLoading,
    error,
    refetch,
    isRefetching,
    // isStale,
  } = useHomePageData({
    provider,
    enabled: !!(installedProviders?.length && provider?.value),
  });

  // Memoized scroll handler
  const handleScroll = useCallback((event: any) => {
    const newBackgroundColor =
      event.nativeEvent.contentOffset.y > 0 ? 'black' : 'transparent';
    setBackgroundColor(newBackgroundColor);
  }, []);

  // Stable hero post calculation
  const heroPost = useMemo(() => {
    if (!homeData || homeData.length === 0) {
      return null;
    }
    return getRandomHeroPost(homeData, provider?.value);
  }, [homeData, provider?.value, heroRetryNonce]);

  // Update hero only when hero post actually changes
  React.useEffect(() => {
    heroImageErrorCountRef.current = 0;
  }, [provider?.value]);

  const handleHeroImageError = useCallback(
    (failedLink?: string) => {
      if (!provider?.value) {
        return;
      }
      if (heroImageErrorCountRef.current >= HERO_IMAGE_RETRY_LIMIT) {
        return;
      }
      heroImageErrorCountRef.current += 1;

      if (failedLink) {
        cacheStorage.setString(getHeroBadLinkKey(provider.value), failedLink);
      }
      clearHeroCache(provider.value);
      if (failedLink && ARCHIVE_HERO_PROVIDERS.has(provider.value)) {
        writeHeroHistory(provider.value, failedLink);
      }
      setHeroRetryNonce(value => value + 1);
    },
    [provider?.value],
  );

  React.useEffect(() => {
    let isActive = true;
    const controller = new AbortController();

    const setHeroData = (hero: Post | null) => {
      if (!provider?.value) {
        setHero({link: '', image: '', title: ''});
        return;
      }
      if (hero?.link) {
        setHero(hero);
        const cacheKey = `heroCache:${provider.value}`;
        cacheStorage.setString(
          cacheKey,
          JSON.stringify({timestamp: Date.now(), hero}),
        );
        if (ARCHIVE_HERO_PROVIDERS.has(provider.value)) {
          writeHeroHistory(provider.value, hero.link);
        }
        return;
      }
      setHero({link: '', image: '', title: ''});
    };

    if (!provider?.value) {
      setHero({link: '', image: '', title: ''});
      return;
    }

    const badHeroLink = cacheStorage.getString(getHeroBadLinkKey(provider.value));
    const cacheKey = `heroCache:${provider.value}`;
    const cached = cacheStorage.getString(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        const isFresh =
          parsed?.timestamp &&
          Date.now() - parsed.timestamp < heroCacheTtlMs;
        if (isFresh && parsed?.hero?.link && parsed.hero.link !== badHeroLink) {
          setHero(parsed.hero);
          return;
        }
      } catch {
        // ignore cache parsing errors
      }
    }

    const resolveHero = async () => {
      let nextHero: Post | null = null;

      if (provider?.value && ARCHIVE_HERO_PROVIDERS.has(provider.value)) {
        try {
          const history = readHeroHistory(provider.value);
          nextHero = await fetchArchiveHero({
            providerValue: provider.value,
            history,
            signal: controller.signal,
          });
        } catch (fetchError) {
          console.error('Error fetching archive hero:', fetchError);
        }
      }

      if (!nextHero && heroPost?.link && heroPost.link !== badHeroLink) {
        nextHero = heroPost;
      }

      if (!isActive) {
        return;
      }

      setHeroData(nextHero);
      if (nextHero?.link && nextHero.link !== badHeroLink) {
        cacheStorage.delete(getHeroBadLinkKey(provider.value));
      }
    };

    resolveHero();

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [heroPost, provider?.value, setHero, heroCacheTtlMs, heroRetryNonce]);

  // Optimized refresh handler
  const handleRefresh = useCallback(async () => {
    try {
      await refetch();
    } catch (refreshError) {
      console.error('Error refreshing home data:', refreshError);
    }
  }, [refetch]);

  // Memoized content sliders
  const contentSliders = useMemo(() => {
    return homeData.map(item => (
      <Slider
        isLoading={!!item.isLoading}
        key={`content-${item.filter}`}
        title={resolveCatalogTitle(item)}
        posts={item.Posts}
        filter={item.filter}
      />
    ));
  }, [homeData, resolveCatalogTitle]);

  const scrollKey = useMemo(() => {
    return `${provider?.value ?? 'none'}:${homeData.length}`;
  }, [provider?.value, homeData.length]);

  // Memoized error message
  const errorComponent = useMemo(() => {
    if (!error && (isLoading || homeData.length > 0)) {
      return null;
    }

    return (
      <View className="p-4 m-4 bg-red-500/20 rounded-lg min-h-64 flex-1 justify-center items-center">
        <Text className="text-red-400 text-center font-medium">
          {error?.message || t('Failed to load content')}
        </Text>
        <Text className="text-gray-400 text-center text-sm mt-1">
          {t('Pull to refresh and try again')}
        </Text>
      </View>
    );
  }, [error, isLoading, homeData.length]);

  // Early return for no providers
  if (
    !installedProviders ||
    installedProviders.length === 0 ||
    !provider?.value
  ) {
    return <Tutorial />;
  }

  return (
    <QueryErrorBoundary>
      <GestureHandlerRootView style={{flex: 1}}>
        <SafeAreaView className="bg-black flex-1">
          <Drawer
            open={isDrawerOpen}
            onOpen={() => setIsDrawerOpen(true)}
            onClose={() => setIsDrawerOpen(false)}
            drawerPosition="left"
            drawerType="front"
            drawerStyle={{width: 200, backgroundColor: 'transparent'}}
            swipeEdgeWidth={disableDrawer ? 0 : 70}
            swipeEnabled={!disableDrawer}
            renderDrawerContent={() =>
              !disableDrawer ? (
                <ProviderDrawer onClose={() => setIsDrawerOpen(false)} />
              ) : null
            }>
            <StatusBar
              style="auto"
              animated={true}
              translucent={true}
              backgroundColor={backgroundColor}
            />

            <ScrollView
              key={scrollKey}
              onScroll={handleScroll}
              scrollEventThrottle={16} // Optimize scroll performance
              showsVerticalScrollIndicator={false}
              className="bg-black"
              refreshControl={
                <RefreshControl
                  colors={[primary]}
                  tintColor={primary}
                  progressBackgroundColor="black"
                  refreshing={isRefetching}
                  onRefresh={handleRefresh}
                />
              }>
              <HeroOptimized
                isDrawerOpen={isDrawerOpen}
                onOpenDrawer={() => setIsDrawerOpen(true)}
                onImageError={handleHeroImageError}
              />

              <ContinueWatching />

              <View className="-mt-6 relative z-20">
                {contentSliders}
                {errorComponent}
              </View>

              <View className="h-16" />
            </ScrollView>
          </Drawer>
        </SafeAreaView>
      </GestureHandlerRootView>
    </QueryErrorBoundary>
  );
};

export default React.memo(Home);
