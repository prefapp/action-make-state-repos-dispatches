const debug = require('debug')('make-state-repos-dispatches')
const refHelper = require('../utils/ref-helper')
const textHelper = require('../utils/text-helper')
const fs = require('fs')
const minimatch = require('minimatch')
const configHelper = require('../utils/config-helper')

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

  try {
    // Parse action inputs
    debug('Parsing action inputs')

    const {
      dispatchesFilePath,
      appsFolderPath,
      clustersFolderPath,
      registriesFolderPath,
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
      checkRunName
    } = gitController.getAllInputs()
    const payloadCtx = gitController.getPayloadContext()

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
    const stateReposList =
      stateRepoFilter === '*' ? '*' : getListFromInput(stateRepoFilter)
    const flavorsList =
      flavorFilter === '*' ? '*' : getListFromInput(flavorFilter)
    const envFilterList = envFilter === '*' ? '*' : getListFromInput(envFilter)
    const tenantFilterList =
      tenantFilter === '*' ? '*' : getListFromInput(tenantFilter)

    const appConfig = configHelper.getAppsConfig(appsFolderPath)
    const clusterConfig = configHelper.getClustersConfig(clustersFolderPath)
    const registriesConfig = configHelper.getRegistriesConfig(
      registriesFolderPath,
      defaultSnapshotsRegistry,
      defaultReleasesRegistry
    )

    const dispatchList = createDispatchList(
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
          stateReposList,
          envFilterList,
          tenantFilterList
        )
      ) {
        const resolvedVersion = await refHelper.getLatestRef(
          data.version,
          gitController
        )
        const stateRepoName = appConfig[data.app].state_repo
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
            entry.registry ===
              (data.state_repo.registry || defaultRegistries[data.type])
        )[0]

        if (!imageData)
          throw new Error(
            `Build summary not found for flavor: ${data.flavor}, ` +
              `version: ${resolvedVersion}, image_type: ${data.type}`
          )

        debug('🖼 Image data >', JSON.stringify(imageData, null, 2))

        data.image =
          `${imageData.registry}/` +
          `${imageData.repository}:${imageData.image_tag}`

        const dispatchStatus = '✔ Dispatching'

        updateSummaryTable(
          data,
          dispatchStatus,
          `${payloadCtx.owner}/${stateRepoName}`,
          summaryTable
        )

        gitController.handleNotice(
          `Dispatching image ${data.image} to state repo ${stateRepoName} ` +
            `for services ${data.service_name_list.join(', ')} with dispatch ` +
            `event type ${data.state_repo.dispatch_event_type}`
        )

        data.message = dispatchStatus
        groupedDispatches[stateRepoName] =
          groupedDispatches[stateRepoName] ?? [] // Initialize as an empty array if the property doesn't exist
        groupedDispatches[stateRepoName].push(data)
      }
    }

    const resultList = []
    for (const key in groupedDispatches) {
      const result = await gitController.dispatch(
        groupedDispatches[key][0].state_repo, // They all belong to the same repo
        groupedDispatches[key]
      )
      resultList.push(result)
    }

    return resultList
  } catch (error) {
    // Fail the workflow run if an error occurs
    gitController.handleFailure(error.message)
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
  const dispatchList = []

  for (const deployment of deployments) {
    if (
      !clusterConfig[deployment.platform].tenants.includes(deployment.tenant)
    ) {
      throw new Error(
        `Error when creating dispatch list: ${deployment.platform} ` +
          `cluster configuration does not include tenant ${deployment.tenant}`
      )
    }

    if (!clusterConfig[deployment.platform].envs.includes(deployment.env)) {
      throw new Error(
        `Error when creating dispatch list: ${deployment.platform} ` +
          `cluster configuration does not include env ${deployment.env}`
      )
    }

    const stateRepo = appConfig[deployment.application].state_repo

    for (const serviceData of appConfig[deployment.application].services) {
      if (deployment.service_names) {
        for (const serviceName of deployment.service_names) {
          if (!serviceData.service_names.includes(serviceName)) {
            throw new Error(
              `Error when creating dispatch list: ${deployment.application} ` +
                `application configuration does not include service ${serviceName}`
            )
          }
        }
      }

      const imageRepo =
        deployment.image_repository ||
        `${registriesConfig[deployment.type].base_paths['services']}/` +
          `${serviceData.repo}`

      dispatchList.push({
        type: deployment.type,
        flavor: deployment.flavor,
        version: versionOverride || deployment.version,
        tenant: tenantOverride || deployment.tenant,
        app: deployment.application,
        env: envOverride || deployment.env,
        service_name_list:
          deployment.service_names || serviceData.service_names,
        state_repo: {
          application: deployment.application,
          env: envOverride || deployment.env,
          repo: stateRepo,
          registry:
            deployment.registry || registriesConfig[deployment.type].registry,
          image_repository: imageRepo,
          tenant: tenantOverride || deployment.tenant,
          version: versionOverride || deployment.version,
          dispatch_event_type:
            `${deployment.dispatch_event_type || 'dispatch-image'}-` +
            `${clusterConfig[deployment.platform].type}`
        },
        reviewers: reviewersList,
        repository_caller: repo,
        base_folder: deployment.base_path || ''
      })
    }
  }

  return dispatchList
}

async function getLatestBuildSummary(version, gitController, checkRunName) {
  try {
    const ref = await refHelper.getLatestRef(version, gitController, false)
    const summaryData = await gitController.getSummaryDataForRef(
      ref,
      checkRunName
    )

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
  stateReposList,
  envFilterList,
  tenantFilterList
) {
  const stateRepo = dispatch.state_repo

  return (
    imageTypesList.includes(dispatch.type) &&
    (flavorsList === '*' ||
      flavorsList.filter(f => minimatch(dispatch.flavor, f)).length === 1) &&
    (stateReposList === '*' || stateReposList.includes(stateRepo.repo)) &&
    (envFilterList === '*' || envFilterList.includes(stateRepo.env)) &&
    (tenantFilterList === '*' || tenantFilterList.includes(stateRepo.tenant))
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
    dispatch.service_name_list.join(', '),
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
