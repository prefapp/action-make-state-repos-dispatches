const debug = require('debug')('make-state-repos-dispatches')

async function getLatestRef(version, gitController, shortSha = true) {
  debug('Calculating image name for action type %s', version)
  let ref = null
  switch (version) {
    case '$latest_prerelease':
      ref = await __last_prerelease(gitController)

      break
    case '$latest_release':
      ref = await __last_release(gitController)

      break
    default:
      if (version.match(/^\$branch_/)) {
        ref = await __last_branch_commit(version, gitController, shortSha)
      } else {
        if (version.match(/\b[0-9a-f]{40}/) && shortSha) {
          ref = version.substring(0, 7)
        }
        ref = version
      }
  }

  return ref
}

async function __last_release(gitController) {
  try {
    const latestReleaseResponse = await gitController.getLatestRelease(
      gitController.getPayloadContext()
    )
    return latestReleaseResponse.data.tag_name
  } catch (err) {
    throw new Error(`calculating last release: ${err}`)
  }
}

async function __last_prerelease(gitController) {
  try {
    const latestPrerelease = await gitController.getLatestPrerelease(
      gitController.getPayloadContext()
    )

    if (latestPrerelease) return latestPrerelease.tag_name

    return null
  } catch (err) {
    throw new Error(`calculating last pre-release: ${err}`)
  }
}

async function __last_branch_commit(branch, gitController, shortSha = true) {
  try {
    const payload = gitController.getPayloadContext()
    payload['branch'] = branch.replace(/^\$branch_/, '')

    return await gitController.getLastBranchCommit(payload, shortSha)
  } catch (err) {
    throw new Error(`calculating last commit on branch ${branch}: ${err}`)
  }
}

module.exports = {
  getLatestRef
}
