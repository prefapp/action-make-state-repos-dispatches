const YAML = require('yaml')
const fs = require('fs')
const path = require('path')
const Ajv = require('ajv')
const validator = new Ajv()
const compiledSchemas = {}

function validateSchema(data, schemaPath) {
  let validate

  if (!compiledSchemas[schemaPath]) {
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'))
    validate = validator.compile(schema)
    compiledSchemas[schemaPath] = validate
  } else {
    validate = compiledSchemas[schemaPath]
  }

  const valid = validate(data)

  if (!valid) {
    throw new Error(`Validation errors: ${JSON.stringify(validate.errors)}`)
  }
}

function configParse(fileContent, encoding = '') {
  try {
    if (encoding) {
      fileContent = Buffer.from(fileContent, encoding).toString('utf-8')
    }

    const yamlData = YAML.parse(fileContent)
    const schemaFilePath = path.join(__dirname, '../schema/config.schema.json')

    validateSchema(yamlData, schemaFilePath)

    return yamlData
  } catch (err) {
    throw new Error(`Error parsing YAML file: ${err.message}`)
  }
}

function getAppsConfig(appFolderPath) {
  try {
    const appConfig = {}
    const configFileList = fs.readdirSync(appFolderPath)
    const schemaFilePath = path.join(
      __dirname,
      '../schema/firestartr-apps.schema.json'
    )

    for (const configFileName of configFileList) {
      if (configFileName.endsWith('.yaml') || configFileName.endsWith('.yml')) {
        const configFileContent = fs.readFileSync(
          path.join(appFolderPath, configFileName),
          'utf-8'
        )
        const configData = YAML.parse(configFileContent)

        try {
          validateSchema(configData, schemaFilePath)
        } catch (err) {
          throw new Error(`File ${configFileName}: ${err.message}`)
        }

        appConfig[configData.name] = {
          state_repo: configData.state_repo,
          services: configData.services
        }
      }
    }

    return appConfig
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
    const schemaFilePath = path.join(
      __dirname,
      '../schema/firestartr-platforms.schema.json'
    )

    for (const configFileName of configFileList) {
      if (configFileName.endsWith('.yaml') || configFileName.endsWith('.yml')) {
        const configFileContent = fs.readFileSync(
          path.join(clustersFolderPath, configFileName),
          'utf-8'
        )
        const configData = YAML.parse(configFileContent)

        try {
          validateSchema(configData, schemaFilePath)
        } catch (err) {
          throw new Error(`File ${configFileName}: ${err.message}`)
        }

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
    const schemaFilePath = path.join(
      __dirname,
      '../schema/firestartr-registries.schema.json'
    )

    for (const configFileName of configFileList) {
      if (configFileName.endsWith('.yaml') || configFileName.endsWith('.yml')) {
        const configFileContent = fs.readFileSync(
          path.join(registriesFolderPath, configFileName),
          'utf-8'
        )
        const configData = YAML.parse(configFileContent)

        try {
          validateSchema(configData, schemaFilePath)
        } catch (err) {
          throw new Error(`File ${configFileName}: ${err.message}`)
        }

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
