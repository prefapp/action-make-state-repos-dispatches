const githubUtils = require('../utils/github-helper')
const dispatcher = require('./dispatcher')
const dockerHelper = require('../utils/docker-helper')

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
