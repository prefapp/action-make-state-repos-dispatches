const debug = require('debug')('make-state-repos-dispatches')
const refHelper = require('../utils/ref-helper')
const textHelper = require('../utils/text-helper')
const path = require('path')
const fs = require('fs')
const minimatch = require('minimatch')
const configHelper = require('../utils/config-helper')

const TFWORKSPACE_PLATFORM_TYPE = 'tfworkspaces'

function getListFromInput(input) {
  return input.replace(' ', '').split(',')
}

async function makeDispatches(gitController) {
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
  const payloadCtx = gitController.getPayloadContext()

  // Parse action inputs
  debug('Parsing action inputs')

  const {
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
  } = gitController.getAllInputs()

  try {
    debug('Loading dispatches file content from path', dispatchesFilePath)
    const dispatchesFileContent = await getDispatchesFileContent(
      dispatchesFilePath,
      gitController
    )

    const dispatchesData = configHelper.configParse(
      dispatchesFileContent,
      'base64'
    )
    debug('Dispatches file content (validated)', dispatchesData)

    let getBuildSummaryData = async version =>
      await getLatestBuildSummary(version, gitController, checkRunName)

    if (buildSummary) {
      const parsedBuildSummary = JSON.parse(buildSummary)
      getBuildSummaryData = async _ => parsedBuildSummary
    }

    const defaultRegistries = {
      releases: defaultReleasesRegistry,
      snapshots: defaultSnapshotsRegistry
    }

    const reviewersList = getListFromInput(reviewers)
    const imageTypesList =
      imageType === '*' ? ['releases', 'snapshots'] : [imageType]
    const flavorsList =
      flavorFilter === '*' ? '*' : getListFromInput(flavorFilter)
    const envFilterList = envFilter === '*' ? '*' : getListFromInput(envFilter)
    const tenantFilterList =
      tenantFilter === '*' ? '*' : getListFromInput(tenantFilter)
    const clusterFilterList =
      clusterFilter === '*' ? '*' : getListFromInput(clusterFilter)

    const repoContext = gitController.getRepoContext()
    const defaultImageRepository = `${repoContext.owner}/${repoContext.repo}`
    const appConfig = configHelper.getAppsConfig(appsFolderPath)
    const clusterConfig = configHelper.getClustersConfig(clustersFolderPath)
    const registriesConfig = configHelper.getRegistriesConfig(
      registriesFolderPath,
      defaultSnapshotsRegistry,
      defaultReleasesRegistry
    )

    const dispatchList = createDispatchList(
      defaultImageRepository,
      dispatchesData.deployments,
      reviewersList,
      payloadCtx.repo,
      appConfig,
      clusterConfig,
      registriesConfig,
      overwriteVersion,
      overwriteTenant,
      overwriteEnv
    )

    const groupedDispatches = {}
    for (const data of dispatchList) {
      if (
        isDispatchValid(
          data,
          imageTypesList,
          flavorsList,
          envFilterList,
          tenantFilterList,
          clusterFilterList
        )
      ) {
        const resolvedVersion = await refHelper.getLatestRef(
          data.version,
          gitController
        )
        const stateRepoName = data.state_repo || appConfig[data.app].state_repo
        const buildSummaryObj = await getBuildSummaryData(data.version)

        debug('📜 Summary builds >', JSON.stringify(buildSummaryObj, null, 2))

        debug(
          '🔍 Filtering by:',
          `flavor: ${data.flavor}, ` +
            `version: ${resolvedVersion}, ` +
            `image_type: ${data.type}`
        )

        const imageData = buildSummaryObj.filter(
          entry =>
            entry.flavor === data.flavor &&
            entry.version === resolvedVersion &&
            entry.image_type === data.type &&
            entry.repository === data.image_repo &&
            entry.registry === (data.registry || defaultRegistries[data.type])
        )[0]

        if (!imageData)
          throw new Error(
            `Build summary not found for flavor: ${data.flavor}, ` +
              `version: ${resolvedVersion}, image_type: ${data.type}, ` +
              `image_repo: ${data.image_repo}, ` +
              `registry: ${data.registry || defaultRegistries[data.type]}`
          )

        debug('🖼 Image data >', JSON.stringify(imageData, null, 2))

        data.image =
          `${imageData.registry}/` +
          `${imageData.repository}:${imageData.image_tag}`

        const dispatchStatus = '✔ Dispatching'

        updateSummaryTable(
          data,
          dispatchStatus,
          `${stateRepoName}`,
          summaryTable
        )

        gitController.handleNotice(
          `Dispatching image ${data.image} to state repo ${stateRepoName} ` +
            `for services ` +
            `${(data.service_name_list || data.image_keys).join(', ')} ` +
            `with dispatch event type ${data.dispatch_event_type}`
        )

        data.message = dispatchStatus
        groupedDispatches[stateRepoName] =
          groupedDispatches[stateRepoName] ?? {} // Initialize as an empty object if the property doesn't exist
        groupedDispatches[stateRepoName][data.dispatch_event_type] =
          groupedDispatches[stateRepoName][data.dispatch_event_type] ?? [] // Initialize as an empty array if the property doesn't exist
        groupedDispatches[stateRepoName][data.dispatch_event_type].push(data)
      }
    }

    const resultList = []
    for (const stateRepo in groupedDispatches) {
      for (const dispatchEventType in groupedDispatches[stateRepo]) {
        const result = await gitController.dispatch(
          stateRepo, // They all belong to the same repo
          dispatchEventType, // They all have the same dispatch_event_type
          groupedDispatches[stateRepo][dispatchEventType]
        )
        resultList.push(result)
      }
    }

    return resultList
  } catch (error) {
    console.log(error)

    // Fail the workflow run if an error occurs
    const msg = `${error.message}

    Using make_dispatches.yaml file from ref ${payloadCtx.ref}, commit ${payloadCtx.sha}: https://www.github.com/${payloadCtx.owner}/${payloadCtx.repo}/blob/${payloadCtx.sha}/${dispatchesFilePath}`
    gitController.handleFailure(msg)
  } finally {
    gitController.handleSummary('Dispatches summary', summaryTable)
  }
}

