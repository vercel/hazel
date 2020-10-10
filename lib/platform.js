// Native
const { extname } = require('path')

module.exports = fileName => {
  const extension = extname(fileName).slice(1)

  if (
    (fileName.includes('mac') || fileName.includes('darwin')) &&
    (extension === 'yml')
  ) {
    return 'darwin'
  }

  const directCache = ['exe', 'dmg', 'rpm', 'deb', 'AppImage', 'zip']
  return directCache.find(ext => ext === extension) || false
}
