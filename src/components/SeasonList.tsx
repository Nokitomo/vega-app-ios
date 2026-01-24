import React, {useState, useMemo, useCallback, useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ToastAndroid,
  Modal,
  FlatList,
  ActivityIndicator,
  Pressable,
  ScrollView,
  TextInput,
} from 'react-native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Feather from '@expo/vector-icons/Feather';
import {Dropdown} from 'react-native-element-dropdown';
import {MotiView} from 'moti';
import {Skeleton} from 'moti/skeleton';
import * as IntentLauncher from 'expo-intent-launcher';
import RNReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {EpisodeLink, Link} from '../lib/providers/types';
import {RootStackParamList} from '../App';
import Downloader from './Downloader';
import {
  cacheStorage,
  mainStorage,
  settingsStorage,
  watchHistoryStorage,
} from '../lib/storage';
import {ifExists} from '../lib/file/ifExists';
import {useEpisodes, useStreamData} from '../lib/hooks/useEpisodes';
import useWatchHistoryStore from '../lib/zustand/watchHistrory';
import useThemeStore from '../lib/zustand/themeStore';

interface SeasonListProps {
  LinkList: Link[];
  poster: {
    logo?: string;
    poster?: string;
    background?: string;
  };
  type: string;
  metaTitle: string;
  providerValue: string;
  refreshing?: boolean;
  routeParams: Readonly<{
    link: string;
    provider?: string;
    poster?: string;
  }>;
}

interface PlayHandlerProps {
  linkIndex: number;
  type: string;
  primaryTitle: string;
  secondaryTitle?: string;
  seasonTitle: string;
  episodeData: EpisodeLink[] | Link['directLinks'];
}

interface StickyMenuState {
  active: boolean;
  link?: string;
  type?: string;
}

interface ResumeProgress {
  currentTime: number;
  duration?: number;
  episodeTitle?: string;
  episodeLink?: string;
}

