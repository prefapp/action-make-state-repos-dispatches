# Changelog

## [1.11.0](https://github.com/prefapp/action-make-state-repos-dispatches/compare/v1.10.0...v1.11.0) (2024-10-22)


### Features

* merge pull request [#64](https://github.com/prefapp/action-make-state-repos-dispatches/issues/64) from prefapp/added-json-schema-validation ([a401a51](https://github.com/prefapp/action-make-state-repos-dispatches/commit/a401a519df84ee34a11f3e55af2953e0d93d294d))

## [1.10.0](https://github.com/prefapp/action-make-state-repos-dispatches/compare/v1.9.0...v1.10.0) (2024-10-18)


### Features

* Compiled app and added tests ([c30602c](https://github.com/prefapp/action-make-state-repos-dispatches/commit/c30602cff5c5bbc61356d447ca44017cea4ecf93))


### Bug Fixes

* Added clearer errors ([67a5191](https://github.com/prefapp/action-make-state-repos-dispatches/commit/67a51918d0997941c8dfc3919d4dac566e74d4ca))

## [1.9.0](https://github.com/prefapp/action-make-state-repos-dispatches/compare/v1.8.1...v1.9.0) (2024-08-30)

### Features

- Added highest*semver*[prerelease/release]\_[tag] filter
  ([ca5e208](https://github.com/prefapp/action-make-state-repos-dispatches/commit/ca5e2080e95040dc9eed90d7691f57b62268c665))
- Added tests and final filter functionality
  ([6cd2780](https://github.com/prefapp/action-make-state-repos-dispatches/commit/6cd2780cdbf0ea3716306a9116e91e9e71d79e44))

### Bug Fixes

- Merge errors
  ([12ea281](https://github.com/prefapp/action-make-state-repos-dispatches/commit/12ea2812b586946bbc2f15f27a6d14ac8cd39778))

## [1.8.1](https://github.com/prefapp/action-make-state-repos-dispatches/compare/v1.8.0...v1.8.1) (2024-08-30)

### Bug Fixes

- remove docker inspect
  ([#51](https://github.com/prefapp/action-make-state-repos-dispatches/issues/51))
  ([80dacd9](https://github.com/prefapp/action-make-state-repos-dispatches/commit/80dacd9dde204e8bd6938a9ec2ea069e4faa83ca))

## [1.8.0](https://github.com/prefapp/action-make-state-repos-dispatches/compare/v1.7.0...v1.8.0) (2024-08-20)

### Features

- Added additional case check for flavor filter test
  ([8e38912](https://github.com/prefapp/action-make-state-repos-dispatches/commit/8e3891232a56dae7fce340eb2177a82a7da3a9a9))
- Added additional testing for github-helper
  ([eb702e2](https://github.com/prefapp/action-make-state-repos-dispatches/commit/eb702e25ce4e7c1fbc5f6e52bea5c94c2decb99a))
- Added additional tests and improved existing ones
  ([e53b25d](https://github.com/prefapp/action-make-state-repos-dispatches/commit/e53b25d57910d774fa806be725901b92d1a98464))
- Added additional tests for docker-helper and github-helper
  ([ef6d029](https://github.com/prefapp/action-make-state-repos-dispatches/commit/ef6d029d0938b71acdf69045064cd4fbcb286fbb))
- Added additional tests for ref-helper.js
  ([96d58e0](https://github.com/prefapp/action-make-state-repos-dispatches/commit/96d58e01768e90c099781d1e20d8bafdb89a2786))
- Added glob pattern matching to flavors list
  ([4a5b48f](https://github.com/prefapp/action-make-state-repos-dispatches/commit/4a5b48fa6edebb3ff3fcdb04f44e54d470ac386f))
- Added last needed tests
  ([c2d2d83](https://github.com/prefapp/action-make-state-repos-dispatches/commit/c2d2d834774d02388bea57bde4e3f429fa7cba98))
- Added missing tests por code coverage
  ([e260a19](https://github.com/prefapp/action-make-state-repos-dispatches/commit/e260a19eb869b6af4e604c5106e1fcc747d31bf2))
- Added tests for ref-helper.js
  ([2966623](https://github.com/prefapp/action-make-state-repos-dispatches/commit/2966623c3cbdf2319cc12c82f3224a47271c9d7c))
- Allowed specifying a version when using
  ([dcd3ad4](https://github.com/prefapp/action-make-state-repos-dispatches/commit/dcd3ad43843edd3aae93c8eed9a48e528ca2a76a))
- Check local make_dispatches.yaml file before getting it from remote repo
  ([57d30be](https://github.com/prefapp/action-make-state-repos-dispatches/commit/57d30be45a237716d9b0436910a9c8058ecbb1c4))
- Check local make_dispatches.yaml file before getting it from remote repo
  ([5f4e527](https://github.com/prefapp/action-make-state-repos-dispatches/commit/5f4e5272277e879168389d92c6dede7ad3624b0e))
- Compiled app
  ([ffb29df](https://github.com/prefapp/action-make-state-repos-dispatches/commit/ffb29dfbee12d32a6b121fe777d9149d29544a39))
- Compiled app
  ([ca84ca9](https://github.com/prefapp/action-make-state-repos-dispatches/commit/ca84ca9286a9d134ac0abae92e8b12bb737adfb7))
- Compiled the action
  ([c33ee3f](https://github.com/prefapp/action-make-state-repos-dispatches/commit/c33ee3f4cc2f6e94827754dca25338e2bb79289d))
- Merge pull request
  [#45](https://github.com/prefapp/action-make-state-repos-dispatches/issues/45)
  from prefapp/feat/check-local-dispatches-file-first
  ([57d30be](https://github.com/prefapp/action-make-state-repos-dispatches/commit/57d30be45a237716d9b0436910a9c8058ecbb1c4))
- The application now checks locally for the dispatches file before getting it
  from Github if it doesn't exists
  ([c53f8e6](https://github.com/prefapp/action-make-state-repos-dispatches/commit/c53f8e6ead76d44a7e1adb4f7c77bf7def6c2f25))

### Bug Fixes

- Added additional debug info
  ([c777dd8](https://github.com/prefapp/action-make-state-repos-dispatches/commit/c777dd87529b82b14b758bde8e31bd96f0c375e0))
- Changed all instances of console.log to debug
  ([b09132b](https://github.com/prefapp/action-make-state-repos-dispatches/commit/b09132b49b67b6e7548d6157e2614a3881408b63))
- Fixed dispatch data debug message
  ([ba63fc6](https://github.com/prefapp/action-make-state-repos-dispatches/commit/ba63fc6b3e3cc09210f62b11d9fa937282cf42a7))
- Fixed linter errors
  ([1157d8b](https://github.com/prefapp/action-make-state-repos-dispatches/commit/1157d8be13a3fea79f7bbb03d9ec1fd52f45e957))
- Linter errors
  ([79baebc](https://github.com/prefapp/action-make-state-repos-dispatches/commit/79baebc6b7ba9923427a5df147bc03a752bc46ae))
- Removed all instances of the unused registry_base_paths inputs and variable
  ([6b8e7b8](https://github.com/prefapp/action-make-state-repos-dispatches/commit/6b8e7b88c392e94c80381859e19d81daf045ccbe))
- Removed debug logs
  ([2783357](https://github.com/prefapp/action-make-state-repos-dispatches/commit/27833574a4eb4c9e9e76b59475b15d322a1b9a43))
- Some linter errors
  ([aaa8d52](https://github.com/prefapp/action-make-state-repos-dispatches/commit/aaa8d528fa875c02c694e8adc5e80347178e6ff9))

## [1.7.0](https://github.com/prefapp/action-make-state-repos-dispatches/compare/v1.6.0...v1.7.0) (2024-07-23)

### Features

- Recompile app
  ([a326b53](https://github.com/prefapp/action-make-state-repos-dispatches/commit/a326b53852957bf123de53af4c8adec1cc880ee6))

### Bug Fixes

- Merge pull request
  [#35](https://github.com/prefapp/action-make-state-repos-dispatches/issues/35)
  from prefapp/fix/wrong-registry-access
  ([b8638e9](https://github.com/prefapp/action-make-state-repos-dispatches/commit/b8638e92e7df46ca938268465fcf423e690e53da))
- Wrong access to registry value
  ([b8638e9](https://github.com/prefapp/action-make-state-repos-dispatches/commit/b8638e92e7df46ca938268465fcf423e690e53da))
- Wrong access to registry value
  ([c770459](https://github.com/prefapp/action-make-state-repos-dispatches/commit/c770459dbee70e7723f49f6c254832dd983e2656))

## [1.6.0](https://github.com/prefapp/action-make-state-repos-dispatches/compare/v1.5.1...v1.6.0) (2024-07-23)

### Features

- Compiled app
  ([2ffaf73](https://github.com/prefapp/action-make-state-repos-dispatches/commit/2ffaf73a564b370469dbb1f8ede9d81eaf994b4d))

### Bug Fixes

- Fixed getting wrong registry from build summary
  ([639b676](https://github.com/prefapp/action-make-state-repos-dispatches/commit/639b67600ea45f93e89c7bdc3b880b78452128da))
- Merge pull request
  [#33](https://github.com/prefapp/action-make-state-repos-dispatches/issues/33)
  from prefapp/fix/wrong-registry
  ([878cdda](https://github.com/prefapp/action-make-state-repos-dispatches/commit/878cdda57ff5665821e80c6a2fd863ffa98d7c6e))
- Wrong registry
  ([878cdda](https://github.com/prefapp/action-make-state-repos-dispatches/commit/878cdda57ff5665821e80c6a2fd863ffa98d7c6e))

## [1.5.1](https://github.com/prefapp/action-make-state-repos-dispatches/compare/v1.5.0...v1.5.1) (2024-07-23)

### Bug Fixes

- filters and sort pre-releases
  ([#31](https://github.com/prefapp/action-make-state-repos-dispatches/issues/31))
  ([43bdf82](https://github.com/prefapp/action-make-state-repos-dispatches/commit/43bdf820d58cbdf7c65e42b36b46b3e39daae225))

## [1.5.0](https://github.com/prefapp/action-make-state-repos-dispatches/compare/v1.4.0...v1.5.0) (2024-07-22)

### Features

- Added initial tests
  ([4dc1e7b](https://github.com/prefapp/action-make-state-repos-dispatches/commit/4dc1e7bff0d58e42939c9a84806e19412e4d8dea))
- Compiled the action
  ([fd48c4b](https://github.com/prefapp/action-make-state-repos-dispatches/commit/fd48c4bb172cb89c8311640adee406fb10f04244))
- Further changes and improvements to the refactor
  ([607ab95](https://github.com/prefapp/action-make-state-repos-dispatches/commit/607ab95f9d83155d2447606db84d49f5f1f91928))
- Test structure
  ([32ab5e5](https://github.com/prefapp/action-make-state-repos-dispatches/commit/32ab5e55a5c72ceef4c910a9a028cde2ae5ece9c))

### Bug Fixes

- dispatch function name and recompiled action
  ([6e2d8c2](https://github.com/prefapp/action-make-state-repos-dispatches/commit/6e2d8c290e014acf4e0c25521fe372574e1e247c))
- Fixed github function name and recompiled action
  ([d9e1dcb](https://github.com/prefapp/action-make-state-repos-dispatches/commit/d9e1dcbef7a62c3f2e2be9e2bd771a8c74a8fc45))
- Fixed missing await and recompiled action
  ([5adb0e5](https://github.com/prefapp/action-make-state-repos-dispatches/commit/5adb0e5d4b13c54907d89f5c1b144af16127fd3b))
- Fixed missing exports and recompiled action
  ([12f83b0](https://github.com/prefapp/action-make-state-repos-dispatches/commit/12f83b04264e472ca9617bffe385e3155157a23f))
- missing await and recompiled action
  ([f287db4](https://github.com/prefapp/action-make-state-repos-dispatches/commit/f287db413c3e605f1088613e3a5c824ef9920c77))
- Recompiled action
  ([02519bd](https://github.com/prefapp/action-make-state-repos-dispatches/commit/02519bd3a2414b3c649b9fb6995e400ab482600a))
- Removed unused imports
  ([80af5a7](https://github.com/prefapp/action-make-state-repos-dispatches/commit/80af5a7a32dd026200e1d3963a693236a7d7686c))
- simplify the four for loops
  ([#29](https://github.com/prefapp/action-make-state-repos-dispatches/issues/29))
  ([7b1bc4d](https://github.com/prefapp/action-make-state-repos-dispatches/commit/7b1bc4dd1819b4db2de820dedc4b56e7e8feecde))

## [1.4.0](https://github.com/prefapp/action-make-state-repos-dispatches/compare/v1.3.0...v1.4.0) (2024-07-09)

### Features

- rename inputs
  ([6332e98](https://github.com/prefapp/action-make-state-repos-dispatches/commit/6332e98cdebc1efc9bafeb5075d5b33cda651451))

## [1.3.0](https://github.com/prefapp/action-make-state-repos-dispatches/compare/v1.2.0...v1.3.0) (2024-07-05)

### Features

- Compile action
  ([9efadd8](https://github.com/prefapp/action-make-state-repos-dispatches/commit/9efadd8ee456aedff31773a4e1f0204306b245db))

### Bug Fixes

- Updated base paths variable from YAML to JSON
  ([7c9498f](https://github.com/prefapp/action-make-state-repos-dispatches/commit/7c9498f5816e86245fd2a7300e536a8b106029bc))

## [1.2.0](https://github.com/prefapp/action-make-state-repos-dispatches/compare/v1.1.1...v1.2.0) (2024-07-05)

### Features

- Add event type input
  [#14](https://github.com/prefapp/action-make-state-repos-dispatches/issues/14)
  ([d1e2da1](https://github.com/prefapp/action-make-state-repos-dispatches/commit/d1e2da1c538fee22a4905170ec4a1192aa2356b9))

### Bug Fixes

- Payload sent to action-state-repo-update-image
  ([4c3b48d](https://github.com/prefapp/action-make-state-repos-dispatches/commit/4c3b48dfae77b4af0590ba48f1db62ef46599253))
- Payload sent to action-state-repo-update-image
  ([15d5b50](https://github.com/prefapp/action-make-state-repos-dispatches/commit/15d5b50d9a05fbacecb6d3bec6a93d775e963620))

## [1.1.1](https://github.com/prefapp/action-make-state-repos-dispatches/compare/v1.1.0...v1.1.1) (2024-07-04)

### Bug Fixes

- Add check to avoid empty dispatches
  [#12](https://github.com/prefapp/action-make-state-repos-dispatches/issues/12)
  ([dc8e28a](https://github.com/prefapp/action-make-state-repos-dispatches/commit/dc8e28a4276bec97e31ffb0d86df2ce7b468416a))

## [1.1.0](https://github.com/prefapp/action-make-state-repos-dispatches/compare/v1.0.0...v1.1.0) (2024-07-03)

### Features

- Add support for docker registry base path input
  [#8](https://github.com/prefapp/action-make-state-repos-dispatches/issues/8)
  ([f130453](https://github.com/prefapp/action-make-state-repos-dispatches/commit/f13045344ea795ee7ae97637e2e4f232ac04f9c3))
- Check image existence before dispatching
  [#10](https://github.com/prefapp/action-make-state-repos-dispatches/issues/10)
  ([bf0ee46](https://github.com/prefapp/action-make-state-repos-dispatches/commit/bf0ee463c04dc10ad23d3f7d72cd7f2959a9b9cb))

## 1.0.0 (2024-06-20)

### Features

- Add release-please
  [#6](https://github.com/prefapp/action-make-state-repos-dispatches/issues/6)
  ([13aea23](https://github.com/prefapp/action-make-state-repos-dispatches/commit/13aea239bf9457fd95084eb7806dbe55ebc78b86))
- Added support for image_repository config option
  ([de02e3b](https://github.com/prefapp/action-make-state-repos-dispatches/commit/de02e3b30333f7e370bc38b636c57c64d64b3f9f))
- Initial version of the action
  ([3933cb1](https://github.com/prefapp/action-make-state-repos-dispatches/commit/3933cb144ea8a211718cc3288a06106992356d51))
