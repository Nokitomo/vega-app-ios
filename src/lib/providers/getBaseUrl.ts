import {cacheStorageService} from '../storage';
import {PASTEBIN_PROVIDERS, PASTEBIN_URL} from './baseUrlRegistry';

// 1 hour
const expireTime = 60 * 60 * 1000;

const normalizeBaseUrl = (value: string) => value.replace(/\/+$/, '');

const getPastebinBaseUrl = async (
  providerValue: string,
): Promise<string | null> => {
  const config = PASTEBIN_PROVIDERS[providerValue];
  if (!config) {
    return null;
  }
  try {
    const res = await fetch(PASTEBIN_URL);
    const text = await res.text();
    const lines = text
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean);
    for (const line of lines) {
      try {
        const host = new URL(line).hostname;
        if (config.match.test(host)) {
          return normalizeBaseUrl(line);
        }
      } catch {
        continue;
      }
    }
    return null;
  } catch {
    return null;
  }
};

export const getBaseUrl = async (providerValue: string) => {
  try {
    let baseUrl = '';
    const cacheKey = 'CacheBaseUrl' + providerValue;
    const timeKey = 'baseUrlTime' + providerValue;

    const cachedUrl = cacheStorageService.getString(cacheKey);
    const cachedTime = cacheStorageService.getObject<number>(timeKey);

    if (cachedUrl && cachedTime && Date.now() - cachedTime < expireTime) {
      baseUrl = cachedUrl;
      console.log(`[baseUrl] cache ${providerValue} -> ${baseUrl}`);
    } else {
      const pastebinUrl = await getPastebinBaseUrl(providerValue);
      if (pastebinUrl) {
        baseUrl = pastebinUrl;
        console.log(
          `[baseUrl] pastebin ${providerValue} -> ${baseUrl}`,
        );
        cacheStorageService.setString(cacheKey, baseUrl);
        cacheStorageService.setObject(timeKey, Date.now());
      } else {
        if (PASTEBIN_PROVIDERS[providerValue]) {
          console.log(
            `[baseUrl] pastebin missing for ${providerValue}, falling back to provider defaults`,
          );
          return '';
        }
        const baseUrlRes = await fetch(
          'https://himanshu8443.github.io/providers/modflix.json',
        );
        const baseUrlData = await baseUrlRes.json();
        baseUrl = baseUrlData[providerValue].url;
        console.log(`[baseUrl] modflix ${providerValue} -> ${baseUrl}`);
        cacheStorageService.setString(cacheKey, baseUrl);
        cacheStorageService.setObject(timeKey, Date.now());
      }
    }
    return baseUrl;
  } catch (error) {
    console.error(`Error fetching baseUrl: ${providerValue}`, error);
    return '';
  }
};
