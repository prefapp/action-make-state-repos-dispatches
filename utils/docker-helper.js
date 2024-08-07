const { execSync } = require('child_process')

function checkManifest(image) {
  try {
    // Execute the command
    execSync(`docker manifest inspect ${image}`, { stdio: 'ignore' })

    // If the command succeeds (exit code 0), return true
    return true
  } catch (error) {
    // If the command fails (non-zero exit code), return false
    return false
  }
}

module.exports = {
  checkManifest
}
