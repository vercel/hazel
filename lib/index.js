// Packages
const { send } = require('micro')
const Router = require('router')
const finalhandler = require('finalhandler')
const {valid, gt} = require('semver')
const ms = require('ms')

// Utilities
const {refreshCache, loadCache} = require('./cache')

// Initialize a new router
const router = Router()

// Refresh cache every 10 seconds
setInterval(refreshCache, ms('10s'))

router.get('/update/:platform/:version', (req, res) => {
  const {platform, version} = req.params

  if (!valid(version)) {
    send(res, 500, {
      error: 'version_invalid',
      message: 'The specified version is not SemVer-compatible'
    })

    return
  }

  // Get the latest version from the cache
  const latest = loadCache()

  if (!latest.platforms || !latest.platforms[platform]) {
    res.statusCode = 204
    res.end()

    return
  }

  if (gt(latest.version, version)) {
    const {notes, pub_date} = latest

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
