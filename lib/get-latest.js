import path from 'path';
import fetchRetry from '@zeit/fetch-retry';
import convertStream from 'stream-to-string';
import formatDistanceToNow from 'date-fns/formatDistanceToNow';
import parseISO from 'date-fns/parseISO';
import { extensionAliases, supportedExtensions } from './extensions';

const fetch = fetchRetry();

const { REPOSITORY, ACCOUNT, PRE, TOKEN } = process.env;

if (!REPOSITORY || !ACCOUNT) {
  throw new Error(
    'Please define the `REPOSITORY` and `ACCOUNT` environment variables'
  );
}

const cacheReleaseList = async url => {
  const headers = { Accept: 'application/vnd.github.preview' };

  if (TOKEN && typeof TOKEN === 'string' && TOKEN.length > 0) {
    headers.Authorization = `token ${TOKEN}`;
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

export default async () => {
  const repo = ACCOUNT + '/' + REPOSITORY;
  const releaseUrl = `https://api.github.com/repos/${repo}/releases?per_page=100`;
  const headers = { Accept: 'application/vnd.github.preview' };

  if (TOKEN && typeof TOKEN === 'string' && TOKEN.length > 0) {
    headers.Authorization = `token ${TOKEN}`;
  }

  const response = await fetch(releaseUrl, { headers });

  if (response.status !== 200) {
    throw new Error(
      `GitHub API responded with ${response.status} for url ${releasesUrl}`
    );
  }

  const data = await response.json();

  if (!Array.isArray(data) || data.length === 0) {
    return;
  }

  const release = data.find(item => {
    const isPre = Boolean(PRE) === Boolean(item.prerelease);
    return !item.draft && isPre;
  });

  if (!release || !release.assets || !Array.isArray(release.assets)) {
    return;
  }

  const { tag_name } = release;

  console.log(`Found latest version ${tag_name}...`);

  const latest = {
    repository: REPOSITORY,
    account: ACCOUNT,
    version: tag_name,
    publishedAt: release.published_at,
    platforms: {},
    files: {},
    age: formatDistanceToNow(parseISO(release.published_at), {
      addSuffix: true
    })
  };

  for (const asset of release.assets) {
    const { name, browser_download_url, url, content_type, size } = asset;

    if (name === 'RELEASES') {
      try {
        latest.files.RELEASES = await cacheReleaseList(browser_download_url);
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
      apiUrl: url,
      downloadUrl: browser_download_url,
      contentType: content_type,
      size
    };
  }

  return latest;
};
