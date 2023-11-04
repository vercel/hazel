import http from "http";
import path from "path";
import semver from "semver";
import fs from "fs/promises";
import Router from "find-my-way";
import Handlebars from "handlebars";
import { formatDistanceToNow } from "date-fns";

const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes in milliseconds

type Config = {
  interval?: string;
  account?: string;
  repository?: string;
  pre?: string;
  token?: string;
  url?: string;
};

type PlatformAssets = {
  date: string;
  name: string;
  version: string;
  url: string;
  notes: string;
  api_url: string;
  content_type: string;
  size: number;
  RELEASES?: string;
};

enum Platform {
  APPIMAGE_ARM64 = "appimage-arm64",
  APPIMAGE_X64 = "appimage-x64",
  DARWIN_ARM64 = "darwin-arm64",
  DARWIN_X64 = "darwin-x64",
  DMG_ARM64 = "dmg-arm64",
  DMG_X64 = "dmg-x64",
  DEBIAN_ARM64 = "deb-arm64",
  DEBIAN_X64 = "deb-x64",
  REDHAT_ARM64 = "rpm-arm64",
  REDHAT_X64 = "rpm-x64",
  WIN32_ARM64 = "win32-arm64",
  WIN32_IA32 = "win32-ia32",
  WIN32_X64 = "win32-x64",
  SNAP_ARM64 = "snap-arm64",
  SNAP_X64 = "snap-x64",
}

function requestToPlatform(platformRaw: string): Platform | null {
  const platform = platformRaw.toLowerCase().replace(/_/g, "-");
  if (platform === "appimage-arm64") return Platform.APPIMAGE_ARM64;
  if (platform === "appimage") return Platform.APPIMAGE_X64;
  if (platform === "darwin-arm64") return Platform.DARWIN_ARM64;
  if (platform === "darwin") return Platform.DARWIN_X64;
  if (platform === "deb-arm64") return Platform.DEBIAN_ARM64;
  if (platform === "deb") return Platform.DEBIAN_X64;
  if (platform === "debian") return Platform.DEBIAN_X64;
  if (platform === "dmg-arm64") return Platform.DMG_ARM64;
  if (platform === "dmg") return Platform.DMG_X64;
  if (platform === "exe") return Platform.WIN32_X64;
  if (platform === "fedora") return Platform.REDHAT_X64;
  if (platform === "mac") return Platform.DARWIN_X64;
  if (platform === "macos") return Platform.DARWIN_X64;
  if (platform === "osx") return Platform.DARWIN_X64;
  if (platform === "rpm-arm64") return Platform.REDHAT_ARM64;
  if (platform === "rpm") return Platform.REDHAT_X64;
  if (platform === "win") return Platform.WIN32_X64;
  if (platform === "win32") return Platform.WIN32_X64;
  if (platform === "windows") return Platform.WIN32_X64;
  if (platform === "win64") return Platform.WIN32_X64;
  if (platform === "x64") return Platform.WIN32_X64;
  if (platform === "x86") return Platform.WIN32_IA32;
  if (platform === "snap-arm64") return Platform.SNAP_ARM64;
  if (platform === "snap") return Platform.SNAP_X64;
  if (platform === "linux") return Platform.SNAP_X64;
  return null;
}

const filenameToPlatform = (fileName: string): Platform | null => {
  const lowerFileName = fileName.toLowerCase();

  if (lowerFileName.endsWith(".dmg")) {
    if (
      lowerFileName.includes("darwin-arm") ||
      lowerFileName.includes("mac-arm") ||
      lowerFileName.includes("osx-arm")
    ) {
      return Platform.DMG_ARM64;
    }
    if (
      lowerFileName.includes("darwin") ||
      lowerFileName.includes("mac") ||
      lowerFileName.includes("osx")
    ) {
      return Platform.DMG_X64;
    }
  }

  if (lowerFileName.endsWith(".zip")) {
    if (
      lowerFileName.includes("darwin-arm") ||
      lowerFileName.includes("mac-arm") ||
      lowerFileName.includes("osx-arm")
    ) {
      return Platform.DARWIN_ARM64;
    }
    if (
      lowerFileName.includes("darwin") ||
      lowerFileName.includes("mac") ||
      lowerFileName.includes("osx")
    ) {
      return Platform.DARWIN_X64;
    }
  }

  if (lowerFileName.includes("win32-ia32")) {
    return Platform.WIN32_IA32;
  }

  if (lowerFileName.includes("win32-x64")) {
    return Platform.WIN32_X64;
  }

  if (lowerFileName.includes("win32-arm64")) {
    return Platform.WIN32_ARM64;
  }

  if (lowerFileName.endsWith(".deb") || lowerFileName.endsWith(".rpm")) {
    if (lowerFileName.includes("arm64") || lowerFileName.includes("aarch64")) {
      return lowerFileName.endsWith(".deb")
        ? Platform.DEBIAN_ARM64
        : Platform.REDHAT_ARM64;
    } else {
      return lowerFileName.endsWith(".deb")
        ? Platform.DEBIAN_X64
        : Platform.REDHAT_X64;
    }
  }

  if (lowerFileName.endsWith(".appimage")) {
    return lowerFileName.includes("arm64") || lowerFileName.includes("aarch64")
      ? Platform.APPIMAGE_ARM64
      : Platform.APPIMAGE_X64;
  }

  if (lowerFileName.endsWith(".snap")) {
    return lowerFileName.includes("arm64") || lowerFileName.includes("aarch64")
      ? Platform.SNAP_ARM64
      : Platform.SNAP_X64;
  }

  // Special case handling: Default x64 windows asset
  if (
    lowerFileName.endsWith(".exe") &&
    !lowerFileName.includes("arm") &&
    !lowerFileName.includes("ia32")
  ) {
    return Platform.WIN32_X64;
  }

  return null;
};

