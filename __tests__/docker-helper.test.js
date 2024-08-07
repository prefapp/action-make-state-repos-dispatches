const { execSync } = require('child_process')
const { checkManifest } = require('../utils/docker-helper')

jest.mock('child_process', () => ({
  execSync: (image_name, _) => {
    if (image_name === 'docker manifest inspect test-image') {
      return true
    } else {
      throw new Error()
    }
  }
}))

describe('docker-helper', () => {
  it('returns true when no errors happen', async () => {
    const result = checkManifest('test-image')

    expect(result).toEqual(true)
  })

  it('returns false when an error happens', async () => {
    const result = checkManifest('throw-error')

    expect(result).toEqual(false)
  })
})
