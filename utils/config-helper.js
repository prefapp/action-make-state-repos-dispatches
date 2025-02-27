const YAML = require('yaml')
const fs = require('fs')
const path = require('path')
const Ajv = require('ajv')

function configParse(fileContent, encoding = '') {
  try {
    if (encoding) {
      fileContent = Buffer.from(fileContent, encoding).toString('utf-8')
    }

    const yamlData = YAML.parse(fileContent, 'utf8')

    const schemaFilePath = path.join(__dirname, '../schema/config.schema.json')
    const schema = JSON.parse(fs.readFileSync(schemaFilePath, 'utf8'))

    const ajv = new Ajv()
    const validate = ajv.compile(schema)
    const valid = validate(yamlData)

    if (!valid) {
      throw new Error(
        `YAML validation errors: ${JSON.stringify(validate.errors)}`
      )
    }

    return yamlData
  } catch (err) {
    throw new Error(`Error parsing YAML file: ${err.message}`)
  }
}

function getAppsConfig(appFolderPath) {
  try {
    const appsConfig = {}
    const configFileList = fs.readdirSync(appFolderPath)

    for (const configFileName of configFileList) {
      if (configFileName.endsWith('.yaml') || configFileName.endsWith('.yml')) {
        const configFileContent = fs.readFileSync(
          path.join(appFolderPath, configFileName),
          'utf-8'
        )
        const configData = YAML.parse(configFileContent, 'utf8')

        appsConfig[configData.name] = {
          state_repo: configData.state_repo,
          services: configData.services
        }
      }
    }

    return appsConfig
  } catch (err) {
    throw new Error(
      `Error getting app configs from folder ${appFolderPath}: ${err.message}`
    )
  }
}

function getClustersConfig(clustersFolderPath) {
  try {
    const clustersConfig = {}
    const configFileList = fs.readdirSync(clustersFolderPath)

    for (const configFileName of configFileList) {
      if (configFileName.endsWith('.yaml') || configFileName.endsWith('.yml')) {
        const configFileContent = fs.readFileSync(
          path.join(clustersFolderPath, configFileName),
          'utf-8'
        )
        const configData = YAML.parse(configFileContent, 'utf8')

        clustersConfig[configData.name] = {
          type: configData.type,
          tenants: configData.tenants,
          envs: configData.envs
        }
      }
    }

    return clustersConfig
  } catch (err) {
    throw new Error(
      `Error getting cluster configs from folder ` +
        `${clustersFolderPath}: ${err.message}`
    )
  }
}

function getRegistriesConfig(
  registriesFolderPath,
  snapshotsRegistry,
  releasesRegistry
) {
  try {
    const registriesConfig = {}
    const configFileList = fs.readdirSync(registriesFolderPath)

    for (const configFileName of configFileList) {
      if (configFileName.endsWith('.yaml') || configFileName.endsWith('.yml')) {
        const configFileContent = fs.readFileSync(
          path.join(registriesFolderPath, configFileName),
          'utf-8'
        )
        const configData = YAML.parse(configFileContent, 'utf8')

        if (configData.registry === snapshotsRegistry) {
          registriesConfig['snapshots'] = configData
        }

        if (configData.registry === releasesRegistry) {
          registriesConfig['releases'] = configData
        }

        if (registriesConfig.snapshots && registriesConfig.releases) break
      }
    }

    return registriesConfig
  } catch (err) {
    throw new Error(
      `Error getting registry configs from folder ` +
        `${registriesFolderPath}: ${err.message}`
    )
  }
}

module.exports = {
  configParse,
  getAppsConfig,
  getClustersConfig,
  getRegistriesConfig
}
