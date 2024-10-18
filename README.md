# Make state repo dispatches action

# Inputs and configuration

This action dispatches Docker images changes made in a code repository to one or more helm state repositories. That is, when a new image is generated in a code repository, this action can be called to update the configurations of all related state repositories by creating a pull request with the changes in each of them. In our case this usually means updating the `images.yaml` with a newly built image

## Inputs

The action takes the following inputs:

- `dispatches_file`: path to the `make_dispatches.yaml` in *your code repo*. Usually, and by default, `.github/make_dispatches.yaml`.
- `token`: a Github token, with `repo` permissions over both the code and state repos. It's **mandatory** to pass a PAT token of an user or GitHub app with the needed permission in both repositories.
- `image_type`: image type to dispatch. Can be any of `releases`, `snapshots` or `\*`, meaning *all* (default).
- `flavors`: list of flavor names, as defined in the `dispatches_file`. Can be a single flavor or a list of comma separated flavors. By default, the flavor `default` is used.
- `state_repo`: list of specific state repos to which to dispatch. Can be a single state repo name, a list of comma separated state repo names or `\*`, meaning *all* (default). These state repositories must still be defined within the `dispatches_file`, i.e. this parameter works as a filter and won't make dispatches to "unknown" repositories.
- `filter_by_env`: list of specific environments to which to dispatch. Can be a single environment name, a list of comma separated environment names or `\*`, meaning *all* (default). Since this parameter is a filter, the environment names must be one of those defined within the `dispatches_file`.
- `filter_by_tenant`: list of specific tenants to which to dispatch. Can be a single tenant name, a list of comma separated tenant names or `\*`, meaning *all* (default). Since this parameter is a filter, the tenant names must be one of those defined within the `dispatches_file`.
- `overwrite_version`: use this version instead of the one specified in the `dispatches_file`. Meaning, for each flavor to dispatch, instead of using its defined `version` parameter, this will be used instead. Can be a string of any value, so invalid versions are not checked for. This parameter accepts special keywords, see *Special version keywords* below.
- `overwrite_env`: use this environment instead of the one specified in the `dispatches_file`. Meaning, for each flavor to dispatch, instead of using its defined `environment` parameter, this will be used instead. Can be a string of any value, so invalid environments are not checked for.
- `overwrite_tenant`: use this tenant instead of the one specified in the `dispatches_file`. Meaning, for each flavor to dispatch, instead of using its defined `tenant` parameter, this will be used instead. Can be a string of any value, so invalid tenants are not checked for.
- `default_releases_registry`: the registry to use for `release` type dispatches when no registry has been specified. Can be a string of any value, so invalid registries are not checked for.
- `default_snapshots_registry`: the registry to use for `snapshots` type dispatches when no registry has been specified. Can be a string of any value, so invalid registries are not checked for.
- `reviewers`: list of reviewers to add to the newly created state repo pull request. Can be a single Github username, a list of Github usernames or an empty string (default). Invalid or nonexistent usernames are not checked for.
- `build_summary`: *contents* of the `build_summary.yaml` file outputted by the `build_images` workflow. If left blank (default), it will be automatically calculated by the workflow. See its documentation for more information.
- `check_run_name`: name of the workflow check run where `build_summary` was uploaded. See the `build_images` documentation for more information.


## Special version keywords

`overwrite_version` and `dispatches_file.flavor.version` both accept a special set of keywords, which will be expanded during the make dispatches process. The accepted values are:

- `$latest_release`: the latest available release, configured in the GitHub repository. See [Get the latest release](https://docs.github.com/en/rest/releases/releases?apiVersion=2022-11-28#get-the-latest-release) in the GitHub API.
- `$latest_prerelease`: the latest available pre-release, by **date of creation**.
- `$highest_semver_release_[semver]`: the release with the **highest** [semver] digits available. See [semver precedence according Semver definition](https://semver.org/#spec-item-11): 1.0.0 < 2.0.0 < 2.1.0 < 2.1.1.  It could be used with `major` or `major.minor` digits, for example: `$highest_semver_release_v1`.
- `$highest_semver_prerelease_[semver]`: the pre-release with the highest [semver] digits available, according with [Semver precedence definition](https://semver.org/#spec-item-11), i.e.  1.0.0-alpha < 1.0.0-alpha.1 < 1.0.0-alpha.beta < 1.0.0-beta < 1.0.0-beta.2 < 1.0.0-beta.11 < 1.0.0-rc.1 < 1.0.0.
- `$branch_[branch_name]`: the image associated with the **latest commit** in the [branch_name] pattern, for example: `$branch_develop`, `$branch_main`...
- Any commit SHA (both **short** and **long** are supported) or **git tag**: the latest available image associated with the SHA commit or de-referenced commit from the git tag.


# Developing and contributing

## Initial Setup

After you've cloned the repository to your local machine or codespace, you'll
need to perform some initial setup steps before you can develop your action.

> [!NOTE]
>
> You'll need to have a reasonably modern version of
> [Node.js](https://nodejs.org) handy. If you are using a version manager like
> [`nodenv`](https://github.com/nodenv/nodenv) or
> [`nvm`](https://github.com/nvm-sh/nvm), you can run `nodenv install` in the
> root of your repository to install the version specified in
> [`package.json`](./package.json). Otherwise, 20.x or later should work!

1. :hammer_and_wrench: Install the dependencies

   ```bash
   npm install
   ```

1. :building_construction: Package the JavaScript for distribution

   ```bash
   npm run bundle
   ```

1. :white_check_mark: Run the tests

   ```bash
   $ npm test

   PASS  ./index.test.js
     ✓ throws invalid number (3ms)
     ✓ wait 500 ms (504ms)
     ✓ test runs (95ms)

   ...
   ```

## Update the Action Code

So, what are you waiting for? Go ahead and start customizing your action!

1. Create a new branch

   ```bash
   git checkout -b releases/v1
   ```

1. Replace the contents of `src/` with your action code
1. Add tests to `__tests__/` for your source code
1. Format, test, and build the action

   ```bash
   npm run all
   ```

   > [!WARNING]
   >
   > This step is important! It will run [`ncc`](https://github.com/vercel/ncc)
   > to build the final JavaScript action code with all dependencies included.
   > If you do not run this step, your action will not work correctly when it is
   > used in a workflow. This step also includes the `--license` option for
   > `ncc`, which will create a license file for all of the production node
   > modules used in your project.

1. Commit your changes

   ```bash
   git add .
   git commit -m "My first action is ready!"
   ```

1. Push them to your repository

   ```bash
   git push -u origin releases/v1
   ```

1. Create a pull request and get feedback on your action
1. Merge the pull request into the `main` branch

Your action is now published! :rocket:

For information about versioning your action, see
[Versioning](https://github.com/actions/toolkit/blob/master/docs/action-versioning.md)
in the GitHub Actions toolkit.
