const path = require('path')
const fs = require('fs')
const yaml = require('yaml')
const {
  configParse,
  getAppsConfig,
  getClustersConfig,
  getRegistriesConfig
} = require('../utils/config-helper')

function getYamlContent(yamlFilePath) {
  const fullYamlFilePath = path.join(__dirname, yamlFilePath)
  return fs.readFileSync(fullYamlFilePath, 'utf8')
}

function writeYamlContent(yamlFilePath, content) {
  const fullYamlFilePath = path.join(__dirname, yamlFilePath)
  const dirPath = path.dirname(fullYamlFilePath)

  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
  }

  return fs.writeFileSync(fullYamlFilePath, content)
}

function deleteFileIfExists(filePath) {
  const fullFilePath = path.join(__dirname, filePath)
  if (fs.existsSync(fullFilePath)) {
    fs.unlinkSync(fullFilePath)
  }
}

function deleteFolderIfExists(filePath) {
  const fullFolderPath = path.join(__dirname, filePath)
  if (fs.existsSync(fullFolderPath)) {
    fs.rmdirSync(fullFolderPath)
  }
}

describe('Yaml validation against Json schema', () => {
  afterAll(() => {
    // Ensure invalid test files are cleaned up after tests run
    deleteFileIfExists('../fixtures/invalid_firestartr_apps/invalid-app.yaml')
    deleteFileIfExists(
      '../fixtures/invalid_firestartr_platforms/invalid-platform.yaml'
    )
    deleteFileIfExists(
      '../fixtures/invalid_firestartr_docker_registries/invalid-registry.yaml'
    )

    deleteFolderIfExists('../fixtures/invalid_firestartr_apps')
    deleteFolderIfExists('../fixtures/invalid_firestartr_platforms')
    deleteFolderIfExists('../fixtures/invalid_firestartr_docker_registries')
  })

  test('should validate make_dispatches.yaml successfully against the Json Schema', () => {
    const yamlContent = getYamlContent('../fixtures/dispatches_file.yaml')
    const yamlData = configParse(yamlContent)

    expect(yamlData).toBeDefined()
  })

  test('should fail if make_dispatches.yaml data does not match the schema', () => {
    const yamlContent = getYamlContent('../fixtures/dispatches_file.yaml')
    const yamlData = configParse(yamlContent)
    const invalidYamlData = {
      ...yamlData,
      dispatches: [...yamlData.deployments]
    }

    invalidYamlData.dispatches[0].extraField = 'invalid'

    expect(() => configParse(yaml.stringify(invalidYamlData))).toThrow()
  })

  test('should fail if a required field is missing in make_dispatches.yaml', () => {
    const yamlContent = getYamlContent('../fixtures/dispatches_file.yaml')
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
      getYamlContent('../fixtures/.firestartr/apps/app1.yaml')
    )
    yamlContent['extraField'] = 'invalid'
    writeYamlContent(
      '../fixtures/invalid_firestartr_apps/invalid-app.yaml',
      yaml.stringify(yamlContent)
    )

    expect(() =>
      getAppsConfig(path.join(__dirname, '../fixtures/invalid_firestartr_apps'))
    ).toThrow()
  })

  test('should fail if a required field is missing in .firestartr/apps', () => {
    const yamlContent = yaml.parse(
      getYamlContent('../fixtures/.firestartr/apps/app1.yaml')
    )
    delete yamlContent.state_repo
    writeYamlContent(
      '../fixtures/invalid_firestartr_apps/invalid-app.yaml',
      yaml.stringify(yamlContent)
    )

    expect(() =>
      getAppsConfig(path.join(__dirname, '../fixtures/invalid_firestartr_apps'))
    ).toThrow()
  })

  test('should validate .firestartr/docker_registries configs successfully against the Json Schema', () => {
    const yamlData = getRegistriesConfig(
      path.join(__dirname, '../fixtures/.firestartr/docker_registries'),
      'snapshots.reg',
      'releases.reg'
    )

    console.log(yamlData)

    expect(yamlData).toBeDefined()
    expect(yamlData.snapshots).toBeDefined()
    expect(yamlData.snapshots.name).toEqual('mysnapshotsreg')
    expect(yamlData.releases).toBeDefined()
    expect(yamlData.releases.name).toEqual('myreleasesreg')
  })

  test('should fail if .firestartr/docker_registries data does not match the schema', () => {
    const yamlContent = yaml.parse(
      getYamlContent(
        '../fixtures/.firestartr/docker_registries/registry_a.yaml'
      )
    )
    yamlContent.extraField = 'invalid'
    writeYamlContent(
      '../fixtures/invalid_firestartr_docker_registries/invalid-registry.yaml',
      yaml.stringify(yamlContent)
    )

    expect(() =>
      getRegistriesConfig(
        path.join(
          __dirname,
          '../fixtures/invalid_firestartr_docker_registries'
        ),
        'snapshots.reg',
        'releases.reg'
      )
    ).toThrow()
  })

  test('should fail if a required field is missing in .firestartr/docker_registries', () => {
    const yamlContent = yaml.parse(
      getYamlContent(
        '../fixtures/.firestartr/docker_registries/registry_a.yaml'
      )
    )
    delete yamlContent.registry
    writeYamlContent(
      '../fixtures/invalid_firestartr_docker_registries/invalid-registry.yaml',
      yaml.stringify(yamlContent)
    )

    expect(() =>
      getRegistriesConfig(
        path.join(
          __dirname,
          '../fixtures/invalid_firestartr_docker_registries'
        ),
        'snapshots.reg',
        'releases.reg'
      )
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
      }
    })
  })

  test('should fail if .firestartr/platforms data does not match the schema', () => {
    const yamlContent = yaml.parse(
      getYamlContent('../fixtures/.firestartr/clusters/cluster1.yaml')
    )
    yamlContent.extraField = 'invalid'
    writeYamlContent(
      '../fixtures/invalid_firestartr_platforms/invalid-platform.yaml',
      yaml.stringify(yamlContent)
    )

    expect(() =>
      getClustersConfig(
        path.join(__dirname, '../fixtures/invalid_firestartr_platforms')
      )
    ).toThrow()
  })

  test('should fail if a required field is missing in .firestartr/platforms', () => {
    const yamlContent = yaml.parse(
      getYamlContent('../fixtures/.firestartr/clusters/cluster1.yaml')
    )
    delete yamlContent.envs
    writeYamlContent(
      '../fixtures/invalid_firestartr_platforms/invalid-platform.yaml',
      yaml.stringify(yamlContent)
    )

    expect(() =>
      getClustersConfig(
        path.join(__dirname, '../fixtures/invalid_firestartr_platforms')
      )
    ).toThrow()
  })
})
