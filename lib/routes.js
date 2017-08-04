// Packages
const { send } = require('micro')
const { valid, gt } = require('semver')
const { parse } = require('express-useragent')

// Utilities
const { loadCache } = require('./cache')
const checkAlias = require('./aliases')

exports.download = (req, res) => {
  const userAgent = parse(req.headers['user-agent'])
  let platform

  if (userAgent.isMac) {
    platform = 'darwin'
  } else if (userAgent.isWindows) {
    platform = 'win32'
  }

  // Get the latest version from the cache
  const { platforms } = loadCache()

  if (!platform || !platforms || !platforms[platform]) {
    send(res, 404, 'No download available for your platform!')
    return
  }

  res.writeHead(302, {
    Location: platforms[platform]
  })

  res.end()
}

exports.downloadPlatform = (req, res) => {
  let { platform } = req.params

  // Get the latest version from the cache
  const latest = loadCache()

  // Check platform for appropiate aliases
  platform = checkAlias(platform)

  if (!platform) {
    send(res, 500, 'The specified platform is not valid')
    return
  }

  if (!latest.platforms || !latest.platforms[platform]) {
    send(res, 404, 'No download available for your platform')
    return
  }

  res.writeHead(302, {
    Location: latest.platforms[platform]
  })

  res.end()
}

exports.update = (req, res) => {
  let { platform, version } = req.params

  if (!valid(version)) {
    send(res, 500, {
      error: 'version_invalid',
      message: 'The specified version is not SemVer-compatible'
    })

    return
  }

  platform = checkAlias(platform)

  if (!platform) {
    send(res, 500, {
      error: 'invalid_platform',
      message: 'The specified platform is not valid'
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
}

exports.releases = (req, res) => {
  // Get the latest version from the cache
  const latest = loadCache()

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
