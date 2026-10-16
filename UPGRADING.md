# Upgrading to v3

Version 3 modernizes the toolchain and the dependencies of all packages (`header-generator`, `fingerprint-generator`, `fingerprint-injector` and `generative-bayesian-network`) the same way [Crawlee v4](https://crawlee.dev/js/docs/upgrading/upgrading-to-v4) and the [Apify SDK v4](https://docs.apify.com/sdk/js/docs/upgrading/upgrading-to-v4) did, so the suite shares its stack (and its installed dependencies) with them. **The generated headers and fingerprints, the injected script and the public classes and options are unchanged.**

## Node.js 22.13+

Support for older Node.js versions was dropped. The packages are tested on Node.js 22, 24 and 26.

## ESM only

The packages are native ES modules now and no longer ship a CommonJS build or the `dist/index.mjs` wrapper. `import` works as before. `require()` keeps working too, because the packages have no top-level `await` and Node.js 22.13+ can `require()` ES modules:

```js
import { HeaderGenerator } from 'header-generator';
// CommonJS projects can still use:
const { HeaderGenerator } = require('header-generator');
```

A TypeScript project that compiles to CommonJS needs TypeScript 5.8+ (with `module: nodenext`) to type-check such a `require()`.

## Argument validation (`ow` → `zod`)

`HeaderGenerator` (and so `FingerprintGenerator`) validates its options with [zod](https://zod.dev), through `@apify/validations` - the package Crawlee and the Apify SDK use. Valid options are accepted exactly as before, but a validation failure now throws `ArgumentValidationError` (exported from `header-generator` and `fingerprint-generator`; it is the error class that Crawlee and the SDK use as well, so `instanceof` works across them whenever `@apify/validations` is deduplicated) instead of `ow`'s `ArgumentError`. All problems are reported at once, field first:

```diff
- Expected property `strict` to be of type `boolean` but received type `string` in object `HeaderGeneratorOptions`
+ Invalid input: expected boolean, received the string `yes` at `strict` in `HeaderGeneratorOptions`

- (array `operatingSystems`) Expected property string values to be one of `["windows","macos","linux","android","ios"]`, got `beos` in object `HeaderGeneratorOptions`
+ Invalid option: expected one of "windows"|"macos"|"linux"|"android"|"ios" at `operatingSystems[0]`, got `beos` in `HeaderGeneratorOptions`
```

The structured zod issues are available as `error.issues` (and the raw `ZodError` as `error.cause`).

- `headerGeneratorOptionsShape` (an `ow` shape) is replaced by `headerGeneratorOptionsSchema`, a zod schema.
- An array or a function passed as the whole options object is rejected now (`ow.object` accepted them by accident).

## `browserslist` is an optional peer dependency

`browserslist` and its data (`caniuse-lite`, ...) are about 5 MB, yet they are needed only to resolve a `browserListQuery`. If you use `browserListQuery` - **including the `PRESETS`, which are defined through it** - install the package yourself:

```bash
npm install browserslist
```

Without it, generating headers and fingerprints works as usual, and using a `browserListQuery` throws an error that says what to install.

## Private members are `#private` fields

Private members are native `#` fields now instead of TypeScript's `private`, so they are no longer reachable through casts or bracket access (and no longer show up in `Object.keys()` or `JSON.stringify()`). Use the public API instead. `BayesianNetwork.nodesByName` and `BayesianNode.conditionalProbabilities` are new read-only accessors for what used to be read this way.

## Dependencies

|                                                         | v2                                       | v3                                                           |
| ------------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------ |
| `generative-bayesian-network`                           | `adm-zip`, `tslib`                       | none (network definitions are read with `node:zlib`)         |
| `header-generator`                                      | `ow`, `browserslist`, `tslib`            | `@apify/validations` (zod); optional peer: `browserslist`    |
| `fingerprint-generator`, `fingerprint-injector`         | `tslib` (+ the above)                    | only the packages above; optional peers: `playwright`, `puppeteer` |

The network definitions are still ZIP archives, so the data files remain usable from other ecosystems (they are published to PyPI as well). `new BayesianNetwork({ path })` accepts a `file:` URL in addition to a file path.
