import retry from "async-retry";
import fetch from "cross-fetch";
import ms from "ms";

import type { HazelConfig } from "./index.js";
import { patchPlatform } from "./utils.js";

type PlatformType = {
  [key: string]: {
    name: string;
    api_url: string;
    url: string;
    content_type: string;
    size: number;
  };
};

type FilesType = {
  [key: string]: string;
};

type LatestType = {
  version?: string;
  notes?: string;
  pub_date?: string;
  platforms?: PlatformType;
  files?: FilesType;
};

export class HazelCache {
  config: HazelConfig;
  latest: LatestType;
  lastUpdate: number | null;
  constructor(config: HazelConfig) {
    const { account, repository, token, url } = config;
    this.config = config;

    if (!account || !repository) {
      throw new Error("Neither ACCOUNT, nor REPOSITORY are defined");
    }

    if (token && !url) {
      throw new Error(
        "Neither VERCEL_URL, nor URL are defined, which are mandatory for private repo mode",
      );
    }

    this.latest = {};
    this.lastUpdate = null;

    this.cacheReleaseList = this.cacheReleaseList.bind(this);
    this.refreshCache = this.refreshCache.bind(this);
    this.loadCache = this.loadCache.bind(this);
    this.isOutdated = this.isOutdated.bind(this);
  }

  async cacheReleaseList(url: string) {
    const { token } = this.config;
    const headers: RequestInit["headers"] = {
      Accept: "application/octet-stream",
    };

    if (token && typeof token === "string" && token.length > 0) {
      headers.Authorization = `token ${token}`;
    }

    const { body } = await retry(
      async () => {
        const response = await fetch(url, { headers });

        if (response.status !== 200) {
          throw new Error(
            `Tried to cache RELEASES, but failed fetching ${url}, status ${response.status}`,
          );
        }

        return response;
      },
      { retries: 3 },
    );

    const content = await convertStream(body);
    const matches = content.match(/[^ ]*\.nupkg/gim);

    if (!matches || matches.length === 0) {
      throw new Error(
        `Tried to cache RELEASES, but failed. RELEASES content doesn't contain nupkg`,
      );
    }

    return content;
  }

  async refreshCache() {
    const { account, repository, pre, token } = this.config;
    const repo = account + "/" + repository;
    const url = `https://api.github.com/repos/${repo}/releases?per_page=100`;
    const headers: RequestInit["headers"] = {
      Accept: "application/vnd.github.preview",
    };

    if (token && typeof token === "string" && token.length > 0) {
      headers.Authorization = `token ${token}`;
    }

    const response = await retry(
      async () => {
        const response = await fetch(url, { headers });

        if (response.status !== 200) {
          throw new Error(
            `GitHub API responded with ${response.status} for url ${url}`,
          );
        }

        return response;
      },
      { retries: 3 },
    );

    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      return;
    }

    const release = data.find((item) => {
      const isPre = Boolean(pre) === Boolean(item.prerelease);
      return !item.draft && isPre;
    });

    if (!release || !release.assets || !Array.isArray(release.assets)) {
      return;
    }

    const { tag_name } = release;

    if (this.latest.version === tag_name) {
      console.log("Cached version is the same as latest");
      this.lastUpdate = Date.now();
      return;
    }

    console.log(`Caching version ${tag_name}...`);

    this.latest.version = tag_name;
    this.latest.notes = release.body;
    this.latest.pub_date = release.published_at;

    // Clear list of download links
    this.latest.platforms = {};

    for (const asset of release.assets) {
      const { name, browser_download_url, url, content_type, size } = asset;

      if (name === "RELEASES") {
        try {
          if (!this.latest.files) this.latest.files = {};
          this.latest.files.RELEASES = await this.cacheReleaseList(url);
        } catch (err) {
          throw new Error("Failed to refresh RELEASES");
        }
        continue;
      }

      const platform = patchPlatform(name);

      if (!platform) {
        continue;
      }

      this.latest.platforms[platform] = {
        name,
        api_url: url,
        url: browser_download_url,
        content_type,
        size: Math.round((size / 1000000) * 10) / 10,
      };
    }

    console.log(`Finished caching version ${tag_name}`);
    this.lastUpdate = Date.now();
  }

  isOutdated() {
    try {
      const { lastUpdate, config } = this;
      const { interval = 15 } = config;

      if (lastUpdate && Date.now() - lastUpdate > ms(`${interval}m`)) {
        return true;
      }

      return false;
    } catch (err) {
      throw new Error("Failed to check if cache is outdated");
    }
  }

  // This is a method returning the cache
  // because the cache would otherwise be loaded
  // only once when the index file is parsed
  async loadCache() {
    try {
      const { latest, refreshCache, isOutdated, lastUpdate } = this;

      if (!lastUpdate || isOutdated()) {
        await refreshCache();
      }

      const storage = Object.assign({}, latest);
      console.log(storage);
      return storage;
    } catch (err) {
      throw new Error("Failed to load cache");
    }
  }
}

async function convertStream(
  stream: ReadableStream<Uint8Array> | null,
): Promise<string> {
  if (!stream) return "";
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let result = "";
  let done = false;
  while (!done) {
    const { done: readDone, value } = await reader.read();
    done = readDone;
    if (!done) {
      result += decoder.decode(value);
    }
  }
  return result;
}