async function fetchLatestRelease(
  config: Config
): Promise<Map<Platform, PlatformAssets> | null> {
  const latest = new Map<Platform, PlatformAssets>();
  const indexes = new Map<string, string>();

  const account = encodeURIComponent(config.account || "");
  const repository = encodeURIComponent(config.repository || "");
  const url = `https://api.github.com/repos/${account}/${repository}/releases?per_page=100`;
  const headers: HeadersInit = { Accept: "application/vnd.github.preview" };
  if (config.token) headers.Authorization = `token ${config.token}`;
  const releasesResponse = await fetch(url, { headers });

  if (releasesResponse.status === 403) {
    console.error("Rate Limited!");
    return null;
  }

  if (releasesResponse.status >= 400) {
    return null;
  }

  const releases = await releasesResponse.json();

  for (const release of releases) {
    if (
      !(!semver.valid(release.tag_name) || release.draft || release.prerelease)
    ) {
      for (const asset of release.assets) {
        if (asset.name === "RELEASES") {
          // Store in indexes
          indexes.set(release.tag_name, asset.url);
        } else {
          // Store in latest
          const platform = filenameToPlatform(asset.name);
          if (platform && !latest.has(platform)) {
            latest.set(platform, {
              name: release.name,
              notes: release.body,
              version: release.tag_name,
              date: release.published_at,
              url: asset.browser_download_url,
              api_url: asset.url,
              content_type: asset.content_type,
              size: Math.round((asset.size / 1000000) * 10) / 10,
            });
          }
        }
      }
    }
  }

  for (const key of [
    Platform.WIN32_X64,
    Platform.WIN32_IA32,
    Platform.WIN32_ARM64,
  ]) {
    const asset = latest.get(key);
    if (asset && indexes.has(asset.version)) {
      const indexURL = indexes.get(asset.version) || "";
      const indexResponse = await fetch(indexURL, {
        headers: {
          Accept: "application/octet-stream",
          ...(config.token ? { Authorization: `Bearer ${config.token}` } : {}),
        },
      });
      const content = await indexResponse.text();
      asset.RELEASES = content;
    }
  }

  return latest;
}

function createCache(config: Config) {
  let cachedLatest: Map<Platform, PlatformAssets> | null = null;
  let lastUpdated: number = 0;

  const getLatest = async () => {
    const now = Date.now();

    if (!cachedLatest || now - lastUpdated > CACHE_DURATION) {
      cachedLatest = await fetchLatestRelease(config);
      lastUpdated = now;
    }

    return cachedLatest;
  };

  return getLatest;
}

