import axios from 'axios';
import {fetchAnimeMetadata} from './animeMeta';

type EnhancedMetaIds = {
  imdbId?: string;
  type?: string;
  malId?: number;
  anilistId?: number;
};

const CINEMETA_BASE_URL = 'https://v3-cinemeta.strem.io/meta';
const REQUEST_TIMEOUT = 10000;

export const buildEnhancedMetaKey = ({
  imdbId,
  type,
  malId,
  anilistId,
}: EnhancedMetaIds) => {
  if (imdbId && type) {
    return `imdb:${imdbId}:${type}`;
  }
  if (anilistId) {
    return `anilist:${anilistId}`;
  }
  if (malId) {
    return `mal:${malId}`;
  }
  return '';
};

export const fetchEnhancedMetadata = async ({
  imdbId,
  type,
  malId,
  anilistId,
}: EnhancedMetaIds) => {
  if (imdbId && type) {
    const response = await axios.get(
      `${CINEMETA_BASE_URL}/${type}/${imdbId}.json`,
      {timeout: REQUEST_TIMEOUT},
    );
    return response.data?.meta || {};
  }

  return fetchAnimeMetadata({malId, anilistId});
};
