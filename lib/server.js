const hazel = require('.')

const {
  INTERVAL: interval,
  PRE: pre,
  TOKEN: token,
  URL: PRIVATE_BASE_URL,
  NOW_URL
} = process.env

let account = 'sandeep1995', repository = 'release-server'

const url = NOW_URL || PRIVATE_BASE_URL

module.exports = hazel({
  interval,
  account,
  repository,
  pre,
  token,
  url
})
