import retry from "async-retry";
import fetch from "cross-fetch";
import ms from "ms";

import type { Config } from "./index.js";
import { Platform, getPlatform } from "./utils.js";

interface Latest {
  version: string | null;
  notes: string | null;
  pubDate: string | null;
  platforms: Map<
    Platform,
    {
      name: string;
      api_url: string;
      url: string;
      content_type: string;
      size: number;
    }
  >;
  files: {
    RELEASES: string | null;
  };
}

export class CarrotCache {
  config: Config;
  latest: Latest = {
    version: null,
    notes: null,
    pubDate: null,
    platforms: new Map(),
    files: {
      RELEASES: null,
    },
  };
  lastUpdate: number | null = null;

  constructor(config: Config) {
    this.config = config;
    if (!config.account || !config.repository) {
      throw new Error("Neither ACCOUNT, nor REPOSITORY are defined");
    }
    if (config.token && !config.url) {
      throw new Error(
        "Neither VERCEL_URL, nor URL are defined, which are mandatory for private repo mode",
      );
    }
  }

  async cacheReleaseList(url: string): Promise<string | null> {
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

      const response = await retry(
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

      return await convertStream(response.body);
    } catch (err) {
      console.error("Failed to cache RELEASES", err);
      return null;
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
      this.latest.pubDate = release.published_at;

      // Clear list of download links
      this.latest.platforms = new Map();

      for (const asset of release.assets) {
        if (asset.name === "RELEASES") {
          try {
            this.latest.files.RELEASES = await this.cacheReleaseList(asset.url);
          } catch (err) {
            console.error("Failed to cache release list", err);
          }
          continue;
        }

        // Get platform and pacmanitecture from asset name
        const platformArch = getPlatform(asset.name);

        // Skip if platform is not supported
        if (!platformArch) continue;

        // Store download link
        this.latest.platforms.set(platformArch, {
          name: asset.name,
          api_url: asset.url,
          url: asset.browser_download_url,
          content_type: asset.content_type,
          size: Math.round((asset.size / 1000000) * 10) / 10,
        });
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
  async loadCache(): Promise<Latest> {
    try {
      if (!this.lastUpdate || this.isOutdated()) await this.refreshCache();
      const storage = { ...this.latest };
      console.log(storage);
      return storage;
    } catch (err) {
      console.error("Failed to load cache", err);
      const storage = {
        version: null,
        notes: null,
        pubDate: null,
        platforms: new Map(),
        files: { RELEASES: null },
      };
      console.log(storage);
      return storage;
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
    const readResult = await reader.read();
    done = readResult.done;
    if (!done) {
      result += decoder.decode(readResult.value);
    }
  }
  return result;
}
