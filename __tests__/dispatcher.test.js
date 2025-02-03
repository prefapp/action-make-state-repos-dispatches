const debug = require('debug')('make-state-repos-dispatches')
const dispatcher = require('../src/dispatcher')
const fs = require('fs')
const YAML = require('js-yaml')
const path = require('path')
const configHelper = require('../utils/config-helper')

const defaultDispatchesFilePath = 'fixtures/dispatches_file.yaml'
const allInputs = {
  dispatchesFilePath: path.join(__dirname, '../fixtures/dispatches_file.yaml'),
  appsFolderPath: path.join(__dirname, '../fixtures/.firestartr/apps'),
  clustersFolderPath: path.join(__dirname, '../fixtures/.firestartr/clusters'),
  registriesFolderPath: path.join(
    __dirname,
    '../fixtures/.firestartr/docker_registries'
  ),
  imageType: '*',
  stateRepoFilter: '*',
  defaultReleasesRegistry: 'releases.reg',
  defaultSnapshotsRegistry: 'snapshots.reg',
  buildSummary: fs.readFileSync('fixtures/build_summary.json', 'utf-8'),
  flavorFilter: '*',
  envFilter: '*',
  tenantFilter: '*',
  clusterFilter: '*',
  overwriteVersion: '',
  overwriteEnv: '',
  overwriteTenant: '',
  overwriteCluster: '',
  reviewers: 'juanjosevazquezgil,test-reviewer'
}
const getAllDispatches = (dispatchesFilePath = defaultDispatchesFilePath) => {
  const dispatches = YAML.load(fs.readFileSync(dispatchesFilePath, 'utf-8'))

  return dispatches
}
const getSingleDispatch = (
  dispatchesFilePath = defaultDispatchesFilePath,
  dispatchIndex = 0
) => {
  const dispatches = YAML.load(fs.readFileSync(dispatchesFilePath, 'utf-8'))
  const dispatchToReturn = dispatches.deployments[dispatchIndex]
  dispatches.deployments = [dispatchToReturn]

  return { dispatchesFileObj: dispatches, singleDispatch: dispatchToReturn }
}
const gitControllerMock = {
  getInput: (input, required) => {
    return `${input}_value`
  },
  getAllInputs: () => {
    return allInputs
  },
  getFileContent: filePath => {
    return Buffer.from(
      fs.readFileSync(path.join('fixtures', filePath))
    ).toString('base64')
  },
  getPayloadContext: () => {
    return {
      owner: 'payload-ctx-owner',
      repo: 'payload-ctx-repo'
    }
  },
  getRepoContext: () => {
    return {
      owner: 'repo-ctx-owner',
      repo: 'repo-ctx-repo'
    }
  },
  getSummaryDataForRef: (ref, checkRunName) => {
    return {
      summary: `\`\`\`yaml${fs.readFileSync('fixtures/build_summary.json', 'utf-8')}\`\`\``
    }
  },
  dispatch: (stateRepoName, eventTypeName, matrix) => {
    const result = []
    for (const dispatch of matrix) {
      result.push(`${dispatch.image} published in ${stateRepoName}`)
    }
    return result
  },
  handleNotice: msg => {
    debug(msg)
  },
  handleFailure: msg => {
    debug(msg)
  },
  handleSummary: (msg, table) => {
    debug(msg)
  },
  handleError: msg => {
    debug(msg)
  }
}
const imageHelperMock = {
  checkManifest: _ => true
}

