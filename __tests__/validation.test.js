const path = require('path')
const fs = require('fs')
const yaml = require('yaml')
const os = require('os')
const {
  configParse,
  getAppsConfig,
  getClustersConfig,
  getRegistriesConfig,
  validateBuildSummary
} = require('../utils/config-helper')

function getYamlContent(basePath, yamlFilePath) {
  const fullYamlFilePath = path.join(basePath, yamlFilePath)
  return fs.readFileSync(fullYamlFilePath, 'utf8')
}

function writeYamlContent(basePath, yamlFilePath, content) {
  const fullYamlFilePath = path.join(basePath, yamlFilePath)
  const dirPath = path.dirname(fullYamlFilePath)

  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
  }

  return fs.writeFileSync(fullYamlFilePath, content)
}

function deleteFileIfExists(basePath, filePath) {
  const fullFilePath = path.join(basePath, filePath)
  if (fs.existsSync(fullFilePath)) {
    fs.unlinkSync(fullFilePath)
  }
}

function deleteFolderIfExists(basePath, folderPath) {
  const fullFolderPath = path.join(basePath, folderPath)
  if (fs.existsSync(fullFolderPath)) {
    fs.rmSync(fullFolderPath, { recursive: true, force: true })
  }
}

describe('Yaml validation against Json schema', () => {
  afterAll(() => {
    // Ensure invalid test files are cleaned up after tests run
    deleteFileIfExists(os.tmpdir(), 'invalid_firestartr_apps/invalid-app.yaml')
    deleteFileIfExists(
      os.tmpdir(),
      'invalid_firestartr_platforms/invalid-platform.yaml'
    )
    deleteFileIfExists(
      os.tmpdir(),
      'invalid_firestartr_docker_registries/invalid-registry.yaml'
    )

    deleteFolderIfExists(os.tmpdir(), 'invalid_firestartr_apps')
    deleteFolderIfExists(os.tmpdir(), 'invalid_firestartr_platforms')
    deleteFolderIfExists(os.tmpdir(), 'invalid_firestartr_docker_registries')
  })

  test('should validate make_dispatches.yaml successfully against the Json Schema', () => {
    const yamlContent = getYamlContent(
      __dirname,
      '../fixtures/dispatches_file.yaml'
    )
    const yamlData = configParse(yamlContent)

    expect(yamlData).toBeDefined()
  })

  test('should fail if make_dispatches.yaml data does not match the schema', () => {
    const yamlContent = getYamlContent(
      __dirname,
      '../fixtures/dispatches_file.yaml'
    )
    const yamlData = configParse(yamlContent)
    const invalidYamlData = {
      ...yamlData,
      dispatches: [...yamlData.deployments]
    }

    invalidYamlData.dispatches[0].extraField = 'invalid'

    expect(() => configParse(yaml.stringify(invalidYamlData))).toThrow()
  })

  test('should fail if a required field is missing in make_dispatches.yaml', () => {
    const yamlContent = getYamlContent(
      __dirname,
      '../fixtures/dispatches_file.yaml'
    )
    const yamlData = configParse(yamlContent)
    const yamlWithoutRequiredField = {
      ...yamlData,
      dispatches: [...yamlData.deployments]
    }

    delete yamlWithoutRequiredField.dispatches[0].tenant

    expect(() =>
      configParse(yaml.stringify(yamlWithoutRequiredField))
    ).toThrow()
  })

  test('should validate .firestartr/apps configs successfully against the Json Schema', () => {
    const yamlData = getAppsConfig(
      path.join(__dirname, '../fixtures/.firestartr/apps')
    )

    expect(yamlData).toBeDefined()
  })

  test('should fail if .firestartr/apps data does not match the schema', () => {
    const yamlContent = yaml.parse(
      getYamlContent(__dirname, '../fixtures/.firestartr/apps/app1.yaml')
    )
    yamlContent['extraField'] = 'invalid'
    writeYamlContent(
      os.tmpdir(),
      'invalid_firestartr_apps/invalid-app.yaml',
      yaml.stringify(yamlContent)
    )

    expect(() =>
      getAppsConfig(path.join(os.tmpdir(), 'invalid_firestartr_apps'))
    ).toThrow()
  })

  test('should fail if a required field is missing in .firestartr/apps', () => {
    const yamlContent = yaml.parse(
      getYamlContent(__dirname, '../fixtures/.firestartr/apps/app1.yaml')
    )
    delete yamlContent.state_repo
    writeYamlContent(
      os.tmpdir(),
      'invalid_firestartr_apps/invalid-app.yaml',
      yaml.stringify(yamlContent)
    )

    expect(() =>
      getAppsConfig(path.join(os.tmpdir(), 'invalid_firestartr_apps'))
    ).toThrow()
  })

  test('should validate .firestartr/docker_registries configs successfully against the Json Schema', () => {
    const yamlData = getRegistriesConfig(
      path.join(__dirname, '../fixtures/.firestartr/docker_registries'),
      'snapshots.reg',
      'releases.reg'
    )

    expect(yamlData).toBeDefined()
    expect(yamlData.snapshots).toBeDefined()
    expect(yamlData.snapshots.name).toEqual('mysnapshotsreg')
    expect(yamlData.releases).toBeDefined()
    expect(yamlData.releases.name).toEqual('myreleasesreg')
  })

  test('should fail if .firestartr/docker_registries data does not match the schema', () => {
    const yamlContent = yaml.parse(
      getYamlContent(
        __dirname,
        '../fixtures/.firestartr/docker_registries/registry_a.yaml'
      )
    )
    yamlContent.extraField = 'invalid'
    writeYamlContent(
      os.tmpdir(),
      'invalid_firestartr_docker_registries/invalid-registry.yaml',
      yaml.stringify(yamlContent)
    )

    expect(() =>
      getRegistriesConfig(
        path.join(os.tmpdir(), 'invalid_firestartr_docker_registries'),
        'snapshots.reg',
        'releases.reg'
      )
    ).toThrow()
  })

  test('should fail if a required field is missing in .firestartr/docker_registries', () => {
    const yamlContent = yaml.parse(
      getYamlContent(
        __dirname,
        '../fixtures/.firestartr/docker_registries/registry_a.yaml'
      )
    )
    delete yamlContent.registry
    writeYamlContent(
      os.tmpdir(),
      'invalid_firestartr_docker_registries/invalid-registry.yaml',
      yaml.stringify(yamlContent)
    )

    expect(() =>
      getRegistriesConfig(
        path.join(os.tmpdir(), 'invalid_firestartr_docker_registries'),
        'snapshots.reg',
        'releases.reg'
      )
    ).toThrow()
  })

  const writeRegistryConfigs = registries => {
    const folderName = 'invalid_firestartr_docker_registries'
    const baseContent = yaml.parse(
      getYamlContent(
        __dirname,
        '../fixtures/.firestartr/docker_registries/registry_a.yaml'
      )
    )

    deleteFolderIfExists(os.tmpdir(), folderName)

    for (const [fileName, registry] of Object.entries(registries)) {
      writeYamlContent(
        os.tmpdir(),
        `${folderName}/${fileName}`,
        yaml.stringify({ ...baseContent, registry })
      )
    }

    return path.join(os.tmpdir(), folderName)
  }

  test.each([
    ['a port', 'releases.reg:5000'],
    ['a path', 'releases.reg/extra'],
    ['whitespace', 'releases reg'],
    ['a leading space', ' releases.reg']
  ])(
    'should reject a .firestartr/docker_registries registry with %s',
    (_description, registry) => {
      const folderPath = writeRegistryConfigs({ 'a.yaml': registry })

      expect(() =>
        getRegistriesConfig(folderPath, 'snapshots.reg', 'releases.reg')
      ).toThrow()
    }
  )

  test.each(['releases.reg', 'localhost', 'ghcr.io', 'REG.example.com'])(
    'should accept a portless .firestartr/docker_registries registry (%s)',
    registry => {
      const folderPath = writeRegistryConfigs({ 'a.yaml': registry })
      const config = getRegistriesConfig(folderPath, registry, 'unused.reg')

      expect(config.snapshots).toBeDefined()
      expect(config.snapshots.registry).toEqual(registry)
    }
  )

  test('should fail on a ported registry that no deployment resolves', () => {
    // Reading stopped once both defaults were resolved, so a ported registry
    // left in a later-sorting file was never validated.
    const folderPath = writeRegistryConfigs({
      'a_snapshots.yaml': 'snapshots.reg',
      'b_releases.yaml': 'releases.reg',
      'z_leftover.yaml': 'legacy.reg:5000'
    })

    expect(() =>
      getRegistriesConfig(folderPath, 'snapshots.reg', 'releases.reg')
    ).toThrow()
  })

  test('should validate .firestartr/platforms configs successfully against the Json Schema', () => {
    const yamlData = getClustersConfig(
      path.join(__dirname, '../fixtures/.firestartr/clusters')
    )

    expect(yamlData).toBeDefined()
    expect(yamlData).toEqual({
      myclusteraks1: {
        type: 'aks-cluster',
        tenants: ['tenant1', 'tenant2', 'tenant3'],
        envs: ['dev', 'pre']
      },
      'cluster-releases1': {
        type: 'aks-cluster',
        tenants: ['tenant-releases1'],
        envs: ['env-releases1']
      },
      cluster1: { type: 'aks-cluster', tenants: ['tenant1'], envs: ['env1'] },
      cluster23: { type: 'vmss', tenants: ['tenant23'], envs: ['env23'] },
      cluster4: { type: 'kind-cluster', tenants: ['tenant4'], envs: ['env4'] },
      cluster99: {
        type: 'tfworkspaces',
        tenants: ['tenant99', 'tenant2', 'tenant1'],
        envs: ['dev', 'env1', 'flavor99']
      },
      'cluster-any1': {
        envs: ['env-any1'],
        tenants: ['tenant-any1'],
        type: 'aks-cluster'
      },
      'cluster-any2': {
        envs: ['env-any2'],
        tenants: ['tenant-any2'],
        type: 'aks-cluster'
      }
    })
  })

  test('should fail if .firestartr/platforms data does not match the schema', () => {
    const yamlContent = yaml.parse(
      getYamlContent(
        __dirname,
        '../fixtures/.firestartr/clusters/cluster1.yaml'
      )
    )
    yamlContent.extraField = 'invalid'
    writeYamlContent(
      os.tmpdir(),
      'invalid_firestartr_platforms/invalid-platform.yaml',
      yaml.stringify(yamlContent)
    )

    expect(() =>
      getClustersConfig(path.join(os.tmpdir(), 'invalid_firestartr_platforms'))
    ).toThrow()
  })

  test('should fail if a required field is missing in .firestartr/platforms', () => {
    const yamlContent = yaml.parse(
      getYamlContent(
        __dirname,
        '../fixtures/.firestartr/clusters/cluster1.yaml'
      )
    )
    delete yamlContent.envs
    writeYamlContent(
      os.tmpdir(),
      'invalid_firestartr_platforms/invalid-platform.yaml',
      yaml.stringify(yamlContent)
    )

    expect(() =>
      getClustersConfig(path.join(os.tmpdir(), 'invalid_firestartr_platforms'))
    ).toThrow()
  })
})

