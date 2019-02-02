// Native
const { extname } = require('path')

const extHandlers = {
  exe: () => 'exe',
  dmg: () => 'dmg',
  rpm: () => 'rpm',
  deb: () => 'deb',
  AppImage: () => 'AppImage',
  zip: fname => (fname.match(/mac|osx|darwin/) ? 'darwin' : false)
}

module.exports = (fileName, customPlatforms) => {
  if (customPlatforms) {
    const filter = ([_, handler]) => handler(fileName)
    const [platform] = Object.entries(customPlatforms).find(filter) || []
    if (platform) return platform
  }

  const ext = extname(fileName).split('.')[1]
  return extHandlers[ext] ? extHandlers[ext](fileName) : false
}
