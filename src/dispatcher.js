const debug = require('debug')('make-state-repos-dispatches')
const YAML = require('js-yaml')
const { execSync } = require('child_process')
const imageNameCalculator = require('../utils/image-name-calculator')

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

function getListFromInput(input) {
  return input.replace(' ', '').split(',')
}

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

async function makeDispatches(gitController) {
  try {
    // Parse action inputs
    debug('Parsing action inputs')

    const dispatchesFilePath = gitController.getInput('dispatches_file', true)
    debug('Loading dispatches file content from path', dispatchesFilePath)
    const dispatchesFileContent =
      await gitController.getFileContent(dispatchesFilePath)

    debug('Parsing dispatches file yaml content')
    const yamlContent = Buffer.from(dispatchesFileContent, 'base64').toString(
      'utf-8'
    )
    const dispatchesFileData = YAML.load(yamlContent)

    const version = gitController.getInput('overwrite_version')
    const repoCtx = gitController.getRepoContext()
    const registryBasePathsRaw = gitController.getInput('registry_base_paths')
    const registryBasePaths = JSON.parse(registryBasePathsRaw)
    const defaultRegistries = {
      releases: gitController.getInput('default_releases_registry', true),
      snapshots: gitController.getInput('default_snapshots_registry', true)
    }
    const calculateFullImageName = (imageName, registry, imageRepository) => {
      const fullImageRepo = `${registry}/${imageRepository}`

      return `${fullImageRepo}:${imageName}`
    }

    const envOverride = gitController.getInput('overwrite_env')
    const tenantOverride = gitController.getInput('overwrite_tenant')
    const reviewersInput = gitController.getInput('reviewers', true)
    const reviewersList = getListFromInput(reviewersInput)

    const dispatchData = createDispatchData(
      dispatchesFileData['dispatches'],
      reviewersList,
      '',
      '',
      version,
      tenantOverride,
      envOverride
    )
  } catch (error) {
    // Fail the workflow run if an error occurs
    gitController.handleFailure(error.message)
  } finally {
    gitController.handleSummary('Dispatches summary', summaryTable)
  }
}

function createDispatchData(
  dispatches,
  reviewersList,
  dispatchStatus,
  buildSummary,
  versionOverride = '',
  tenantOverride = '',
  envOverride = ''
) {
  return dispatches.flatMap(({ type, flavors, state_repos }) =>
    flavors.flatMap(flavor =>
      state_repos.flatMap(({ service_names, ...state_repo }) => {
        const version = versionOverride || state_repo.version
        const imageData = buildSummary.filter(
          entry =>
            entry.flavor === flavor &&
            entry.version === version &&
            entry.image_type === type
        )[0]
        return service_names.flatMap(service_name =>
          imageData.registries.map(registry => ({
            tenant: tenantOverride || state_repo.tenant,
            app: state_repo.application,
            env: envOverride || state_repo.env,
            service_name,
            image: `${registry}/${imageData.repository}:${imageData.image_name}`,
            reviewers: reviewersList,
            base_folder: state_repo.base_path || '',
            message: dispatchStatus
          }))
        )
      })
    )
  )
}

async function iterateDispatches(dispatches, gitController) {
  const image_type = gitController.getInput('image_type', true)
  const imageTypesList =
    image_type === '*' ? ['releases', 'snapshots'] : [image_type]

  for (const dispatch of dispatches) {
    if (!imageTypesList.includes(dispatch.type)) {
      debug('Skipping dispatch', dispatch.type)
    } else {
      await iterateDispatchFlavors(dispatch, gitController)
    }
  }
}

async function iterateDispatchFlavors(dispatch, gitController) {
  const selectedFlavors = gitController.getInput('flavors')
  const flavorsList =
    selectedFlavors === '*' ? '*' : getListFromInput(selectedFlavors)

  for (const flavor of dispatch.flavors) {
    if (flavorsList !== '*' && !flavorsList.includes(flavor)) {
      debug('Skipping flavor', flavor)
    } else {
      await iterateDispatchStateRepos(dispatch, flavor, gitController)
    }
  }
}

async function iterateDispatchStateRepos(dispatch, flavor, gitController) {
  const destinationRepos = gitController.getInput('state_repo', true)
  const envFilter = gitController.getInput('filter_by_env')
  const tenantFilter = gitController.getInput('filter_by_tenant')

  const stateReposList =
    destinationRepos === '*' ? '*' : getListFromInput(destinationRepos)
  const envFilterList = envFilter === '*' ? '*' : getListFromInput(envFilter)
  const tenantFilterList =
    tenantFilter === '*' ? '*' : getListFromInput(tenantFilter)

  for (const stateRepo of dispatch.state_repos) {
    if (
      (stateReposList !== '*' && !stateReposList.includes(stateRepo.repo)) ||
      (envFilterList !== '*' && !envFilterList.includes(stateRepo.env)) ||
      (tenantFilterList !== '*' && !tenantFilterList.includes(stateRepo.tenant))
    ) {
      debug('Skipping state repo', stateRepo)
    } else {
      const dispatchMatrix = await iterateStateRepoServices(
        dispatch,
        stateRepo,
        flavor,
        gitController
      )

      if (dispatchMatrix.length === 0) continue

      await gitController.dispatch(stateRepo, dispatchMatrix)
    }
  }
}

async function iterateStateRepoServices(
  dispatch,
  stateRepo,
  flavor,
  gitController
) {
  const dispatchMatrix = []
  const envOverride = gitController.getInput('overwrite_env')
  const tenantOverride = gitController.getInput('overwrite_tenant')
  const reviewersInput = gitController.getInput('reviewers', true)
  const reviewersList = getListFromInput(reviewersInput)
  const payloadCtx = gitController.getPayloadContext()

  for (const serviceName of stateRepo.service_names) {

    console.log('Registry debug')
    console.log(`stateRepo.registry: ${stateRepo.registry}`)
    console.log(`defaultRegistry: ${defaultRegistries[dispatch.type]}`)
    console.log(`registry: ${registry}`)
    console.log(`imageRepo: ${fullImageRepo}`)

    const imageExists = checkDockerManifest(fullImagePath)
    const dispatchStatus = imageExists
      ? '✔ Dispatching'
      : '❌ Error: Image not found in registry'

    summaryTable.push([
      `${payloadCtx.owner}/${stateRepo.repo}`,
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
      gitController.handleError(`Image ${fullImagePath} not found in registry`)
      continue
    }

    gitController.handleNotice(
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

  return dispatchMatrix
}

module.exports = {
  makeDispatches,
  createDispatchData
}
