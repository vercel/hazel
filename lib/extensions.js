export const extensionAliases = {
  '.dmg': ['mac', 'macos', 'osx'],
  '.exe': ['win32', 'windows', 'win'],
  '.deb': ['debian'],
  '.rpm': ['fedora'],
  '.AppImage': ['appimage']
};

export const supportedExtensions = Object.keys(extensionAliases);
