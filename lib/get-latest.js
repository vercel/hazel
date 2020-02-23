import path from 'path';
import fetchRetry from '@zeit/fetch-retry';
import convertStream from 'stream-to-string';

const fetch = fetchRetry();

const extensionAliases = {
  '.dmg': [ 'mac', 'macos', 'osx' ],
  '.exe': [ 'win32', 'windows', 'win' ],
  '.deb': [ 'debian' ],
  '.rpm': [ 'fedora' ],
  '.AppImage': [ 'appimage' ]
};

const supportedExtensions = Object.keys(extensionAliases);

const cacheReleaseList = async (url, token) => {
  const headers = { Accept: 'application/vnd.github.preview' };

  if (token && typeof token === 'string' && token.length > 0) {
    headers.Authorization = `token ${token}`;
  }

  const { status, body } = await fetch(url, { headers });

  if (status !== 200) {
    throw new Error(
      `Tried to cache RELEASES, but failed fetching ${url}, status ${status}`
    );
  }

  let content = await convertStream(body);
  const matches = content.match(/[^ ]*\.nupkg/gim);

  if (matches.length === 0) {
    throw new Error(
      `Tried to cache RELEASES, but failed. RELEASES content doesn't contain nupkg`
    );
  }

  for (let i = 0; i < matches.length; i += 1) {
    const nuPKG = url.replace('RELEASES', matches[i]);
    content = content.replace(matches[i], nuPKG);
  }

  return content;
};

export default async (account, repository, pre, token) => {
  const repo = account + '/' + repository;
  const url = `https://api.github.com/repos/${repo}/releases?per_page=100`;
  const headers = { Accept: 'application/vnd.github.preview' };

  if (token && typeof token === 'string' && token.length > 0) {
    headers.Authorization = `token ${token}`;
  }

  const response = await fetch(url, { headers });

  if (response.status !== 200) {
    throw new Error(
      `GitHub API responded with ${response.status} for url ${url}`
    )
  }

  const data = await response.json();

  if (!Array.isArray(data) || data.length === 0) {
    return;
  }

  const release = data.find(item => {
    const isPre = Boolean(pre) === Boolean(item.prerelease);
    return !item.draft && isPre;
  });

  if (!release || !release.assets || !Array.isArray(release.assets)) {
    return;
  }

  const { tag_name } = release;

  console.log(`Found latest version ${tag_name}...`);

  const latest = {
    version: tag_name,
    publishedAt: release.published_at,
    platforms: {},
    files: {}
  };

  for (const asset of release.assets) {
    const { name, browser_download_url, url, content_type, size } = asset;

    if (name === 'RELEASES') {
      try {
        latest.files.RELEASES = await cacheReleaseList(
          browser_download_url,
          token
        );
      } catch (err) {
        console.error(err);
      }
      continue;
    }

    const extension = path.extname(name);

    if (!extension || !supportedExtensions.includes(extension)) {
      continue;
    }

    latest.platforms[extension] = {
      name,
      api_url: url,
      url: browser_download_url,
      content_type,
      size: Math.round(size / 1000000 * 10) / 10
    };
  }

  return latest;
};
