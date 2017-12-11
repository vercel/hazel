// Packages
const Router = require('router')
const finalhandler = require('finalhandler')
const ms = require('ms')
const Cache = require('./cache')

module.exports = config => {
  // Utilities
  const cache = new Cache(config)
  const { refreshCache } = cache
  const routes = require('./routes')({ cache, config })

  // Initialize a new router
  const router = Router()

  const refresh = () => {
    try {
      refreshCache()
    } catch (err) {
      console.error(err)
    }
  }

  // Load most recent release
  refresh()

  // Refresh cache every 15 minutes or as defined
  const { interval = 15 } = config

  setInterval(refresh, ms(`${interval}m`))
  // Define a route for every relevant path
  router.get('/', routes.overview)
  router.get('/download', routes.download)
  router.get('/download/:platform', routes.downloadPlatform)
  router.get('/update/:platform/:version', routes.update)
  router.get('/update/win32/:version/RELEASES', routes.releases)

  return (req, res) => {
    router(req, res, finalhandler(req, res))
  }
}
