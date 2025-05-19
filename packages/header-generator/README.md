# `header-generator`

---

`header-generator` is a part of the `fingerprint-suite` developed by [Apify](https://apify.com/). Make sure to check out the [main repository](https://github.com/apify/fingerprint-suite/) for all the anti-fingerprinting tools!

---

`header-generator` is a Node.js package for generating browser-like HTTP headers.

<!-- toc -->

- [Installation](#installation)
- [Usage](#usage)
- [Presets](#presets)
- [Result example](#result-example)
- [API Reference](#api-reference)

<!-- tocstop -->

## Installation

Run the `npm install header-generator` command. No further setup is needed afterwards.

## Usage

To use the generator, you need to create an instance of the `HeaderGenerator` class which is exported from this package. Constructor of this class accepts a `HeaderGeneratorOptions` object, which can be used to globally specify what kind of headers you are looking for:

```js
import { HeaderGenerator } from 'header-generator';
let headerGenerator = new HeaderGenerator({
    browsers: [
        { name: 'firefox', minVersion: 90 },
        { name: 'chrome', minVersion: 110 },
        'safari',
    ],
    devices: ['desktop'],
    operatingSystems: ['windows'],
});
```

You can then get the headers using the `getHeaders` method, either with no argument, or with another `HeaderGeneratorOptions` object, this time specifying the options only for this call (overwriting the global options when in conflict) and using the global options specified beforehands for the unspecified options:

```js
let headers = headerGenerator.getHeaders({
    operatingSystems: ['linux'],
    locales: ['en-US', 'en'],
});
```

This method always generates a random realistic set of headers, excluding the request dependant headers (e.g. the `Host` header or [HTTP2 pseudo-headers](https://datatracker.ietf.org/doc/html/rfc9113#name-request-pseudo-header-field)), which need to be filled in afterwards. Since the generation is randomized, multiple calls to this method with the same parameters can generate multiple different outputs.

## Presets

Presets are setting templates for common use cases. It saves time writing the same configuration over and over.

```js
import { HeaderGenerator, PRESETS } = from 'header-generator';
let headerGenerator = new HeaderGenerator(PRESETS.MODERN_WINDOWS_CHROME);
```

This preset will fill the configuration for the latest five versions of chrome for windows desktops. Checkout the available presets list [here](https://github.com/apify/fingerprint-suite/blob/master/packages/header-generator/src/presets.ts).

## Result example

A result that can be generated for the usage example above:

```json
{
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": "\"Windows\"",
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0",
    "accept-encoding": "gzip, deflate, br",
    "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
    "sec-ch-ua": "\"Microsoft Edge\";v=\"119\", \"Chromium\";v=\"119\", \"Not?A_Brand\";v=\"24\"",
    "upgrade-insecure-requests": "1",
    "accept-language": "en-US",
    "sec-fetch-site": "same-site",
    "sec-fetch-mode": "navigate",
    "sec-fetch-user": "?1",
    "sec-fetch-dest": "document"
}
```

## API Reference

All public classes, methods and their parameters can be inspected in this API reference.

### HeaderGenerator

HeaderGenerator randomly generates realistic browser headers based on specified options.

- [HeaderGenerator](#headergenerator)
    - [`new HeaderGenerator(options)`](#new-headergeneratoroptions)
    - [`.getHeaders(options, requestDependentHeaders)`](#headergeneratorgetheadersoptions-requestdependentheaders)
    - [`.orderHeaders(headers, order)`](#headergeneratororderheadersheaders-order)
- [BrowserSpecification](#browserspecification)
- [HeaderGeneratorOptions](#headergeneratoroptions)

---

#### `new HeaderGenerator(options)`

| Param   | Type                                                | Description                                              |
| ------- | --------------------------------------------------- | -------------------------------------------------------- |
| options | [`HeaderGeneratorOptions`](#HeaderGeneratorOptions) | default header generation options used unless overridden |

#### `headerGenerator.getHeaders(options, requestDependentHeaders)`

Generates a single set of ordered headers using a combination of the default options specified in the constructor
and their possible overrides provided here.

| Param                   | Type                                                | Description                                                                                                                           |
| ----------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| options                 | [`HeaderGeneratorOptions`](#HeaderGeneratorOptions) | specifies options for the header generator that should be overridden for this one call                                                |
| requestDependentHeaders | `Record<string, any>`                               | specifies known values of headers dependent on the particular request. These will be merged with the generated headers in the result. |

#### `headerGenerator.orderHeaders(headers, order)`

Returns a new object that contains ordered headers.

| Param     | Type        | Description                                                                     |
| --------- | ----------- | ------------------------------------------------------------------------------- |
| `headers` | `object`    | specifies known values of headers dependent on the particular request           |
| `order`   | `string[]?` | an array of ordered header names, optional (will be deducted from `user-agent`) |

### `BrowserSpecification`

| Param         | Type     | Description                                                                                                                                                                                  |
| ------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`        | `string` | One of `chrome`, `firefox` and `safari`.                                                                                                                                                     |
| `minVersion`  | `number` | Minimal version of browser used.                                                                                                                                                             |
| `maxVersion`  | `number` | Maximal version of browser used.                                                                                                                                                             |
| `httpVersion` | `string` | HTTP version to be used to generate headers (the headers differ depending on the version). Either 1 or 2. If none specified the `httpVersion` specified in `HeaderGeneratorOptions` is used. |

### `HeaderGeneratorOptions`

| Param              | Type                                | Description                                                                                                                                                                                                                                   |
| ------------------ | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `browsers`         | `(BrowserSpecification\|string)[]?` | List of BrowserSpecifications to generate the headers for, or one of `chrome`, `firefox` and `safari`.                                                                                                                                        |
| `browserListQuery` | `string?`                           | Browser generation query based on the real world data. For more info see the [query docs](https://github.com/browserslist/browserslist#full-list). If `browserListQuery` is passed the `browsers` array is ignored.                           |
| `operatingSystems` | `string[]?`                         | List of operating systems to generate the headers for. The options are `windows`, `macos`, `linux`, `android` and `ios`.                                                                                                                      |
| `devices`          | `string[]?`                         | List of devices to generate the headers for. Options are `desktop` and `mobile`.                                                                                                                                                              |
| `locales`          | `string[]?`                         | List of at most 10 languages to include in the [Accept-Language](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Accept-Language) request header in the language format accepted by that header, for example `en`, `en-US` or `de`. |
| `httpVersion`      | `string?`                           | HTTP version to be used to generate headers (the headers differ depending on the version). Can be either 1 or 2. Default value is 2.                                                                                                          |
