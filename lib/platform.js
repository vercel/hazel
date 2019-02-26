// Native
const { extname } = require('path')

module.exports = fileName => {
  const extension = extname(fileName).split('.')[1]

  if ((fileName.includes('mac') || fileName.includes('darwin')) && extension === 'zip') {
    return 'darwin'
  }

  const directCache = ['exe', 'rpm', 'deb', 'AppImage']
  const index = directCache.indexOf(extension)

  if (index > -1) {
    return directCache[index]
  }

  return false
}
