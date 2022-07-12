// This file contains utils that are build and included on the window object with some randomized prefix.

// some protections can mess with these to prevent the overrides - our script is first so we can reference the old values.
const cache = {
    Reflect: {
        get: Reflect.get.bind(Reflect),
        apply: Reflect.apply.bind(Reflect),
    },
    // Used in `makeNativeString`
    nativeToStringStr: `${Function.toString}`, // => `function toString() { [native code] }`
};

/**
 * @param masterObject Object to override.
 * @param propertyName Property to override.
 * @param proxyHandler Proxy handled with the new value.
 */
function overridePropertyWithProxy(masterObject, propertyName, proxyHandler) {
    const originalObject = masterObject[propertyName];
    const proxy = new Proxy(masterObject[propertyName], stripProxyFromErrors(proxyHandler));

    redefineProperty(masterObject, propertyName, { value: proxy });
    redirectToString(proxy, originalObject);
}

/**
 * @param masterObject Object to override.
 * @param propertyName Property to override.
 * @param proxyHandler Proxy handled with getter handler.
 */
function overrideGetterWithProxy(masterObject, propertyName, proxyHandler) {
    const fn = Object.getOwnPropertyDescriptor(masterObject, propertyName).get;
    const fnStr = fn.toString; // special getter function string
    const proxyObj = new Proxy(fn, stripProxyFromErrors(proxyHandler));

    redefineProperty(masterObject, propertyName, { get: proxyObj });
    redirectToString(proxyObj, fnStr);
}

/**
 * @param instance Instance to override.
 * @param overrideObj New instance values.
 */
// eslint-disable-next-line no-unused-vars
function overrideInstancePrototype(instance, overrideObj) {
    Object.keys(overrideObj).forEach((key) => {
        if (!(overrideObj[key] === null)) {
            try {
                overrideGetterWithProxy(
                    Object.getPrototypeOf(instance),
                    key,
                    makeHandler().getterValue(overrideObj[key]),
                );
            } catch (e) {
                console.error(`Could not override property: ${key} on ${instance}. Reason: ${e.message} `);
            }
        }
    });
}

function redirectToString(proxyObj, originalObj) {
    const handler = {
        apply(target, ctx) {
            // This fixes e.g. `HTMLMediaElement.prototype.canPlayType.toString + ""`
            if (ctx === Function.prototype.toString) {
                return makeNativeString('toString');
            }

            // `toString` targeted at our proxied Object detected
            if (ctx === proxyObj) {
                const fallback = () => (originalObj && originalObj.name
                    ? makeNativeString(originalObj.name)
                    : makeNativeString(proxyObj.name));

                // Return the toString representation of our original object if possible
                return `${originalObj}` || fallback();
            }

            // Check if the toString prototype of the context is the same as the global prototype,
            // if not indicates that we are doing a check across different windows., e.g. the iframeWithdirect` test case
            const hasSameProto = Object.getPrototypeOf(
                Function.prototype.toString,
            ).isPrototypeOf(ctx.toString); // eslint-disable-line no-prototype-builtins
            if (!hasSameProto) {
                // Pass the call on to the local Function.prototype.toString instead
                return ctx.toString();
            }

            return target.call(ctx);
        },
    };

    const toStringProxy = new Proxy(
        Function.prototype.toString,
        stripProxyFromErrors(handler),
    );
    redefineProperty(Function.prototype, 'toString', {
        value: toStringProxy,
    });
}

function makeNativeString(name = '') {
    return cache.nativeToStringStr.replace('toString', name || '');
}

function redefineProperty(masterObject, propertyName, descriptorOverrides = {}) {
    return Object.defineProperty(masterObject, propertyName, {
        // Copy over the existing descriptors (writable, enumerable, configurable, etc)
        ...(Object.getOwnPropertyDescriptor(masterObject, propertyName) || {}),
        // Add our overrides (e.g. value, get())
        ...descriptorOverrides,
    });
}

