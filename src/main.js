const core = require('@actions/core')
const github = require('@actions/github')
const YAML = require('js-yaml')
const debug = require('debug')('make-state-repos-dispatches')
const { execSync } = require('child_process')

function checkDockerManifest(image) {
  try {
    // Execute the command
    const output = execSync(`docker manifest inspect ${image}`, {
      stdio: 'ignore'
    })

    // If the command succeeds (exit code 0), return true
    return true
  } catch (error) {
    // If the command fails (non-zero exit code), return false
    return false
  }
}

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
async function run() {
  const summaryTable = [
    [
      { data: 'State repository', header: true },
      { data: 'Tenant', header: true },
      { data: 'Application', header: true },
      { data: 'Env', header: true },
      { data: 'Service Name', header: true },
      { data: 'Image', header: true },
      { data: 'Reviewers', header: true },
      { data: 'Base Folder', header: true },
      { data: 'Status', header: true }
    ]
  ]

  try {
    // Parse action inputs
    debug('Parsing action inputs')

    const dispatchesFilePath = core.getInput('dispatches_file', {
      required: true
    })

    const defaultRegistries = {
      releases: core.getInput('default_releases_registry', { required: true }),
      snapshots: core.getInput('default_snapshots_registry', { required: true })
    }
    const token = core.getInput('token', { required: true })
    const image_type = core.getInput('image_type', { required: true })
    const destinationRepos = core.getInput('state_repo', { required: true })
    const reviewersInput = core.getInput('reviewers', { required: true })
    const registryBasePathsRaw = core.getInput('registry_base_paths')
    const version = core.getInput('overwrite_version')
    const envOverride = core.getInput('overwrite_env')
    const tenantOverride = core.getInput('overwrite_tenant')
    const envFilter = core.getInput('filter_by_env')
    const tenantFilter = core.getInput('filter_by_tenant')

    const registryBasePaths = JSON.parse(registryBasePathsRaw)

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
    const imageTypesList =
      image_type === '*' ? ['releases', 'snapshots'] : [image_type]

    const selectedFlavors = core.getInput('flavors')
    const flavorsList =
      selectedFlavors === '*' ? '*' : getListFromInput(selectedFlavors)

    const stateReposList =
      destinationRepos === '*' ? '*' : getListFromInput(destinationRepos)

    const envFilterList = envFilter === '*' ? '*' : getListFromInput(envFilter)
    const tenantFilterList =
      tenantFilter === '*' ? '*' : getListFromInput(tenantFilter)

    const reviewersList = getListFromInput(reviewersInput)

    let dispatchMatrix = []

    for (const dispatch of dispatchesFileContent['dispatches']) {
      if (!imageTypesList.includes(dispatch.type)) {
        debug('Skipping dispatch', dispatch.type)
        continue
      }
      for (const flavor of dispatch.flavors) {
        if (flavorsList !== '*' && !flavorsList.includes(flavor)) {
          debug('Skipping flavor', flavor)
          continue
        }
        for (const stateRepo of dispatch.state_repos) {
          if (
            (stateReposList !== '*' &&
              !stateReposList.includes(stateRepo.repo)) ||
            (envFilterList !== '*' && !envFilterList.includes(stateRepo.env)) ||
            (tenantFilterList !== '*' &&
              !tenantFilterList.includes(stateRepo.tenant))
          ) {
            debug('Skipping state repo', stateRepo)
            continue
          }

          dispatchMatrix = []

          for (const serviceName of stateRepo.service_names) {
            const imageName = await calculateImageName(
              version || stateRepo.version,
              octokit,
              ctx,
              flavor
            )

            const registry =
              stateRepo.registry || defaultRegistries[dispatch.type]
            const imageRepository =
              stateRepo.image_repository ||
              `${github.context.repo.owner}/${github.context.repo.repo}`

            const imageBasePath = registryBasePaths?.services?.[dispatch.type]

            const fullImageBasePath =
              imageBasePath &&
              !stateRepo.registry &&
              !stateRepo.image_repository
                ? `${imageBasePath}/`
                : ''

            const fullImageRepo = `${registry}/${fullImageBasePath}${imageRepository}`

            console.log('Registry debug')
            console.log(`stateRepo.registry: ${stateRepo.registry}`)
            console.log(`defaultRegistry: ${defaultRegistries[dispatch.type]}`)
            console.log(`registry: ${registry}`)
            console.log(`imageRepo: ${fullImageRepo}`)

            const fullImagePath = `${fullImageRepo}:${imageName}`

            const imageExists = checkDockerManifest(fullImagePath)
            const dispatchStatus = imageExists
              ? '✔ Dispatching'
              : '❌ Error: Image not found in registry'

            summaryTable.push([
              `${ctx.owner}/${stateRepo.repo}`,
              tenantOverride || stateRepo.tenant,
              stateRepo.application,
              envOverride || stateRepo.env,
              serviceName,
              fullImagePath,
              reviewersList.join(', '),
              stateRepo.base_path || '',
              dispatchStatus
            ])

            if (!imageExists) {
              core.error(`Image ${fullImagePath} not found in registry`)
              continue
            }

            core.notice(
              `Dispatching image ${fullImagePath} to state repo ${stateRepo.repo} for service ${serviceName}`
            )

            dispatchMatrix.push({
              tenant: tenantOverride || stateRepo.tenant,
              app: stateRepo.application,
              env: envOverride || stateRepo.env,
              service_name: serviceName,
              image: fullImagePath,
              reviewers: reviewersList,
              base_folder: stateRepo.base_path || '',
              message: dispatchStatus
            })
          }

          if (dispatchMatrix.length === 0) continue

          await octokit.rest.repos.createDispatchEvent({
            owner: ctx.owner,
            repo: stateRepo.repo,
            event_type: stateRepo.dispatch_event_type || 'dispatch-image',
            client_payload: {
              images: dispatchMatrix,
              version: 4
            }
          })
        }
      }
    }
  } catch (error) {
    // Fail the workflow run if an error occurs
    core.setFailed(error.message)
  } finally {
    core.summary.addHeading('Dispatches summary').addTable(summaryTable).write()
  }
}

