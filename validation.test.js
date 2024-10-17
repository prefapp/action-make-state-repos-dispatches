const fs = require('fs')
const path = require('path')
const yaml = require('yaml')
const Ajv = require('ajv')

describe('Yaml validation against Json schema', () => {
  let yamlData
  let schema
  let validate

  beforeAll(() => {
    const yamlFilePath = path.join(
      __dirname,
      '/fixtures/github/make_dispatches.yaml'
    )
    const yamlConten = fs.readFileSync(yamlFilePath, 'utf8')
    yamlData = yaml.parse(yamlConten)

    const schemaFilePath = path.join(__dirname, '/schema/jsonschema.json')
    schema = JSON.parse(fs.readFileSync(schemaFilePath, 'utf8'))

    const ajv = new Ajv()
    validate = ajv.compile(schema)
  })

  test('should validate Yaml successfully against the Json Schema', () => {
    const valid = validate(yamlData)
    if (!valid) {
      console.error('Validation errors:', validate.errors)
    }
    expect(valid).toBe(true)
  })

  test('should fail if Yaml data does not match the schema', () => {
    const invalidYamlData = { ...yamlData, extraField: 'invalid' }

    const valid = validate(invalidYamlData)
    expect(valid).toBe(false)
    expect(validate.errors).toBeDefined()
  })

  test('should fail if a required field is missing in Yaml', () => {
    const yamlWithoutRequiredField = {
      ...yamlData,
      dispatches: yamlData.dispatches.map(dispatch => ({
        ...dispatch,
        state_repos: dispatch.state_repos.map(repo => {
          const { repo: removedRepo, ...rest } = repo
        })
      }))
    }

    const valid = validate(yamlWithoutRequiredField)
    expect(valid).toBe(false)
    expect(validate.errors).toBeDefined()
  })
})