const formatResumeTime = (seconds: number) => {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainingSeconds = safeSeconds % 60;
  const pad = (value: number) => value.toString().padStart(2, '0');

  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(remainingSeconds)}`;
  }

  return `${pad(minutes)}:${pad(remainingSeconds)}`;
};

const areResumeProgressEqual = (
  left: ResumeProgress | null,
  right: ResumeProgress | null,
) => {
  if (!left && !right) {
    return true;
  }
  if (!left || !right) {
    return false;
  }
  return (
    left.currentTime === right.currentTime &&
    left.duration === right.duration &&
    left.episodeTitle === right.episodeTitle &&
    left.episodeLink === right.episodeLink
  );
};

const areProgressMapsEqual = (
  left: Record<string, number>,
  right: Record<string, number>,
) => {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  if (leftKeys.length !== rightKeys.length) {
    return false;
  }
  return leftKeys.every(key => left[key] === right[key]);
};

const getEpisodeLabel = (episodeTitle?: string) => {
  if (!episodeTitle) {
    return undefined;
  }

  const match = episodeTitle.match(/\d+/);
  if (!match) {
    return undefined;
  }

  return `Ep. ${match[0]}`;
};

const SeasonList: React.FC<SeasonListProps> = ({
  LinkList,
  poster,
  type,
  metaTitle,
  providerValue,
  refreshing: _refreshing,
  routeParams,
}) => {
  const {primary} = useThemeStore(state => state);
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {addItem} = useWatchHistoryStore(state => state);
  const {fetchStreams} = useStreamData();

  // Early return if no LinkList provided
  if (!LinkList || LinkList.length === 0) {
    return (
      <View className="p-4">
        <Text className="text-white text-center">No Streams Available</Text>
      </View>
    );
  }

  // Memoized initial active season
  const [activeSeason, setActiveSeason] = useState<Link>(() => {
    if (!LinkList || LinkList.length === 0) {
      return {} as Link;
    }

    const cached = cacheStorage.getString(
      `ActiveSeason${metaTitle + providerValue}`,
    );

    if (cached) {
      try {
        const parsedSeason = JSON.parse(cached);
        // Verify the cached season still exists in LinkList
        const seasonExists = LinkList.find(
          link => link.title === parsedSeason.title,
        );
        if (seasonExists) {
          return parsedSeason;
        }
      } catch (error) {
        console.warn('Failed to parse cached season:', error);
      }
    }

    return LinkList[0];
  });

  // React Query for episodes
  const {
    data: episodeList = [],
    isLoading: episodeLoading,
    error: episodeError,
    refetch: refetchEpisodes,
  } = useEpisodes(
    activeSeason?.episodesLink,
    providerValue,
    activeSeason?.episodesLink ? true : false,
  );

  // UI state
  const [vlcLoading, setVlcLoading] = useState<boolean>(false);
  const [stickyMenu, setStickyMenu] = useState<StickyMenuState>({
    active: false,
  });

  // Search and sorting state - memoized initial values
  const [searchText, setSearchText] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(() =>
    mainStorage.getString('episodeSortOrder') === 'desc' ? 'desc' : 'asc',
  );

  // External player state
  const [showServerModal, setShowServerModal] = useState<boolean>(false);
  const [externalPlayerStreams, setExternalPlayerStreams] = useState<any[]>([]);
  const [isLoadingStreams, setIsLoadingStreams] = useState<boolean>(false);
  const [resumeProgress, setResumeProgress] = useState<ResumeProgress | null>(
    null,
  );
  const [episodeProgressMap, setEpisodeProgressMap] = useState<
    Record<string, number>
  >({});

  // Memoized filtering and sorting logic for episodes
  const filteredAndSortedEpisodes = useMemo(() => {
    if (!episodeList || !Array.isArray(episodeList)) {
      return [];
    }

    let episodes = episodeList.filter(
      episode => episode && episode.title && episode.link,
    );

    // Apply search filter
    if (searchText.trim()) {
      episodes = episodes.filter(
        episode =>
          episode?.title?.toLowerCase().includes(searchText.toLowerCase()),
      );
    }

    // Apply sorting
    if (sortOrder === 'desc') {
      episodes = [...episodes].reverse();
    }

    return episodes;
  }, [episodeList, searchText, sortOrder]);

  // Memoized direct links processing
  const filteredAndSortedDirectLinks = useMemo(() => {
    if (
      !activeSeason?.directLinks ||
      !Array.isArray(activeSeason.directLinks)
    ) {
      return [];
    }

    let links = activeSeason.directLinks.filter(
      link => link && link.title && link.link,
    );

    // Apply search filter
    if (searchText.trim()) {
      links = links.filter(
        link => link?.title?.toLowerCase().includes(searchText.toLowerCase()),
      );
    }

    // Apply sorting
    if (sortOrder === 'desc') {
      links = [...links].reverse();
    }

    return links;
  }, [activeSeason?.directLinks, searchText, sortOrder]);

  // Memoized title alignment
  const titleAlignment = useMemo(() => {
    const hasLongTitles =
      filteredAndSortedEpisodes.some(ep => ep?.title && ep.title.length > 27) ||
      filteredAndSortedDirectLinks.some(
        link => link?.title && link.title.length > 27,
      );

    return hasLongTitles ? 'justify-start' : 'justify-center';
  }, [filteredAndSortedEpisodes, filteredAndSortedDirectLinks]);

  // Memoized completion checker
  const isCompleted = useCallback((link: string) => {
    const watchProgress = JSON.parse(cacheStorage.getString(link) || '{}');
    const percentage =
      (watchProgress?.position / watchProgress?.duration) * 100;
    return percentage > 85;
  }, []);

  // Memoized toggle sort order
  const toggleSortOrder = useCallback(() => {
    const newOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    setSortOrder(newOrder);
    mainStorage.setString('episodeSortOrder', newOrder);
  }, [sortOrder]);

  // Memoized season change handler
  const handleSeasonChange = useCallback(
    (item: Link) => {
      setActiveSeason(item);
      cacheStorage.setString(
        `ActiveSeason${metaTitle + providerValue}`,
        JSON.stringify(item),
      );
    },
    [metaTitle, providerValue],
  );

  const getProgressPercent = useCallback((link: string) => {
    if (!link) {
      return 0;
    }

    try {
      const cachedProgress = cacheStorage.getString(link);
      if (!cachedProgress) {
        return 0;
      }

      const parsed = JSON.parse(cachedProgress);
      if (!parsed?.position || !parsed?.duration) {
        return 0;
      }

      const percentage = (parsed.position / parsed.duration) * 100;
      return Math.min(Math.max(percentage, 0), 100);
    } catch (error) {
      console.error('Error reading episode progress:', error);
      return 0;
    }
  }, []);

  const refreshProgressData = useCallback(() => {
    const progressKey = `watch_history_progress_${routeParams.link}`;
    const storedProgress = mainStorage.getString(progressKey);
    let nextResume: ResumeProgress | null = null;
    const hasHistory = watchHistoryStorage
      .getWatchHistory()
      .some(item => item.link === routeParams.link);

    if (!hasHistory) {
      setResumeProgress(prev =>
        areResumeProgressEqual(prev, null) ? prev : null,
      );
      setEpisodeProgressMap(prev =>
        areProgressMapsEqual(prev, {}) ? prev : {},
      );
      return;
    }

    if (!storedProgress) {
      nextResume = null;
    } else {
      try {
        const parsed = JSON.parse(storedProgress);
        if (parsed?.currentTime > 0) {
          nextResume = {
            currentTime: parsed.currentTime,
            duration: parsed.duration,
            episodeTitle: parsed.episodeTitle,
            episodeLink: parsed.episodeLink,
          };
        } else {
          nextResume = null;
        }
      } catch (error) {
        console.error('Error parsing resume progress:', error);
        nextResume = null;
      }
    }

    setResumeProgress(prev =>
      areResumeProgressEqual(prev, nextResume) ? prev : nextResume,
    );

    const progressMap: Record<string, number> = {};
    const allEpisodes = Array.isArray(episodeList) ? episodeList : [];
    const allDirectLinks = Array.isArray(activeSeason?.directLinks)
      ? activeSeason?.directLinks
      : [];

    [...allEpisodes, ...allDirectLinks].forEach(item => {
      if (!item?.link) {
        return;
      }

      const percentage = getProgressPercent(item.link);
      if (percentage > 0) {
        progressMap[item.link] = percentage;
      }
    });

    setEpisodeProgressMap(prev =>
      areProgressMapsEqual(prev, progressMap) ? prev : progressMap,
    );
  }, [routeParams.link, episodeList, activeSeason?.directLinks, getProgressPercent]);

  useEffect(() => {
    refreshProgressData();
  }, [refreshProgressData]);

  useFocusEffect(
    useCallback(() => {
      refreshProgressData();
      return () => {};
    }, [refreshProgressData]),
  );

  // Memoized external player handler
  const handleExternalPlayer = useCallback(
    async (link: string, streamType: string) => {
      setVlcLoading(true);
      setIsLoadingStreams(true);

      try {
        const streams = await fetchStreams(link, streamType, providerValue);

        if (!streams || streams.length === 0) {
          ToastAndroid.show('No stream available', ToastAndroid.SHORT);
          return;
        }

        console.log('Available Streams Count:', streams.length);
        setExternalPlayerStreams([...streams]);
        setIsLoadingStreams(false);
        setVlcLoading(false);
        setShowServerModal(true);

        ToastAndroid.show(
          `Found ${streams.length} servers`,
          ToastAndroid.SHORT,
        );
      } catch (error) {
        console.error('Error fetching streams:', error);
        ToastAndroid.show('Failed to load streams', ToastAndroid.SHORT);
      } finally {
        setVlcLoading(false);
        setIsLoadingStreams(false);
      }
    },
    [fetchStreams, providerValue],
  );

  // Memoized external player opener
  const openExternalPlayer = useCallback(async (streamUrl: string) => {
    setShowServerModal(false);
    setVlcLoading(true);

    try {
      await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
        data: streamUrl,
        type: 'video/*',
      });
    } catch (error) {
      console.error('Error opening external player:', error);
      ToastAndroid.show('Failed to open external player', ToastAndroid.SHORT);
    } finally {
      setVlcLoading(false);
    }
  }, []);

  // Memoized play handler
  const playHandler = useCallback(
    async ({
      linkIndex,
      type: contentType,
      primaryTitle,
      secondaryTitle,
      seasonTitle,
      episodeData,
    }: PlayHandlerProps) => {
      addItem({
        id: routeParams.link,
        link: routeParams.link,
        title: primaryTitle,
        poster: poster?.poster,
        provider: providerValue,
        lastPlayed: Date.now(),
        episodeTitle: secondaryTitle,
        playbackRate: 1,
        currentTime: 0,
        duration: 1,
      });

      if (!episodeData || episodeData.length === 0) {
        return;
      }

      const link = episodeData[linkIndex].link;
      const file = (
        metaTitle +
        seasonTitle +
        episodeData[linkIndex]?.title
      ).replaceAll(/[^a-zA-Z0-9]/g, '_');

      const externalPlayer = settingsStorage.getBool('useExternalPlayer');
      const dwFile = await ifExists(file);

      if (externalPlayer) {
        if (dwFile) {
          await IntentLauncher.startActivityAsync(
            'android.intent.action.VIEW',
            {
              data: dwFile,
              type: 'video/*',
            },
          );
          return;
        }
        handleExternalPlayer(link, contentType);
        return;
      }

      navigation.navigate('Player', {
        linkIndex,
        episodeList: episodeData,
        type: contentType,
        primaryTitle: primaryTitle,
        secondaryTitle: seasonTitle,
        poster: poster,
        providerValue: providerValue,
        infoUrl: routeParams.link,
      });
    },
    [
      addItem,
      routeParams.link,
      poster,
      providerValue,
      metaTitle,
      handleExternalPlayer,
      navigation,
    ],
  );

  // Memoized long press handler
  const onLongPressHandler = useCallback(
    (active: boolean, link: string, streamType?: string) => {
      if (settingsStorage.isHapticFeedbackEnabled()) {
        RNReactNativeHapticFeedback.trigger('effectTick', {
          enableVibrateFallback: true,
          ignoreAndroidSystemSettings: false,
        });
      }
      setStickyMenu({active: active, link: link, type: streamType});
    },
    [],
  );

  // Memoized mark as watched handler
  const markAsWatched = useCallback(() => {
    if (stickyMenu.link) {
      cacheStorage.setString(
        stickyMenu.link,
        JSON.stringify({
          position: 10000,
          duration: 1,
        }),
      );
      setStickyMenu({active: false});
    }
  }, [stickyMenu.link]);

  // Memoized mark as unwatched handler
  const markAsUnwatched = useCallback(() => {
    if (stickyMenu.link) {
      cacheStorage.setString(
        stickyMenu.link,
        JSON.stringify({
          position: 0,
          duration: 1,
        }),
      );
      setStickyMenu({active: false});
    }
  }, [stickyMenu.link]);

  // Memoized sticky menu external player handler
  const handleStickyMenuExternalPlayer = useCallback(() => {
    setStickyMenu({active: false});
    if (stickyMenu.link && stickyMenu.type) {
      handleExternalPlayer(stickyMenu.link, stickyMenu.type);
    }
  }, [stickyMenu.link, stickyMenu.type, handleExternalPlayer]);

  const handleResume = useCallback(() => {
    const resumeList =
      filteredAndSortedEpisodes.length > 0
        ? filteredAndSortedEpisodes
        : filteredAndSortedDirectLinks;

    if (!resumeList || resumeList.length === 0) {
      ToastAndroid.show('Nessun episodio disponibile', ToastAndroid.SHORT);
      return;
    }

    if (!resumeProgress) {
      const resumeItem = resumeList[0];
      playHandler({
        linkIndex: 0,
        type: type,
        primaryTitle: metaTitle,
        secondaryTitle: resumeItem.title,
        seasonTitle: activeSeason?.title || '',
        episodeData: resumeList,
      });
      return;
    }

    let resumeIndex = -1;

    if (resumeProgress.episodeLink) {
      resumeIndex = resumeList.findIndex(
        item => item.link === resumeProgress.episodeLink,
      );
    }

    if (resumeIndex < 0 && resumeProgress.episodeTitle) {
      const normalizedTitle = resumeProgress.episodeTitle
        .trim()
        .toLowerCase();
      resumeIndex = resumeList.findIndex(
        item => item.title?.trim().toLowerCase() === normalizedTitle,
      );
    }

    if (resumeIndex < 0) {
      ToastAndroid.show('Episodio non disponibile', ToastAndroid.SHORT);
      return;
    }

    const resumeItem = resumeList[resumeIndex];

    playHandler({
      linkIndex: resumeIndex,
      type: type,
      primaryTitle: metaTitle,
      secondaryTitle: resumeItem.title,
      seasonTitle: activeSeason?.title || '',
      episodeData: resumeList,
    });
  }, [
    resumeProgress,
    filteredAndSortedEpisodes,
    filteredAndSortedDirectLinks,
    playHandler,
    type,
    metaTitle,
    activeSeason?.title,
  ]);

  // Memoized episode render item
  const renderEpisodeItem = useCallback(
    ({item, index}: {item: EpisodeLink; index: number}) => {
      if (!item || !item.link || !item.title) {
        console.warn('Invalid episode item at index', index, item);
        return null; // Skip rendering if item is invalid
      }

      return (
        <View
          key={item.link + index}
          className={`w-full justify-center items-center gap-2 flex-row my-1
          ${
            isCompleted(item.link) || stickyMenu.link === item.link
              ? 'opacity-60'
              : ''
          }
        `}>
          <View className="flex-row w-full justify-between gap-2 items-center">
            <TouchableOpacity
              className={`rounded-md bg-white/30 w-[80%] h-12 items-center p-1 flex-row gap-x-2 relative ${titleAlignment}`}
              onPress={() =>
                playHandler({
                  linkIndex: index,
                  type: type,
                  primaryTitle: metaTitle,
                  secondaryTitle: item.title,
                  seasonTitle: activeSeason?.title || '',
                  episodeData: filteredAndSortedEpisodes,
                })
              }
              onLongPress={() => onLongPressHandler(true, item.link, 'series')}>
              <Ionicons name="play-circle" size={28} color={primary} />
              <Text className="text-white">
                {item.title.length > 30
                  ? item.title.slice(0, 30) + '...'
                  : item.title}
              </Text>
              {episodeProgressMap[item.link] ? (
                <View
                  className="absolute bottom-0 left-0 right-0 h-1"
                  style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
                  <View
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      height: '100%',
                      width: `${episodeProgressMap[item.link]}%`,
                      backgroundColor: primary,
                    }}
                  />
                </View>
              ) : null}
            </TouchableOpacity>
            <Downloader
              providerValue={providerValue}
              link={item.link}
              type={type}
              title={
                metaTitle.length > 30
                  ? metaTitle.slice(0, 30) + '... ' + item.title
                  : metaTitle + ' ' + item.title
              }
              fileName={(
                metaTitle +
                activeSeason.title +
                item.title
              ).replaceAll(/[^a-zA-Z0-9]/g, '_')}
            />
          </View>
        </View>
      );
    },
    [
      isCompleted,
      stickyMenu.link,
      titleAlignment,
      playHandler,
      metaTitle,
      activeSeason?.title,
      filteredAndSortedEpisodes,
      onLongPressHandler,
      primary,
      providerValue,
    ],
  );

  // Memoized direct link render item
  const renderDirectLinkItem = useCallback(
    ({item, index}: {item: any; index: number}) => {
      if (!item || !item.link || !item.title) {
        console.warn('Invalid direct link item at index', index, item);
        return null; // Skip rendering if item is invalid
      }

      return (
        <View
          key={item.link + index}
          className={`w-full justify-center items-center my-2 gap-2 flex-row
          ${
            isCompleted(item.link) || stickyMenu.link === item.link
              ? 'opacity-60'
              : ''
          }
        `}>
          <View className="flex-row w-full justify-between gap-2 items-center">
            <TouchableOpacity
              className={`rounded-md bg-white/30 w-[80%] h-12 items-center p-2 flex-row gap-x-2 relative ${titleAlignment}`}
              onPress={() =>
                playHandler({
                  linkIndex: index,
                  type: type,
                  primaryTitle: metaTitle,
                  secondaryTitle: item.title,
                  seasonTitle: activeSeason?.title || '',
                  episodeData: filteredAndSortedDirectLinks,
                })
              }
              onLongPress={() =>
                onLongPressHandler(true, item.link, item?.type || 'series')
              }>
              <Ionicons name="play-circle" size={28} color={primary} />
              <Text className="text-white">
                {activeSeason?.directLinks?.length &&
                activeSeason?.directLinks?.length > 1
                  ? item.title?.length > 27
                    ? item.title.slice(0, 27) + '...'
                    : item.title
                  : 'Play'}
              </Text>
              {episodeProgressMap[item.link] ? (
                <View
                  className="absolute bottom-0 left-0 right-0 h-1"
                  style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
                  <View
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      height: '100%',
                      width: `${episodeProgressMap[item.link]}%`,
                      backgroundColor: primary,
                    }}
                  />
                </View>
              ) : null}
            </TouchableOpacity>
            <Downloader
              providerValue={providerValue}
              link={item.link}
              type={type}
              title={
                metaTitle.length > 30
                  ? metaTitle.slice(0, 30) + '... ' + item.title
                  : metaTitle + ' ' + item.title
              }
              fileName={(
                metaTitle +
                activeSeason.title +
                item.title
              ).replaceAll(/[^a-zA-Z0-9]/g, '_')}
            />
          </View>
        </View>
      );
    },
    [
      isCompleted,
      stickyMenu.link,
      titleAlignment,
      playHandler,
      metaTitle,
      activeSeason?.title,
      activeSeason?.directLinks,
      filteredAndSortedDirectLinks,
      onLongPressHandler,
      primary,
      providerValue,
    ],
  );

  // Memoized server render item
  const renderServerItem = useCallback(
    (item: any, index: number) => (
      <TouchableOpacity
        key={`server-${index}-${item.server}`}
        className="bg-black/30 p-3 rounded-lg mb-2 flex-row justify-between items-center"
        style={{borderColor: primary, borderWidth: 1}}
        onPress={() => openExternalPlayer(item.link)}>
        <View>
          <Text className="text-white text-lg capitalize font-bold">
            {item.server || `Server ${index + 1}`}
          </Text>
          <Text className="text-white text-xs opacity-80">
            {item.type ? `Format: ${item.type.toUpperCase()}` : ''}
          </Text>
        </View>
        <MaterialCommunityIcons name="vlc" size={24} color={primary} />
      </TouchableOpacity>
    ),
    [primary, openExternalPlayer],
  );

  // Show loading skeleton while episodes are loading
  if (episodeLoading) {
    return (
      <View>
        {LinkList.length > 1 && (
          <Dropdown
            selectedTextStyle={{
              color: primary,
              overflow: 'hidden',
              height: 20,
              fontWeight: 'bold',
            }}
            labelField={'title'}
            valueField={
              LinkList[0]?.episodesLink ? 'episodesLink' : 'directLinks'
            }
            onChange={handleSeasonChange}
            value={activeSeason}
            data={LinkList}
            style={{
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: '#2f302f',
              paddingHorizontal: 12,
              borderRadius: 8,
              backgroundColor: 'black',
            }}
            containerStyle={{
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: 'gray',
              borderRadius: 8,
              backgroundColor: 'black',
            }}
            renderItem={item => (
              <View
                className={`px-3 py-2 bg-black text-white flex-row justify-start items-center border-b border-gray-500 text-center ${
                  activeSeason === item ? 'bg-quaternary' : ''
                }`}>
                <Text className="text-white">{item?.title || 'Unknown'}</Text>
              </View>
            )}
          />
        )}

        <MotiView
          animate={{backgroundColor: '#0000'}}
          delay={0}
          //@ts-ignore
          transition={{
            type: 'timing',
          }}
          style={{
            width: '100%',
            padding: 10,
            alignItems: 'flex-start',
            gap: 20,
          }}>
          <Skeleton colorMode={'dark'} width={'85%'} height={48} />
          <Skeleton colorMode={'dark'} width={'85%'} height={48} />
          <Skeleton colorMode={'dark'} width={'85%'} height={48} />
          <Skeleton colorMode={'dark'} width={'85%'} height={48} />
          <Skeleton colorMode={'dark'} width={'85%'} height={48} />
          <Skeleton colorMode={'dark'} width={'85%'} height={48} />
        </MotiView>
      </View>
    );
  }

  // Show error state
  if (episodeError) {
    return (
      <View className="p-4">
        <Text className="text-red-500 text-center">
          Failed to load episodes. Please try again.
        </Text>
        <TouchableOpacity
          className="mt-2 bg-red-600 p-2 rounded-md"
          onPress={() => refetchEpisodes()}>
          <Text className="text-white text-center">Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View>
      {/* Season Selector */}
      {LinkList.length > 1 ? (
        <Dropdown
          selectedTextStyle={{
            color: primary,
            overflow: 'hidden',
            height: 20,
            fontWeight: 'bold',
          }}
          labelField={'title'}
          valueField={
            LinkList[0]?.episodesLink ? 'episodesLink' : 'directLinks'
          }
          onChange={handleSeasonChange}
          value={activeSeason}
          data={LinkList}
          style={{
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: '#2f302f',
            paddingHorizontal: 12,
            borderRadius: 8,
            backgroundColor: 'black',
          }}
          containerStyle={{
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: 'gray',
            borderRadius: 8,
            backgroundColor: 'black',
          }}
          renderItem={item => (
            <View
              className={`px-3 py-2 bg-black text-white flex-row justify-start items-center border-b border-gray-500 text-center ${
                activeSeason === item ? 'bg-quaternary' : ''
              }`}>
              <Text className="text-white">{item?.title || 'Unknown'}</Text>
            </View>
          )}
        />
      ) : (
        <Text className="text-red-600 text-lg font-semibold px-2">
          {LinkList[0]?.title || 'Unknown Season'}
        </Text>
      )}

      {/* Search and Sort Controls */}
      {(filteredAndSortedEpisodes.length > 8 ||
        filteredAndSortedDirectLinks.length > 8 ||
        searchText.trim().length > 0) && (
        <View className="flex-row justify-between items-center mt-2">
          <TextInput
            placeholder="Search..."
            className="bg-black/30 text-white rounded-md p-2 h-10 w-[80%] border-collapse border border-white/10"
            value={searchText}
            onChangeText={setSearchText}
          />
          <TouchableOpacity
            className="bg-black/30 rounded-md p-2 h-10 w-[15%] flex-row justify-center items-center"
            onPress={toggleSortOrder}>
            <MaterialCommunityIcons
              name={sortOrder === 'asc' ? 'sort-ascending' : 'sort-descending'}
              size={24}
              color={primary}
            />
          </TouchableOpacity>
        </View>
      )}

      {(resumeProgress?.currentTime != null ||
        filteredAndSortedEpisodes.length > 0 ||
        filteredAndSortedDirectLinks.length > 0) ? (
        <View className="mt-3 mb-2">
          <TouchableOpacity
            onPress={handleResume}
            className="bg-tertiary/60 rounded-md px-3 py-2 flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <MaterialCommunityIcons
                name="play-circle"
                size={20}
                color={primary}
              />
              <Text className="text-white font-semibold">
                {resumeProgress?.currentTime ? 'Riprendi' : 'Riproduci'}
              </Text>
              {resumeProgress?.episodeTitle &&
              getEpisodeLabel(resumeProgress.episodeTitle) ? (
                <Text className="text-white/80 text-xs">
                  {`- ${getEpisodeLabel(resumeProgress.episodeTitle)}`}
                </Text>
              ) : (
                <Text className="text-white/80 text-xs">- Ep. 1</Text>
              )}
            </View>
            <Text className="text-white/80 text-xs">
              {formatResumeTime(resumeProgress?.currentTime ?? 0)}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Episode/Direct Links List */}
      <View className="flex-row flex-wrap justify-center gap-x-2 gap-y-2">
        {/* Episodes List */}
        {filteredAndSortedEpisodes.length > 0 && (
          <FlatList
            data={filteredAndSortedEpisodes}
            keyExtractor={(item, index) => `episode-${item.link}-${index}`}
            renderItem={renderEpisodeItem}
            maxToRenderPerBatch={10}
            windowSize={10}
            removeClippedSubviews={true}
            getItemLayout={(data, index) => ({
              length: 60,
              offset: 60 * index,
              index,
            })}
          />
        )}

        {/* Direct Links List */}
        {filteredAndSortedDirectLinks.length > 0 && (
          <View className="w-full justify-center items-center gap-y-2 mt-3 p-2">
            <FlatList
              data={filteredAndSortedDirectLinks}
              keyExtractor={(item, index) => `direct-${item.link}-${index}`}
              renderItem={renderDirectLinkItem}
              maxToRenderPerBatch={10}
              windowSize={10}
              removeClippedSubviews={true}
              getItemLayout={(data, index) => ({
                length: 68,
                offset: 68 * index,
                index,
              })}
            />
          </View>
        )}

        {/* No Content Available */}
        {filteredAndSortedEpisodes.length === 0 &&
          filteredAndSortedDirectLinks.length === 0 &&
          LinkList?.length === 0 && (
            <Text className="text-white text-lg font-semibold min-h-20">
              No stream found
            </Text>
          )}
      </View>

      {/* VLC Loading Indicator */}
      {vlcLoading && (
        <View className="absolute top-0 left-0 w-full h-full bg-black/60 bg-opacity-50 justify-center items-center">
          <MotiView
            from={{rotate: '0deg'}}
            animate={{rotate: '360deg'}}
            //@ts-ignore
            transition={{
              type: 'timing',
              duration: 800,
              loop: true,
              repeatReverse: false,
            }}>
            <MaterialCommunityIcons name="vlc" size={70} color={primary} />
          </MotiView>
          <Text className="text-white text-lg font-semibold mt-2">
            Loading available servers...
          </Text>
        </View>
      )}

      {/* Server Selection Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showServerModal}
        onRequestClose={() => setShowServerModal(false)}>
        <Pressable
          onPress={() => setShowServerModal(false)}
          className="flex-1 justify-center items-center bg-black/80">
          <View className="bg-tertiary rounded-xl p-4 w-[90%] max-w-[350px]">
            <Text className="text-white text-xl font-bold mb-2 text-center">
              Select External Player Server
            </Text>
            <Text className="text-white text-sm mb-4 text-center opacity-70">
              {externalPlayerStreams.length} servers available
            </Text>

            {isLoadingStreams ? (
              <ActivityIndicator size="large" color={primary} />
            ) : (
              <>
                <ScrollView style={{maxHeight: 300}}>
                  {externalPlayerStreams.map((item, index) =>
                    renderServerItem(item, index),
                  )}
                  {externalPlayerStreams.length === 0 && (
                    <Text className="text-white text-center p-4">
                      No servers available
                    </Text>
                  )}
                </ScrollView>

                <TouchableOpacity
                  className="mt-4 bg-black/30 py-2 rounded-md"
                  onPress={() => setShowServerModal(false)}>
                  <Text className="text-white text-center font-bold">
                    Cancel
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </Pressable>
      </Modal>

      {/* Sticky Menu Modal */}
      <Modal
        animationType="fade"
        visible={stickyMenu.active}
        transparent={true}
        onRequestClose={() => setStickyMenu({active: false})}>
        <Pressable
          className="flex-1 justify-end items-center"
          onPress={() => setStickyMenu({active: false})}>
          <View className="w-full h-14 bg-quaternary flex-row justify-evenly items-center pt-2">
            {isCompleted(stickyMenu.link || '') ? (
              <TouchableOpacity
                className="flex-row justify-center items-center gap-2 p-2"
                onPress={markAsUnwatched}>
                <Text className="text-white">Marked as Unwatched</Text>
                <Ionicons name="checkmark-done" size={30} color={primary} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                className="flex-row justify-center items-center gap-2 pt-0 pb-2 px-2 bg-tertiary rounded-md"
                onPress={markAsWatched}>
                <Text className="text-white">Mark as Watched</Text>
                <Ionicons name="checkmark" size={25} color={primary} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              className="flex-row justify-center bg-tertiary rounded-md items-center pt-0 pb-2 px-2 gap-2"
              onPress={handleStickyMenuExternalPlayer}>
              <Text className="text-white font-bold text-base">
                External Player
              </Text>
              <Feather name="external-link" size={20} color={primary} />
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

export default SeasonList;
