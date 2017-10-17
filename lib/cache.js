// Packages
const fetch = require('node-fetch')
const convertStream = require('stream-to-string')

// Utilities
const checkPlatform = require('./platform')

const latest = {}
const { ACCOUNT, REPOSITORY, PRE, GH_TOKEN, PRIVATE_BASE_URL } = process.env

if (!ACCOUNT || !REPOSITORY) {
  console.error('Neither ACCOUNT, nor REPOSITORY are defined')
  process.exit(1)
}

if (GH_TOKEN && !PRIVATE_BASE_URL) {
  console.error('PRIVATE_BASE_URL missing')
  process.exit(1)
}

if (!GH_TOKEN && PRIVATE_BASE_URL) {
  console.error('GH_TOKEN missing')
  process.exit(1)
}

const cacheReleaseList = async url => {
  const headers = { Accept: 'application/vnd.github.preview' }

  if (GH_TOKEN && typeof GH_TOKEN === 'string' && GH_TOKEN.length > 0) {
    headers.Authorization = `token ${GH_TOKEN}`
  }

  const { status, body } = await fetch(url, { headers })

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
  const repo = ACCOUNT + '/' + REPOSITORY
  const url = `https://api.github.com/repos/${repo}/releases?per_page=100`
  const headers = { Accept: 'application/vnd.github.preview' }

  if (GH_TOKEN && typeof GH_TOKEN === 'string' && GH_TOKEN.length > 0) {
    headers.Authorization = `token ${GH_TOKEN}`
  }

  const response = await fetch(url, { headers })

  if (response.status !== 200) {
    return
  }

  const data = await response.json()

  if (!Array.isArray(data) || data.length === 0) {
    return
  }

  const release = data.find(item => {
    const isPre = Boolean(PRE) === Boolean(item.prerelease)
    return !item.draft && isPre
  })

  if (!release || !release.assets || !Array.isArray(release.assets)) {
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
    const { name, url, browser_download_url, content_type } = asset

    if (name === 'RELEASES') {
      await cacheReleaseList(browser_download_url)
      continue
    }

    const platform = checkPlatform(name)

    if (!platform) {
      continue
    }

    latest.platforms[platform] = {
      name,
      url,
      content_type
    }
  }

  console.log(`Finished caching version ${tag_name}`)
}

// This is a method returning the cache
// because the cache would otherwise be loaded
// only once when the index file is parsed
exports.loadCache = () => latest
