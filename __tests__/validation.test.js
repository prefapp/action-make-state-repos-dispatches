const path = require('path')
const fs = require('fs')
const yaml = require('yaml')
const { configParse } = require('../utils/config-helper')

describe('Yaml validation against Json schema', () => {
  let yamlFilePath
  let schemaFilePath
  let yamlData

  beforeAll(() => {
    yamlFilePath = path.join(__dirname, '../fixtures/dispatches_file.yaml')
    schemaFilePath = path.join(__dirname, '../schema/jsonschema.json')

    const yamlContent = fs.readFileSync(yamlFilePath, 'utf8')
    yamlData = configParse(yamlContent)
  })

  test('should validate Yaml successfully against the Json Schema', () => {
    expect(yamlData).toBeDefined()
  })

  test('should fail if Yaml data does not match the schema', () => {
    const invalidYamlData = {
      ...yamlData,
      dispatches: [...yamlData.deployments]
    }

    invalidYamlData.dispatches[0].extraField = 'invalid'

    expect(() => configParse(yaml.stringify(invalidYamlData))).toThrow()
  })

  test('should fail if a required field is missing in Yaml', () => {
    const yamlWithoutRequiredField = {
      ...yamlData,
      dispatches: [...yamlData.deployments]
    }

    delete yamlWithoutRequiredField.dispatches[0].tenant

    expect(() =>
      configParse(yaml.stringify(yamlWithoutRequiredField))
    ).toThrow()
  })
})
