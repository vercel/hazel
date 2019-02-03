const fetch = require('node-fetch')
const { send } = require('micro')

const _proxyDownload = async (asset, token, res) => {
  const isClientDownload = Boolean(res)
  const redirect = 'manual'
  const headers = { Accept: 'application/octet-stream' }
  const options = { headers, redirect }
  const rawUrl = isClientDownload ? asset.api_url : asset.url
  const url = rawUrl.replace(
    'https://api.github.com/',
    `https://${token}@api.github.com/`
  )

  const { headers: resHeaders } = await fetch(url, options)
  const location = resHeaders.get('Location') || resHeaders.get('location')

  if (!isClientDownload) return fetch(location, { headers })

  res.setHeader('Location', location)
  send(res, 302)
}

const proxyReleaseDownload = (asset, token) => _proxyDownload(asset, token)

const filetypeForUpdate = platform => {
  return platform === 'darwin' ? `?filetype=zip` : ''
}

module.exports = {
  filetypeForUpdate,
  proxyReleaseDownload,
  proxyPrivateDownload: _proxyDownload
}
