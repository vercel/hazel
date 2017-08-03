// Native
const {extname} = require('path')

module.exports = fileName => {
  const allowedExtensions = [
    'exe',
    'zip',
    'dmg'
  ]

  const extension = extname(fileName).split('.')[1]

  if (!allowedExtensions.includes(extension)) {
    return false
  }

  if (fileName.includes('mac') && extension === 'zip') {
    return 'darwin'
  }

  if (extension === 'exe') {
    return 'win32'
  }

  return false
}
