# Fingerprint generator
NodeJs package for generating realistic browser fingerprints and matching headers.

Works best with the [Fingerprint injector](https://github.com/apify/fingerprint-injector).

<!-- toc -->

- [Installation](#installation)
- [Usage](#usage)
- [Result example](#result-example)
- [API Reference](#api-reference)

<!-- tocstop -->

## Installation
Run the `npm install fingerprint-generator` command. No further setup is needed afterwards.
## Usage
To use the generator, you need to create an instance of the `FingerprintGenerator` class which is exported from this package. Constructor of this class accepts a `HeaderGeneratorOptions` object, which can be used to globally specify what kind of fingerprint and headers you are looking for:
```js
const FingerprintGenerator = require('fingerprint-generator');
let fingerprintGenerator = new FingerprintGenerator({
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
You can then get the fingerprint and headers using the `getFingerprint` method, either with no argument, or with another `HeaderGeneratorOptions` object, this time specifying the options only for this call (overwriting the global options when in conflict) and using the global options specified beforehands for the unspecified options:
```js
let { fingerprint, headers } = fingerprintGenerator.getFingerprint({
        operatingSystems: [
            "linux"
        ],
        locales: ["en-US", "en"]
});
```
This method always generates a random realistic fingerprint and a matching set of headers, excluding the request dependant headers, which need to be filled in afterwards. Since the generation is randomized, multiple calls to this method with the same parameters can generate multiple different outputs.
## Result example
Fingerprint that might be generated for the usage example above:
```json
{
  "userAgent": "Mozilla/5.0 (X11; Linux x86_64; rv:90.0) Gecko/20100101 Firefox/90.0",
  "cookiesEnabled": true,
  "timezone": "Europe/Prague",
  "timezoneOffset": -60,
  "audioCodecs": {
    "ogg": "probably",
    "mp3": "maybe",
    "wav": "probably",
    "m4a": "maybe",
    "aac": "maybe"
  },
  "videoCodecs": {
    "ogg": "probably", 
    "h264": "probably", 
    "webm": "probably"
  },
  "videoCard": [
    "Intel Open Source Technology Center",
    "Mesa DRI Intel(R) HD Graphics 4600 (HSW GT2)"
  ],
  "productSub": "20100101",
  "hardwareConcurrency": 8,
  "multimediaDevices": { 
    "speakers": 0, 
    "micros": 0, 
    "webcams": 0
  },
  "platform": "Linux x86_64",
  "pluginsSupport": true,
  "screenResolution": [ 1920, 1080 ],
  "availableScreenResolution": [ 1920, 1080 ],
  "colorDepth": 24,
  "touchSupport": { 
    "maxTouchPoints": 0, 
    "touchEvent": false, 
    "touchStart": false
  },
  "languages": [ "en-US", "en" ]
}
```
And the matching headers:
```json
{
  "user-agent": "Mozilla/5.0 (X11; Linux x86_64; rv:90.0) Gecko/20100101 Firefox/90.0",
  "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "accept-language": "en-US,en;q=0.9",
  "accept-encoding": "gzip, deflate, br",
  "upgrade-insecure-requests": "1",
  "te": "trailers"
}
```
## API Reference
All public classes, methods and their parameters can be inspected in this API reference.

<a name="FingerprintGenerator"></a>

### FingerprintGenerator
Fingerprint generator - randomly generates realistic browser fingerprints


* [FingerprintGenerator](#FingerprintGenerator)
    * [`new FingerprintGenerator(options)`](#new_FingerprintGenerator_new)
    * [`.getFingerprint(options, requestDependentHeaders)`](#FingerprintGenerator+getFingerprint)


* * *

<a name="new_FingerprintGenerator_new"></a>

#### `new FingerprintGenerator(options)`

| Param | Type | Description |
| --- | --- | --- |
| options | [<code>HeaderGeneratorOptions</code>](#HeaderGeneratorOptions) | default header generation options used unless overridden |


* * *

<a name="FingerprintGenerator+getFingerprint"></a>

#### `fingerprintGenerator.getFingerprint(options, requestDependentHeaders)`
Generates a fingerprint and a matching set of ordered headers using a combination of the default options specified in the constructor
and their possible overrides provided here.


| Param | Type | Description |
| --- | --- | --- |
| options | [<code>HeaderGeneratorOptions</code>](#HeaderGeneratorOptions) | specifies options that should be overridden for this one call |
| requestDependentHeaders | <code>Object</code> | specifies known values of headers dependent on the particular request |


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
| operatingSystems | <code>Array.&lt;string&gt;</code> | List of operating systems to generate the headers for.  The options are `windows`, `macos`, `linux`, `android` and `ios`. |
| devices | <code>Array.&lt;string&gt;</code> | List of devices to generate the headers for. Options are `desktop` and `mobile`. |
| locales | <code>Array.&lt;string&gt;</code> | List of at most 10 languages to include in the  [Accept-Language](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Accept-Language) request header  in the language format accepted by that header, for example `en`, `en-US` or `de`. |
| httpVersion | <code>string</code> | Http version to be used to generate headers (the headers differ depending on the version).  Can be either 1 or 2. Default value is 2. |


* * *

