import fetch from "cross-fetch";
import { formatDistanceToNow } from "date-fns";
import expressUserAgent from "express-useragent";
import fs from "fs/promises";
import handlebars from "handlebars";
import type { IncomingMessage, ServerResponse } from "http";
import { RequestHandler, send } from "micro";
import path from "path";
import { compare, valid } from "semver";
import urlHelpers from "url";

import { HazelCache } from "./cache.js";
import { resolvePlatform } from "./utils.js";

type RequestHandlerProducer = (
  req: IncomingMessage,
  res: ServerResponse,
  options?: Record<string, string>,
) => unknown;

export interface Config {
  interval?: number;
  account?: string;
  repository?: string;
  pre?: string;
  token?: string;
  url?: string;
}

export function hazel(config: Config): RequestHandler {
  // Create a new cache instance
  const cache = new HazelCache(config);

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
        send(res, 400, "Bad Request");
        return;
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

      send(res, 404, "Not Found");
      return;
    } catch (err) {
      send(res, 500, "Internal Server Error");
      return;
    }
  };
}

function downloadHandler({
  cache,
  config,
}: {
  cache: HazelCache;
  config: Config;
}): RequestHandlerProducer {
  return async (req, res) => {
    const userAgent = expressUserAgent.parse(req.headers["user-agent"] || "");
    const params = urlHelpers.parse(req.url || "", true).query;
    const isUpdate = params && params.update;

    let resolvedPlatform;

    if (userAgent.isMac && isUpdate) {
      resolvedPlatform = "darwin";
    } else if (userAgent.isMac && !isUpdate) {
      resolvedPlatform = "dmg";
    } else if (userAgent.isWindows) {
      resolvedPlatform = "exe";
    }

    // Get the latest version from the cache
    const { platforms } = await cache.loadCache();

    if (!resolvedPlatform || !platforms || !platforms[resolvedPlatform]) {
      send(res, 404, "No download available for your platform!");
      return;
    }

    if (
      config.token &&
      typeof config.token === "string" &&
      config.token.length > 0
    ) {
      const asset = platforms[resolvedPlatform];
      proxyPrivateDownload(config.token, asset.api_url, res);
      return;
    }

    res.writeHead(302, {
      Location: platforms[resolvedPlatform].url,
    });

    res.end();
  };
}

function downloadPlatformHandler({
  cache,
  config,
}: {
  cache: HazelCache;
  config: Config;
}): RequestHandlerProducer {
  return async (req, res, options) => {
    if (!options) {
      send(res, 500, "No options provided");
      return;
    }

    const { platform } = options;

    const params = urlHelpers.parse(req.url || "", true).query;
    const isUpdate = params && params.update;

    let resolvedPlatform: string | null = platform;

    if (resolvedPlatform === "mac" && !isUpdate) {
      resolvedPlatform = "dmg";
    }

    if (resolvedPlatform === "mac_arm64" && !isUpdate) {
      resolvedPlatform = "dmg_arm64";
    }

    // Get the latest version from the cache
    const latest = await cache.loadCache();
    console.log("CACHE: ", latest);

    // Check platform for appropiate aliases
    resolvedPlatform = resolvePlatform(resolvedPlatform);

    if (!resolvedPlatform) {
      send(res, 500, "The specified platform is not valid");
      return;
    }

    if (!latest.platforms || !latest.platforms[resolvedPlatform]) {
      send(res, 404, "No download available for your platform");
      return;
    }

    if (
      config.token &&
      typeof config.token === "string" &&
      config.token.length > 0
    ) {
      const asset = latest.platforms[resolvedPlatform];
      if (!asset) return;
      proxyPrivateDownload(config.token, asset.api_url, res);
      return;
    }

    res.writeHead(302, {
      Location: latest.platforms[resolvedPlatform].url,
    });

    res.end();
  };
}

