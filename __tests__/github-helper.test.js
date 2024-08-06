const core = require('@actions/core')
const github = require('@actions/github')
const debug = require('debug')('make-state-repos-dispatches')
const ghHelper = require('../utils/github-helper')

jest.mock('@actions/core', () => ({
  getInput: inputName => `${inputName}-value`,
  notice: _ => true,
  error: _ => true,
  setFailed: _ => true
}))
jest.mock('@actions/github', () => ({
  getOctokit: _ => {
    return {
      rest: {
        repos: {
          getReleaseByTag: payload => {
            if (payload.throw) {
              throw new Error()
            } else {
              return 'got-release-by-tag'
            }
          },
          getLatestRelease: payload => {
            if (payload.throw) {
              throw new Error()
            } else {
              return 'got-latest-release'
            }
          },
          getBranch: payload => {
            if (payload.throw) {
              throw new Error()
            } else {
              return { data: { commit: { sha: '0123456789' } } }
            }
          },
          getContent: payload => {
            if (payload.path === 'wrong_status') {
              return { status: 404 }
            } else if (payload.path === 'wrong_file_type') {
              return { status: 200, data: { type: 'not-file' } }
            } else {
              return {
                status: 200,
                data: { type: 'file', content: 'file-content' }
              }
            }
          },
          createDispatchEvent: payload => true,
          listReleases: payload => {
            if (payload.throw) {
              throw new Error()
            } else {
              return {
                data: [
                  { prerelease: true, created_at: '2024-03-11' },
                  { prerelease: true, created_at: '2024-07-11' },
                  { prerelease: false, created_at: '2024-07-15' }
                ]
              }
            }
          }
        }
      }
    }
  },
  context: {
    payload: {
      repository: {
        owner: { login: 'owner-login' },
        name: 'repo-name'
      }
    },
    repo: 'repo-context-value'
  }
}))

describe('github-helper', () => {
  it('can get an input using @actions/core', async () => {
    const inputValue = ghHelper.getInput('test-input')

    expect(inputValue).toEqual('test-input-value')
  })

  it('can get all inputs via @actions/core', async () => {
    const result = ghHelper.getAllInputs()

    expect(result).toEqual({
      dispatchesFilePath: 'dispatches_file-value',
      imageType: 'image_type-value',
      stateRepoFilter: 'state_repo-value',
      defaultReleasesRegistry: 'default_releases_registry-value',
      defaultSnapshotsRegistry: 'default_snapshots_registry-value',
      buildSummary: 'build_summary-value',
      flavorFilter: 'flavors-value',
      envFilter: 'filter_by_env-value',
      tenantFilter: 'filter_by_tenant-value',
      overwriteVersion: 'overwrite_version-value',
      overwriteEnv: 'overwrite_env-value',
      overwriteTenant: 'overwrite_tenant-value',
      reviewers: 'reviewers-value',
      checkRunName: 'check_run_name-value'
    })
  })

  it('can get the payload context', async () => {
    const result = ghHelper.getPayloadContext()

    expect(result).toEqual({ owner: 'owner-login', repo: 'repo-name' })
  })

  it('can get the repo context', async () => {
    const result = ghHelper.getRepoContext()

    expect(result).toEqual('repo-context-value')
  })

  it('can get the octokit object when needed', async () => {
    const result = ghHelper.getOctokit()

    expect(result).not.toEqual(null)
  })

  it('can get the latest release, with and without tags', async () => {
    const latestRelease = await ghHelper.getLatestRelease({})
    expect(latestRelease).toEqual('got-latest-release')

    const releaseByTag = await ghHelper.getLatestRelease({ tag: 'tag' })
    expect(releaseByTag).toEqual('got-release-by-tag')
  })

  it('can catch and throw a custom error when getting releases', async () => {
    const releasePayload = { throw: true }
    await expect(ghHelper.getLatestRelease(releasePayload)).rejects.toThrow(
      `Error getting latest release for ${releasePayload}`
    )

    const releaseTagPayload = { tag: 'tag', throw: true }
    await expect(ghHelper.getLatestRelease(releaseTagPayload)).rejects.toThrow(
      `Error getting latest release for ${releaseTagPayload}`
    )
  })

  it('can get the latest prerelease', async () => {
    const latestPrerelease = await ghHelper.getLatestPrerelease({})
    expect(latestPrerelease.created_at).toEqual('2024-07-11')
  })

  it('can catch and throw a custom error when getting prereleases', async () => {
    const prereleasePayload = { throw: true }
    await expect(
      ghHelper.getLatestPrerelease(prereleasePayload)
    ).rejects.toThrow(
      `Error getting latest prerelease for ${prereleasePayload}`
    )
  })

  it('can sort a list of objects by their create_at property', async () => {
    const unorderedReleases = [
      { created_at: '2024-04-12' },
      { created_at: '1999-04-12' },
      { created_at: '2024-05-12' },
      { created_at: '2024-04-28' },
      { created_at: '2026-01-09' }
    ]
    const orderedReleases = [
      { created_at: '2026-01-09' },
      { created_at: '2024-05-12' },
      { created_at: '2024-04-28' },
      { created_at: '2024-04-12' },
      { created_at: '1999-04-12' }
    ]

    const sortedReleases = await ghHelper.sortReleasesByTime(unorderedReleases)

    expect(sortedReleases).toEqual(orderedReleases)
  })

  it('can get the latest branch commit long sha', async () => {
    const latestBranchCommit = await ghHelper.getLastBranchCommit({}, false)
    expect(latestBranchCommit).toEqual('0123456789')
  })

  it('can get the latest branch commit short sha', async () => {
    const latestBranchCommit = await ghHelper.getLastBranchCommit({}, true)
    expect(latestBranchCommit).toEqual('0123456')
  })

  it('can catch and throw a custom error when getting branch commits', async () => {
    const branchPayload = { throw: true }
    await expect(ghHelper.getLastBranchCommit(branchPayload)).rejects.toThrow(
      `Error getting last branch commit for ${branchPayload}`
    )
  })

  it('can get the contents of a file', async () => {
    const fileContents = await ghHelper.getFileContent('')
    expect(fileContents).toEqual('file-content')
  })

  it("throws an error when a file is not found or isn't actually a file", async () => {
    await expect(ghHelper.getFileContent('wrong_status')).rejects.toThrow(
      `Error getting file content for wrong_status`
    )
    await expect(ghHelper.getFileContent('wrong_file_type')).rejects.toThrow(
      `Error getting file content for wrong_file_type`
    )
  })
})
