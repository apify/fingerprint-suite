# Header generator
NodeJs package for generating browser-like headers.

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
const { HeaderGenerator } = require('header-generator');
let headerGenerator = new HeaderGenerator({
        browsers: [
            {name: "firefox", minVersion: 80},
            {name: "chrome", minVersion: 87},
            "safari"
        ],
        devices: [
            "desktop"
        ],
        operatingSystems: [
            "windows"
        ]
});
```
You can then get the headers using the `getHeaders` method, either with no argument, or with another `HeaderGeneratorOptions` object, this time specifying the options only for this call (overwriting the global options when in conflict) and using the global options specified beforehands for the unspecified options:
```js
let headers = headersGenerator.getHeaders({
        operatingSystems: [
            "linux"
        ],
        locales: ["en-US", "en"]
});
```
This method always generates a random realistic set of headers, excluding the request dependant headers, which need to be filled in afterwards. Since the generation is randomized, multiple calls to this method with the same parameters can generate multiple different outputs.

## Presets
Presets are setting templates for common use cases. It saves time writing the same configuration over and over.
```js
const { HeaderGenerator, PRESETS } = require('header-generator');
let headerGenerator = new HeaderGenerator(PRESETS.MODERN_WINDOWS_CHROME);
```

This preset will fill the configuration for the latest five versions of chrome for windows desktops. Checkout the available presets list [here](https://github.com/apify/header-generator/blob/master/src/presets.ts).
## Result example
A result that can be generated for the usage example above:
```json
{
  "sec-ch-ua-mobile": "?0",
  "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.72 Safari/537.36",
  "accept-encoding": "gzip, deflate, br",
  "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
  "upgrade-insecure-requests": "1",
  "accept-language": "en-US,en;0.9",
  "sec-fetch-site": "same-site",
  "sec-fetch-mode": "navigate",
  "sec-fetch-user": "?1",
  "sec-fetch-dest": "document"
}
```
## API Reference
All public classes, methods and their parameters can be inspected in this API reference.

<a name="HeaderGenerator"></a>

### HeaderGenerator
HeaderGenerator randomly generates realistic browser headers based on specified options.


* [HeaderGenerator](#HeaderGenerator)
    * [`new HeaderGenerator(options)`](#new_HeaderGenerator_new)
    * [`.getHeaders(options, requestDependentHeaders)`](#HeaderGenerator+getHeaders)
    * [`.orderHeaders(headers, order)`](#HeaderGenerator+orderHeaders)


* * *

<a name="new_HeaderGenerator_new"></a>

#### `new HeaderGenerator(options)`

| Param | Type | Description |
| --- | --- | --- |
| options | [<code>HeaderGeneratorOptions</code>](#HeaderGeneratorOptions) | default header generation options used unless overridden |


* * *

<a name="HeaderGenerator+getHeaders"></a>

#### `headerGenerator.getHeaders(options, requestDependentHeaders)`
Generates a single set of ordered headers using a combination of the default options specified in the constructor
and their possible overrides provided here.


| Param | Type | Description |
| --- | --- | --- |
| options | [<code>HeaderGeneratorOptions</code>](#HeaderGeneratorOptions) | specifies options that should be overridden for this one call |
| requestDependentHeaders | <code>Object</code> | specifies known values of headers dependent on the particular request |


* * *

<a name="HeaderGenerator+orderHeaders"></a>

#### `headerGenerator.orderHeaders(headers, order)`
Returns a new object that contains ordered headers.


| Param | Type | Description |
| --- | --- | --- |
| headers | <code>object</code> | specifies known values of headers dependent on the particular request |
| order | <code>Array.&lt;string&gt;</code> | an array of ordered header names, optional (will be deducted from `user-agent`) |


* * *

<a name="BrowserSpecification"></a>

### `BrowserSpecification`

| Param | Type | Description |
| --- | --- | --- |
| name | <code>string</code> | One of `chrome`, `firefox` and `safari`. |
| minVersion | <code>number</code> | Minimal version of browser used. |
| maxVersion | <code>number</code> | Maximal version of browser used. |
| httpVersion | <code>string</code> | Http version to be used to generate headers (the headers differ depending on the version).  Either 1 or 2. If none specified the httpVersion specified in `HeaderGeneratorOptions` is used. |


* * *

<a name="HeaderGeneratorOptions"></a>

### `HeaderGeneratorOptions`

| Param | Type | Description |
| --- | --- | --- |
| browsers | <code>Array.&lt;(BrowserSpecification\|string)&gt;</code> | List of BrowserSpecifications to generate the headers for,  or one of `chrome`, `firefox` and `safari`. |
| browserListQuery | <code>string</code> | Browser generation query based on the real world data.  For more info see the [query docs](https://github.com/browserslist/browserslist#full-list).  If `browserListQuery` is passed the `browsers` array is ignored. |
| operatingSystems | <code>Array.&lt;string&gt;</code> | List of operating systems to generate the headers for.  The options are `windows`, `macos`, `linux`, `android` and `ios`. |
| devices | <code>Array.&lt;string&gt;</code> | List of devices to generate the headers for. Options are `desktop` and `mobile`. |
| locales | <code>Array.&lt;string&gt;</code> | List of at most 10 languages to include in the  [Accept-Language](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Accept-Language) request header  in the language format accepted by that header, for example `en`, `en-US` or `de`. |
| httpVersion | <code>string</code> | Http version to be used to generate headers (the headers differ depending on the version).  Can be either 1 or 2. Default value is 2. |


* * *

