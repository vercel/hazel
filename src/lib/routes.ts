import urlHelpers from "url";
import { send } from "micro";
import { valid, compare } from "semver";
import expressUserAgent from "express-useragent";
import fetch from "cross-fetch";
import { formatDistanceToNow } from "date-fns";

import checkAlias from "./aliases.js";
import prepareView from "./view.js";
import type Cache from "./cache.js";

const routes = ({
  cache,
  config,
}: {
  cache: Cache;
  config: {
    interval?: string;
    account?: string;
    repository?: string;
    pre?: string;
    token?: string;
    url?: string;
  };
}) => {
  const { loadCache } = cache;
  const { token, url } = config;
  const shouldProxyPrivateDownload =
    token && typeof token === "string" && token.length > 0;

  // Helpers
  const proxyPrivateDownload = (asset, req, res) => {
    const redirect = "manual";
    const headers = {
      Accept: "application/octet-stream",
      Authorization: `Bearer ${token}`,
    };
    const options: RequestInit = { headers, redirect };
    const { api_url: apiUrl } = asset;

    fetch(apiUrl, options).then((assetRes) => {
      res.setHeader("Location", assetRes.headers.get("Location"));
      send(res, 302);
    });
  };

  const download = async (req, res) => {
    const userAgent = expressUserAgent.parse(req.headers["user-agent"]);
    const params = urlHelpers.parse(req.url, true).query;
    const isUpdate = params && params.update;

    let platform;

    if (userAgent.isMac && isUpdate) {
      platform = "darwin";
    } else if (userAgent.isMac && !isUpdate) {
      platform = "dmg";
    } else if (userAgent.isWindows) {
      platform = "exe";
    }

    // Get the latest version from the cache
    const { platforms } = await loadCache();

    if (!platform || !platforms || !platforms[platform]) {
      send(res, 404, "No download available for your platform!");
      return;
    }

    if (shouldProxyPrivateDownload) {
      proxyPrivateDownload(platforms[platform], req, res);
      return;
    }

    res.writeHead(302, {
      Location: platforms[platform].url,
    });

    res.end();
  };

  const downloadPlatform = async (req, res) => {
    const params = urlHelpers.parse(req.url, true).query;
    const isUpdate = params && params.update;

    let { platform } = req.params;

    if (platform === "mac" && !isUpdate) {
      platform = "dmg";
    }

    if (platform === "mac_arm64" && !isUpdate) {
      platform = "dmg_arm64";
    }

    // Get the latest version from the cache
    const latest = await loadCache();
    console.log("CACHE: ", latest);

    // Check platform for appropiate aliases
    platform = checkAlias(platform);

    if (!platform) {
      send(res, 500, "The specified platform is not valid");
      return;
    }

    if (!latest.platforms || !latest.platforms[platform]) {
      send(res, 404, "No download available for your platform");
      return;
    }

    if (token && typeof token === "string" && token.length > 0) {
      proxyPrivateDownload(latest.platforms[platform], req, res);
      return;
    }

    res.writeHead(302, {
      Location: latest.platforms[platform].url,
    });

    res.end();
  };

  const update = async (req, res) => {
    const { platform: platformName, version } = req.params;

    if (!valid(version)) {
      send(res, 500, {
        error: "version_invalid",
        message: "The specified version is not SemVer-compatible",
      });

      return;
    }

    const platform = checkAlias(platformName);

    if (!platform) {
      send(res, 500, {
        error: "invalid_platform",
        message: "The specified platform is not valid",
      });

      return;
    }

    // Get the latest version from the cache
    const latest = await loadCache();

    if (!latest.platforms || !latest.platforms[platform]) {
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

    if (compare(latest.version, version) !== 0) {
      const { notes, pub_date } = latest;

      const patchedUrl = url.startsWith("https://") ? url : `https://${url}`;

      const responseData = {
        name: latest.version,
        notes,
        pub_date,
        url: shouldProxyPrivateDownload
          ? `${patchedUrl}/download/${platformName}?update=true`
          : latest.platforms[platform].url,
      };

      console.log("RESPONSE DATA:", responseData);
      send(res, 200, responseData);

      return;
    }

    res.statusCode = 204;
    res.end();
  };

  const squirrelWindows = async (req, res) => {
    const { filename } = req.params;
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
        proxyPrivateDownload(nupkgAsset, req, res);
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

  const overview = async (req, res) => {
    const latest = await loadCache();

    try {
      const render = await prepareView();

      const details = {
        account: config.account,
        repository: config.repository,
        date: formatDistanceToNow(new Date(latest.pub_date), {
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

export default routes;
