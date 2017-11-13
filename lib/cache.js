// Packages
const URL = require('url')
const fetch = require('node-fetch')

// Utilities
const checkPlatform = require('./platform')

const latest = {}
const {
  ACCOUNT,
  REPOSITORY,
  PRE,
  TOKEN,
  URL: PRIVATE_BASE_URL,
  NOW_URL
} = process.env
const baseUrl = NOW_URL || PRIVATE_BASE_URL
const isPrivate = TOKEN && typeof TOKEN === 'string' && TOKEN.length > 0

if (!ACCOUNT || !REPOSITORY) {
  console.error('Neither ACCOUNT, nor REPOSITORY are defined')
  process.exit(1)
}

if (TOKEN && !baseUrl) {
  console.error(
    'Neither NOW_URL, nor URL are defined, which are mandatory for private repo mode.'
  )
  process.exit(1)
}

const cacheReleaseList = async asset => {
  let url = asset.browser_download_url
  let headers = { Accept: 'application/vnd.github.preview' }

  if (isPrivate) {
    headers = { Accept: 'application/octet-stream' }
    url = asset.url.replace(
      'https://api.github.com/',
      `https://${TOKEN}@api.github.com/`
    )
  }

  const res = await fetch(url, { headers })

  if (res.status !== 200) {
    return
  }

  const content = await res.text()

  if (!latest.files) {
    latest.files = {}
  }

  latest.files.RELEASES = content
}

exports.refreshCache = async () => {
  const repo = ACCOUNT + '/' + REPOSITORY
  const url = `https://api.github.com/repos/${repo}/releases?per_page=100`
  const headers = { Accept: 'application/vnd.github.preview' }

  if (TOKEN && typeof TOKEN === 'string' && TOKEN.length > 0) {
    headers.Authorization = `token ${TOKEN}`
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

  const nupkgAsset = release.assets.find(asset => {
    return asset.name.endsWith('.nupkg')
  })
  if (isPrivate) {
    latest.nupkgAssetUrl = nupkgAsset.url
  } else {
    latest.nupkgAssetUrl = nupkgAsset.browser_download_url
  }

  for (const asset of release.assets) {
    const { name, browser_download_url, url, content_type } = asset

    if (name === 'RELEASES') {
      await cacheReleaseList(asset)
      continue
    }

    const platform = checkPlatform(name)

    if (!platform) {
      continue
    }

    latest.platforms[platform] = {
      name,
      api_url: url,
      url: browser_download_url,
      content_type
    }
  }

  console.log(`Finished caching version ${tag_name}`)
}

exports.cacheNupkgAssetDetails = url => {
  if (
    !latest.nupkgAssetUrlExpiresAt ||
    latest.nupkgAssetUrlExpiresAt < Date.now()
  ) {
    latest.nupkgAssetUrlExpiresAt =
      Date.now() + URL.parse(url, true).query['X-Amz-Expires'] * 1000
  }
  latest.nupkgGithubAssetUrl = url
}

// This is a method returning the cache
// because the cache would otherwise be loaded
// only once when the index file is parsed
exports.loadCache = () => latest
