const YAML = require('yaml')

function parseFile(fileContent, encoding = '') {
  try {
    if (encoding) {
      fileContent = Buffer.from(fileContent, encoding).toString('utf-8')
    }

    return YAML.parse(fileContent, 'utf8')
  } catch (err) {
    throw new Error(`Error parsing YAML file: ${err.message}`)
  }
}

module.exports = {
  parseFile
}
