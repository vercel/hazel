// Native
const { extname } = require('path')

module.exports = fileName => {
  const extension = extname(fileName).split('.')[1]

  if (fileName.includes('mac') && extension === 'zip') {
    return 'darwin'
  }

  if (extension === 'exe') {
    return 'win32'
  }

  const directCache = ['rpm', 'deb', 'AppImage']

  const index = directCache.indexOf(extension)

  if (index > -1) {
    return directCache[index]
  }

  return false
}
