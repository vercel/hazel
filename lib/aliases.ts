const aliasMap: Record<string, string[]> = {
  darwin: ["mac", "macos", "osx"],
  exe: ["win32", "windows", "win"],
  deb: ["debian"],
  rpm: ["fedora"],
  AppImage: ["appimage"],
  dmg: ["dmg"],
  nupkg: ["nupkg"],
};

for (const [key, value] of Object.entries(aliasMap)) {
  aliasMap[`${key}_arm64`] = value.map((v) => `${v}_arm64`);
}

export function resolvePlatform(platform: string): string | null {
  for (const [key, value] of Object.entries(aliasMap)) {
    if (key === platform || value.includes(platform)) return key;
  }
  return null;
}
