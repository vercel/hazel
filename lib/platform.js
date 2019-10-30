// Native
const { extname } = require('path')

module.exports = fileName => {
  const extension = extname(fileName).slice(1)

  if (
    (fileName.includes('mac') || fileName.includes('darwin')) &&
    extension === 'zip'
  ) {
    return 'darwin'
  }

  if (fileName.includes('linux') && extension === 'zip') {
    return 'linux'
  }

  const directCache = ['exe', 'dmg', 'rpm', 'deb', 'AppImage', 'nupkg']

  return directCache.find(ext => ext === extension) || false
}
