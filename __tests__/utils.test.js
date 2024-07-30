const refHelper = require('../utils/ref-helper')

const gitControllerMock = {
  getPayloadContext: () => {
    return {
      owner: 'payload-ctx-owner',
      repo: 'payload-ctx-repo'
    }
  },
  getLatestRelease: _ => {
    return { data: { tag_name: 'release_tag' } }
  },
  getLatestPrerelease: _ => {
    return { tag_name: 'prerelease_tag' }
  },
  getLastBranchCommit: (_, short) => {
    const sha = '0123456789'

    if (short) {
      return sha.substring(0, 7)
    }

    return sha
  }
}

describe('The ref helper', () => {
  it('can get the latest release', async () => {
    const ref = await refHelper.getLatestRef(
      '$latest_release',
      gitControllerMock
    )

    expect(ref).toEqual('release_tag')
  })

  it('can get the latest prerelease', async () => {
    const ref = await refHelper.getLatestRef(
      '$latest_prerelease',
      gitControllerMock
    )

    expect(ref).toEqual('prerelease_tag')
  })

  it('can get the latest branch commit sha', async () => {
    const ref = await refHelper.getLatestRef(
      '$branch_test',
      gitControllerMock,
      false
    )

    expect(ref).toEqual('0123456789')
  })

  it('can get the latest branch commit short sha', async () => {
    const ref = await refHelper.getLatestRef('$branch_test', gitControllerMock)

    expect(ref).toEqual('0123456')
  })
})
