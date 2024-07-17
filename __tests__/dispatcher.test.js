const dispatcher = require('../src/dispatcher')
const fs = require('fs')
const YAML = require('js-yaml')
const path = require('path')

const gitControllerMock = {
  getInput: (input, required) => {
    return `${input}_value`
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
    return true
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

describe('The dispatcher', () => {
  // it('can make dispatches', async () => {
  //   await dispatcher.makeDispatches(gitControllerMock)
  // })
  it('can get a dispatch object from a YAML config', async () => {
    const dispatches = YAML.load(
      fs.readFileSync('fixtures/dispatches_file_value', 'utf-8')
    )
    const result = await dispatcher.createDispatchData(
      dispatches['dispatches'],
      async (stateRepo, flavor, dispatchType) => {
        return setTimeout(() => {
          return `${stateRepo.version}-${flavor}-${dispatchType}`
        }, 1000)
      },
      [],
      ''
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
