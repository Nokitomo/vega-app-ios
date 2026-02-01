import {
  SafeAreaView,
  ScrollView,
  RefreshControl,
  View,
  Text,
} from 'react-native';
import Slider from '../../components/Slider';
import React, {useCallback, useMemo, useState} from 'react';
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

type Props = NativeStackScreenProps<HomeStackParamList, 'Home'>;

const Home = ({}: Props) => {
  const {primary} = useThemeStore(state => state);
  const {t} = useTranslation();
  const [backgroundColor, setBackgroundColor] = useState('transparent');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [refreshNonce, setRefreshNonce] = useState(0);

  // Memoize static values
  const disableDrawer = useMemo(
    () => mainStorage.getBool('disableDrawer') || false,
    [],
  );

  const {provider, installedProviders} = useContentStore(state => state);
  const {setHero} = useHeroStore(state => state);
  const heroCacheTtlMs = 7 * 24 * 60 * 60 * 1000;

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
  }, [homeData, provider?.value]);

  // Update hero only when hero post actually changes
  React.useEffect(() => {
    if (!provider?.value) {
      setHero({link: '', image: '', title: ''});
      return;
    }

    const cacheKey = `heroCache:${provider.value}`;
    const cached = cacheStorage.getString(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        const isFresh =
          parsed?.timestamp &&
          Date.now() - parsed.timestamp < heroCacheTtlMs;
        if (isFresh && parsed?.hero?.link) {
          setHero(parsed.hero);
          return;
        }
      } catch {
        // ignore cache parsing errors
      }
    }

    if (heroPost) {
      setHero(heroPost);
      cacheStorage.setString(
        cacheKey,
        JSON.stringify({timestamp: Date.now(), hero: heroPost}),
      );
      return;
    }

    setHero({link: '', image: '', title: ''});
  }, [heroPost, setHero, provider?.value, heroCacheTtlMs]);

  // Optimized refresh handler
  const handleRefresh = useCallback(async () => {
    try {
      if (provider?.value) {
        clearHeroCache(provider.value);
        cacheStorage.delete(`heroCache:${provider.value}`);
      }
      await refetch();
    } catch (refreshError) {
      console.error('Error refreshing home data:', refreshError);
    } finally {
      setRefreshNonce(value => value + 1);
    }
  }, [provider?.value, refetch]);

  // Memoized loading skeleton
  const loadingSliders = useMemo(() => {
    if (!provider?.value) {
      return [];
    }

    return providerManager
      .getCatalog({providerValue: provider.value})
      .map((item, index) => (
        <Slider
          isLoading={true}
          key={`loading-${item.filter}-${index}`}
          title={resolveCatalogTitle(item)}
          posts={[]}
          filter={item.filter}
        />
      ));
  }, [provider?.value, resolveCatalogTitle]);

  // Memoized content sliders
  const contentSliders = useMemo(() => {
    return homeData.map(item => (
      <Slider
        isLoading={false}
        key={`content-${item.filter}-${item.Posts.length}-${refreshNonce}`}
        title={resolveCatalogTitle(item)}
        posts={item.Posts}
        filter={item.filter}
      />
    ));
  }, [homeData, refreshNonce, resolveCatalogTitle]);

  const scrollKey = useMemo(() => {
    return `${provider?.value ?? 'none'}:${homeData.length}:${isLoading}`;
  }, [provider?.value, homeData.length, isLoading]);

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
              />

              <ContinueWatching />

              <View className="-mt-6 relative z-20">
                {isLoading ? loadingSliders : contentSliders}
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
