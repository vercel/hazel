import fetch from "cross-fetch";
import { formatDistanceToNow } from "date-fns";
import expressUserAgent from "express-useragent";
import type { IncomingMessage, ServerResponse } from "http";
import { send } from "micro";
import { compare, valid } from "semver";
import urlHelpers from "url";

import { resolvePlatform } from "./aliases.js";
import type { Cache, Platform } from "./cache.js";
import type { Config, RouteHandler } from "./index.js";
import { prepareView } from "./view.js";

function proxyPrivateDownload(
  token: string,
  asset: Platform,
  req: IncomingMessage,
  res: ServerResponse,
) {
  const redirect = "manual";
  const headers = {
    Accept: "application/octet-stream",
    Authorization: `Bearer ${token}`,
  };
  const options: RequestInit = { headers, redirect };
  const { api_url: apiUrl } = asset;

  fetch(apiUrl, options).then((assetRes) => {
    const location = assetRes.headers.get("Location");
    if (!location) {
      send(res, 500, "The asset URL is not valid");
      return;
    }
    res.setHeader("Location", location);
    send(res, 302);
  });
}

export const generateRequestHandlers = ({
  cache,
  config,
}: {
  cache: Cache;
  config: Config;
}) => {
  const { loadCache } = cache;
  const { token, url } = config;
  const shouldProxyPrivateDownload =
    token && typeof token === "string" && token.length > 0;

  const download: RouteHandler = async (req, res) => {
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
    const { platforms } = await loadCache();

    if (!resolvedPlatform || !platforms || !platforms[resolvedPlatform]) {
      send(res, 404, "No download available for your platform!");
      return;
    }

    if (shouldProxyPrivateDownload) {
      proxyPrivateDownload(token, platforms[resolvedPlatform], req, res);
      return;
    }

    res.writeHead(302, {
      Location: platforms[resolvedPlatform].url,
    });

    res.end();
  };

  const downloadPlatform: RouteHandler = async (req, res, options) => {
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
    const latest = await loadCache();
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

    if (token && typeof token === "string" && token.length > 0) {
      proxyPrivateDownload(token, latest.platforms[resolvedPlatform], req, res);
      return;
    }

    res.writeHead(302, {
      Location: latest.platforms[resolvedPlatform].url,
    });

    res.end();
  };

  const update: RouteHandler = async (req, res, options) => {
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
    const latest = await loadCache();

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

    if (latest.version && url && compare(latest.version, version) !== 0) {
      const { notes, pub_date } = latest;

      const patchedUrl = url.startsWith("https://") ? url : `https://${url}`;

      const responseData = {
        name: latest.version,
        notes,
        pub_date,
        url: shouldProxyPrivateDownload
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

  const squirrelWindows: RouteHandler = async (req, res, options) => {
    const { filename } = options;

    // Get the latest version from the cache
    const latest = await loadCache();

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

      const nupkgAsset = latest.platforms["nupkg"];

      if (shouldProxyPrivateDownload) {
        proxyPrivateDownload(token, nupkgAsset, req, res);
        return;
      }

      res.writeHead(302, {
        Location: nupkgAsset.url,
      });
      res.end();
    } else {
      res.statusCode = 400;
      res.end();
    }
  };

  const overview: RouteHandler = async (req, res) => {
    const latest = await loadCache();

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

  return {
    download,
    downloadPlatform,
    update,
    squirrelWindows,
    overview,
  };
};
