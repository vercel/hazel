const hazel = require('.')

const {
  INTERVAL: interval,
  ACCOUNT: account,
  REPOSITORY: repository,
  PRE: pre,
  TOKEN: token,
  URL: PRIVATE_BASE_URL,
  NOW_REGION: now_region
} = process.env

const url = PRIVATE_BASE_URL

let deployed_to_now = false

if (now_region && now_region.length > 0) {
  deployed_to_now = true
}

module.exports = hazel({
  interval,
  account,
  repository,
  pre,
  token,
  deployed_to_now,
  url
})
