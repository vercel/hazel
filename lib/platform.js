// Native
const { extname } = require('path')

module.exports = fileName => {
  const extension = extname(fileName).slice(1)
  const arch = (fileName.includes('arm64') || fileName.includes('aarch64')) ? '_arm64' : ''

  if (
    (fileName.includes('mac') || fileName.includes('darwin')) &&
    extension === 'zip'
  ) {
    return 'zip' + arch
  }

  const directCache = ['exe', 'zip', 'dmg', 'rpm', 'deb', 'AppImage']
  return directCache.includes(extension) ? (extension + arch) : false
}
