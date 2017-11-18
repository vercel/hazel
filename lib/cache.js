// Packages
const fetch = require('node-fetch')
const convertStream = require('stream-to-string')

// Utilities
const checkPlatform = require('./platform')

module.exports = config => {
  const { account, repository, pre, token, url } = config

  if (!account || !repository) {
    console.error('Neither ACCOUNT, nor REPOSITORY are defined')
    process.exit(1)
  }

  if (token && !url) {
    console.error(
      'Neither NOW_URL, nor URL are defined, which are mandatory for private repo mode.'
    )
    process.exit(1)
  }

  class Cache {
    constructor() {
      this.latest = {}
      this.cacheReleaseList = this.cacheReleaseList.bind(this)
      this.refreshCache = this.refreshCache.bind(this)
      this.loadCache = this.loadCache.bind(this)
    }
    async cacheReleaseList(url) {
      const headers = { Accept: 'application/vnd.github.preview' }

      if (token && typeof token === 'string' && token.length > 0) {
        headers.Authorization = `token ${token}`
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

      if (!this.latest.files) {
        this.latest.files = {}
      }

      this.latest.files.RELEASES = content
    }
    async refreshCache() {
      const repo = account + '/' + repository
      const url = `https://api.github.com/repos/${repo}/releases?per_page=100`
      const headers = { Accept: 'application/vnd.github.preview' }

      if (token && typeof token === 'string' && token.length > 0) {
        headers.Authorization = `token ${token}`
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
        const isPre = Boolean(pre) === Boolean(item.prerelease)
        return !item.draft && isPre
      })

      if (!release || !release.assets || !Array.isArray(release.assets)) {
        return
      }

      const { tag_name } = release

      if (this.latest.version === tag_name) {
        console.log('Cached version is the same as latest')
        return
      }

      console.log(`Caching version ${tag_name}...`)

      this.latest.version = tag_name
      this.latest.notes = release.body
      this.latest.pub_date = release.published_at

      // Clear list of download links
      this.latest.platforms = {}

      for (const asset of release.assets) {
        const { name, browser_download_url, url, content_type } = asset

        if (name === 'RELEASES') {
          await this.cacheReleaseList(browser_download_url)
          continue
        }

        const platform = checkPlatform(name)

        if (!platform) {
          continue
        }

        this.latest.platforms[platform] = {
          name,
          api_url: url,
          url: browser_download_url,
          content_type
        }
      }

      console.log(`Finished caching version ${tag_name}`)
    }

    // This is a method returning the cache
    // because the cache would otherwise be loaded
    // only once when the index file is parsed
    loadCache() {
      return this.latest
    }
  }
  return new Cache()
}
