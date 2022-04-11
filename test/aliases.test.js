/* global describe, it, expect */
const aliases = require('../lib/aliases')

describe('Aliases', () => {
  it('Should return the correct platform', () => {
    const result = aliases('mac')
    expect(result).toBe('zip')
  })

  it('Should return the platform when the platform is provided', () => {
    const result = aliases('zip')
    expect(result).toBe('zip')
  })

  it('Should return false if no platform is found', () => {
    const result = aliases('test')
    expect(result).toBe(false)
  })
})
