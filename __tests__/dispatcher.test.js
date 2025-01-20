const debug = require('debug')('make-state-repos-dispatches')
const dispatcher = require('../src/dispatcher')
const fs = require('fs')
const YAML = require('js-yaml')
const path = require('path')
const configHelper = require('../utils/config-helper')

const defaultDispatchesFilePath = 'fixtures/github/dispatches_file.yaml'
const allInputs = {
  dispatchesFilePath: path.join(
    __dirname,
    '../fixtures/github/dispatches_file.yaml'
  ),
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
  overwriteVersion: '',
  overwriteEnv: '',
  overwriteTenant: '',
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
      fs.readFileSync(path.join('fixtures/github', filePath))
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
  dispatch: (dispatchObj, matrix) => {
    const result = []
    for (const dispatch of matrix) {
      result.push(`${dispatch.image} published`)
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
    const dispatchesExpectedLengths = [1, 4, 1, 1]

    const dispatches = await dispatcher.makeDispatches(
      gitControllerMock,
      imageHelperMock
    )

    expect(dispatches.length).toEqual(4)

    for (const index in dispatches) {
      expect(dispatches[index].length).toEqual(dispatchesExpectedLengths[index])
    }

    expect(dispatches[0]).toEqual([
      'registry1/service/my-org/my-repo:v1.1.0-pre published'
    ])
  })

  it('can make dispatches without a build summary', async () => {
    const dispatchesExpectedLengths = [1, 4, 1, 1]
    gitControllerMock.getAllInputs = () => {
      allInputs.buildSummary = ''
      return allInputs
    }

    const dispatches = await dispatcher.makeDispatches(
      gitControllerMock,
      imageHelperMock
    )

    expect(dispatches.length).toEqual(4)

    for (const index in dispatches) {
      expect(dispatches[index].length).toEqual(dispatchesExpectedLengths[index])
    }

    expect(dispatches[0]).toEqual([
      'registry1/service/my-org/my-repo:v1.1.0-pre published'
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
      state_repo: {
        repo: 'org/state-app-app1',
        tenant: 'tenant1',
        application: 'application1',
        registry: 'registry1',
        image_repository: 'wips/org/repo1',
        env: 'env1',
        version: 'version1'
      },
      version: 'version1',
      tenant: 'tenant1',
      app: 'application1',
      env: 'env1',
      service_name_list: ['service1'],
      reviewers: [],
      repository_caller: 'test-repo-caller',
      base_folder: ''
    })
    expect(result[3]).toEqual({
      type: 'releases',
      flavor: 'flavor2',
      state_repo: {
        repo: 'org/state-app-app23',
        tenant: 'tenant23',
        application: 'application23',
        registry: 'registry23',
        image_repository: 'repo23',
        env: 'env23',
        version: 'version23'
      },
      version: 'version23',
      tenant: 'tenant23',
      app: 'application23',
      env: 'env23',
      service_name_list: ['service2', 'service23'],
      reviewers: [],
      repository_caller: 'test-repo-caller',
      base_folder: 'test_bpath'
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
      state_repo: {
        repo: 'org/state-app-app1',
        tenant: 'tenant1',
        application: 'application1',
        registry: 'registry1',
        image_repository: 'wips/org/repo1',
        env: 'env1',
        version: 'version1'
      },
      version: 'version1',
      tenant: 'tenant1',
      app: 'application1',
      env: 'env1',
      service_name_list: ['service1'],
      reviewers: [],
      repository_caller: 'test-repo-caller',
      base_folder: ''
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
      state_repo: {
        repo: 'org/state-app-app1',
        tenant: 'tenant1',
        application: 'application1',
        registry: 'registry1',
        image_repository: 'wips/org/repo1',
        env: 'env1',
        version: 'version1'
      },
      version: 'version1',
      tenant: 'tenant1',
      app: 'application1',
      env: 'env1',
      service_name_list: ['service1'],
      reviewers: [],
      repository_caller: 'test-repo-caller',
      base_folder: ''
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
      `Error when creating dispatch list: ${singleDispatch.platform} cluster configuration does not include ${singleDispatch.env}`
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
      `Error when creating dispatch list: ${singleDispatch.platform} cluster configuration does not include ${singleDispatch.tenant}`
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

  it('can filter by repos', async () => {
    const stateRepo1Dispatch = { type: 'any', state_repo: { repo: 'repo1' } }
    const stateRepo2Dispatch = { type: 'any', state_repo: { repo: 'repo2' } }

    expect(
      dispatcher.isDispatchValid(
        stateRepo1Dispatch,
        ['any'],
        '*',
        ['repo1'],
        '*',
        '*'
      )
    ).toEqual(true)
    expect(
      dispatcher.isDispatchValid(
        stateRepo2Dispatch,
        ['any'],
        '*',
        ['repo1'],
        '*',
        '*'
      )
    ).toEqual(false)

    expect(
      dispatcher.isDispatchValid(
        stateRepo1Dispatch,
        ['any'],
        '*',
        ['repo1', 'repo2'],
        '*',
        '*'
      )
    ).toEqual(true)
    expect(
      dispatcher.isDispatchValid(
        stateRepo2Dispatch,
        ['any'],
        '*',
        ['repo1', 'repo2'],
        '*',
        '*'
      )
    ).toEqual(true)
  })

  it('can filter by environment', async () => {
    const env1Dispatch = { type: 'any', state_repo: { env: 'env1' } }
    const env2Dispatch = { type: 'any', state_repo: { env: 'env2' } }

    expect(
      dispatcher.isDispatchValid(env1Dispatch, ['any'], '*', '*', ['env1'], '*')
    ).toEqual(true)
    expect(
      dispatcher.isDispatchValid(env2Dispatch, ['any'], '*', '*', ['env1'], '*')
    ).toEqual(false)

    expect(
      dispatcher.isDispatchValid(
        env1Dispatch,
        ['any'],
        '*',
        '*',
        ['env1', 'env2'],
        '*'
      )
    ).toEqual(true)
    expect(
      dispatcher.isDispatchValid(
        env2Dispatch,
        ['any'],
        '*',
        '*',
        ['env1', 'env2'],
        '*'
      )
    ).toEqual(true)
  })

  it('can filter by tenant', async () => {
    const tenant1Dispatch = { type: 'any', state_repo: { tenant: 'tenant1' } }
    const tenant2Dispatch = { type: 'any', state_repo: { tenant: 'tenant2' } }

    expect(
      dispatcher.isDispatchValid(tenant1Dispatch, ['any'], '*', '*', '*', [
        'tenant1'
      ])
    ).toEqual(true)
    expect(
      dispatcher.isDispatchValid(tenant2Dispatch, ['any'], '*', '*', '*', [
        'tenant1'
      ])
    ).toEqual(false)

    expect(
      dispatcher.isDispatchValid(tenant1Dispatch, ['any'], '*', '*', '*', [
        'tenant1',
        'tenant2'
      ])
    ).toEqual(true)
    expect(
      dispatcher.isDispatchValid(tenant2Dispatch, ['any'], '*', '*', '*', [
        'tenant1',
        'tenant2'
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
      .readFileSync(path.join('fixtures/github', remoteFilePath))
      .toString('base64')
    const remoteFileContent = await dispatcher.getDispatchesFileContent(
      remoteFilePath,
      gitControllerMock
    )

    expect(remoteFileContent).toEqual(expectedRemoteResult)
  })
})
