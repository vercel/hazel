const fetch = require('node-fetch')
const { send } = require('micro')

const proxyPrivateDownload = (asset, req, res, token) => {
  const redirect = 'manual'
  const headers = { Accept: 'application/octet-stream' }
  const options = { headers, redirect }
  const { api_url: rawUrl } = asset
  const url = rawUrl.replace(
    'https://api.github.com/',
    `https://${token}@api.github.com/`
  )

  fetch(url, options).then(assetRes => {
    res.setHeader('Location', assetRes.headers.get('Location'))
    send(res, 302)
  })
}

const filetypeForUpdate = platform => {
  return platform === 'darwin' ? `?filetype=zip` : ''
}

module.exports = { filetypeForUpdate, proxyPrivateDownload }
