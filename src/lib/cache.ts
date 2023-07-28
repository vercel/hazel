import fetch from "cross-fetch";
import retry from "async-retry";
import ms from "ms";

import checkPlatform from "./platform.js";

async function convertStream(
  stream: ReadableStream<Uint8Array> | null,
): Promise<string> {
  if (!stream) {
    return "";
  }
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

export class CustomError extends Error {
  code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.code = code;
  }
}

class Cache {
  config: {
    interval?: string;
    account?: string;
    repository?: string;
    pre?: string;
    token?: string;
    url?: string;
  };
  latest: {
    notes?: string;
    pub_date?: string;
    version?: string;
    files?: {
      [key: string]: string;
    };
    platforms?: {
      [key: string]: {
        name: string;
        api_url: string;
        url: string;
        content_type: string;
        size: number;
      };
    };
  };
  lastUpdate: number | null;
  constructor(config: {
    interval?: string;
    account?: string;
    repository?: string;
    pre?: string;
    token?: string;
    url?: string;
  }) {
    const { account, repository, token, url } = config;
    this.config = config;

    if (!account || !repository) {
      const error = new CustomError(
        "Neither ACCOUNT, nor REPOSITORY are defined",
      );
      error.code = "missing_configuration_properties";
      throw error;
    }

    if (token && !url) {
      const error = new CustomError(
        "Neither VERCEL_URL, nor URL are defined, which are mandatory for private repo mode",
      );
      error.code = "missing_configuration_properties";
      throw error;
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
    const headers: { Accept?: string; Authorization?: string } = {
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

    if (matches?.length === 0) {
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
    const headers: { Accept?: string; Authorization?: string } = {
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
          if (!this.latest.files) {
            this.latest.files = {};
          }
          this.latest.files.RELEASES = await this.cacheReleaseList(url);
        } catch (err) {
          console.error(err);
        }
        continue;
      }

      const platform = checkPlatform(name);

      if (!platform) {
        continue;
      }

      const entry = {
        name,
        api_url: url,
        url: browser_download_url,
        content_type,
        size: Math.round((size / 1000000) * 10) / 10,
      };

      this.latest.platforms[platform] = entry;
    }

    console.log(`Finished caching version ${tag_name}`, this.latest);
    this.lastUpdate = Date.now();
  }

  isOutdated() {
    const { lastUpdate, config } = this;
    const { interval = 15 } = config;

    if (lastUpdate && Date.now() - lastUpdate > ms(`${interval}m`)) {
      return true;
    }

    return false;
  }

  // This is a method returning the cache
  // because the cache would otherwise be loaded
  // only once when the index file is parsed
  async loadCache() {
    const { latest, refreshCache, isOutdated, lastUpdate } = this;

    if (!lastUpdate || isOutdated()) {
      await refreshCache();
    }

    return Object.assign({}, latest);
  }
}

export default Cache;
