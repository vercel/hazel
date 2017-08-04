// Packages
const Router = require('router')
const finalhandler = require('finalhandler')
const ms = require('ms')

// Utilities
const { refreshCache } = require('./cache')
const routes = require('./routes')

// Initialize a new router
const router = Router()

// Load most recent release
refreshCache()

// Refresh cache every 15 minutes or as defined
const { INTERVAL } = process.env
setInterval(refreshCache, ms(INTERVAL ? `${INTERVAL}m` : '15m'))

// Define a route for every relevant path
router.get('/download/:platform', routes.downloadPlatform)
router.get('/update/:platform/:version', routes.update)

module.exports = (req, res) => {
  router(req, res, finalhandler(req, res))
}
