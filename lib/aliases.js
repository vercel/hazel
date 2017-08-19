const aliases = {
  darwin: ['mac', 'macos', 'osx'],
  exe: ['win32', 'windows', 'win'],
  deb: ['debian'],
  rpm: ['fedora'],
  AppImage: ['appimage']
}

module.exports = platform => {
  for (const guess in aliases) {
    if (!{}.hasOwnProperty.call(aliases, guess)) {
      continue
    }

    const list = aliases[guess]

    if (guess === platform || list.includes(platform)) {
      return guess
    }
  }

  return false
}