function stripProxyFromErrors(handler) {
    const newHandler = {};
    // We wrap each trap in the handler in a try/catch and modify the error stack if they throw
    const traps = Object.getOwnPropertyNames(handler);
    traps.forEach((trap) => {
        newHandler[trap] = function () {
            try {
                // Forward the call to the defined proxy handler
                return handler[trap].apply(this, arguments || []); //eslint-disable-line
            } catch (err) {
                // Stack traces differ per browser, we only support chromium based ones currently
                if (!err || !err.stack || !err.stack.includes(`at `)) {
                    throw err;
                }

                // When something throws within one of our traps the Proxy will show up in error stacks
                // An earlier implementation of this code would simply strip lines with a blacklist,
                // but it makes sense to be more surgical here and only remove lines related to our Proxy.
                // We try to use a known "anchor" line for that and strip it with everything above it.
                // If the anchor line cannot be found for some reason we fall back to our blacklist approach.

                const stripWithBlacklist = (stack, stripFirstLine = true) => {
                    const blacklist = [
                        `at Reflect.${trap} `, // e.g. Reflect.get or Reflect.apply
                        `at Object.${trap} `, // e.g. Object.get or Object.apply
                        `at Object.newHandler.<computed> [as ${trap}] `, // caused by this very wrapper :-)
                    ];
                    return (
                        err.stack
                            .split('\n')
                            // Always remove the first (file) line in the stack (guaranteed to be our proxy)
                            .filter((line, index) => !(index === 1 && stripFirstLine))
                            // Check if the line starts with one of our blacklisted strings
                            .filter((line) => !blacklist.some((bl) => line.trim().startsWith(bl)))
                            .join('\n')
                    );
                };

                const stripWithAnchor = (stack, anchor) => {
                    const stackArr = stack.split('\n');
                    anchor = anchor || `at Object.newHandler.<computed> [as ${trap}] `; // Known first Proxy line in chromium
                    const anchorIndex = stackArr.findIndex((line) => line.trim().startsWith(anchor));
                    if (anchorIndex === -1) {
                        return false; // 404, anchor not found
                    }
                    // Strip everything from the top until we reach the anchor line
                    // Note: We're keeping the 1st line (zero index) as it's unrelated (e.g. `TypeError`)
                    stackArr.splice(1, anchorIndex);
                    return stackArr.join('\n');
                };

                // Special cases due to our nested toString proxies
                err.stack = err.stack.replace(
                    'at Object.toString (',
                    'at Function.toString (',
                );
                if ((err.stack || '').includes('at Function.toString (')) {
                    err.stack = stripWithBlacklist(err.stack, false);
                    throw err;
                }

                // Try using the anchor method, fallback to blacklist if necessary
                err.stack = stripWithAnchor(err.stack) || stripWithBlacklist(err.stack);

                throw err; // Re-throw our now sanitized error
            }
        };
    });
    return newHandler;
}

// eslint-disable-next-line no-unused-vars
function overrideWebGl(webGl) {
    // try to override WebGl
    try {
        // Remove traces of our Proxy
        const stripErrorStack = (stack) => stack
            .split('\n')
            .filter((line) => !line.includes('at Object.apply'))
            .filter((line) => !line.includes('at Object.get'))
            .join('\n');

        const getParameterProxyHandler = {
            get(target, key) {
                try {
                    // Mitigate Chromium bug (#130)
                    if (typeof target[key] === 'function') {
                        return target[key].bind(target);
                    }
                    return Reflect.get(target, key);
                } catch (err) {
                    err.stack = stripErrorStack(err.stack);
                    throw err;
                }
            },
            apply(target, thisArg, args) {
                const param = (args || [])[0];
                // UNMASKED_VENDOR_WEBGL
                if (param === 37445) {
                    return webGl.vendor;
                }
                // UNMASKED_RENDERER_WEBGL
                if (param === 37446) {
                    return webGl.renderer;
                }
                try {
                    return cache.Reflect.apply(target, thisArg, args);
                } catch (err) {
                    err.stack = stripErrorStack(err.stack);
                    throw err;
                }
            },
        };

        const addProxy = (obj, propName) => {
            overridePropertyWithProxy(obj, propName, getParameterProxyHandler);
        };

        addProxy(WebGLRenderingContext.prototype, 'getParameter');
        addProxy(WebGL2RenderingContext.prototype, 'getParameter');
    } catch (err) {
        console.warn(err);
    }
}

