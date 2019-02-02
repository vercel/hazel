// Packages
const { send } = require('micro')
const { valid, compare } = require('semver')
const distanceInWordsToNow = require('date-fns/distance_in_words_to_now')
const { proxyPrivateDownload, filetypeForUpdate } = require('./util')
const prepareView = require('./view')

module.exports = ({ cache, config }) => {
  const exports = {}
  const { loadCache } = cache
  const { token, url } = config
  const shouldProxyPrivateDownload =
    token && typeof token === 'string' && token.length > 0

  exports.download = async (req, res) => {
    const { asset } = await cache.getLatestForPlatform(req)

    if (!asset) {
      send(res, 404, 'No download available for your platform')
      return
    }

    if (shouldProxyPrivateDownload) {
      proxyPrivateDownload(asset, req, res, token)
      return
    }

    res.writeHead(302, {
      Location: asset.url
    })

    res.end()
  }

  exports.downloadPlatform = exports.download

  exports.update = async (req, res) => {
    const { version } = req.params

    if (!valid(version)) {
      send(res, 500, {
        error: 'version_invalid',
        message: 'The specified version is not SemVer-compatible'
      })

      return
    }

    const { latest, asset, platform } = await cache.getLatestForPlatform(
      req,
      true
    )

    if (!asset) {
      res.statusCode = 204
      res.end()

      return
    }

    // Previously, we were checking if the latest version is
    // greater than the one on the client. However, we
    // only need to compare if they're different (even if
    // lower) in order to trigger an update.

    // This allows developers to downgrade their users
    // to a lower version in the case that a major bug happens
    // that will take a long time to fix and release
    // a patch update.

    if (compare(latest.version, version) !== 0) {
      const filetype = filetypeForUpdate(platform)

      send(res, 200, {
        name: latest.version,
        notes: latest.notes,
        pub_date: latest.pub_date,
        url: shouldProxyPrivateDownload
          ? `${url}/download/${platform}${filetype}`
          : latest.platforms[platform].url
      })

      return
    }

    res.statusCode = 204
    res.end()
  }

  exports.releases = async (req, res) => {
    // Get the latest version from the cache
    const latest = await loadCache()

    if (!latest.files || !latest.files.RELEASES) {
      res.statusCode = 204
      res.end()

      return
    }

    const content = latest.files.RELEASES

    res.writeHead(200, {
      'content-length': Buffer.byteLength(content, 'utf8'),
      'content-type': 'application/octet-stream'
    })

    res.end(content)
  }

  exports.overview = async (req, res) => {
    const latest = await loadCache()

    try {
      const render = await prepareView()

      const details = {
        account: config.account,
        repository: config.repository,
        date: distanceInWordsToNow(latest.pub_date, { addSuffix: true }),
        files: latest.platforms,
        version: latest.version,
        releaseNotes: `https://github.com/${config.account}/${
          config.repository
        }/releases/tag/${latest.version}`,
        allReleases: `https://github.com/${config.account}/${
          config.repository
        }/releases`,
        github: `https://github.com/${config.account}/${config.repository}`
      }

      send(res, 200, render(details))
    } catch (err) {
      console.error(err)
      send(res, 500, 'Error reading overview file')
    }
  }

  return exports
}
