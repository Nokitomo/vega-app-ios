import {ScrollView, View, Text, TouchableOpacity} from 'react-native';
import React, {useEffect, useMemo, useState, useRef} from 'react';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {HomeStackParamList, SearchStackParamList} from '../App';
import {Post} from '../lib/providers/types';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import useContentStore from '../lib/zustand/contentStore';
import {MaterialIcons} from '@expo/vector-icons';
import Ionicons from '@expo/vector-icons/Ionicons';
import {settingsStorage} from '../lib/storage';
import {FlashList} from '@shopify/flash-list';
import SkeletonLoader from '../components/Skeleton';
import useThemeStore from '../lib/zustand/themeStore';
import {providerManager} from '../lib/services/ProviderManager';
import ProviderImage from '../components/ProviderImage';

type Props = NativeStackScreenProps<HomeStackParamList, 'ScrollList'>;

const ScrollList = ({route}: Props): React.ReactElement => {
  const {primary} = useThemeStore(state => state);
  const navigation =
    useNavigation<NativeStackNavigationProp<SearchStackParamList>>();
  const [posts, setPosts] = useState<Post[]>([]);
  const {filter, providerValue} = route.params;
  const [page, setPage] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isEnd, setIsEnd] = useState<boolean>(false);
  const {provider} = useContentStore(state => state);
  const [viewType, setViewType] = useState<number>(
    settingsStorage.getListViewType(),
  );
  const isAnimeunityTop =
    (route.params.providerValue || provider.value) === 'animeunity' &&
    filter === 'top' &&
    !route.params.isSearch;
  const isCalendarView = filter === 'calendar' && !route.params.isSearch;
  // Add abort controller to cancel API requests when unmounting
  const abortController = useRef<AbortController | null>(null);
  const isMounted = useRef(true);
  const isLoadingMore = useRef(false);
  const calendarDayOrder = useMemo(
    () => [
      'Lunedì',
      'Martedì',
      'Mercoledì',
      'Giovedì',
      'Venerdì',
      'Sabato',
      'Domenica',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday',
      'Undetermined',
    ],
    [],
  );
  const calendarSections = useMemo(() => {
    if (!isCalendarView) {
      return [];
    }
    const grouped = new Map<string, Post[]>();
    posts.forEach(post => {
      if (!post.day) {
        return;
      }
      if (!calendarDayOrder.includes(post.day)) {
        return;
      }
      const items = grouped.get(post.day) || [];
      items.push(post);
      grouped.set(post.day, items);
    });
    return calendarDayOrder
      .filter(day => grouped.get(day)?.length)
      .map(day => ({
        title: day,
        data: grouped.get(day) || [],
      }));
  }, [calendarDayOrder, isCalendarView, posts]);

  // Set up cleanup effect that runs on component unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
      if (abortController.current) {
        if (isAnimeunityTop) {
          console.log(`[animeunity][top] abort on unmount page=${page}`);
        }
        abortController.current.abort();
      }
    };
  }, []);

  useEffect(() => {
    // Clean up the previous controller if it exists
    if (abortController.current) {
      if (isAnimeunityTop) {
        console.log(
          `[animeunity][top] abort previous before page=${page}`,
        );
      }
      abortController.current.abort();
    }

    // Create a new controller for this effect
    abortController.current = new AbortController();
    const signal = abortController.current.signal;
    if (isAnimeunityTop) {
      console.log(`[animeunity][top] new controller page=${page}`);
    }

    const fetchPosts = async () => {
      // Don't fetch if we're already at the end
        if (isEnd) {
          return;
        }

      try {
        // Prevent concurrent loading calls
        if (isLoadingMore.current) {
          return;
        }
        isLoadingMore.current = true;

        setIsLoading(true);

        // Simulate network delay to reduce rapid API calls
        // Remove this in production if not needed
        await new Promise(resolve => setTimeout(resolve, 300));

        // Skip if component unmounted or request was aborted
        if (!isMounted.current || signal.aborted) {
          return;
        }

        const getNewPosts = route.params.isSearch
          ? providerManager.getSearchPosts({
              searchQuery: filter,
              page,
              providerValue: providerValue || provider.value,
              signal,
            })
          : providerManager.getPosts({
              filter,
              page,
              providerValue: providerValue || provider.value,
              signal,
            });

        const newPosts = await getNewPosts;

        // Skip if component unmounted or request was aborted
        if (!isMounted.current || signal.aborted) {
          return;
        }

        if (!newPosts || newPosts.length === 0) {
          console.log('end', page);
          setIsEnd(true);
          setIsLoading(false);
          isLoadingMore.current = false;
          return;
        }

        setPosts(prev => [...prev, ...newPosts]);
      } catch (error) {
        // Skip handling if component unmounted or request was aborted
        if (!isMounted.current || (error as any)?.name === 'AbortError') {
          return;
        }
        console.error('Error fetching posts:', error);
      } finally {
        if (isMounted.current) {
          setIsLoading(false);
          isLoadingMore.current = false;
        }
      }
    };

    fetchPosts();
  }, [page, route.params, filter, provider.value]);

  const onEndReached = async () => {
    // Don't trigger more loading if we're already loading or at the end
    if (isLoading || isEnd || isLoadingMore.current) {
      return;
    }
    setIsLoading(true);
    setPage(prevPage => prevPage + 1);
  };

  // Limit the number of skeletons to prevent unnecessary renders
  const renderSkeletons = () => {
    const skeletonCount = viewType === 1 ? 6 : 3;
    return Array.from({length: skeletonCount}).map((_, i) => (
      <View
        className="mx-3 gap-0 flex mb-3 justify-center items-center"
        key={i}>
        <SkeletonLoader height={150} width={100} />
        <SkeletonLoader height={12} width={97} />
      </View>
    ));
  };

  return (
    <View className="h-full w-full bg-black items-center p-4">
      <View className="w-full px-4 font-semibold my-6 flex-row justify-between items-center">
        <View className="flex-row items-center gap-2">
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={26} color="white" />
          </TouchableOpacity>
          <Text className="text-2xl font-bold" style={{color: primary}}>
            {route.params.title}
          </Text>
        </View>
        {!isCalendarView && (
          <TouchableOpacity
            onPress={() => {
              const newViewType = viewType === 1 ? 2 : 1;
              setViewType(newViewType);
              settingsStorage.setListViewType(newViewType);
            }}>
            <MaterialIcons
              name={viewType === 1 ? 'view-module' : 'view-list'}
              size={27}
              color="white"
            />
          </TouchableOpacity>
        )}
      </View>
      <View className="justify-center flex-row w-96 ">
        {isCalendarView ? (
          <ScrollView showsVerticalScrollIndicator={false}>
            {isLoading ? (
              <View className="flex flex-row flex-wrap gap-1 justify-center items-center mb-16">
                {renderSkeletons()}
              </View>
            ) : (
              calendarSections.map(section => (
                <View key={section.title} className="mb-6">
                  <Text
                    className="text-xl font-bold mb-2"
                    style={{color: primary}}>
                    {section.title}
                  </Text>
                  <View className="flex flex-row flex-wrap">
                    {section.data.map(item => (
                      <TouchableOpacity
                        key={item.link}
                        className="flex flex-col m-3"
                        onPress={() =>
                          navigation.navigate('Info', {
                            link: item.link,
                            provider: route.params.providerValue || provider.value,
                            poster: item?.image,
                          })
                        }>
                        <View className="relative">
                          <ProviderImage
                            className="rounded-md"
                            uri={item.image}
                            link={item.link}
                            providerValue={
                              route.params.providerValue || provider.value
                            }
                            style={{width: 100, height: 150}}
                          />
                          {item.episodeLabel ? (
                            <View
                              className="absolute top-1 right-1 rounded-full px-2 py-0.5"
                              style={{backgroundColor: primary}}>
                              <Text className="text-black text-[10px] font-semibold">
                                {item.episodeLabel}
                              </Text>
                            </View>
                          ) : null}
                        </View>
                        <Text className="text-white text-center truncate w-24 text-xs">
                          {item?.title?.length > 24
                            ? item.title.slice(0, 24) + '...'
                            : item.title}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ))
            )}
            <View className="h-32" />
            {!isLoading && calendarSections.length === 0 ? (
              <View className="w-full h-full flex items-center justify-center">
                <Text className="text-white text-center font-semibold text-lg">
                  No Content Found
                </Text>
              </View>
            ) : null}
          </ScrollView>
        ) : (
          <FlashList
            estimatedItemSize={300}
            ListFooterComponent={
              <>
                {isLoading && (
                  <View
                    className={`flex ${
                      viewType === 1 ? 'flex-row flex-wrap' : 'flex-col'
                    } gap-1 justify-center items-center mb-16`}>
                    {renderSkeletons()}
                  </View>
                )}
                <View className="h-32" />
              </>
            }
            data={posts}
            numColumns={viewType === 1 ? 3 : 1}
            key={`view-type-${viewType}`}
            contentContainerStyle={{paddingBottom: 80}}
            keyExtractor={(item, i) => `${item.title}-${i}`}
            renderItem={({item}) => (
              <TouchableOpacity
                className={
                  viewType === 1
                    ? 'flex flex-col m-3'
                    : 'flex-row m-3 items-center'
                }
                onPress={() =>
                  navigation.navigate('Info', {
                    link: item.link,
                    provider: route.params.providerValue || provider.value,
                    poster: item?.image,
                  })
                }>
                <View className="relative">
                  <ProviderImage
                    className="rounded-md"
                    uri={item.image}
                    link={item.link}
                    providerValue={route.params.providerValue || provider.value}
                    style={
                      viewType === 1
                        ? {width: 100, height: 150}
                        : {width: 70, height: 100}
                    }
                  />
                  {item.episodeLabel ? (
                    <View
                      className="absolute top-1 right-1 rounded-full px-2 py-0.5"
                      style={{backgroundColor: primary}}>
                      <Text className="text-black text-[10px] font-semibold">
                        {item.episodeLabel}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Text
                  className={
                    viewType === 1
                      ? 'text-white text-center truncate w-24 text-xs'
                      : 'text-white ml-3 truncate w-72 font-semibold text-base'
                  }>
                  {item?.title?.length > 24 && viewType === 1
                    ? item.title.slice(0, 24) + '...'
                    : item.title}
                </Text>
              </TouchableOpacity>
            )}
            onEndReached={onEndReached}
            onEndReachedThreshold={0.5}
          />
        )}
        {!isCalendarView && !isLoading && posts.length === 0 ? (
          <View className="w-full h-full flex items-center justify-center">
            <Text className="text-white text-center font-semibold text-lg">
              No Content Found
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
};

export default ScrollList;