describe('Build summary validation against Json schema', () => {
  const validEntry = {
    registry: 'snapshots.reg',
    repository: 'service/my-org/my-repo',
    image_tag: 'abc1234_default'
  }

  test('should validate a build summary successfully against the Json Schema', () => {
    const buildSummary = JSON.parse(
      fs.readFileSync(
        path.join(__dirname, '../fixtures/build_summary.json'),
        'utf8'
      )
    )

    expect(() => validateBuildSummary(buildSummary)).not.toThrow()
  })

  test('should validate an empty build summary', () => {
    expect(() => validateBuildSummary([])).not.toThrow()
  })

  test('should accept unknown metadata fields on an entry', () => {
    const entry = {
      ...validEntry,
      flavor: 'flavor1',
      image_type: 'snapshots',
      version: 'abc1234',
      image_repo: 'my-org/my-repo',
      build_args: [{ SOME_ARG: 'value' }],
      platforms: ['linux/arm64', 'linux/amd64'],
      workflow_run_id: '1234',
      something_the_producer_may_add_later: true
    }

    expect(() => validateBuildSummary([entry])).not.toThrow()
  })

  test('should accept a version that is not constrained by the schema', () => {
    const versions = [
      'abc1234',
      '1.2.3',
      'v1.2.3-pre',
      '$branch_feature/my-branch',
      '$latest_release',
      'my-branch_default'
    ]

    for (const version of versions) {
      const entry = { ...validEntry, version }

      expect(() => validateBuildSummary([entry])).not.toThrow()
    }
  })

  test('should reject a build summary that is not a list', () => {
    for (const buildSummary of [{}, 'a string', 42, null]) {
      expect(() => validateBuildSummary(buildSummary)).toThrow(
        /Invalid build summary/
      )
    }
  })

  test.each(['registry', 'repository', 'image_tag'])(
    'should reject a summary entry missing %s',
    field => {
      const entry = { ...validEntry }
      delete entry[field]

      expect(() => validateBuildSummary([entry])).toThrow(
        /Invalid build summary/
      )
    }
  )

  test.each(['registry', 'repository', 'image_tag'])(
    'should reject an empty %s',
    field => {
      const entry = { ...validEntry, [field]: '' }

      expect(() => validateBuildSummary([entry])).toThrow(
        /Invalid build summary/
      )
    }
  )

  test.each([
    ['registry', 'reg.example.com:5000'],
    ['registry', 'reg.example.com/extra'],
    ['registry', 'reg example.com'],
    ['registry', 'reg/../../etc'],
    ['repository', 'service\\repo'],
    ['repository', 'service/my repo'],
    ['repository', 'service/repo:tagged'],
    ['repository', 'service/repo${IFS}'],
    ['image_tag', 'tag/../escape'],
    ['image_tag', 'tag with spaces'],
    ['image_tag', 'tag;rm -rf /'],
    ['image_tag', '$(whoami)']
  ])('should reject an out of charset %s (%s)', (field, value) => {
    const entry = { ...validEntry, [field]: value }

    expect(() => validateBuildSummary([entry])).toThrow(/Invalid build summary/)
  })

  test('should accept a dot segment, leaving rejection to location matching', () => {
    // A dot segment is inside the charset the build workflow can emit, so the
    // schema does not reject it. It can never match the expected repository of
    // a dispatch, which is what keeps it from being dispatched.
    const entry = { ...validEntry, repository: '../../etc/passwd' }

    expect(() => validateBuildSummary([entry])).not.toThrow()
  })

  test('should reject when a single entry of an otherwise valid list is invalid', () => {
    const buildSummary = [
      validEntry,
      { ...validEntry, image_tag: 'evil/../../escape' }
    ]

    expect(() => validateBuildSummary(buildSummary)).toThrow(
      /Invalid build summary/
    )
  })
})