async function getDispatchesFileContent(filePath, gitController) {
  try {
    return fs.readFileSync(filePath).toString('base64')
  } catch (err) {
    return await gitController.getFileContent(filePath)
  }
}

function createDispatchList(
  defaultImageRepository,
  deployments,
  reviewersList,
  repo,
  appConfig,
  clusterConfig,
  registriesConfig,
  versionOverride = '',
  tenantOverride = '',
  envOverride = ''
) {
  try {
    const dispatchList = []

    for (const deployment of deployments) {
      const chosenCluster = deployment.platform

      if (!clusterConfig[chosenCluster]) {
        throw new Error(
          `Error when creating dispatch list: ${chosenCluster} ` +
            `cluster configuration does not exist`
        )
      }

      if (!clusterConfig[chosenCluster].tenants.includes(deployment.tenant)) {
        throw new Error(
          `Error when creating dispatch list: ${chosenCluster} ` +
            `cluster configuration does not include tenant ${deployment.tenant}`
        )
      }

      if (!clusterConfig[chosenCluster].envs.includes(deployment.env)) {
        throw new Error(
          `Error when creating dispatch list: ${chosenCluster} ` +
            `cluster configuration does not include env ${deployment.env}`
        )
      }

      if (
        clusterConfig[chosenCluster].type === TFWORKSPACE_PLATFORM_TYPE &&
        !deployment.claim
      ) {
        throw new Error(
          `Error when creating dispatch list: ${TFWORKSPACE_PLATFORM_TYPE} ` +
            `type clusters must set the 'claim' config value`
        )
      }

      if (!appConfig[deployment.application]) {
        throw new Error(
          `Error when creating dispatch list: ${deployment.application} ` +
            `application configuration does not exist`
        )
      }

      if (deployment.service_names && deployment.image_keys) {
        throw new Error(
          `Error when creating dispatch list: ${deployment.application} ` +
            `for tenant ${deployment.tenant}, flavor ${deployment.flavor} ` +
            `type ${deployment.type} and env ${deployment.env} ` +
            `has values for both service_names and image_keys. ` +
            `Unset one of them before continuing.`
        )
      }

      for (const serviceData of appConfig[deployment.application].services) {
        if (defaultImageRepository === serviceData.repo) {
          let makeDispatch = false
          if (deployment.service_names) {
            for (const serviceName of deployment.service_names) {
              if (serviceData.service_names.includes(serviceName)) {
                makeDispatch = true
                break
              }
            }
          } else {
            makeDispatch = true
          }

          if (makeDispatch) {
            const imageRepo =
              deployment.image_repository ||
              `${registriesConfig[deployment.type].base_paths['services']}/` +
                `${defaultImageRepository}`

            const basePath = path.join(
              clusterConfig[chosenCluster].type,
              chosenCluster
            )

            dispatchList.push({
              type: deployment.type,
              flavor: deployment.flavor,
              version: versionOverride || deployment.version,
              tenant: tenantOverride || deployment.tenant,
              app: deployment.application,
              env: envOverride || deployment.env,
              state_repo: deployment.state_repo,
              service_name_list: deployment.service_names,
              image_keys: deployment.image_keys,
              claim: deployment.claim,
              registry:
                deployment.registry ||
                registriesConfig[deployment.type].registry,
              image_repo: imageRepo,
              dispatch_event_type:
                deployment.dispatch_event_type ||
                `dispatch-image-${clusterConfig[chosenCluster].type}`,
              reviewers: reviewersList,
              repository_caller: repo,
              technology: clusterConfig[chosenCluster].type,
              platform: chosenCluster,
              base_folder: basePath
            })
          }
        }
      }
    }

    return dispatchList
  } catch (e) {
    throw new Error(`Error happened when trying to create dispatch list: ${e}`)
  }
}

