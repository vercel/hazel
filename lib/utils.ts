import { extname } from "path";

const ALIASES: Record<string, string[]> = {
  darwin: ["mac", "macos", "osx"],
  exe: ["win32", "windows", "win"],
  deb: ["debian"],
  rpm: ["fedora"],
  AppImage: ["appimage"],
  dmg: ["dmg"],
  nupkg: ["nupkg"],
};

for (const [key, value] of Object.entries(ALIASES)) {
  ALIASES[`${key}_arm64`] = value.map((v) => `${v}_arm64`);
}

export function resolvePlatform(platform: string): string | null {
  for (const [key, value] of Object.entries(ALIASES)) {
    if (key === platform || value.includes(platform)) return key;
  }
  return null;
}

export function patchPlatform(fileName: string) {
  const extension = extname(fileName).slice(1);
  const arch =
    fileName.includes("arm64") || fileName.includes("aarch64") ? "_arm64" : "";

  if (
    (fileName.includes("mac") || fileName.includes("darwin")) &&
    extension === "zip"
  ) {
    return `darwin${arch}`;
  }

  const directCache = new Set([
    "exe",
    "dmg",
    "rpm",
    "deb",
    "AppImage",
    "nupkg",
  ]);

  return directCache.has(extension) ? `${extension}${arch}` : false;
}
