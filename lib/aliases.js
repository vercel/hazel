const aliases = {
  darwin: ['mac', 'macos', 'osx'],
  exe: ['win32', 'windows', 'win'],
  deb: ['debian'],
  rpm: ['fedora'],
  AppImage: ['appimage']
}

const aliasMap = new Map()
Object.entries(aliases).forEach(([platform, aliases]) => {
  aliases.forEach(alias => aliasMap.set(alias, platform))
  aliasMap.set(platform, platform)
})

module.exports = (platform, customPlatforms = {}) => {
  if (customPlatforms[platform]) return platform
  return aliasMap.get(platform) || false
}