function updateHandler({
  cache,
  config,
}: {
  cache: HazelCache;
  config: Config;
}): RequestHandlerProducer {
  return async (req, res, options) => {
    if (!options) {
      send(res, 500, {
        error: "no_options",
        message: "No options provided",
      });

      return;
    }

    const { platform, version } = options;

    if (!valid(version)) {
      send(res, 500, {
        error: "version_invalid",
        message: "The specified version is not SemVer-compatible",
      });

      return;
    }

    const resolvedPlatform = resolvePlatform(platform);

    if (!resolvedPlatform) {
      send(res, 500, {
        error: "invalid_platform",
        message: "The specified platform is not valid",
      });

      return;
    }

    // Get the latest version from the cache
    const latest = await cache.loadCache();

    if (!latest.platforms || !latest.platforms[resolvedPlatform]) {
      res.statusCode = 204;
      res.end();

      return;
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
      compare(latest.version, version) !== 0
    ) {
      const { notes, pub_date } = latest;

      const patchedUrl = config.url.startsWith("https://")
        ? config.url
        : `https://${config.url}`;

      const responseData = {
        name: latest.version,
        notes,
        pub_date,
        url:
          config.token &&
          typeof config.token === "string" &&
          config.token.length > 0
            ? `${patchedUrl}/download/${resolvedPlatform}?update=true`
            : latest.platforms[resolvedPlatform].url,
      };

      console.log("RESPONSE DATA:", responseData);
      send(res, 200, responseData);

      return;
    }

    res.statusCode = 204;
    res.end();
  };
}

function updateWin32Handler({
  cache,
  config,
}: {
  cache: HazelCache;
  config: Config;
}): RequestHandlerProducer {
  return async (req, res, options) => {
    if (!options) {
      send(res, 500, {
        error: "no_options",
        message: "No options provided",
      });

      return;
    }

    const { filename } = options;

    // Get the latest version from the cache
    const latest = await cache.loadCache();

    if (filename.toLowerCase().startsWith("releases")) {
      if (!latest.files || !latest.files.RELEASES) {
        res.statusCode = 204;
        res.end();

        return;
      }

      const content = latest.files.RELEASES;
      console.log("RESPONSE DATA:", content);

      res.writeHead(200, {
        "content-length": Buffer.byteLength(content, "utf8"),
        "content-type": "application/octet-stream",
      });

      res.end(content);
    } else if (filename.toLowerCase().endsWith("nupkg")) {
      if (!latest.platforms || !latest.platforms["nupkg"]) {
        res.statusCode = 204;
        res.end();

        return;
      }

      const asset = latest.platforms["nupkg"];

      if (
        config.token &&
        typeof config.token === "string" &&
        config.token.length > 0
      ) {
        if (!asset) return;
        proxyPrivateDownload(config.token, asset.api_url, res);
        return;
      }

      res.writeHead(302, {
        Location: asset.url,
      });
      res.end();
    } else {
      res.statusCode = 400;
      res.end();
    }
  };
}

function overviewHandler({
  cache,
  config,
}: {
  cache: HazelCache;
  config: Config;
}): RequestHandlerProducer {
  return async (req, res) => {
    const latest = await cache.loadCache();

    try {
      const render = await prepareView();

      const details = {
        account: config.account,
        repository: config.repository,
        date: formatDistanceToNow(new Date(latest.pub_date || ""), {
          addSuffix: true,
        }),
        files: latest.platforms,
        version: latest.version,
        releaseNotes: `https://github.com/${config.account}/${config.repository}/releases/tag/${latest.version}`,
        allReleases: `https://github.com/${config.account}/${config.repository}/releases`,
        github: `https://github.com/${config.account}/${config.repository}`,
      };

      send(res, 200, render(details));
    } catch (err) {
      console.error(err);
      send(res, 500, "Error reading overview file");
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
    send(res, 500, "The asset URL is not valid");
    return;
  }
  res.setHeader("Location", location);
  send(res, 302);
}
