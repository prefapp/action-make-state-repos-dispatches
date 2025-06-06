const core = require('@actions/core')
const github = require('@actions/github')
const debug = require('debug')('make-state-repos-dispatches')
const semver = require('semver')

const _payloadCtx = {
  owner: github.context.payload.repository.owner.login,
  repo: github.context.payload.repository.name
}

/**
 * In order to be able to have the minimum required permissions in the GitHub App,
 * we only use the GitHub App token to create dispatch events and the GitHub token
 * to read the repository information, such as the latest release, file contents, etc.
 * This way, we can avoid using the GitHub App token for read operations, which would
 * require additional permissions that we don't need.
 */

const GITHUB_READ_ONLY_TOKEN = core.getInput('read_token', true)
const readOnlyOctokit = github.getOctokit(GITHUB_READ_ONLY_TOKEN)

const GITHUB_APP_TOKEN = core.getInput('token', true)
const appOctokit = github.getOctokit(GITHUB_APP_TOKEN)

// We use `module.exports` in this module to allow using spyOn in tests so we can validate
// that the dispatch event is being created with the correct authentication

/**
 * To call this functions we call it through the module.exports object. This allows
 * us to use spyOn in tests to validate that the dispatch event is being created
 * with the correct authentication (e.g. `module.exports.getReadOnlyOctokit()`).
 */

function getReadOnlyOctokit() {
  return readOnlyOctokit
}

function getAppOctokit() {
  return appOctokit
}

const regex = /([0-9]+)(\.[0-9]+)?(\.[0-9]+)?/

function _resolveSemver(version) {
  try {
    return version.match(regex).map(value => {
      if (value) return value.replaceAll('.', '')
    })
  } catch (e) {
    throw new Error(`${version} could not be parsed as a SemVer filter`)
  }
}

function getInput(inputName, isRequired = false) {
  try {
    return core.getInput(inputName, { required: isRequired })
  } catch (e) {
    throw new Error(`Error trying to get Github input ${inputName}: ${e}`)
  }
}

function getAllInputs() {
  try {
    const dispatchesFilePath = core.getInput('dispatches_file', {
      required: true
    })
    const appsFolderPath = core.getInput('apps_folder', { required: true })
    const clustersFolderPath = core.getInput('platform_folder', {
      required: true
    })
    const registriesFolderPath = core.getInput('registries_folder', {
      required: true
    })
    const imageType = core.getInput('image_type', { required: true })
    const defaultReleasesRegistry = core.getInput('default_releases_registry', {
      required: true
    })
    const defaultSnapshotsRegistry = core.getInput(
      'default_snapshots_registry',
      { required: true }
    )

    const buildSummary = core.getInput('build_summary')
    const flavorFilter = core.getInput('flavors')
    const envFilter = core.getInput('filter_by_env')
    const tenantFilter = core.getInput('filter_by_tenant')
    const clusterFilter = core.getInput('filter_by_platform')
    const overwriteVersion = core.getInput('overwrite_version')
    const overwriteEnv = core.getInput('overwrite_env')
    const overwriteTenant = core.getInput('overwrite_tenant')
    const reviewers = core.getInput('reviewers')
    const checkRunName = core.getInput('check_run_name')

    return {
      dispatchesFilePath,
      appsFolderPath,
      clustersFolderPath,
      registriesFolderPath,
      imageType,
      defaultReleasesRegistry,
      defaultSnapshotsRegistry,
      buildSummary,
      flavorFilter,
      envFilter,
      tenantFilter,
      clusterFilter,
      overwriteVersion,
      overwriteEnv,
      overwriteTenant,
      reviewers,
      checkRunName
    }
  } catch (e) {
    throw new Error(`Error while obtaining all Github inputs: ${e}`)
  }
}

function getPayloadContext() {
  debug('Getting payload context', _payloadCtx)
  return _payloadCtx
}

function getRepoContext() {
  debug('Getting repo context', github.context.repo)
  return github.context.repo
}

async function getLatestRelease(payload) {
  try {
    const octokit = module.exports.getReadOnlyOctokit()

    if (payload.tag) {
      return await getLatestTaggedRelease(payload, octokit)
    } else {
      return await octokit.rest.repos.getLatestRelease(payload)
    }
  } catch (e) {
    console.error(e)

    throw new Error(`Error getting latest release for ${payload}`)
  }
}

async function getLatestTaggedRelease(payload, octokit) {
  try {
    const response = await octokit.rest.repos.listReleases({
      owner: payload.owner,
      repo: payload.repo
    })

    const releases = response.data.filter(r => !r.prerelease)

    return await getHighestSemVerTaggedRelease(payload.tag, releases)
  } catch (e) {
    console.error(e)

    throw new Error(`Error getting latest release for ${payload}`)
  }
}

