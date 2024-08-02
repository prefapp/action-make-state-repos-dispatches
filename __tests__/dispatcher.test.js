const debug = require('debug')('make-state-repos-dispatches')
const dispatcher = require('../src/dispatcher')
const fs = require('fs')
const YAML = require('js-yaml')
const path = require('path')

const allInputs = {
  dispatchesFilePath: 'dispatches_file.yaml',
  imageType: '*',
  stateRepoFilter: '*',
  defaultReleasesRegistry: 'test-releases-registry',
  defaultSnapshotsRegistry: 'test-snapshots-registry',
  buildSummary: fs.readFileSync('fixtures/build_summary.json', 'utf-8'),
  flavorFilter: '*',
  envFilter: '*',
  tenantFilter: '*',
  overwriteVersion: '',
  overwriteEnv: '',
  overwriteTenant: '',
  reviewers: 'juanjosevazquezgil,test-reviewer'
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
    throw new Error('Git controller managed failure')
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
    const dispatchesExpectedLengths = [1, 12, 2, 1]

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
    const dispatchesExpectedLengths = [1, 12, 2, 1]
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

  it("can detect when a image doesn't exist in the registry", async () => {
    gitControllerMock.getAllInputs = () => {
      allInputs.buildSummary = ''
      return allInputs
    }

    const dispatches = await dispatcher.makeDispatches(gitControllerMock, {
      checkManifest: _ => false
    })

    expect(dispatches).toEqual([])
    expect(dispatches.length).toEqual(0)
  })

  it('can get a dispatch object from a YAML config', async () => {
    const dispatches = YAML.load(
      fs.readFileSync('fixtures/dispatches_file.yaml', 'utf-8')
    )

    const result = dispatcher.createDispatchList(dispatches.dispatches, [])

    expect(result.length).toEqual(16)
    expect(result[0]).toEqual({
      type: 'snapshots',
      flavor: 'flavor1',
      state_repo: {
        repo: 'repo1',
        tenant: 'tenant1',
        application: 'application1',
        env: 'env1',
        version: 'version1'
      },
      version: 'version1',
      tenant: 'tenant1',
      app: 'application1',
      env: 'env1',
      service_name: 'service1',
      reviewers: [],
      base_folder: ''
    })
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
})
