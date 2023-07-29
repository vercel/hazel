import retry from "async-retry";
import fetch from "cross-fetch";
import ms from "ms";

import type { Config } from "./index.js";
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
  config: Config;
  latest: LatestType = {};
  lastUpdate: number | null = null;

  constructor(config: Config) {
    this.config = { interval: 15, ...config };
    if (!config.account || !config.repository) {
      throw new Error("Neither ACCOUNT, nor REPOSITORY are defined");
    }
    if (config.token && !config.url) {
      throw new Error(
        "Neither VERCEL_URL, nor URL are defined, which are mandatory for private repo mode",
      );
    }
  }

  async cacheReleaseList(url: string) {
    try {
      const headers: RequestInit["headers"] = {
        Accept: "application/octet-stream",
      };

      if (
        this.config.token &&
        typeof this.config.token === "string" &&
        this.config.token.length > 0
      ) {
        headers.Authorization = `token ${this.config.token}`;
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
    } catch (err) {
      console.error("Failed to cache RELEASES", err);
      return "";
    }
  }

  async refreshCache() {
    try {
      const repo = this.config.account + "/" + this.config.repository;
      const url = `https://api.github.com/repos/${repo}/releases?per_page=100`;
      const headers: RequestInit["headers"] = {
        Accept: "application/vnd.github.preview",
      };

      if (
        this.config.token &&
        typeof this.config.token === "string" &&
        this.config.token.length > 0
      ) {
        headers.Authorization = `token ${this.config.token}`;
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
        const isPre = Boolean(this.config.pre) === Boolean(item.prerelease);
        return !item.draft && isPre;
      });

      if (!release || !release.assets || !Array.isArray(release.assets)) {
        return;
      }

      if (this.latest.version === release.tag_name) {
        console.log("Cached version is the same as latest");
        this.lastUpdate = Date.now();
        return;
      }

      console.log(`Caching version ${release.tag_name}...`);

      this.latest.version = release.tag_name;
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
            console.error("Failed to cache release list", err);
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

      console.log(`Finished caching version ${release.tag_name}`);
      this.lastUpdate = Date.now();
    } catch (err) {
      console.error("Failed to refresh cache", err);
    }
  }

  isOutdated() {
    try {
      if (
        this.lastUpdate &&
        Date.now() - this.lastUpdate > ms(`${this.config.interval}m`)
      ) {
        return true;
      }

      return false;
    } catch (err) {
      console.error("Failed to check if cache is outdated", err);
      return false;
    }
  }

  // This is a method returning the cache
  // because the cache would otherwise be loaded
  // only once when the index file is parsed
  async loadCache() {
    try {
      if (!this.lastUpdate || this.isOutdated()) await this.refreshCache();
      const storage = { ...this.latest };
      console.log(storage);
      return storage;
    } catch (err) {
      console.error("Failed to load cache", err);
      return { version: "", notes: "", pub_date: "", platforms: {}, files: {} };
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
