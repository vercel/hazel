const fetch = require('node-fetch')
const retry = require('async-retry')

const publicURL = async (api_url, token) => {
  const redirect = 'manual'
  const headers = {
    Accept: 'application/octet-stream',
    Authorization: `token ${token}`
  }
  const options = { headers, redirect }

  const assetRes = await fetch(api_url, options)

  return assetRes.headers.get('Location')
}

const getPreview = async (config, repoPath) => {
  const { account, repository, token } = config
  const repo = account + '/' + repository
  const url = `https://api.github.com/repos/${repo}${repoPath}`
  const headers = { Accept: 'application/vnd.github.preview' }

  if (token && typeof token === 'string' && token.length > 0) {
    headers.Authorization = `token ${token}`
  }

  const response = await retry(
    async () => {
      const response = await fetch(url, { headers })

      if (response.status !== 200) {
        throw new Error(
          `GitHub API responded with ${response.status} for url ${url}`
        )
      }

      return response
    },
    { retries: 3 }
  )

  const data = await response.json()

  return data
}

const releases = async config => {
  return getPreview(config, '/releases?per_page=100')
}

const release = async (config, tag) => {
  return getPreview(config, `/releases/tags/${tag}`)
}

module.exports.publicURL = publicURL
module.exports.releases = releases
module.exports.release = release
