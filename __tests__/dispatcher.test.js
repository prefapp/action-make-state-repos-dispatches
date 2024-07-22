const dispatcher = require('../src/dispatcher')
const fs = require('fs')
const YAML = require('js-yaml')
const path = require('path')

const gitControllerMock = {
  getInput: (input, required) => {
    return `${input}_value`
  },
  getAllInputs: () => {
    return {
      dispatchesFilePath: 'dispatches_file.yaml',
      imageType: '*',
      stateRepoFilter: '*',
      defaultReleasesRegistry: 'test-releases-registry',
      defaultSnapshotsRegistry: 'test-snapshots-registry',
      buildSummary: fs.readFileSync('fixtures/build_summary.yaml', 'utf-8'),
      flavorFilter: '*',
      envFilter: '*',
      tenantFilter: '*',
      overwriteVersion: '',
      overwriteEnv: '',
      overwriteTenant: '',
      reviewers: 'juanjosevazquezgil,test-reviewer',
      registryBasePaths: ''
    }
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
  dispatch: (dispatchObj, matrix) => {
    return `${dispatchObj.tenant}-${dispatchObj.app}-${dispatchObj.env} published`
  },
  handleNotice: msg => {
    console.log(msg)
  },
  handleFailure: msg => {
    console.log(msg)
  },
  handleSummary: (msg, table) => {
    console.log(msg)
  },
  handleError: msg => {
    console.log(msg)
  }
}
const imageHelperMock = {
  checkManifest: _ => {
    return true
  }
}

describe('The dispatcher', () => {
  it('can make dispatches', async () => {
    console.dir(
      await dispatcher.makeDispatches(gitControllerMock, imageHelperMock),
      { depth: null }
    )
  })
  it('can get a dispatch object from a YAML config', async () => {
    const dispatches = YAML.load(
      fs.readFileSync('fixtures/dispatches_file.yaml', 'utf-8')
    )
    const buildSummary = YAML.load(
      fs.readFileSync('fixtures/build_summary.yaml', 'utf-8')
    )
    const result = dispatcher.createDispatchList(
      dispatches['dispatches'],
      _ => buildSummary,
      []
    )
    console.dir(result, { depth: null })
  })
  // it('can filter by dispatch type', async () => {
  //   expect(dispatcher).toHaveBeenCalled()
  // })
  // it('can filter by flavor', async () => {
  //   expect(dispatcher).toHaveBeenCalled()
  // })
  // it('can filter by repos', async () => {
  //   expect(dispatcher).toHaveBeenCalled()
  // })
  // it('can filter by environment', async () => {
  //   expect(dispatcher).toHaveBeenCalled()
  // })
  // it('can filter by tenant', async () => {
  //   expect(dispatcher).toHaveBeenCalled()
  // })
  // it('can handle a failure', async () => {
  //   expect(dispatcher).toHaveBeenCalled()
  // })
})