async function getLatestBuildSummary(version, gitController, checkRunName) {
  try {
    const ref = await refHelper.getLatestRef(version, gitController, false)
    const summaryData = await gitController.getSummaryDataForRef(
      ref,
      checkRunName
    )

    if (!summaryData || !summaryData.summary)
      throw new Error(`No build summary found for version ${version}`)

    const buildSummary = summaryData.summary
      .replace('```yaml', '')
      .replace('```', '')

    return textHelper.parseFile(buildSummary)
  } catch (err) {
    throw new Error(
      `Error while getting the latest build summary: ${err.message}`
    )
  }
}

function isDispatchValid(
  dispatch,
  imageTypesList,
  flavorsList,
  envFilterList,
  tenantFilterList,
  clusterFilterList
) {
  return (
    imageTypesList.includes(dispatch.type) &&
    (flavorsList === '*' ||
      flavorsList.filter(f => minimatch(dispatch.flavor, f)).length === 1) &&
    (envFilterList === '*' || envFilterList.includes(dispatch.env)) &&
    (tenantFilterList === '*' || tenantFilterList.includes(dispatch.tenant)) &&
    (clusterFilterList === '*' || clusterFilterList.includes(dispatch.platform))
  )
}

function updateSummaryTable(
  dispatch,
  dispatchStatus,
  stateRepoName,
  summaryTable
) {
  summaryTable.push([
    stateRepoName,
    dispatch.tenant,
    dispatch.app,
    dispatch.env,
    (dispatch.service_name_list || dispatch.image_keys).join(', '),
    dispatch.image,
    dispatch.reviewers.join(', '),
    dispatch.base_path || '',
    dispatchStatus
  ])
}

module.exports = {
  makeDispatches,
  createDispatchList,
  getLatestBuildSummary,
  getDispatchesFileContent,
  isDispatchValid,
  updateSummaryTable
}
