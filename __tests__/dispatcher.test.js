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
    const result = dispatcher.createDispatchData(
      dispatches['dispatches'],
      [],
      '',
      [
        {
          build_args: [{ BACKEND_URL: 'https://example.com' }],
          flavor: 'flavor1',
          image_repo: 'my-org/my-repo',
          image_tag: 'v1.1.0-pre',
          image_type: 'snapshots',
          registries: ['registry1'],
          repository: 'service/my-org/my-repo',
          version: 'version1'
        },
        {
          build_args: [{ BACKEND_URL: 'https://example.com' }],
          flavor: 'flavor4',
          image_repo: 'org/repo',
          image_tag: 'v444',
          image_type: 'snapshots',
          registries: ['registry4', 'registry5', 'registry0'],
          repository: 'service/org/repo',
          version: 'version4'
        },
        {
          build_args: [{ BACKEND_URL: 'https://example.com' }],
          flavor: 'flavor2',
          image_repo: 'my-other-org/my-other-repo',
          image_tag: 'v2.3-dev',
          image_type: 'snapshots',
          registries: ['registry2', 'registry3'],
          repository: 'service/my-other-org/my-other-repo',
          version: 'version23'
        },
        {
          build_args: [{ BACKEND_URL: 'https://example.com' }],
          flavor: 'flavor3',
          image_repo: 'my-other-org/my-other-repo',
          image_tag: 'v2.3-dev',
          image_type: 'snapshots',
          registries: ['registry2', 'registry3'],
          repository: 'service/my-other-org/my-other-repo',
          version: 'version23'
        },
        {
          build_args: [{ BACKEND_URL: 'https://example.com' }],
          flavor: 'flavor1',
          image_repo: 'my-org/my-repo',
          image_tag: 'v1.1.0-pro',
          image_type: 'releases',
          registries: ['registry1'],
          repository: 'service/my-org/my-repo',
          version: 'version-releases1'
        },
        {
          build_args: [{ BACKEND_URL: 'https://example.com' }],
          flavor: 'flavor2',
          image_repo: 'my-other-org/my-other-repo',
          image_tag: 'v2.3-pro',
          image_type: 'releases',
          registries: ['registry2', 'registry3'],
          repository: 'service/my-other-org/my-other-repo',
          version: 'version23'
        },
        {
          build_args: [{ BACKEND_URL: 'https://example.com' }],
          flavor: 'flavor3',
          image_repo: 'my-other-org/my-other-repo',
          image_tag: 'v2.3-pro',
          image_type: 'releases',
          registries: ['registry2', 'registry3'],
          repository: 'service/my-other-org/my-other-repo',
          version: 'version23'
        }
      ]
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
