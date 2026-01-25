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
    console.log(`[baseUrl] pastebin skip (no config) ${providerValue}`);
    return null;
  }
  console.log(`[baseUrl] pastebin fetch start ${providerValue}`);
  try {
    const res = await fetch(PASTEBIN_URL);
    console.log(
      `[baseUrl] pastebin response ${providerValue} status=${res.status}`,
    );
    const text = await res.text();
    const preview = text.slice(0, 200).replace(/\s+/g, ' ').trim();
    console.log(
      `[baseUrl] pastebin body preview ${providerValue}: ${preview}`,
    );
    const lines = text
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean);
    console.log(
      `[baseUrl] pastebin lines ${providerValue}: ${lines.length}`,
    );
    for (const line of lines) {
      console.log(`[baseUrl] pastebin line ${providerValue}: ${line}`);
      const withoutProtocol = line.replace(/^https?:\/\//i, '');
      const host = withoutProtocol.split('/')[0].split(':')[0];
      if (!host) {
        console.log(
          `[baseUrl] pastebin parse error ${providerValue}: invalid url`,
        );
        continue;
      }
      console.log(
        `[baseUrl] pastebin host ${providerValue}: ${host}`,
      );
      if (config.match.test(host)) {
        console.log(
          `[baseUrl] pastebin match ${providerValue}: ${line}`,
        );
        return normalizeBaseUrl(line);
      }
    }
    console.log(`[baseUrl] pastebin no match ${providerValue}`);
    return null;
  } catch (error) {
    console.log(
      `[baseUrl] pastebin fetch error ${providerValue}: ${String(error)}`,
    );
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
