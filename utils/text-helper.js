const YAML = require('js-yaml')

function parseFile(fileContent, encoding = '') {
  if (encoding) {
    fileContent = Buffer.from(fileContent, encoding).toString('utf-8')
  }

  return YAML.load(fileContent)
}

module.exports = {
  parseFile
}
