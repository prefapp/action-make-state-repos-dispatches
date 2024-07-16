const dispatcher = require('../src/dispatcher')
const fs = require('fs')
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
  createDispatchEvent: (dispatchObj, matrix) => {
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
  it('can make dispatches', async () => {
    await dispatcher.makeDispatches(gitControllerMock)
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
