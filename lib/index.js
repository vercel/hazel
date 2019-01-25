// Packages
const Router = require('router')
const finalhandler = require('finalhandler')
const Cache = require('./cache')

module.exports = config => {
  // Utilities
  const cache = new Cache(config)
  const routes = require('./routes')({ cache, config })

  // Initialize a new router
  const router = Router()

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