// eslint-disable-next-line no-unused-vars
const overrideCodecs = (audioCodecs, videoCodecs) => {
    const codecs = {
        ...Object.fromEntries(Object.entries(audioCodecs).map(([key, value]) => [`audio/${key}`, value])),
        ...Object.fromEntries(Object.entries(videoCodecs).map(([key, value]) => [`video/${key}`, value])),
    };
    const findCodec = (codecString) => {
        const codec = Object.entries(codecs).find(([key]) => key === codecString);
        if(codec) {
            return {name: codec[0], state: codec[1]};
        }
        throw new Error(`Codec ${codecString} not found in ${JSON.stringify(codecs)}`);
    };

    const canPlayType = {
        // eslint-disable-next-line
        apply: function (target, ctx, args) {
            if (!args || !args.length) {
                return target.apply(ctx, args);
            }
            const [codecString] = args;
            const codec = findCodec(codecString);

            if (codec) {
                return codec.state;
            }

            // If the codec is not in our collected data use
            return target.apply(ctx, args);
        },
    };

    overridePropertyWithProxy(
        HTMLMediaElement.prototype,
        'canPlayType',
        canPlayType,
    );
};

// eslint-disable-next-line no-unused-vars
function overrideBattery(batteryInfo) {
    const getBattery = {
        // eslint-disable-next-line
        apply: async function () {
            return batteryInfo;
        },
    };

    overridePropertyWithProxy(
        Object.getPrototypeOf(navigator),
        'getBattery',
        getBattery,
    );
}

function overrideIntlAPI(language){
    const innerHandler = {
        construct(target, [locales, options]) {  
          return new target(locales ?? language, options);
        },
        apply(target, _, [locales, options]) {
            return target(locales ?? language, options);
        }
      };

    overridePropertyWithProxy(window, 'Intl', {
        get(target, key){
            if(key[0].toLowerCase() === key[0]) return target[key];
            return new Proxy(
                target[key],
                innerHandler
            );
        }
    });
}

function makeHandler() {
    return {
        // Used by simple `navigator` getter evasions
        getterValue: (value) => ({
            apply(target, ctx, args) {
                // Let's fetch the value first, to trigger and escalate potential errors
                // Illegal invocations like `navigator.__proto__.vendor` will throw here
                const ret = cache.Reflect.apply(...arguments); // eslint-disable-line
                if (args && args.length === 0) {
                    return value;
                }
                return ret;
            },
        }),
    };
}
function overrideScreenByReassigning(target, newProperties) {
    for (const [prop, value] of Object.entries(newProperties)) {
        if (value > 0) {
            // The 0 values are introduced by collecting in the hidden iframe.
            // They are document sizes anyway so no need to test them or inject them.
            target[prop] = value;
        }
    }
}

// eslint-disable-next-line no-unused-vars
function overrideWindowDimensionsProps(props) {
    overrideScreenByReassigning(window, props);
}

// eslint-disable-next-line no-unused-vars
function overrideDocumentDimensionsProps(props) {
    overrideScreenByReassigning(window.document.body, props);
}

// eslint-disable-next-line no-unused-vars
function overrideUserAgentData(userAgentData) {
    const { brands, mobile, platform, ...highEntropyValues } = userAgentData;
    // Override basic properties
    const getHighEntropyValues = {
        // eslint-disable-next-line
        apply: async function (target, ctx, args) {
            // Just to throw original validation error
            // Remove traces of our Proxy
            const stripErrorStack = (stack) => stack
                .split('\n')
                .filter((line) => !line.includes('at Object.apply'))
                .filter((line) => !line.includes('at Object.get'))
                .join('\n');

            try {
                if (!args || !args.length) {
                    return target.apply(ctx, args);
                }
                const [hints] = args;
                await target.apply(ctx, args);

                // If the codec is not in our collected data use
                const data = {};
                hints.forEach((hint) => {
                    data[hint] = highEntropyValues[hint];
                });
                return data;
            } catch (err) {
                err.stack = stripErrorStack(err.stack);
                throw err;
            }
        },
    };

    overridePropertyWithProxy(
        Object.getPrototypeOf(window.navigator.userAgentData),
        'getHighEntropyValues',
        getHighEntropyValues,
    );

    overrideInstancePrototype(window.navigator.userAgentData, { brands, mobile, platform });
};

function overrideBasics(){
    Object.defineProperty(window.navigator, 'webdriver', {
        get: () => false
    });
}
