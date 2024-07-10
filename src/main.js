const YAML = require('js-yaml')
const debug = require('debug')('make-state-repos-dispatches')
const githubUtils = require('../utils/github')
const dispatcher = require('./dispatcher')

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
async function run() {
  await dispatcher.makeDispatches(githubUtils)
}

module.exports = {
  run
}
