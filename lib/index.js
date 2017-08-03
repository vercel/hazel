// Packages
const { send } = require('micro')
const Router = require('router')
const finalhandler = require('finalhandler')
const { valid, gt } = require('semver')
const ms = require('ms')

// Utilities
const { refreshCache, loadCache } = require('./cache')

// Initialize a new router
const router = Router()

// Load most recent release
refreshCache()

// Refresh cache every 15 minutes or as defined
const { INTERVAL } = process.env
setInterval(refreshCache, ms(INTERVAL ? `${INTERVAL}m` : '15m'))

router.get('/download/:platform', (req, res) => {
  const { platform } = req.params

  // Get the latest version from the cache
  const latest = loadCache()

  if (!latest.platforms || !latest.platforms[platform]) {
    send(res, 404, 'Release not available yet!')
    return
  }

  const url = latest.platforms[platform]

  res.writeHead(302, {
    Location: url
  })

  res.end()
})

router.get('/update/:platform/:version', (req, res) => {
  const { platform, version } = req.params

  if (!valid(version)) {
    send(res, 500, {
      error: 'version_invalid',
      message: 'The specified version is not SemVer-compatible'
    })

    return
  }

  // Get the latest version from the cache
  const latest = loadCache()

  if (!latest.platforms || !latest.platforms[platform]) {
    res.statusCode = 204
    res.end()

    return
  }

  if (gt(latest.version, version)) {
    const { notes, pub_date } = latest

    send(res, 200, {
      name: latest.version,
      notes,
      pub_date,
      url: latest.platforms[platform]
    })

    return
  }

  res.statusCode = 204
  res.end()
})

module.exports = (req, res) => {
  router(req, res, finalhandler(req, res))
}
