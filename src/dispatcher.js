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

    const ctx = gitController.getPayloadContext()

    const dispatchesFilePath = gitController.getInput('dispatches_file', true)
    debug('Loading dispatches file content from path', dispatchesFilePath)
    const dispatchesFileContent =
      await gitController.getFileContent(dispatchesFilePath)

    debug('Parsing dispatches file yaml content')
    const yamlContent = Buffer.from(dispatchesFileContent, 'base64').toString(
      'utf-8'
    )

    const dispatchesFileData = YAML.load(yamlContent)

    iterateDispatches(dispatchesFileData['dispatches'], gitController)
  } catch (error) {
    // Fail the workflow run if an error occurs
    gitController.handleFailure(error.message)
  } finally {
    gitController.handleSummary('Dispatches summary', summaryTable)
  }
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

      await gitController.createDispatchEvent(stateRepo, dispatchMatrix)
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
  const version = gitController.getInput('overwrite_version')
  const envOverride = gitController.getInput('overwrite_env')
  const tenantOverride = gitController.getInput('overwrite_tenant')
  const registryBasePathsRaw = gitController.getInput('registry_base_paths')
  const registryBasePaths = JSON.parse(registryBasePathsRaw)
  const defaultRegistries = {
    releases: gitController.getInput('default_releases_registry', true),
    snapshots: gitController.getInput('default_snapshots_registry', true)
  }
  const reviewersInput = gitController.getInput('reviewers', true)
  const reviewersList = getListFromInput(reviewersInput)
  const repoCtx = gitController.getRepoContext()
  const payloadCtx = gitController.getPayloadContext()

  for (const serviceName of stateRepo.service_names) {
    const imageName = await imageNameCalculator.calculateImageName(
      version || stateRepo.version,
      gitController,
      flavor
    )

    const registry = stateRepo.registry || defaultRegistries[dispatch.type]
    const imageRepository =
      stateRepo.image_repository || `${repoCtx.owner}/${repoCtx.repo}`

    const imageBasePath = registryBasePaths?.services?.[dispatch.type]

    const fullImageBasePath =
      imageBasePath && !stateRepo.registry && !stateRepo.image_repository
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
  makeDispatches
}
