# wrapme <a name="start"></a>

[![NPM version](https://badge.fury.io/js/wrapme.png)](http://badge.fury.io/js/wrapme)

Functions to wrap other functions and methods and to change/enhance their behavior, functionality or usage.  
Can be used for Aspect-oriented programming.

### Features

* Wrap a single function/method (by `wrap`) or several methods at once (by `intercept`).
* Call original function/method before (use `before` or `beforeResult` option),
after (use `after` option) and/or inside `handler` (use `run()` or `runApply()`).
* Totally control calling of original function/method inside `handler`: call depending on condition,
filter/validate passed arguments and/or provide another arguments.
* Return result of original function/method or any other value from `handler`.
* Save necessary data between `handler` calls.
* Restore original methods when it is needed.
* Does not have dependencies and can be used in ECMAScript 5+ environment.
* Small size (minified version is about 1 Kb).

```js
import { intercept } from 'wrapme';

const api = {
    sum(...numList) {
        let result = 0;
        for (let value of numList) {
            result += value;
        }
        return result;
    },
    // Other methods
    // ...
};

// Logging

const log = [];

function logger(callData) {
    log.push({
        name: callData.method,
        args: callData.arg,
        result: callData.result,
        callNum: callData.number,
        time: new Date().getTime()
    });
}

const unwrap = intercept(api, 'sum', logger, {beforeResult: true});

api.sum(1, 2, 3, 4);   // Returns 10, adds item to log
api.sum(1, -1, 2, -2, 3);   // Returns 3, adds item to log

// Restore original method
unwrap();
```

[See more examples below.](#examples)

## Table of contents

* [Installation](#install)
* [Usage](#usage)
* [Examples](#examples)
* [API](#api)
* [Related projects](#related)
* [Inspiration](#inspiration)
* [Contributing](#contributing)
* [License](#license)

## Installation <a name="install"></a> [&#x2191;](#start)

### Node

    npm install wrapme

### AMD, &lt;script&gt;

Use `dist/wrapme.umd.development.js` or `dist/wrapme.umd.production.min.js` (minified version).

## Usage <a name="usage"></a> [&#x2191;](#start)

### ECMAScript 6+

```js
import { intercept, wrap } from 'wrapme';
```

### Node

```js
const wrapme = require('wrapme');
const { intercept, wrap } = wrapme;
```

### AMD

```js
define(['path/to/dist/wrapme.umd.production.min.js'], function(wrapme) {
    const intercept = wrapme.intercept;
    const wrap = wrapme.wrap;
});
```

### &lt;script&gt;

```html
<script type="text/javascript" src="path/to/dist/wrapme.umd.production.min.js"></script>
<script type="text/javascript">
    // wrapme is available via wrapme field of window object
    const intercept = wrapme.intercept;
    const wrap = wrapme.wrap;
</script>
```

## Examples <a name="examples"></a> [&#x2191;](#start)

```js
import { intercept, wrap } from 'wrapme';

const api = {
    sum(...numList) {
        let result = 0;
        for (let value of numList) {
            result += value;
        }

        return result;
    },
    positive(...numList) {
        let result = [];
        for (let value of numList) {
            if (value > 0) {
                result.push(value);
            }
        }

        return result;
    },
    factorial(num) {
        let result = 1;
        while (num > 1) {
            result *= num--;
        }

        return result;
    },
    binomCoeff(n, k) {
        const { factorial } = api;

        return factorial(n) / (factorial(k) * factorial(n - k));
    }
};


// Logging

const log = [];

function logger(callData) {
    callData.settings.log.push({
        name: callData.method,
        args: callData.arg,
        result: callData.result,
        callNum: callData.number,
        time: new Date().getTime()
    });
}

const unwrap = intercept(api, ['sum', 'positive'], logger, {beforeResult: true, log});

api.sum(1, 2, 3, 4);   // Returns 10, adds item to log
api.positive(1, 2, -3, 0, 10, -7);   // Returns [1, 2, 10], adds item to log
api.sum(1, -1, 2, -2, 3);   // Returns 3, adds item to log

// Restore original methods
unwrap();

api.positive(-1, 5, 0, -8);   // Returns [5], doesn't add item to log

console.log("call log:\n", JSON.stringify(log, null, 4));
/* log looks like:
    [
        {
            "name": "sum",
            "args": [
                1,
                2,
                3,
                4
            ],
            "result": 10,
            "callNum": 1,
            "time": 1582642216821
        },
        {
            "name": "positive",
            "args": [
                1,
                2,
                -3,
                0,
                10,
                -7
            ],
            "result": [
                1,
                2,
                10
            ],
            "callNum": 1,
            "time": 1582642216822
        },
        {
            "name": "sum",
            "args": [
                1,
                -1,
                2,
                -2,
                3
            ],
            "result": 3,
            "callNum": 2,
            "time": 1582642216822
        }
    ]
*/


// Simple memoization

function memoize(callData) {
    const { save } = callData;
    const key = callData.arg.join(' ');

    return (key in save)
        ? save[key]
        : (save[key] = callData.run());
}

intercept(api, ['factorial', 'binomCoeff'], memoize);

api.factorial(10);
api.factorial(5);

api.binomCoeff(10, 5);   // Uses already calculated factorials

api.binomCoeff(10, 5);   // Uses already calculated value


// Validation or filtering

function filter(callData) {
    return callData.runApply(
        callData.arg.filter((item) => typeof item === 'number' && ! isNaN(item))
    );
}

const sum = wrap(api.sum, filter);
const positive = wrap(api.positive, filter);

sum(false, 3, NaN, new Date(), 8, {}, 'sum');   // Returns 11
positive(true, -5, NaN, 4, new Date(), 1, {a: 5}, 0, 'positive', -1);   // Returns [4, 1]
```

See additional examples in tests.

## API <a name="api"></a> [&#x2191;](#start)

### wrap(target, method, handler?, settings?): Function

Wraps specified object's method or standalone function into new (wrapping) function
that calls passed handler which may run wrapped function eventually.

Arguments:

* `target: Function | object` - Function that should be wrapped or an object whose method will be wrapped and replaced.
* `method: Function | string` - Name of method that should be wrapped or a handler when function is passed for `target` parameter.
* `handler: Function | object` - A function (interceptor) that should be executed when newly created function is called,
or optional settings when function is passed for `target` parameter.
* `settings: object` - Optional settings that will be available in `handler`.
* `settings.after: boolean` (optional) - Whether original function or method should be called after `handler`.
* `settings.before: boolean` (optional) - Whether original function or method should be called before `handler`.
* `settings.beforeResult: boolean` (optional) - Whether original function or method should be called before `handler`
and whether original's result should be returned.
* `settings.bind: boolean` (optional) - Whether wrapping function should be bound to `target` object.
* `settings.context: object` (optional) - Context (`this`) that should be used for `handler` call.
* `settings.data: any` (optional) - Any data that should be available in `handler`.

Returns wrapping function when `target` is a function,
or a function that restores original method when `target` is an object.

An object with the following fields will be passed into `handler`:

* `arg: any[]` - array of arguments that were passed to the wrapping function or method.
* `context: object` - context (`this`) with which wrapping function is called.
* `data: any` - value of `settings.data` option.
* `method: string` - name of the method or function that was wrapped.
* `number: number` - number of `handler`'s call (starting from 1).
* `result: any` - result of original function/method when it is called before `handler`.
* `run: (...args?) => any` - method that calls original function or method;
by default values from `arg` will be used as arguments;
but you may pass arguments to `run` and they will be used instead of the original arguments.
* `runApply: (any[]?) => any` - similar to `run` but accepts an array of new arguments,
e.g. `runApply([1, 2, 3])` is equivalent to `run(1, 2, 3)`;
if the first argument of `runApply` is not an array it will be wrapped into array (i.e. `[arguments[0]]`);
only the first argument  of `runApply` is used.
* `save: object` - an object that can be used to preserve some values between `handler` calls.
* `settings: object` - value of `settings` parameter; except for `settings.bind` and `settings.context`,
it is possible to change any setting to alter following execution;
so be careful when you change a field's value of `settings` object.
* `target: (...args) => any` - original function or method that was wrapped.
* `targetObj: object | null` - an object whose method was wrapped and replaced.

When `settings.after` and `settings.beforeResult` are `false`, result of `handler` will be returned from wrapping function.

### intercept(target, method, handler?, settings?): Function

Wraps specified object's method(s) or standalone function into new (wrapping) function
that calls passed handler which may run wrapped function eventually.

Arguments:

* `target: Function | object` - Function that should be wrapped or an object whose method(s) will be wrapped and replaced.
* `method: Function | string | string[]` - Name of method (or list of method names) that should be wrapped
or a handler when function is passed for `target` parameter.
* `handler: Function | object` - A function (interceptor) that should be executed when newly created function is called,
or optional settings when function is passed for `target` parameter. See `wrap` for details.
* `settings: object` - Optional settings that will be available in `handler`. See `wrap` for details.

Returns wrapping function when `target` is a function,
or a function that restores original method(s) when `target` is an object.

See `doc` folder for details.

## Related projects <a name="related"></a> [&#x2191;](#start)

* [eva](https://github.com/gamtiq/eva)
* [povtor](https://github.com/gamtiq/povtor)

## Inspiration <a name="inspiration"></a> [&#x2191;](#start)

This library is inspired by [meld](https://github.com/cujojs/meld).

## Contributing <a name="contributing"></a> [&#x2191;](#start)
In lieu of a formal styleguide, take care to maintain the existing coding style.
Add unit tests for any new or changed functionality.
Lint and test your code.

## License <a name="license"></a> [&#x2191;](#start)
Copyright (c) 2020 Denis Sikuler  
Licensed under the MIT license.
