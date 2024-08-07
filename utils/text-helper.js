const YAML = require('yaml')

function parseFile(fileContent, encoding = '') {
  if (encoding) {
    fileContent = Buffer.from(fileContent, encoding).toString('utf-8')
  }

  return YAML.parse(fileContent, 'utf8')
}

module.exports = {
  parseFile
}
