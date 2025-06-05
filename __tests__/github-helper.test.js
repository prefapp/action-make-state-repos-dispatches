const core = require('@actions/core')
const github = require('@actions/github')
const debug = require('debug')('make-state-repos-dispatches')
const ghHelper = require('../utils/github-helper')

jest.mock('@actions/core', () => ({
  getInput: inputName => {
    if (inputName === 'throw') {
      throw new Error(`Not found`)
    }
    return `${inputName}-value`
  },
  notice: jest.fn(),
  error: jest.fn(),
  setFailed: jest.fn(),
  summary: {
    addHeading: heading => {
      return {
        addTable: msg => {
          return {
            write: () => {
              throw new Error(
                `Function correctly executed with ${heading} and ${msg}`
              )
            }
          }
        }
      }
    }
  }
}))

jest.mock('@actions/github', () => ({
  getOctokit: () => {
    return {
      request: (url, payload) => {
        if (url.includes('throw')) {
          throw new Error()
        } else {
          return {
            data: {
              check_runs: [
                {
                  name: 'check1',
                  id: 'id1',
                  conclusion: 'conclusion1',
                  output: { summary: 'summary1' }
                },
                {
                  name: 'check2',
                  id: 'id2',
                  conclusion: 'conclusion2',
                  output: { summary: 'summary2' }
                },
                {
                  name: 'check3',
                  id: 'id3',
                  conclusion: 'conclusion3',
                  output: { summary: 'summary3' }
                },
                {
                  name: 'check4',
                  id: 'id4',
                  conclusion: 'conclusion4',
                  output: { summary: 'summary4' }
                }
              ]
            }
          }
        }
      },
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
          createDispatchEvent: jest.fn(payload => {
            if (payload.repo === 'throw') {
              throw new Error()
            }
          }),
          listReleases: payload => {
            if (payload.throw) {
              throw new Error()
            } else {
              return {
                data: [
                  {
                    prerelease: true,
                    created_at: '2024-03-11',
                    tag_name: 'v1.2.3'
                  },
                  {
                    prerelease: true,
                    created_at: '2024-07-11',
                    tag_name: 'v2.3.4'
                  },
                  {
                    prerelease: false,
                    created_at: '2024-07-15',
                    tag_name: 'v3.4.5'
                  }
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

beforeEach(() => {
  jest.spyOn(console, 'error')
  console.error.mockImplementation(() => null)

  jest.spyOn(console, 'info')
  console.info.mockImplementation(() => null)
})

afterEach(() => {
  console.error.mockRestore()
  console.info.mockRestore()
})

describe('github-helper', () => {
  it('can get an input using @actions/core', async () => {
    const inputValue = ghHelper.getInput('test-input')

    expect(inputValue).toEqual('test-input-value')
  })

  it('throws an error when an input is not found', async () => {
    expect(() => {
      ghHelper.getInput('throw')
    }).toThrow('Error trying to get Github input throw')
  })

  it('can get all inputs via @actions/core', async () => {
    const result = ghHelper.getAllInputs()

    expect(result).toEqual({
      appsFolderPath: 'apps_folder-value',
      clustersFolderPath: 'platform_folder-value',
      registriesFolderPath: 'registries_folder-value',
      dispatchesFilePath: 'dispatches_file-value',
      imageType: 'image_type-value',
      defaultReleasesRegistry: 'default_releases_registry-value',
      defaultSnapshotsRegistry: 'default_snapshots_registry-value',
      buildSummary: 'build_summary-value',
      flavorFilter: 'flavors-value',
      envFilter: 'filter_by_env-value',
      tenantFilter: 'filter_by_tenant-value',
      clusterFilter: 'filter_by_platform-value',
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
    const result = ghHelper.getBuiltinOctokit()

    expect(result).not.toEqual(null)
  })

  it('can get the latest release, with and without tags', async () => {
    const latestRelease = await ghHelper.getLatestRelease({})
    expect(latestRelease).toEqual('got-latest-release')

    const tag = 'v3.4.5'
    const releaseByTag = await ghHelper.getLatestRelease({ tag })
    expect(releaseByTag.tag_name).toEqual(tag)
  })

  it("correctly resolves SemVer's major, minor and patch values", async () => {
    const sv123 = '1.2.3'
    const [sv123Full, sv123Major, sv123Minor, sv123Patch] =
      ghHelper._resolveSemver(sv123)

    expect(sv123Full).toEqual('123')
    expect(sv123Major).toEqual('1')
    expect(sv123Minor).toEqual('2')
    expect(sv123Patch).toEqual('3')

    const sv456 = 'tagged_version_4.5.6'
    const [sv456Full, sv456Major, sv456Minor, sv456Patch] =
      ghHelper._resolveSemver(sv456)

    expect(sv456Full).toEqual('456')
    expect(sv456Major).toEqual('4')
    expect(sv456Minor).toEqual('5')
    expect(sv456Patch).toEqual('6')

    const sv789 = 'leftText-7.8.9-rightText'
    const [sv789Full, sv789Major, sv789Minor, sv789Patch] =
      ghHelper._resolveSemver(sv789)

    expect(sv789Full).toEqual('789')
    expect(sv789Major).toEqual('7')
    expect(sv789Minor).toEqual('8')
    expect(sv789Patch).toEqual('9')

    const svAll = '0.1.2.3.4.5.6.7.8.9'
    const [svAllFull, svAllMajor, svAllMinor, svAllPatch] =
      ghHelper._resolveSemver(svAll)

    expect(svAllFull).toEqual('012')
    expect(svAllMajor).toEqual('0')
    expect(svAllMinor).toEqual('1')
    expect(svAllPatch).toEqual('2')
  })

  it('can filter SemVer tagged releases', async () => {
    const releases = [
      { tag_name: 'v2.0.0-rc5' },
      { tag_name: 'v2.0.0' },
      { tag_name: 'v3.0.0-rc3' },
      { tag_name: 'v3.0.0-rc2' },
      { tag_name: 'v2.9.6' },
      { tag_name: 'v2.9.20' },
      { tag_name: 'v2.5.4' }
    ]

    const onlyMajorVersion = 'v2'
    const onlyMajorVersionResult = await ghHelper.getHighestSemVerTaggedRelease(
      onlyMajorVersion,
      releases
    )
    expect(onlyMajorVersionResult.tag_name).toEqual('v2.9.20')

    const upToMinorVersion = 'v2.5'
    const upToMinorVersionResult = await ghHelper.getHighestSemVerTaggedRelease(
      upToMinorVersion,
      releases
    )
    expect(upToMinorVersionResult.tag_name).toEqual('v2.5.4')

    const upToPatchVersion = 'v2.9.6'
    const upToPatchVersionResult = await ghHelper.getHighestSemVerTaggedRelease(
      upToPatchVersion,
      releases
    )
    expect(upToPatchVersionResult.tag_name).toEqual('v2.9.6')

    const beyondPatchVersion = 'v3.0.0'
    const beyondPatchVersionResult =
      await ghHelper.getHighestSemVerTaggedRelease(beyondPatchVersion, releases)
    expect(beyondPatchVersionResult.tag_name).toEqual('v3.0.0-rc3')

    const rcIsLowerVersion = 'v2.0.0'
    const rcIsLowerVersionResult = await ghHelper.getHighestSemVerTaggedRelease(
      rcIsLowerVersion,
      releases
    )
    expect(rcIsLowerVersionResult.tag_name).toEqual('v2.0.0')
  })

  it("throws an error when no matching release is found or the filter doesn't have a major number", async () => {
    const incorrectTag = 'abcdefg'
    await expect(
      ghHelper.getHighestSemVerTaggedRelease(incorrectTag, [])
    ).rejects.toThrow(`${incorrectTag} could not be parsed as a SemVer filter`)

    const tag = 'v2'
    await expect(
      ghHelper.getHighestSemVerTaggedRelease(tag, [])
    ).rejects.toThrow(`No release matched filter ${tag}`)
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

  it('can get the latest prerelease, with and without tags', async () => {
    const latestPrerelease = await ghHelper.getLatestPrerelease({})
    expect(latestPrerelease.created_at).toEqual('2024-07-11')

    const tag = 'v1.2.3'
    const prereleaseByTag = await ghHelper.getLatestPrerelease({ tag })
    expect(prereleaseByTag.tag_name).toEqual(tag)
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

  it('can get the summary of a reference', async () => {
    const summaryContents = await ghHelper.getSummaryDataForRef('', 'check3')

    expect(summaryContents.id).toEqual('id3')
    expect(summaryContents.conclusion).toEqual('conclusion3')
    expect(summaryContents.summary).toEqual('summary3')
  })

  it('when a reference is not found, false is returned instead', async () => {
    const summaryContents = await ghHelper.getSummaryDataForRef('', 'check5')

    expect(summaryContents).toEqual(false)
  })

  it('when looking for a reference, throws an error if any happen', async () => {
    await expect(ghHelper.getSummaryDataForRef('throw', 'wf')).rejects.toThrow(
      `Error getting check run summary for ref: throw and workflow: wf`
    )
  })

  it('can make dispatches', async () => {
    const getAppOctokitSpy = jest.spyOn(ghHelper, 'getAppOctokit');

    const result = await ghHelper.dispatch('', '', { repo: '' })

    // Validate that is using the app octokit
    expect(getAppOctokitSpy).toHaveBeenCalled()

    getAppOctokitSpy.mockRestore()

    expect(result).toEqual(true)
  })

  it('when making dispatches, throws an error if any happen', async () => {
    const repoObj = { repo: 'org/throw' }
    await expect(
      ghHelper.dispatch('org/throw', 'event', 'dispatch-matrix')
    ).rejects.toThrow(
      `Error creating dispatch event for repo org/throw. ` +
        `Dispatch matrix: dispatch-matrix`
    )
  })

  it('can handle varied types of messages: info, failures, errors', async () => {
    ghHelper.handleNotice('')
    expect(core.notice).toHaveBeenCalled()

    ghHelper.handleError('')
    expect(core.error).toHaveBeenCalled()

    ghHelper.handleFailure('')
    expect(core.setFailed).toHaveBeenCalled()
  })

  it('can handle creating a summary', async () => {
    expect(() => ghHelper.handleSummary('header', 'message-content')).toThrow(
      'Function correctly executed with header and message-content'
    )
  })
})