async function getHighestSemVerTaggedRelease(tag_filter, releases) {
  const [_, filterMajor, filterMinor, filterPatch] = _resolveSemver(tag_filter)

  let highestSemverRelease = null
  for (const currentRelease of releases) {
    const [__, releaseMajor, releaseMinor, releasePatch] = _resolveSemver(
      currentRelease.tag_name
    )

    if (
      !releaseMajor ||
      !releaseMinor ||
      !releasePatch ||
      filterMajor !== releaseMajor ||
      (filterMinor && filterMinor !== releaseMinor) ||
      (filterPatch && filterPatch !== releasePatch)
    ) {
      continue
    }

    if (
      highestSemverRelease === null ||
      semver.gte(currentRelease.tag_name, highestSemverRelease.tag_name)
    )
      highestSemverRelease = currentRelease
  }

  if (highestSemverRelease === null)
    throw new Error(`No release matched filter ${tag_filter}`)

  return highestSemverRelease
}

async function getLatestPrerelease(payload) {
  try {
    const octokit = module.exports.getReadOnlyOctokit()

    const listReleasesResponse = await octokit.rest.repos.listReleases(payload)

    const sortedPrereleases = sortReleasesByTime(
      listReleasesResponse.data.filter(r => r.prerelease)
    )

    if (payload.tag) {
      return await getHighestSemVerTaggedRelease(payload.tag, sortedPrereleases)
    } else {
      return sortedPrereleases[0]
    }
  } catch (e) {
    console.error(e)

    throw new Error(`Error getting latest prerelease for ${payload}`)
  }
}

function sortReleasesByTime(releases) {
  return releases.sort((a, b) => {
    return Date.parse(a.created_at) <= Date.parse(b.created_at) ? 1 : -1
  })
}

async function getLastBranchCommit(payload, short = true) {
  try {
    const octokit = module.exports.getReadOnlyOctokit()

    const getBranchResponse = await octokit.rest.repos.getBranch(payload)

    if (short) {
      return getBranchResponse.data.commit.sha.substring(0, 7)
    }
    return getBranchResponse.data.commit.sha
  } catch (e) {
    console.error(e)

    throw new Error(`Error getting last branch commit for ${payload}`)
  }
}

async function getFileContent(filePath) {
  try {
    const ctx = getPayloadContext()
    const octokit = module.exports.getReadOnlyOctokit()

    const fileResponse = await octokit.rest.repos.getContent({
      owner: ctx.owner,
      repo: ctx.repo,
      path: filePath
    })

    if (fileResponse.status !== 200) {
      throw new Error(
        `Got status code ${fileResponse.status}, please check the file path exists or the token permissions.`
      )
    }
    if (fileResponse.data.type !== 'file') {
      throw new Error(`The path ${filePath} is not a file.`)
    }

    return fileResponse.data.content
  } catch (e) {
    console.error(e)

    throw new Error(`Error getting file content for ${filePath}`)
  }
}

async function getSummaryDataForRef(ref, workflowName) {
  try {
    console.info(
      `Getting check run summary for ref: ${ref} and workflow: ${workflowName}`
    )
    const octokit = module.exports.getReadOnlyOctokit()
    const ctx = getPayloadContext()

    const resp = await octokit.request(
      `GET /repos/${ctx.owner}/${ctx.repo}/commits/${ref}/check-runs`,
      {
        owner: ctx.owner,
        repo: ctx.repo,
        ref,
        headers: { 'X-GitHub-Api-Version': '2022-11-28' }
      }
    )

    const checkRun = resp.data.check_runs.find(
      check => check.name === workflowName
    )

    if (!checkRun) {
      console.info(
        `Check run not found for ref: ${ref} and workflow: ${workflowName}`
      )

      return false
    } else {
      console.info(
        `Check run found for ref: ${ref} and workflow: ${workflowName}`
      )

      return {
        summary: checkRun.output.summary,
        conclusion: checkRun.conclusion,
        id: checkRun.id
      }
    }
  } catch (e) {
    console.error(e)

    throw new Error(
      `Error getting check run summary for ref: ${ref} and workflow: ${workflowName}`
    )
  }
}

async function dispatch(stateRepoName, dispatchEventType, dispatchMatrix) {
  try {
    const octokit = module.exports.getAppOctokit()
    const ownerAndRepo = stateRepoName.split('/')
    const owner = ownerAndRepo[0]
    const repo = ownerAndRepo[1]

    await octokit.rest.repos.createDispatchEvent({
      owner,
      repo,
      event_type: dispatchEventType,
      client_payload: {
        images: dispatchMatrix,
        version: 4
      }
    })

    return true
  } catch (e) {
    console.error(e)

    throw new Error(
      `Error creating dispatch event for repo ${stateRepoName}. ` +
        `Dispatch matrix: ${dispatchMatrix}`
    )
  }
}

function handleNotice(msg) {
  core.notice(msg)
}

function handleSummary(heading, table) {
  core.summary.addHeading(heading).addTable(table).write()
}

function handleError(msg) {
  core.error(msg)
}

function handleFailure(msg) {
  core.setFailed(msg)
}

module.exports = {
  getInput,
  getPayloadContext,
  getRepoContext,
  getReadOnlyOctokit,
  getAppOctokit,
  getLatestRelease,
  getLatestPrerelease,
  sortReleasesByTime,
  getLastBranchCommit,
  getFileContent,
  dispatch,
  handleNotice,
  handleSummary,
  handleError,
  handleFailure,
  getAllInputs,
  getSummaryDataForRef,
  getHighestSemVerTaggedRelease,
  _resolveSemver // Exported for testing purpouses
}
