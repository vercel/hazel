// Packages
const ms = require('ms')
const fetch = require('node-fetch')

// Utilities
const checkPlatform = require('./platform')

const latest = {}
const repo = process.env.REPO

if (!repo) {
  console.error('The REPO env variable is not defined!')
  process.exit(1)
}

if (!repo.includes('/')) {
  console.error('REPO env variable is not valid!')
  process.exit(1)
}

exports.refreshCache = async () => {
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

  if (!data.assets || !Array.isArray(data.assets)) {
    return
  }

  const {tag_name} = data

  if (latest.version === tag_name) {
    console.log('Cached version is the same as latest')
    return
  }

  console.log(`Caching version ${tag_name}...`)

  latest.version = tag_name
  latest.notes = data.body
  latest.pub_date = data.published_at

  for (const asset of data.assets) {
    const platform = checkPlatform(asset.name)

    if (!platform) {
      continue
    }

    if (!latest.platforms) {
      latest.platforms = {}
    }

    latest.platforms[platform] = asset.browser_download_url
  }

  console.log(`Finished caching version ${tag_name}`)
}

exports.loadCache = () => {
  // This is a method returning the cache
  // because the cache would otherwise be loaded
  // only once when the index file is parsed
  return latest
}
