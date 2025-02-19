/**
 * Unit tests for the action's dispatch caller, src/main.js
 */

const { makeDispatches } = require('../src/dispatcher')

// Mock the action's entrypoint
jest.mock('../src/dispatcher', () => ({
  makeDispatches: jest.fn()
}))
jest.mock('../utils/github-helper', () => ({}))

describe('main', () => {
  it('calls makeDispatches when imported', async () => {
    const main = require('../src/main')

    main.run()

    expect(makeDispatches).toHaveBeenCalled()
  })
})
