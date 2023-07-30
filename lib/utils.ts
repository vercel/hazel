export type Extension =
  | "exe"
  | "nupkg"
  | "dmg"
  | "zip"
  | "deb"
  | "rpm"
  | "pacman"
  | "appimage"
  | "snap";

export type Architecture = "arm" | "arm64" | "ia32" | "x64" | "universal";

export type Platform = `${Extension}_${Architecture}`;

const archMap: Record<Architecture, RegExp> = {
  arm: /armv7l|armhf|armv7hl/,
  arm64: /arm64|aarch64/,
  ia32: /ia32/,
  x64: /x64|x86_64|amd64/,
  universal: /nupkg/,
};

const platformMap: Record<Extension, RegExp> = {
  exe: /\.exe$/,
  nupkg: /\.nupkg$/,
  dmg: /\.dmg$/,
  zip: /(mac|darwin|osx).*\.zip$/,
  deb: /\.deb$/,
  rpm: /\.rpm$/,
  pacman: /\.pacman$/,
  appimage: /\.AppImage$/,
  snap: /\.snap$/,
};

function getArchitecture(fileName: string): Architecture | null {
  for (const [arch, regex] of Object.entries(archMap)) {
    if (regex.test(fileName)) return arch as Architecture;
  }
  return null;
}

function getExtension(fileName: string): Extension | null {
  for (const [platform, regex] of Object.entries(platformMap)) {
    if (regex.test(fileName)) return platform as Extension;
  }
  return null;
}

export function getPlatform(fileName: string): Platform | false {
  if (!fileName) return false;

  const arch = getArchitecture(fileName);
  const platform = getExtension(fileName);

  if (arch && platform) return `${platform}_${arch}`;

  return false;
}

export function guessPlatform(
  platform: string,
  isUpdate = false,
): Platform | false {
  const commonAliases: Record<string, Platform> = {
    dmg: "dmg_x64",
    dmg_arm64: "dmg_arm64",
    "darwin-x64": !isUpdate ? "dmg_x64" : "zip_x64",
    "darwin-arm64": !isUpdate ? "dmg_arm64" : "zip_arm64",
    darwin: !isUpdate ? "dmg_x64" : "zip_x64",
    darwin_arm64: !isUpdate ? "dmg_arm64" : "zip_arm64",
    mac: !isUpdate ? "dmg_x64" : "zip_x64",
    mac_arm64: !isUpdate ? "dmg_arm64" : "zip_arm64",
    macos: !isUpdate ? "dmg_x64" : "zip_x64",
    macos_arm64: !isUpdate ? "dmg_arm64" : "zip_arm64",
    osx: !isUpdate ? "dmg_x64" : "zip_x64",
    osx_arm64: !isUpdate ? "dmg_arm64" : "zip_arm64",
    win32: !isUpdate ? "exe_x64" : "nupkg_universal",
    "win32-x64": !isUpdate ? "exe_x64" : "nupkg_universal",
    "win32-ia32": !isUpdate ? "exe_ia32" : "nupkg_universal",
    "win32-arm64": !isUpdate ? "exe_arm64" : "nupkg_universal",
    win32_arm64: !isUpdate ? "exe_arm64" : "nupkg_universal",
    win: !isUpdate ? "exe_x64" : "nupkg_universal",
    win_arm64: !isUpdate ? "exe_arm64" : "nupkg_universal",
    windows: !isUpdate ? "exe_x64" : "nupkg_universal",
    windows_arm64: !isUpdate ? "exe_arm64" : "nupkg_universal",
    deb: "deb_x64",
    deb_arm64: "deb_arm64",
    debian: "deb_x64",
    debian_arm64: "deb_arm64",
    fedora: "rpm_x64",
    fedora_arm64: "rpm_arm64",
    AppImage: "appimage_x64",
    AppImage_arm64: "appimage_arm64",
    nupkg: "nupkg_universal",
    nupkg_arm64: "nupkg_universal",
  };

  return commonAliases[platform] || false;
}
