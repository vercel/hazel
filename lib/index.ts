import fetch from "cross-fetch";
import { formatDistanceToNow } from "date-fns";
import expressUserAgent from "express-useragent";
import fs from "fs/promises";
import handlebars from "handlebars";
import type { IncomingMessage, ServerResponse } from "http";
import { RequestHandler, send } from "micro";
import path from "path";
import { compare, valid } from "semver";
import { parse } from "url";

import { CarrotCache } from "./cache.js";
import { Platform, getPlatform, guessPlatform } from "./utils.js";

type RequestHandlerProducer = (
  req: IncomingMessage,
  res: ServerResponse,
  options?: Record<string, string>,
) => unknown;

export interface Config {
  interval?: string;
  account?: string;
  repository?: string;
  pre?: string;
  token?: string;
  url?: string;
}

export function carrots(config: Config): RequestHandler {
  // Create a new cache instance
  const cache = new CarrotCache(config);

  // Set up routes and handlers
  const routes = [
    {
      path: "/",
      handler: overviewHandler({ cache, config }),
    },
    {
      path: "/download",
      handler: downloadHandler({ cache, config }),
    },
    {
      path: "/download/:platform",
      handler: downloadPlatformHandler({ cache, config }),
    },
    {
      path: "/update/:platform/:version",
      handler: updateHandler({ cache, config }),
    },
    {
      path: "/update/win32/:version/:filename",
      handler: updateWin32Handler({ cache, config }),
    },
  ];

  // Handle requests
  return (req: IncomingMessage, res: ServerResponse) => {
    try {
      if (!req.url) {
        return send(res, 400, "Bad Request");
      }

      const paths = req.url.split("/").filter(Boolean);

      for (const route of routes) {
        const routePaths = route.path.split("/").filter(Boolean);

        if (paths.length !== routePaths.length) {
          continue;
        }

        const match = routePaths.every((routePath, index) => {
          if (routePath.startsWith(":")) {
            return true;
          }
          return routePath === paths[index];
        });

        if (match) {
          const params: Record<string, string> = {};

          routePaths.forEach((routePath, index) => {
            if (routePath.startsWith(":")) {
              const param = routePath.slice(1);
              params[param] = paths[index];
            }
          });

          route.handler(req, res, params);
          return;
        }
      }

      return send(res, 404, "Not Found");
    } catch (err) {
      return send(res, 500, "Internal Server Error");
    }
  };
}

function downloadHandler({
  cache,
  config,
}: {
  cache: CarrotCache;
  config: Config;
}): RequestHandlerProducer {
  return async (req, res) => {
    const params = parse(req.url || "", true).query;
    const isUpdate = params && params.update;
    const userAgent = expressUserAgent.parse(req.headers["user-agent"] || "");

    let platform: Platform | null = null;

    // Best guess for platform based on user agent
    if (userAgent.isMac) {
      if (isUpdate) {
        platform = "zip_arm64";
      } else {
        platform = "dmg_arm64";
      }
    } else if (userAgent.isWindows) {
      if (isUpdate) {
        platform = "nupkg_x64";
      } else {
        platform = "exe_x64";
      }
    }

    const { platforms } = await cache.loadCache();

    if (!platform || !platforms || !platforms.has(platform)) {
      return send(res, 404, "No download available for your platform!");
    }

    const asset = platforms.get(platform);

    if (!asset) {
      return send(res, 404, "No download available for your platform!");
    }

    if (
      config.token &&
      typeof config.token === "string" &&
      config.token.length > 0
    ) {
      return proxyPrivateDownload(config.token, asset.api_url, res);
    }

    return send(res, 302, { Location: asset.url });
  };
}

function downloadPlatformHandler({
  cache,
  config,
}: {
  cache: CarrotCache;
  config: Config;
}): RequestHandlerProducer {
  return async (req, res, options) => {
    if (!options) {
      return send(res, 400, "No options provided");
    }
    if (!options.platform) {
      return send(res, 400, "No platform provided");
    }

    const params = parse(req.url || "", true).query;

    // Get the platform from the user input platform
    let platform = getPlatform(options.platform);

    // If the platform is not valid, try to guess it
    if (!platform) {
      platform = guessPlatform(options.platform, !!params?.update);
    }

    if (!platform) {
      return send(res, 400, "The specified platform is not valid");
    }

    // Get the latest version from the cache
    const latest = await cache.loadCache();
    console.log("CACHE: ", latest);

    if (!latest.platforms || !latest.platforms.has(platform)) {
      return send(res, 404, "No download available for your platform");
    }

    const asset = latest.platforms.get(platform);

    if (!asset) {
      return send(res, 404, "No download available for your platform");
    }

    if (
      config.token &&
      typeof config.token === "string" &&
      config.token.length > 0
    ) {
      proxyPrivateDownload(config.token, asset.api_url, res);
      return;
    }

    return send(res, 302, { Location: asset.url });
  };
}

