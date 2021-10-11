// Native
const { extname, basename } = require('path')

module.exports.checkPlatform = fileName => {
  const extension = extname(fileName).slice(1)
  const arch = (fileName.includes('arm64') || fileName.includes('aarch64')) ? '_arm64' : ''

  if (
    (fileName.includes('mac') || fileName.includes('darwin')) &&
    extension === 'zip'
  ) {
    return 'darwin' + arch
  }

  const directCache = ['exe', 'dmg', 'rpm', 'deb', 'AppImage']
  return directCache.includes(extension) ? (extension + arch) : false
}

module.exports.checkArch = fileName => {
  const ia32Suffixes = [
    // 'exe'
    'ia32',
    // 'rpm'
    'i686',
    // 'deb' and 'AppImage'
    'i386'
  ]
  
  const ext = extname(fileName)
  const name = basename(fileName, ext)
  const is32 = ia32Suffixes.find(suffix => name.endsWith(suffix))

  if (is32) { 
    return 'ia32' 
  }

  if (fileName.includes('aarch64') || fileName.includes('arm64')) { 
    return 'arm64' 
  }
  
  // Default to x64 if we can't figure it out, maintaining the original behaviour
  return 'x64'
}
