type AliasMap = {
  [key: string]: string[];
};

const ALIASES: AliasMap = {
  darwin: ["mac", "macos", "osx"],
  exe: ["win32", "windows", "win"],
  deb: ["debian"],
  rpm: ["fedora"],
  AppImage: ["appimage"],
  dmg: ["dmg"],
  nupkg: ["nupkg"],
};

const keys = Object.keys(ALIASES);
for (const existingPlatform of keys) {
  const newPlatform = `${existingPlatform}_arm64`;
  ALIASES[newPlatform] = ALIASES[existingPlatform].map(
    (alias) => `${alias}_arm64`,
  );
}

export const checkAlias = (platform: string): string | null => {
  if (ALIASES[platform] !== undefined) {
    return platform;
  }

  for (const guess of keys) {
    const list = ALIASES[guess];
    if (list.includes(platform)) {
      return guess;
    }
  }

  return null;
};