describe('The dispatcher', () => {
  it('can make dispatches', async () => {
    const dispatchesExpectedLengths = [1, 3, 1, 1, 1]

    const dispatches = await dispatcher.makeDispatches(
      gitControllerMock,
      imageHelperMock
    )

    console.log(dispatches)

    expect(dispatches.length).toEqual(5)

    for (const index in dispatches) {
      expect(dispatches[index].length).toEqual(dispatchesExpectedLengths[index])
    }

    expect(dispatches[0]).toEqual([
      'registry1/service/my-org/my-repo:v1.1.0-pre published in org/state-app-app1'
    ])
    expect(dispatches[2]).toEqual([
      'registry23/service/my-other-org/my-other-repo:v2.3-flavor2-pro published in test-overwrite-state-repo'
    ])
  })

  it('can make dispatches without a build summary', async () => {
    const dispatchesExpectedLengths = [1, 3, 1, 1, 1]
    gitControllerMock.getAllInputs = () => {
      allInputs.buildSummary = ''
      return allInputs
    }

    const dispatches = await dispatcher.makeDispatches(
      gitControllerMock,
      imageHelperMock
    )

    expect(dispatches.length).toEqual(5)

    for (const index in dispatches) {
      expect(dispatches[index].length).toEqual(dispatchesExpectedLengths[index])
    }

    expect(dispatches[0]).toEqual([
      'registry1/service/my-org/my-repo:v1.1.0-pre published in org/state-app-app1'
    ])
    expect(dispatches[2]).toEqual([
      'registry23/service/my-other-org/my-other-repo:v2.3-flavor2-pro published in test-overwrite-state-repo'
    ])
  })

  it('returns undefined when no data for the current build is found (the error is captured)', async () => {
    gitControllerMock.getAllInputs = () => {
      allInputs.buildSummary = '[{}]'
      return allInputs
    }

    const result = await dispatcher.makeDispatches(
      gitControllerMock,
      imageHelperMock
    )

    expect(result).toBeUndefined()
  })

  it('returns undefined when no build summary is found (the error is captured)', async () => {
    gitControllerMock.getSummaryDataForRef = (ref, checkRunName) => {
      throw new Error('No build summary found mock')
    }

    const result = await dispatcher.makeDispatches(
      gitControllerMock,
      imageHelperMock
    )

    expect(result).toBeUndefined()
  })

  it('can get a dispatch object from a YAML config', async () => {
    const dispatches = getAllDispatches()
    const registriesConfig = configHelper.getRegistriesConfig(
      'fixtures/.firestartr/docker_registries/',
      'snapshots.reg',
      'releases.reg'
    )
    const appConfig = configHelper.getAppsConfig('fixtures/.firestartr/apps/')
    const clusterConfig = configHelper.getClustersConfig(
      'fixtures/.firestartr/clusters/'
    )

    const result = dispatcher.createDispatchList(
      dispatches.deployments,
      [],
      'test-repo-caller',
      appConfig,
      clusterConfig,
      registriesConfig
    )

    expect(result.length).toEqual(7)
    expect(result[0]).toEqual({
      type: 'snapshots',
      flavor: 'flavor1',
      registry: 'registry1',
      dispatch_event_type: 'dispatch-image-aks-cluster',
      version: 'version1',
      tenant: 'tenant1',
      app: 'application1',
      env: 'env1',
      service_name_list: ['service1'],
      reviewers: [],
      repository_caller: 'test-repo-caller',
      technology: 'aks-cluster',
      platform: 'cluster1',
      base_folder: 'aks-cluster/cluster1'
    })
    expect(result[3]).toEqual({
      type: 'releases',
      flavor: 'flavor2',
      registry: 'registry23',
      dispatch_event_type: 'dispatch-image-vmss',
      state_repo: 'test-overwrite-state-repo',
      version: 'version23',
      tenant: 'tenant23',
      app: 'application23',
      env: 'env23',
      service_name_list: ['service2', 'service23'],
      reviewers: [],
      repository_caller: 'test-repo-caller',
      technology: 'vmss',
      platform: 'cluster23',
      base_folder: 'vmss/cluster23'
    })
  })

  it("correctly processes deployments even when its configuration doesn't exactly match the app configuration", async () => {
    const { dispatchesFileObj, singleDispatch } = getSingleDispatch()
    const registriesConfig = configHelper.getRegistriesConfig(
      'fixtures/.firestartr/docker_registries/',
      'snapshots.reg',
      'releases.reg'
    )
    const appConfig = configHelper.getAppsConfig('fixtures/.firestartr/apps/')
    const clusterConfig = configHelper.getClustersConfig(
      'fixtures/.firestartr/clusters/'
    )
    appConfig[singleDispatch.application].services[0].service_names = [
      'another_service2',
      'another_service3',
      'service1',
      'another_service4'
    ]
    const result = dispatcher.createDispatchList(
      dispatchesFileObj.deployments,
      [],
      'test-repo-caller',
      appConfig,
      clusterConfig,
      registriesConfig
    )
    expect(result.length).toEqual(1)
    expect(result[0]).toEqual({
      type: 'snapshots',
      flavor: 'flavor1',
      registry: 'registry1',
      dispatch_event_type: 'dispatch-image-aks-cluster',
      version: 'version1',
      tenant: 'tenant1',
      app: 'application1',
      env: 'env1',
      service_name_list: ['service1'],
      reviewers: [],
      repository_caller: 'test-repo-caller',
      technology: 'aks-cluster',
      platform: 'cluster1',
      base_folder: 'aks-cluster/cluster1'
    })
  })

  it("correctly throws an error when a deployment's service doesn't follow the app configuration", async () => {
    const { dispatchesFileObj, singleDispatch } = getSingleDispatch()
    const registriesConfig = configHelper.getRegistriesConfig(
      'fixtures/.firestartr/docker_registries/',
      'snapshots.reg',
      'releases.reg'
    )
    const appConfig = configHelper.getAppsConfig('fixtures/.firestartr/apps/')
    const clusterConfig = configHelper.getClustersConfig(
      'fixtures/.firestartr/clusters/'
    )
    appConfig[singleDispatch.application].services[0].service_names = [
      'another_service1'
    ]

    expect(() => {
      dispatcher.createDispatchList(
        dispatchesFileObj.deployments,
        [],
        'test-repo-caller',
        appConfig,
        clusterConfig,
        registriesConfig
      )
    }).toThrow(
      `Error when creating dispatch list: ${singleDispatch.application} application configuration does not include service ${singleDispatch.service_names[0]}`
    )
  })

  it("correctly throws an error when an app doesn't have a configuration file", async () => {
    const { dispatchesFileObj, singleDispatch } = getSingleDispatch()
    const registriesConfig = configHelper.getRegistriesConfig(
      'fixtures/.firestartr/docker_registries/',
      'snapshots.reg',
      'releases.reg'
    )
    const clusterConfig = configHelper.getClustersConfig(
      'fixtures/.firestartr/clusters/'
    )

    expect(() => {
      dispatcher.createDispatchList(
        dispatchesFileObj.deployments,
        [],
        'test-repo-caller',
        {},
        clusterConfig,
        registriesConfig
      )
    }).toThrow(
      `Error when creating dispatch list: ${singleDispatch.application} application configuration does not exist`
    )
  })

  it("correctly processes deployments even when its configuration doesn't exactly match the cluster configuration", async () => {
    const { dispatchesFileObj, singleDispatch } = getSingleDispatch()
    const registriesConfig = configHelper.getRegistriesConfig(
      'fixtures/.firestartr/docker_registries/',
      'snapshots.reg',
      'releases.reg'
    )
    const appConfig = configHelper.getAppsConfig('fixtures/.firestartr/apps/')
    const clusterConfig = configHelper.getClustersConfig(
      'fixtures/.firestartr/clusters/'
    )
    clusterConfig[singleDispatch.platform].envs = [
      'another_env2',
      'another_env3',
      'env1',
      'another_env4'
    ]
    clusterConfig[singleDispatch.platform].tenants = [
      'another_tenant2',
      'another_tenant3',
      'tenant1',
      'another_tenant4'
    ]
    const result = dispatcher.createDispatchList(
      dispatchesFileObj.deployments,
      [],
      'test-repo-caller',
      appConfig,
      clusterConfig,
      registriesConfig
    )
    expect(result.length).toEqual(1)
    expect(result[0]).toEqual({
      type: 'snapshots',
      flavor: 'flavor1',
      registry: 'registry1',
      dispatch_event_type: 'dispatch-image-aks-cluster',
      version: 'version1',
      tenant: 'tenant1',
      app: 'application1',
      env: 'env1',
      service_name_list: ['service1'],
      reviewers: [],
      repository_caller: 'test-repo-caller',
      technology: 'aks-cluster',
      platform: 'cluster1',
      base_folder: 'aks-cluster/cluster1'
    })
  })

  it("correctly throws an error when a deployment's enviroment or tenant doesn't follow the cluster configuration", async () => {
    const { dispatchesFileObj, singleDispatch } = getSingleDispatch()
    const registriesConfig = configHelper.getRegistriesConfig(
      'fixtures/.firestartr/docker_registries/',
      'snapshots.reg',
      'releases.reg'
    )
    const appConfig = configHelper.getAppsConfig('fixtures/.firestartr/apps/')
    const clusterConfig = configHelper.getClustersConfig(
      'fixtures/.firestartr/clusters/'
    )
    clusterConfig[singleDispatch.platform].envs = ['another_env1']

    expect(() => {
      dispatcher.createDispatchList(
        dispatchesFileObj.deployments,
        [],
        'test-repo-caller',
        appConfig,
        clusterConfig,
        registriesConfig
      )
    }).toThrow(
      `Error when creating dispatch list: ${singleDispatch.platform} cluster configuration does not include env ${singleDispatch.env}`
    )

    clusterConfig[singleDispatch.platform].tenants = ['another_tenant1']

    expect(() => {
      dispatcher.createDispatchList(
        dispatchesFileObj.deployments,
        [],
        'test-repo-caller',
        appConfig,
        clusterConfig,
        registriesConfig
      )
    }).toThrow(
      `Error when creating dispatch list: ${singleDispatch.platform} cluster configuration does not include tenant ${singleDispatch.tenant}`
    )
  })

  it('can filter by dispatch type', async () => {
    const releasesDispatch = { type: 'releases' }
    const snapshotsDispatch = { type: 'snapshots' }

    expect(
      dispatcher.isDispatchValid(
        releasesDispatch,
        ['releases'],
        '*',
        '*',
        '*',
        '*'
      )
    ).toEqual(true)
    expect(
      dispatcher.isDispatchValid(
        snapshotsDispatch,
        ['releases'],
        '*',
        '*',
        '*',
        '*'
      )
    ).toEqual(false)

    expect(
      dispatcher.isDispatchValid(
        releasesDispatch,
        ['releases', 'snapshots'],
        '*',
        '*',
        '*',
        '*'
      )
    ).toEqual(true)
    expect(
      dispatcher.isDispatchValid(
        snapshotsDispatch,
        ['releases', 'snapshots'],
        '*',
        '*',
        '*',
        '*'
      )
    ).toEqual(true)
  })

  it('can filter by flavor', async () => {
    const flavor1Dispatch = { type: 'any', flavor: 'flavor1' }
    const flavor2Dispatch = { type: 'any', flavor: 'flavor2' }

    expect(
      dispatcher.isDispatchValid(
        flavor1Dispatch,
        ['any'],
        ['flavor1'],
        '*',
        '*',
        '*'
      )
    ).toEqual(true)
    expect(
      dispatcher.isDispatchValid(
        flavor2Dispatch,
        ['any'],
        ['flavor1'],
        '*',
        '*',
        '*'
      )
    ).toEqual(false)

    expect(
      dispatcher.isDispatchValid(
        flavor1Dispatch,
        ['any'],
        ['flavor1', 'flavor2'],
        '*',
        '*',
        '*'
      )
    ).toEqual(true)
    expect(
      dispatcher.isDispatchValid(
        flavor2Dispatch,
        ['any'],
        ['flavor1', 'flavor2'],
        '*',
        '*',
        '*'
      )
    ).toEqual(true)
  })

  it('can filter by flavor using a matching pattern', async () => {
    const flavorDevDispatch = { type: 'any', flavor: 'flavor-dev' }
    const flavorProDispatch = { type: 'any', flavor: 'flavor-pro' }

    expect(
      dispatcher.isDispatchValid(
        flavorDevDispatch,
        ['any'],
        ['*-dev'],
        '*',
        '*',
        '*'
      )
    ).toEqual(true)
    expect(
      dispatcher.isDispatchValid(
        flavorProDispatch,
        ['any'],
        ['*-dev'],
        '*',
        '*',
        '*'
      )
    ).toEqual(false)

    expect(
      dispatcher.isDispatchValid(
        flavorDevDispatch,
        ['any'],
        ['*-dev', '*-pro'],
        '*',
        '*',
        '*'
      )
    ).toEqual(true)
    expect(
      dispatcher.isDispatchValid(
        flavorProDispatch,
        ['any'],
        ['*-dev', '*-pro'],
        '*',
        '*',
        '*'
      )
    ).toEqual(true)

    expect(
      dispatcher.isDispatchValid(
        flavorDevDispatch,
        ['any'],
        ['*-pre', '*-pro'],
        '*',
        '*',
        '*'
      )
    ).toEqual(false)
    expect(
      dispatcher.isDispatchValid(
        flavorProDispatch,
        ['any'],
        ['*-dev', '*-pre'],
        '*',
        '*',
        '*'
      )
    ).toEqual(false)
  })

  it('can filter by environment', async () => {
    const env1Dispatch = { type: 'any', env: 'env1' }
    const env2Dispatch = { type: 'any', env: 'env2' }

    expect(
      dispatcher.isDispatchValid(env1Dispatch, ['any'], '*', ['env1'], '*', '*')
    ).toEqual(true)
    expect(
      dispatcher.isDispatchValid(env2Dispatch, ['any'], '*', ['env1'], '*', '*')
    ).toEqual(false)

    expect(
      dispatcher.isDispatchValid(
        env1Dispatch,
        ['any'],
        '*',
        ['env1', 'env2'],
        '*',
        '*'
      )
    ).toEqual(true)
    expect(
      dispatcher.isDispatchValid(
        env2Dispatch,
        ['any'],
        '*',
        ['env1', 'env2'],
        '*',
        '*'
      )
    ).toEqual(true)
  })

  it('can filter by tenant', async () => {
    const tenant1Dispatch = { type: 'any', tenant: 'tenant1' }
    const tenant2Dispatch = { type: 'any', tenant: 'tenant2' }

    expect(
      dispatcher.isDispatchValid(
        tenant1Dispatch,
        ['any'],
        '*',
        '*',
        ['tenant1'],
        '*'
      )
    ).toEqual(true)
    expect(
      dispatcher.isDispatchValid(
        tenant2Dispatch,
        ['any'],
        '*',
        '*',
        ['tenant1'],
        '*'
      )
    ).toEqual(false)

    expect(
      dispatcher.isDispatchValid(
        tenant1Dispatch,
        ['any'],
        '*',
        '*',
        ['tenant1', 'tenant2'],
        '*'
      )
    ).toEqual(true)
    expect(
      dispatcher.isDispatchValid(
        tenant2Dispatch,
        ['any'],
        '*',
        '*',
        ['tenant1', 'tenant2'],
        '*'
      )
    ).toEqual(true)
  })

  it('can filter by platform', async () => {
    const plat1Dispatch = { type: 'any', platform: 'cluster1' }
    const plat2Dispatch = { type: 'any', platform: 'cluster2' }

    expect(
      dispatcher.isDispatchValid(plat1Dispatch, ['any'], '*', '*', '*', [
        'cluster1'
      ])
    ).toEqual(true)
    expect(
      dispatcher.isDispatchValid(plat2Dispatch, ['any'], '*', '*', '*', [
        'cluster1'
      ])
    ).toEqual(false)

    expect(
      dispatcher.isDispatchValid(plat1Dispatch, ['any'], '*', '*', '*', [
        'cluster1',
        'cluster2'
      ])
    ).toEqual(true)
    expect(
      dispatcher.isDispatchValid(plat2Dispatch, ['any'], '*', '*', '*', [
        'cluster1',
        'cluster2'
      ])
    ).toEqual(true)
  })

  it('can handle a failure', async () => {
    const incompleteGitController = {
      handleFailure: msg => {
        throw new Error('Git controller managed failure')
      },
      handleSummary: (msg, table) => {
        debug(msg)
      }
    }

    await expect(
      dispatcher.makeDispatches(incompleteGitController, imageHelperMock)
    ).rejects.toThrow('Git controller managed failure')
  })

  it('can get the dispatches file content, both locally and remotely', async () => {
    const localFilePath = path.join(
      __dirname,
      '../fixtures/dispatches_file.yaml'
    )
    const expectedLocalResult = fs
      .readFileSync(localFilePath)
      .toString('base64')
    const localFileContent = await dispatcher.getDispatchesFileContent(
      localFilePath,
      gitControllerMock
    )

    expect(localFileContent).toEqual(expectedLocalResult)

    const remoteFilePath = 'dispatches_file.yaml'
    const expectedRemoteResult = fs
      .readFileSync(path.join('fixtures', remoteFilePath))
      .toString('base64')
    const remoteFileContent = await dispatcher.getDispatchesFileContent(
      remoteFilePath,
      gitControllerMock
    )

    expect(remoteFileContent).toEqual(expectedRemoteResult)
  })
})