async function calculateImageName(version, octokit, ctx, flavor) {
  let image

  debug('Calculating image name for action type %s', version)

  switch (version) {
    case '$latest_prerelease':
      image = await __last_prerelease(octokit, ctx)
      break
    case '$latest_release':
      image = await __last_release(octokit, ctx)
      break
    default:
      if (version.match(/^\$branch_/)) {
        image = await __last_branch_commit(version, octokit, ctx)
      } else {
        image = version
      }
  }

  // If no flavor is provided, throw error
  if (!flavor) throw new Error('Flavor is required')
  return `${image}_${flavor}`
}

function getListFromInput(input) {
  return input.replace(' ', '').split(',')
}

async function __last_release(octokit, ctx) {
  try {
    const latestReleaseResponse = await octokit.rest.repos.getLatestRelease({
      owner: ctx.owner,
      repo: ctx.repo
    })

    return latestReleaseResponse.data.tag_name
  } catch (err) {
    throw new Error(`calculating last release: ${err}`)
  }
}

async function __last_prerelease(octokit, ctx) {
  try {
    const listReleasesResponse = await octokit.rest.repos.listReleases({
      owner: ctx.owner,
      repo: ctx.repo
    })

    const latestPrerelease = listReleasesResponse.data.filter(
      r => r.prerelease
    )[0]

    if (latestPrerelease) return latestPrerelease.tag_name

    return null
  } catch (err) {
    throw new Error(`calculating last pre-release: ${err}`)
  }
}

async function __last_branch_commit(branch, octokit, ctx) {
  try {
    const getBranchResponse = await octokit.rest.repos.getBranch({
      owner: ctx.owner,
      repo: ctx.repo,
      branch: branch.replace(/^\$branch_/, '')
    })

    return getBranchResponse.data.commit.sha.substring(0, 7)
  } catch (err) {
    throw new Error(`calculating last commit on branch ${branch}: ${err}`)
  }
}

module.exports = {
  run
}
