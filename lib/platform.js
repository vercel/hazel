// Native
const { extname, basename } = require('path')

exports.checkPlatform = fileName => {
  const extension = extname(fileName).split('.')[1]
  if (fileName.includes('mac') && extension === 'zip') {
    return 'darwin'
  }

  const directCache = ['exe', 'rpm', 'deb', 'AppImage']
  const index = directCache.indexOf(extension)

  if (index > -1) {
    return directCache[index]
  }

  return false
}

const ia32Suffixes = [
  // 'exe'
  'ia32',
  // 'rpm'
  'i686',
  // 'deb' and 'AppImage'
  'i386'
]

exports.checkArch = fileName => {
  const ext = extname(fileName)
  const name = basename(fileName, ext)
  const is32 = ia32Suffixes.find(suffix => name.endsWith(suffix))
  return is32 ? 'ia32' : 'x64'
}
