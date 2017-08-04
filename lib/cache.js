// Packages
const fetch = require('node-fetch')
const convertStream = require('stream-to-string')

// Utilities
const checkPlatform = require('./platform')

const latest = {}
const { ACCOUNT, REPOSITORY } = process.env

if (!ACCOUNT || !REPOSITORY) {
  console.error('Neither ACCOUNT, nor REPOSITORY are defined')
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
  const repo = ACCOUNT + '/' + REPOSITORY
  const url = `https://api.github.com/repos/${repo}/releases/latest`

  const response = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github.preview'
    }
  })

  if (response.status !== 200) {
    return
  }

  const data = await response.json()

  if (typeof data !== 'object') {
    return
  } else if (Object.keys(data).length === 0) {
    return
  }

  if (!data.assets || !Array.isArray(data.assets)) {
    return
  }

  const { tag_name } = data

  if (latest.version === tag_name) {
    console.log('Cached version is the same as latest')
    return
  }

  console.log(`Caching version ${tag_name}...`)

  latest.version = tag_name
  latest.notes = data.body
  latest.pub_date = data.published_at

  // Clear list of download links
  latest.platforms = {}

  for (const asset of data.assets) {
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

exports.loadCache = () => {
  // This is a method returning the cache
  // because the cache would otherwise be loaded
  // only once when the index file is parsed
  return latest
}
