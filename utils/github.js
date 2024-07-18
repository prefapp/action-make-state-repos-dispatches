const core = require('@actions/core')
const github = require('@actions/github')
const debug = require('debug')('make-state-repos-dispatches')

const _payloadCtx = {
  owner: github.context.payload.repository.owner.login,
  repo: github.context.payload.repository.name
}

const _token = core.getInput('token', true)
const _octokit = github.getOctokit(_token)

function getInput(inputName, isRequired = false) {
  return core.getInput(inputName, { required: isRequired })
}

function getAllInputs() {
  const dispatchesFilePath = core.getInput('dispatches_file', {
    required: true
  })
  const imageType = core.getInput('image_type', { required: true })
  const stateRepoFilter = core.getInput('state_repo', { required: true })
  const defaultReleasesRegistry = core.getInput('default_releases_registry', {
    required: true
  })
  const defaultSnapshotsRegistry = core.getInput('default_snapshots_registry', {
    required: true
  })

  const buildSummary = core.getInput('build_summary')
  const flavorFilter = core.getInput('flavors')
  const envFilter = core.getInput('filter_by_env')
  const tenantFilter = core.getInput('filter_by_tenant')
  const overwriteVersion = core.getInput('overwrite_version')
  const overwriteEnv = core.getInput('overwrite_env')
  const overwriteTenant = core.getInput('overwrite_tenant')
  const reviewers = core.getInput('reviewers')
  const registryBasePaths = core.getInput('registry_base_paths')

  return {
    dispatchesFilePath,
    imageType,
    stateRepoFilter,
    defaultReleasesRegistry,
    defaultSnapshotsRegistry,
    buildSummary,
    flavorFilter,
    envFilter,
    tenantFilter,
    overwriteVersion,
    overwriteEnv,
    overwriteTenant,
    reviewers,
    registryBasePaths
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

function getOctokit() {
  return _octokit
}

async function getLatestRelease(payload) {
  const octokit = getOctokit()

  return await octokit.rest.repos.getLatestRelease(payload)
}

async function getLatestPrerelease(payload) {
  const octokit = getOctokit()

  const listReleasesResponse = await octokit.rest.repos.listReleases(payload)

  return listReleasesResponse.data.filter(r => r.prerelease)[0]
}

async function getLastBranchCommit(payload) {
  const octokit = getOctokit()

  const getBranchResponse = await octokit.rest.repos.getBranch(payload)

  return getBranchResponse.data.commit.sha.substring(0, 7)
}

async function getFileContent(filePath) {
  const ctx = getPayloadContext()
  const octokit = getOctokit()

  const fileResponse = await octokit.rest.repos.getContent({
    owner: ctx.owner,
    repo: ctx.repo,
    path: filePath
  })

  if (fileResponse.status !== 200)
    throw new Error(
      `Got status code ${fileResponse.status}, please check the file path exists or the token permissions.`
    )
  if (fileResponse.data.type !== 'file')
    throw new Error(`The path ${filePath} is not a file.`)

  return fileResponse.data.content
}

async function dispatch(repoData, dispatchMatrix) {
  const ctx = getPayloadContext()
  const octokit = getOctokit()

  await octokit.rest.repos.createDispatchEvent({
    owner: ctx.owner,
    repo: repoData.repo,
    event_type: repoData.dispatch_event_type || 'dispatch-image',
    client_payload: {
      images: dispatchMatrix,
      version: 4
    }
  })
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
  getOctokit,
  getLatestRelease,
  getLatestPrerelease,
  getLastBranchCommit,
  getFileContent,
  dispatch,
  handleNotice,
  handleSummary,
  handleError,
  handleFailure
}