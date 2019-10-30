// Packages
const fetch = require('node-fetch')
const retry = require('async-retry')
const convertStream = require('stream-to-string')
const ms = require('ms')

// Utilities
const checkPlatform = require('./platform')
const github = require('./github')

module.exports = class Cache {
  constructor(config) {
    const { account, repository, token, deployed_to_now, url } = config
    this.config = config

    if (!account || !repository) {
      const error = new Error('Neither ACCOUNT, nor REPOSITORY are defined')
      error.code = 'missing_configuration_properties'
      throw error
    }

    if (token && !deployed_to_now && !url) {
      const error = new Error(
        'Not deployed to Now and URL is not defined, which is mandatory for private repo mode'
      )
      error.code = 'missing_configuration_properties'
      throw error
    }

    if (token && typeof token === 'string' && token.length > 0) {
      this.isPrivateRepo = true
    }

    this.latest = {}
    this.lastUpdate = null

    this.cacheReleaseList = this.cacheReleaseList.bind(this)
    this.refreshCache = this.refreshCache.bind(this)
    this.loadCache = this.loadCache.bind(this)
    this.isOutdated = this.isOutdated.bind(this)
  }

  async cacheReleaseList(hazelURL, url, browser_download_url) {
    const { token } = this.config
    const headers = { Accept: 'application/octet-stream' }
    const githubHeaders = headers

    if (this.isPrivateRepo) {
      githubHeaders.Authorization = `token ${token}`
    }

    const { body } = await retry(
      async () => {
        const redirect = 'manual'
        const options = { headers: githubHeaders, redirect }
        let response = await fetch(url, options)

        if (response.status === 302) {
          const redirUrl = response.headers.get('Location')
          response = await fetch(redirUrl, headers)
        }

        if (response.status !== 200) {
          throw new Error(
            `Tried to cache RELEASES, but failed fetching ${url}, status ${
              response.status
            }`
          )
        }

        return response
      },
      { retries: 3 }
    )

    const content = await convertStream(body)

    const matches = content.match(/[^ ]*\.nupkg/gim)

    if (matches && matches.length === 0) {
      throw new Error(
        `Tried to cache RELEASES, but failed. RELEASES content doesn't contain nupkg`
      )
    }

    const nuPKG = this.isPrivateRepo
      ? `${hazelURL}/download/win32/update/${matches[0]}`
      : browser_download_url.replace('RELEASES', matches[0])

    const result = content.replace(matches[0], nuPKG)

    return result
  }

  async refreshCache(hazelURL) {
    const { pre } = this.config
    const data = await github.releases(this.config)

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
      this.lastUpdate = Date.now()
      return
    }

    console.log(`Caching version ${tag_name}...`)

    this.latest.version = tag_name
    this.latest.notes = release.body
    this.latest.pub_date = release.published_at

    // Clear list of download links
    this.latest.platforms = {}

    for (const asset of release.assets) {
      const { name, browser_download_url, url, content_type, size } = asset

      if (name === 'RELEASES') {
        try {
          if (!this.latest.files) {
            this.latest.files = {}
          }
          this.latest.files.RELEASES = await this.cacheReleaseList(
            hazelURL,
            url,
            browser_download_url
          )
        } catch (err) {
          console.error(err)
        }
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
        content_type,
        size: Math.round(size / 1000000 * 10) / 10
      }
    }

    console.log(`Finished caching version ${tag_name}`)
    this.lastUpdate = Date.now()
  }

  isOutdated() {
    const { lastUpdate, config } = this
    const { interval = 15 } = config

    if (lastUpdate && Date.now() - lastUpdate > ms(`${interval}m`)) {
      return true
    }

    return false
  }

  // This is a method returning the cache
  // because the cache would otherwise be loaded
  // only once when the index file is parsed
  async loadCache(hazelURL) {
    const { latest, refreshCache, isOutdated, lastUpdate } = this

    if (!lastUpdate || isOutdated()) {
      await refreshCache(hazelURL)
    }

    return Object.assign({}, latest)
  }
}
