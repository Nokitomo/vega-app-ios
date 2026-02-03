import axios from 'axios';

type AnimeIds = {
  malId?: number;
  anilistId?: number;
};

type AnimeMeta = {
  name?: string;
  description?: string;
  poster?: string;
  background?: string;
  year?: number | string;
  runtime?: string;
  imdbRating?: string;
  genres?: string[];
  trailers?: {source: string}[];
};

const ANILIST_API_URL = 'https://graphql.anilist.co';
const JIKAN_API_URL = 'https://api.jikan.moe/v4/anime';
const REQUEST_TIMEOUT = 10000;

const cleanText = (value?: string) => {
  if (!value) {
    return undefined;
  }
  return value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

const formatScore = (value?: number) => {
  if (value == null || !Number.isFinite(value)) {
    return undefined;
  }
  return (value / 10).toFixed(1);
};

const formatScoreDirect = (value?: number) => {
  if (value == null || !Number.isFinite(value)) {
    return undefined;
  }
  return value.toFixed(1);
};

const buildTrailer = (site?: string, id?: string) => {
  if (!site || !id) {
    return undefined;
  }
  if (!site.toLowerCase().includes('youtube')) {
    return undefined;
  }
  return [{source: id}];
};

const pickTitle = (titles?: {
  english?: string | null;
  romaji?: string | null;
  native?: string | null;
}) => {
  return titles?.english || titles?.romaji || titles?.native || undefined;
};

export const buildAnimeMetaKey = (ids: AnimeIds) => {
  if (ids.anilistId) {
    return `anilist:${ids.anilistId}`;
  }
  if (ids.malId) {
    return `mal:${ids.malId}`;
  }
  return '';
};

const fetchFromAniList = async (anilistId: number): Promise<AnimeMeta> => {
  const query = `
    query ($id: Int) {
      Media(id: $id, type: ANIME) {
        title { romaji english native }
        description
        coverImage { extraLarge large }
        bannerImage
        startDate { year }
        duration
        averageScore
        genres
        trailer { id site }
      }
    }
  `;

  const response = await axios.post(
    ANILIST_API_URL,
    {query, variables: {id: anilistId}},
    {
      timeout: REQUEST_TIMEOUT,
      headers: {'Content-Type': 'application/json'},
    },
  );

  const media = response.data?.data?.Media;
  if (!media) {
    return {};
  }

  return {
    name: pickTitle(media.title),
    description: cleanText(media.description),
    poster: media.coverImage?.extraLarge || media.coverImage?.large,
    background: media.bannerImage || media.coverImage?.extraLarge,
    year: media.startDate?.year,
    runtime: media.duration ? `${media.duration} min` : undefined,
    imdbRating: formatScore(media.averageScore),
    genres: Array.isArray(media.genres) ? media.genres : [],
    trailers: buildTrailer(media.trailer?.site, media.trailer?.id),
  };
};

const fetchFromJikan = async (malId: number): Promise<AnimeMeta> => {
  const response = await axios.get(`${JIKAN_API_URL}/${malId}`, {
    timeout: REQUEST_TIMEOUT,
  });

  const anime = response.data?.data;
  if (!anime) {
    return {};
  }

  const title =
    anime.title_english ||
    anime.title ||
    anime.title_japanese ||
    undefined;

  const trailerId = anime.trailer?.youtube_id || undefined;

  return {
    name: title,
    description: cleanText(anime.synopsis),
    poster:
      anime.images?.webp?.large_image_url ||
      anime.images?.jpg?.large_image_url,
    background:
      anime.images?.webp?.large_image_url ||
      anime.images?.jpg?.large_image_url,
    year: anime.year || anime.aired?.from?.slice(0, 4),
    runtime: anime.duration || undefined,
    imdbRating: formatScoreDirect(anime.score),
    genres: Array.isArray(anime.genres)
      ? anime.genres.map((genre: {name?: string}) => genre.name).filter(Boolean)
      : [],
    trailers: buildTrailer('youtube', trailerId),
  };
};

export const fetchAnimeMetadata = async (ids: AnimeIds): Promise<AnimeMeta> => {
  if (!ids?.anilistId && !ids?.malId) {
    return {};
  }

  if (ids.anilistId) {
    try {
      return await fetchFromAniList(ids.anilistId);
    } catch (error) {
      console.error('AniList metadata error:', error);
    }
  }

  if (ids.malId) {
    try {
      return await fetchFromJikan(ids.malId);
    } catch (error) {
      console.error('Jikan metadata error:', error);
    }
  }

  return {};
};
