const core = require('@actions/core')
const github = require('@actions/github')
const YAML = require('js-yaml')
const debug = require('debug')('make-state-repos-dispatches')

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
async function run() {
  try {
    // Parse action inputs
    debug('Parsing action inputs')

    const dispatchesFilePath = core.getInput('dispatches_file', {
      required: true
    })

    const defaultRegistry = core.getInput('default_registry')
    const token = core.getInput('token', { required: true })
    const dispatch_type = core.getInput('dispatch_type', { required: true })
    const stateRepo = core.getInput('state_repo', { required: true })

    // Authenticate with GitHub
    debug('Authenticating with GitHub')
    const octokit = github.getOctokit(token)

    // Loading github context
    debug('Loading github context')
    const ctx = {
      owner: github.context.payload.repository.owner.login,
      repo: github.context.payload.repository.name
    }
    debug('Loaded github context', ctx)

    debug('Loading dispatches file content from path', dispatchesFilePath)

    const dispatchFileResponse = await octokit.rest.repos.getContent({
      owner: ctx.owner,
      repo: ctx.repo,
      path: dispatchesFilePath
    })

    if (dispatchFileResponse.status !== 200)
      throw new Error(
        `Got status code ${dispatchFileResponse.status}, please check the file path exists or the token permissions.`
      )
    if (dispatchFileResponse.data.type !== 'file')
      throw new Error(`The path ${dispatchesFilePath} is not a file.`)

    debug('Parsing dispatches file yaml content')

    const yamlContent = Buffer.from(
      dispatchFileResponse.data.content,
      'base64'
    ).toString('utf-8')

    const dispatchesFileContent = YAML.load(yamlContent)
    const dispatcheTypesList =
      dispatch_type === '*' ? ['releases', 'snapshots'] : [dispatch_type]

    const selectedFlavors = core.getInput('flavors')
    const flavorsList =
      selectedFlavors === '*' ? '*' : selectedFlavors.split(',')

    const stateReposList = stateRepo === '*' ? '*' : stateRepo.split(',')

    const dispatchMatrix = []

    for (const dispatch of dispatchesFileContent['dispatches']) {
      if (!dispatcheTypesList.includes(dispatch.type)) {
        debug('Skipping dispatch', dispatch.type)
        continue
      }
      for (const flavor of dispatch.flavors) {
        if (!flavorsList.includes(flavor)) {
          debug('Skipping flavor', flavor)
          continue
        }
        for (const stateRepo of dispatch.state_repos) {
          for (const serviceName of stateRepo.service_names) {
            const imageName = await calculateImageName(
              stateRepo.version,
              octokit,
              ctx,
              flavor
            )
            const registry = stateRepo.registry || defaultRegistry

            console.log('Registry debug')
            console.log(`stateRepo.registry: ${stateRepo.registry}`)
            console.log(`defaultRegistry: ${defaultRegistry}`)
            console.log(`registry: ${registry}`)

            const fullImagePath = `${registry}:${imageName}`

            debug(
              'Dispatching image',
              fullImagePath,
              'to state repo',
              stateRepo.repo,
              'for service',
              serviceName
            )
            await octokit.rest.repos.createDispatchEvent({
              owner: ctx.owner,
              repo: stateRepo.repo,
              event_type: 'dispatch-image',
              client_payload: {
                images: [
                  {
                    tenant: stateRepo.tenant,
                    app: stateRepo.application,
                    env: stateRepo.env,
                    service_name: serviceName,
                    image: fullImagePath,
                    reviewers: [],
                    base_folder: stateRepo.base_path || ''
                  }
                ],
                version: 4
              }
            })
          }
        }
      }
    }
  } catch (error) {
    // Fail the workflow run if an error occurs
    core.setFailed(error.message)
  }
}

async function calculateImageName(action_type, octokit, ctx, flavor) {
  let image

  debug('Calculating image name for action type %s', action_type)

  switch (action_type) {
    case '$latest_prerelease':
      image = await __last_prerelease(octokit, ctx)
      break
    case '$latest_release':
      image = await __last_release(octokit, ctx)
      break
    default:
      if (action_type.match(/^branch_/)) {
        image = await __last_branch_commit(action_type, octokit, ctx)
      } else {
        image = action_type
      }
  }

  if (flavor) {
    return `${image}_${flavor}`
  } else {
    return image
  }
}

async function __last_release(octokit, ctx) {
  return await octokit.rest.repos
    .getLatestRelease({
      owner: ctx.owner,
      repo: ctx.repo
    })
    .then(r => {
      return r.data.tag_name
    })
    .catch(err => {
      throw `calculating last release: ${err}`
    })
}

async function __last_prerelease(octokit, ctx) {
  return await octokit.rest.repos
    .listReleases({
      owner: ctx.owner,
      repo: ctx.repo
    })
    .then(rr => {
      return rr.data.filter(r => r.prerelease)[0]
    })
    .then(r => {
      if (r) return r.tag_name
      return null
    })
    .catch(err => {
      throw `calculating last pre-release: ${err}`
    })
}

async function __last_branch_commit(branch, octokit, ctx) {
  return await octokit.rest.repos
    .getBranch({
      owner: ctx.owner,
      repo: ctx.repo,
      branch: branch.replace(/^branch_/, '')
    })
    .then(b => {
      //
      // we only use the first 8 chars of the commit's SHA for tagging
      //
      return b.data.commit.sha.substring(0, 7)
    })
    .catch(err => {
      throw `calculating last commit on branch ${branch}: ${err}`
    })
}

module.exports = {
  run
}
