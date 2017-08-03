// Native
const {extname} = require('path')

// Packages
const { send } = require('micro')
const Router = require('router')
const finalhandler = require('finalhandler')
const {valid, gt} = require('semver')
const ms = require('ms')
const fetch = require('node-fetch')

const router = Router()
const latest = {}

const checkPlatform = fileName => {
  const allowedExtensions = [
    'exe',
    'zip',
    'dmg'
  ]

  const extension = extname(fileName).split('.')[1]

  if (!allowedExtensions.includes(extension)) {
    return false
  }

  if (fileName.includes('mac') && extension === 'zip') {
    return 'darwin'
  }

  if (extension === 'exe') {
    return 'win32'
  }

  return false
}

setInterval(async () => {
  const repo = 'zeit/now-desktop'
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
    return
  }

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
}, ms('10s'))

router.get('/update/:platform/:version', (req, res) => {
  const {platform, version} = req.params

  if (!valid(version)) {
    send(res, 500, {
      error: 'version_invalid',
      message: 'The specified version is not SemVer-compatible'
    })

    return
  }

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
