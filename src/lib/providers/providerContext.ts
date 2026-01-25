import axios from 'axios';
import {getBaseUrl} from './getBaseUrl';
import {headers} from './headers';
import * as cheerio from 'cheerio';
import {hubcloudExtracter} from './hubcloudExtractor';
import {gofileExtracter} from './gofileExtracter';
import {superVideoExtractor} from './superVideoExtractor';
import {gdFlixExtracter} from './gdflixExtractor';
import {ProviderContext} from './types';
import * as Crypto from 'expo-crypto';

/**
 * Context for provider functions.
 * This context is used to pass common dependencies to provider functions.
 */

const extractors = {
  hubcloudExtracter,
  gofileExtracter,
  superVideoExtractor,
  gdFlixExtracter,
};

export const providerContext: ProviderContext = {
  axios,
  getBaseUrl,
  commonHeaders: headers,
  Crypto,
  cheerio,
  extractors,
};

const shouldLogAnimeunityTop = (url?: string) =>
  typeof url === 'string' && url.includes('animeunity.so/top-anime');

axios.interceptors.request.use(
  config => {
    if (shouldLogAnimeunityTop(config.url)) {
      console.log('[animeunity][top] request', {
        url: config.url,
        params: config.params,
      });
    }
    return config;
  },
  error => Promise.reject(error),
);

axios.interceptors.response.use(
  response => {
    if (shouldLogAnimeunityTop(response.config?.url)) {
      const size =
        typeof response.data === 'string'
          ? response.data.length
          : Array.isArray(response.data?.data)
            ? response.data.data.length
            : undefined;
      console.log('[animeunity][top] response', {
        url: response.config?.url,
        status: response.status,
        size,
      });
    }
    return response;
  },
  error => {
    const url = error?.config?.url;
    if (shouldLogAnimeunityTop(url)) {
      console.log('[animeunity][top] response error', {
        url,
        status: error?.response?.status,
        message: error?.message,
      });
    }
    return Promise.reject(error);
  },
);
