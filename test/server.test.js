/* global describe, it, afterEach */
const micro = require('micro')
const listen = require('test-listen')

const initialEnv = Object.assign({}, process.env)

afterEach(() => {
  process.env = initialEnv
})

describe('Server', () => {
  it('Should start without errors', async () => {
    process.env = {
      ACCOUNT: 'zeit',
      REPOSITORY: 'hyper'
    }

    const run = require('../lib/server')
    const server = micro(run)

    await listen(server)
    server.close()
  })
})
