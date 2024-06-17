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
    const type = core.getInput('type', { required: true })
    const stateRepo = core.getInput('state_repo', { required: true })

    // Authenticate with GitHub
    debug('Authenticating with GitHub')
    const octokit = github.getOctokit(token);

    // Loading github context
    debug('Loading github context')
    const ctx = {
      owner: github.context.payload.repository.owner.login,
      repo: github.context.payload.repository.name
    }
    debug('Loaded github context', ctx)



    debug('Loading dispatches file content from path', dispatchesFilePath)

    const encodedYaml = await octokit.rest.repos.getContent({
      owner: ctx.owner,
      repo: ctx.repo,
      path: dispatchesFilePath
    })

    debug('Parsing dispatches file yaml content')

    const yamlContent = Buffer.from(encodedYaml.content, 'base64').toString(
      'utf-8'
    )

    const dispatchesFileContent = YAML.load(yamlContent)
    const typesList = type === '*'
      ? ['releases', 'snapshots']
      : [type]

    const selectedFlavors = core.getInput('flavors')
    const flavorsList =
      selectedFlavors === '*' ? '*' : selectedFlavors.split(',')

    const stateReposList = stateRepo === '*'
      ? '*'
      : stateRepo.split(',')

    const dispatchMatrix = []

    for (const dispatch of dispatchesFileContent['dispatches']) {
      if (typesList.includes(dispatch.type)) {
        for (const flavor of dispatch.flavors) {
          if (flavorsList.includes(flavor)) {
            for (const stateRepo of dispatch.state_repos) {
              for (const serviceName of stateRepo.service_names) {
                const imageName = calculateImageName(
                  stateRepo.version,
                  octokit,
                  ctx,
                  flavor
                )
                const registry = stateRepo.registry || defaultRegistry
                const fullImagePath = `${registry}:${imageName}`

                debug('Dispatching image', fullImagePath, 'to state repo', stateRepo.repo, 'for service', serviceName)
                await octokit.rest.repos.createDispatchEvent({
                  owner: ctx.owner,
                  repo: stateRepo.repo,
                  event_type: 'dispatch-image',
                  client_payload: {
                    tenant: stateRepo.tenant,
                    app: stateRepo.application,
                    env: stateRepo.env,
                    service_name: serviceName,
                    image: fullImagePath,
                    reviewers: [],
                    base_folder: stateRepo.base_path || ''
                  }
                })
              }
            }
          }
        }
      }
    }
  } catch (error) {
    // Fail the workflow run if an error occurs
    core.setFailed(error.message)
  }
}

function calculateImageName(action_type, octokit, ctx, flavor) {
  let image
  switch (action_type) {
    case 'last_prerelease':
      image = __last_prerelease(octokit, ctx)
      break
    case 'last_release':
      image = __last_release(octokit, ctx)
      break
    default:
      if (action_type.match(/^branch_/)) {
        image = __last_branch_commit(action_type, octokit, ctx)
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

function __last_release(octokit, ctx) {
  return octokit.rest.repos
    .getLatestRelease({
      owner: ctx.owner,
      repo: ctx.repo
    }).then((r) => {
      return r.data.tag_name
    }).catch((err) => {
      throw `calculating last release: ${err}`
    })
}

function __last_prerelease(octokit, ctx) {
  return octokit.rest.repos
    .listReleases({
      owner: ctx.owner,
      repo: ctx.repo
    }).then((rr) => {
      return rr.data.filter(r => r.prerelease)[0]
    }).then((r) => {
      if (r) return r.tag_name
      return null
    }).catch((err) => {
      throw `calculating last pre-release: ${err}`
    })
}

function __last_branch_commit(branch, octokit, ctx) {
  return octokit.rest.repos
    .getBranch({
      owner: ctx.owner,
      repo: ctx.repo,
      branch: branch.replace(/^branch_/, '')
    }).then((b) => {
      //
      // we only use the first 8 chars of the commit's SHA for tagging
      //
      return b.data.commit.sha.substring(0, 7)
    }).catch((err) => {
      throw `calculating last commit on branch ${branch}: ${err}`
    })
}

module.exports = {
  run
}
