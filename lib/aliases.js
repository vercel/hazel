const aliases = {
  darwin: ['mac', 'macos', 'osx'],
  exe: ['win32', 'windows', 'win'],
  deb: ['debian'],
  rpm: ['fedora'],
  AppImage: ['appimage'],
  dmg: ['dmg'],
  darwin_arm64: ['mac_arm64', 'macos_arm64', 'osx_arm64'],
  exe_arm64: ['win32_arm64', 'windows_arm64', 'win_arm64'],
  deb_arm64: ['debian_arm64'],
  rpm_arm64: ['fedora_arm64'],
  AppImage_arm64: ['appimage_arm64'],
  dmg_arm64: ['dmg_arm64']
}

module.exports = platform => {
  if (typeof aliases[platform] !== 'undefined') {
    return platform
  }

  for (const guess of Object.keys(aliases)) {
    const list = aliases[guess]

    if (list.includes(platform)) {
      return guess
    }
  }

  return false
}
