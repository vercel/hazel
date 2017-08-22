// Packages
const fetch = require('node-fetch')
const convertStream = require('stream-to-string')

// Utilities
const checkPlatform = require('./platform')

const latest = {}
const { GITHUB_USERNAME_OR_ORG, REPOSITORY, PRE } = process.env

if (!GITHUB_USERNAME_OR_ORG || !REPOSITORY) {
  console.error('Neither GITHUB_USERNAME_OR_ORG, nor REPOSITORY are defined')
  process.exit(1)
}

const cacheReleaseList = async url => {
  const { status, body } = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github.preview'
    }
  })

  if (status !== 200) {
    return
  }

  let content = await convertStream(body)
  const matches = content.match(/[^ ]*\.nupkg/gim)

  if (matches.length === 0) {
    console.error('Tried to cache RELEASES, but failed')
    return
  }

  const nuPKG = url.replace('RELEASES', matches[0])
  content = content.replace(matches[0], nuPKG)

  if (!latest.files) {
    latest.files = {}
  }

  latest.files.RELEASES = content
}

exports.refreshCache = async () => {
  const repo = GITHUB_USERNAME_OR_ORG + '/' + REPOSITORY
  const url = `https://api.github.com/repos/${repo}/releases?per_page=1`

  const response = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github.preview'
    }
  })

  if (response.status !== 200) {
    return
  }

  const data = await response.json()

  if (!Array.isArray(data) || data.length === 0) {
    return
  }

  const release = data[0]

  // Only accept prereleases when the `PRE` env
  // variables is defined
  if (PRE && !release.prerelease) {
    return
  }

  if (!release.assets || !Array.isArray(release.assets)) {
    return
  }

  const { tag_name } = release

  if (latest.version === tag_name) {
    console.log('Cached version is the same as latest')
    return
  }

  console.log(`Caching version ${tag_name}...`)

  latest.version = tag_name
  latest.notes = release.body
  latest.pub_date = release.published_at

  // Clear list of download links
  latest.platforms = {}

  for (const asset of release.assets) {
    const { name, browser_download_url } = asset

    if (name === 'RELEASES') {
      await cacheReleaseList(browser_download_url)
      continue
    }

    const platform = checkPlatform(name)

    if (!platform) {
      continue
    }

    latest.platforms[platform] = browser_download_url
  }

  console.log(`Finished caching version ${tag_name}`)
}

// This is a method returning the cache
// because the cache would otherwise be loaded
// only once when the index file is parsed
exports.loadCache = () => latest
