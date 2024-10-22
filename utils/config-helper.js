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

    const schemaFilePath = path.join(__dirname, '../schema/jsonschema.json')
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

module.exports = {
  configParse
}