function updateHandler({
  cache,
  config,
}: {
  cache: CarrotCache;
  config: Config;
}): RequestHandlerProducer {
  return async (req, res, options) => {
    if (!options) {
      return send(res, 400, "No options provided");
    }

    if (!valid(options.version)) {
      return send(res, 400, "The specified version is not SemVer-compatible");
    }

    const platform = getPlatform(options.platform);

    if (!platform) {
      return send(res, 400, "The specified platform is not valid");
    }

    // Get the latest version from the cache
    const latest = await cache.loadCache();

    if (!latest.platforms || !latest.platforms.has(platform)) {
      return send(res, 204, "No updates available");
    }

    // Previously, we were checking if the latest version is
    // greater than the one on the client. However, we
    // only need to compare if they're different (even if
    // lower) in order to trigger an update.

    // This allows developers to downgrade their users
    // to a lower version in the case that a major bug happens
    // that will take a long time to fix and release
    // a patch update.

    if (
      latest.version &&
      config.url &&
      compare(latest.version, options.version) !== 0
    ) {
      const httpsUrl = config.url.startsWith("https://")
        ? config.url
        : `https://${config.url}`;

      if (
        config.token &&
        typeof config.token === "string" &&
        config.token.length > 0
      ) {
        const responseData = {
          name: latest.version,
          notes: latest.notes,
          pub_date: latest.pubDate,
          url: `${httpsUrl}/download/${platform}?update=true`,
        };

        console.log("RESPONSE DATA:", responseData);
        return send(res, 200, responseData);
      }

      const asset = latest.platforms.get(platform);

      if (!asset) {
        return send(res, 204, "No updates available");
      }

      const responseData = {
        name: latest.version,
        notes: latest.notes,
        pub_date: latest.pubDate,
        url: asset.url,
      };

      console.log("RESPONSE DATA:", responseData);
      return send(res, 200, responseData);
    }

    return send(res, 204, "No updates available");
  };
}

function updateWin32Handler({
  cache,
  config,
}: {
  cache: CarrotCache;
  config: Config;
}): RequestHandlerProducer {
  return async (req, res, options) => {
    if (!options) {
      return send(res, 500, "No options provided");
    }

    const { filename } = options;

    // Get the latest version from the cache
    const latest = await cache.loadCache();

    if (filename.toLowerCase().startsWith("releases")) {
      if (!latest.files || !latest.files.RELEASES) {
        return send(res, 204, "No RELEASES file available");
      }

      const content = latest.files.RELEASES;
      console.log("RESPONSE DATA:", content);

      return send(res, 200, content);
    } else if (filename.toLowerCase().endsWith("nupkg")) {
      if (!latest.platforms || !latest.platforms.has("nupkg_universal")) {
        return send(res, 204, "No nupkg available");
      }

      const asset = latest.platforms.get("nupkg_universal");

      if (!asset) {
        return send(res, 204, "No nupkg asset available");
      }

      if (
        config.token &&
        typeof config.token === "string" &&
        config.token.length > 0
      ) {
        return proxyPrivateDownload(config.token, asset.api_url, res);
      }

      return send(res, 302, { Location: asset.url });
    } else {
      return send(res, 400, "Invalid filename");
    }
  };
}

function overviewHandler({
  cache,
  config,
}: {
  cache: CarrotCache;
  config: Config;
}): RequestHandlerProducer {
  return async (req, res) => {
    const latest = await cache.loadCache();

    try {
      const render = await prepareView();

      const files: {
        [key: string]: {
          name: string;
          api_url: string;
          url: string;
          content_type: string;
          size: number;
        };
      } = {};

      for (const [key, value] of latest.platforms) {
        files[key] = value;
      }

      const details: {
        account: string;
        repository: string;
        date: string;
        files: {
          [key: string]: {
            name: string;
            api_url: string;
            url: string;
            content_type: string;
            size: number;
          };
        };
        version: string;
        releaseNotes: string;
        allReleases: string;
        github: string;
      } = {
        account: config.account || "",
        repository: config.repository || "",
        date: formatDistanceToNow(new Date(latest.pubDate || ""), {
          addSuffix: true,
        }),
        files,
        version: latest.version || "",
        releaseNotes: `https://github.com/${config.account}/${config.repository}/releases/tag/${latest.version}`,
        allReleases: `https://github.com/${config.account}/${config.repository}/releases`,
        github: `https://github.com/${config.account}/${config.repository}`,
      };

      return send(res, 200, render(details));
    } catch (err) {
      console.error(err);
      return send(res, 500, "Error reading overview file");
    }
  };
}

async function prepareView() {
  const viewPath = path.join(process.cwd(), "views", "index.hbs");
  const viewContent = await fs.readFile(viewPath, "utf8");
  return handlebars.compile(viewContent);
}

async function proxyPrivateDownload(
  token: string,
  apiUrl: string,
  res: ServerResponse,
) {
  const redirect = "manual";
  const headers = {
    Accept: "application/octet-stream",
    Authorization: `Bearer ${token}`,
  };
  const options: RequestInit = { headers, redirect };
  const assetRes = await fetch(apiUrl, options);
  const location = assetRes.headers.get("Location");
  if (!location) {
    return send(res, 500, "The asset URL is not valid");
  }
  return send(res, 302, { Location: location });
}
