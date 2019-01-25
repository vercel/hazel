// Packages
const Router = require('router')
const finalhandler = require('finalhandler')
const Cache = require('./cache')

module.exports = config => {
  const cache = new Cache(config)
  const { account, repository } = config
  const enabled = account && repository

  const router = Router()

  if (enabled) {
    const routes = require('./routes')({ cache, config })

    // Define a route for every relevant path
    router.get('/', routes.overview)
    router.get('/download', routes.download)
    router.get('/download/:platform', routes.downloadPlatform)
    router.get('/update/:platform/:version', routes.update)
    router.get('/update/win32/:version/RELEASES', routes.releases)
  } else {
    router.get('/', (req, res) => {
      res.statusCode = 400;

      res.end(JSON.stringify({
        error: {
          code: 'missing_environment_variables',
          message: 'Please define at least `ACCOUNT` and `REPOSITORY` as environment variables'
        }
      }))
    })
  }

  return (req, res) => {
    router(req, res, finalhandler(req, res))
  }
}
