const refHelper = require('../utils/ref-helper')

const gitControllerMock = {
  getPayloadContext: () => {
    return {
      owner: 'payload-ctx-owner',
      repo: 'payload-ctx-repo'
    }
  },
  getLatestRelease: payload => {
    return { data: { tag_name: `release_tag${payload.tag || ''}` } }
  },
  getLatestPrerelease: payload => {
    return { tag_name: `prerelease_tag${payload.tag || ''}` }
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

  it('can get the latest release of a specific tag', async () => {
    const ref = await refHelper.getLatestRef(
      '$highest_semver_release_v1.2.3',
      gitControllerMock
    )

    expect(ref).toEqual('release_tagv1.2.3')
  })

  it('can get the latest prerelease', async () => {
    const ref = await refHelper.getLatestRef(
      '$latest_prerelease',
      gitControllerMock
    )

    expect(ref).toEqual('prerelease_tag')
  })

  it('can get the latest prerelease of a specific tag', async () => {
    const ref = await refHelper.getLatestRef(
      '$highest_semver_prerelease_v3.2.1',
      gitControllerMock
    )

    expect(ref).toEqual('prerelease_tagv3.2.1')
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

  it('can get the short sha of a long sha commit', async () => {
    const sha =
      '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08'
    const ref = await refHelper.getLatestRef(sha, gitControllerMock)

    expect(ref).toEqual(sha.substring(0, 7))
  })

  it('returns null when no prerelease is found', async () => {
    gitControllerMock.getLatestPrerelease = _ => false

    const latestRef = await refHelper.getLatestRef(
      '$latest_prerelease',
      gitControllerMock
    )

    expect(latestRef).toEqual(null)

    const highestSemVerRef = await refHelper.getLatestRef(
      '$highest_semver_prerelease_v3.2.1',
      gitControllerMock
    )

    expect(latestRef).toEqual(null)
  })

  it('throws a controlled error when any of the refs cannot be found', async () => {
    await expect(refHelper.getLatestRef('$latest_release', {})).rejects.toThrow(
      'calculating last release: TypeError: gitController.getPayloadContext is not a function'
    )

    await expect(
      refHelper.getLatestRef('$highest_semver_release_v1.2.3', {})
    ).rejects.toThrow(
      'calculating last release: TypeError: gitController.getPayloadContext is not a function'
    )

    await expect(
      refHelper.getLatestRef('$latest_prerelease', {})
    ).rejects.toThrow(
      'calculating last pre-release: TypeError: gitController.getPayloadContext is not a function'
    )

    await expect(
      refHelper.getLatestRef('$highest_semver_prerelease_v1.2.3', {})
    ).rejects.toThrow(
      'calculating last pre-release: TypeError: gitController.getPayloadContext is not a function'
    )

    await expect(refHelper.getLatestRef('$branch_test', {})).rejects.toThrow(
      'calculating last commit on branch $branch_test: TypeError: gitController.getPayloadContext is not a function'
    )
  })
})
