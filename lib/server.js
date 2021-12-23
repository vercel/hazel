const hazel = require('./index')

const {
  INTERVAL: interval,
  ACCOUNT: account,
  REPOSITORY: repository,
  PRE: pre,
  ONLY_PRE: only_pre,
  TOKEN: token,
  URL: PRIVATE_BASE_URL,
  VERCEL_URL
} = process.env

const url = VERCEL_URL || PRIVATE_BASE_URL

module.exports = hazel({
  interval,
  account,
  repository,
  pre,
  only_pre,
  token,
  url
})