async function carrots(config: Config) {
  const router = Router();
  const getLatest = createCache(config);

  async function updateCache(res: http.ServerResponse) {
    let latest: Map<Platform, PlatformAssets> | null = null;
    let platforms: Platform[] = [];
    let version: string | undefined = "";
    let date: string | undefined = "";

    try {
      latest = await getLatest();
      if (latest) {
        platforms = Array.from(latest.keys());
        version = latest.get(platforms[0])?.version;
        date = latest.get(platforms[0])?.date;
      }
    } catch (e) {
      console.error(e);
      res.statusCode = 500;
      res.end("Failed to fetch latest releases");
      return { latest, platforms, version, date };
    }

    return { latest, platforms, version, date };
  }

  // Overview of all downloads
  router.get("/", async (req, res, params) => {
    const { latest, platforms, version, date } = await updateCache(res);
    if (!latest) {
      res.statusCode = 500;
      res.end("Failed to fetch latest releases");
      return;
    }

    // Render page
    const filepath = path.join(process.cwd(), "lib", "index.hbs");
    const filecontent = await fs.readFile(filepath, "utf8");
    const template = Handlebars.compile(filecontent);
    const html = template({
      account: config.account,
      repository: config.repository,
      date: date
        ? formatDistanceToNow(new Date(date), { addSuffix: true })
        : "",
      files: platforms,
      version: version,
      releaseNotes: `https://github.com/${config.account}/${config.repository}/releases/tag/${version}`,
      allReleases: `https://github.com/${config.account}/${config.repository}/releases`,
      github: `https://github.com/${config.account}/${config.repository}`,
    });

    // Send response
    res.statusCode = 200;
    res.setHeader("Content-Type", "text/html");
    res.end(html);
    return;
  });

  // Redirect to download latest release
  router.get("/download/:platform", async (req, res, params) => {
    const { latest, platforms, version, date } = await updateCache(res);
    if (!latest) {
      res.statusCode = 500;
      res.end("Failed to fetch latest releases");
      return;
    }

    // Parse platform
    if (!params.platform) {
      res.statusCode = 400;
      res.end("Missing platform");
      return;
    }
    const resolvedPlatform = requestToPlatform(params.platform);
    const isPlatform = latest.has(resolvedPlatform as Platform);
    if (!isPlatform) {
      res.statusCode = 400;
      res.end("Invalid platform");
      return;
    }

    // Get latest version
    const asset = latest.get(resolvedPlatform as Platform);
    if (!asset) {
      res.statusCode = 400;
      res.end("Invalid platform");
      return;
    }

    // Proxy the download
    const assetRes = await fetch(asset.api_url, {
      headers: {
        Accept: "application/octet-stream",
        ...(config.token ? { Authorization: `Bearer ${config.token}` } : {}),
      },
      redirect: "manual",
    });
    res.statusCode = 302;
    res.setHeader("Location", assetRes.headers.get("Location") || "");
    res.end();
    return;
  });

  // Electron.autoUpdater
  router.get("/update/:platform/:version/:file?", async (req, res, params) => {
    const { latest, platforms, version, date } = await updateCache(res);
    if (!latest) {
      res.statusCode = 500;
      res.end("Failed to fetch latest releases");
      return;
    }

    // Parse platform
    if (!params.platform) {
      res.statusCode = 400;
      res.end("Missing platform");
      return;
    }
    const resolvedPlatform = requestToPlatform(params.platform);
    const isPlatform = latest.has(resolvedPlatform as Platform);
    if (!isPlatform) {
      res.statusCode = 400;
      res.end("Invalid platform");
      return;
    }
    const validPlatform = resolvedPlatform as Platform;

    // Parse version
    if (!params.version) {
      res.statusCode = 400;
      res.end("Missing version");
      return;
    }
    const isVersion = semver.valid(params.version);
    if (!isVersion) {
      res.statusCode = 400;
      res.end("Invalid version");
      return;
    }

    // Get latest version
    const asset = latest.get(validPlatform);
    if (!asset) {
      res.statusCode = 400;
      res.end("Invalid platform");
      return;
    }

    // Upgrade or Downgrade(!) to the 'latest version' on the server
    const isLatestVersion = semver.eq(params.version, asset.version);
    if (isLatestVersion) {
      res.statusCode = 204;
      res.end();
      return;
    }

    // Windows update
    if (params.file?.toUpperCase() === "RELEASES") {
      if (!asset || !asset.RELEASES) {
        // not found
        res.statusCode = 204;
        res.end();
        return;
      }

      res.statusCode = 200;
      res.setHeader(
        "content-length",
        Buffer.byteLength(asset.RELEASES, "utf8")
      );
      res.setHeader("content-type", "application/octet-stream");
      res.end(asset.RELEASES);
      return;
    }

    // Proxy the update
    const assetRes = await fetch(asset.api_url, {
      headers: {
        Accept: "application/octet-stream",
        ...(config.token ? { Authorization: `Bearer ${config.token}` } : {}),
      },
      redirect: "manual",
    });
    res.statusCode = 302;
    res.setHeader("Location", assetRes.headers.get("Location") || "");
    res.end();
    return;
  });

  // Get latest release version tag
  router.get("/api/semver", async (req, res, params) => {
    const { latest, platforms, version, date } = await updateCache(res);
    if (!latest) {
      res.statusCode = 500;
      res.end("Failed to fetch latest releases");
      return;
    }

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ version }));
  });

  return async (
    req: http.IncomingMessage,
    res: http.ServerResponse<http.IncomingMessage>
  ) => {
    router.lookup(req, res);
  };
}

export default carrots;
