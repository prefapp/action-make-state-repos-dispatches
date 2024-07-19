const YAML = require('js-yaml')
const debug = require('debug')('make-state-repos-dispatches')

function parseFile(fileContent, encoding = '') {
  if (encoding) {
    fileContent = Buffer.from(fileContent, encoding).toString('utf-8')
  }

  return YAML.load(fileContent)
}

module.exports = {
  parseFile
}
