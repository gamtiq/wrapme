# wrapme <a name="start"></a>

[![NPM version](https://badge.fury.io/js/wrapme.png)](http://badge.fury.io/js/wrapme)

Functions to wrap other functions and fields/methods and to change/enhance their behavior, functionality or usage.  
Can be used for Aspect-oriented programming.

### Features

* Wrap a single function/field/method (by `wrap`) or several fields and methods at once (by `intercept`).
* Wrap only field's get operation (`get` option) or set operation (`set` option), or both (by default).
* Provide special getter and/or setter for wrapped field if it is necessary.
* Call original function/method or field's operation before (use `before` or `listen` option),
after (use `after` option) and/or inside `handler` (use `run()` or `runApply()`).
* Totally control calling of original function/method or field's operation inside `handler`:
call depending on condition, filter/validate/convert passed arguments and/or provide another arguments.
* Return result of original function/method or field's operation, or any other value from `handler`.
* Save necessary data between `handler` calls.
* Restore original fields/methods when it is needed.
* Does not have dependencies and can be used in ECMAScript 5+ environment.
* Small size.

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
        name: callData.field,
        args: callData.arg,
        result: callData.result,
        callNum: callData.number,
        time: new Date().getTime()
    });
}

const unwrap = intercept(api, 'sum', logger, {listen: true});

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
    value: 1,
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
    if (! callData.byUnwrap) {
        callData.settings.log.push({
            name: callData.field,
            args: callData.arg,
            result: callData.result,
            callNum: callData.number,
            time: new Date().getTime()
        });
    }
}

const unwrap = intercept(api, ['sum', 'positive', 'value'], logger, {listen: true, log});

api.sum(1, 2, 3, 4);   // Returns 10, adds item to log
api.positive(1, 2, -3, 0, 10, -7);   // Returns [1, 2, 10], adds item to log
api.value += api.sum(1, -1, 2, -2, 3);   // Returns 3, adds items to log

// Restore original fields
unwrap();

api.positive(-1, 5, 0, api.value, -8);   // Returns [5, 4], doesn't add items to log

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
            "time": 1586602348174
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
            "time": 1586602348174
        },
        {
            "name": "value",
            "args": [],
            "result": 1,
            "callNum": 1,
            "time": 1586602348174
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
            "time": 1586602348174
        },
        {
            "name": "value",
            "args": [
                4
            ],
            "result": 4,
            "callNum": 2,
            "time": 1586602348175
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


// Side effects

function saveToLocalStorage(callData) {
    if (callData.bySet) {
        const { save } = callData;
        if ('id' in save) {
            clearTimeout(save.id);
        }

        save.id = setTimeout(
            () => localStorage.setItem(
                `wrap:${callData.field}`,
                typeof callData.result === 'undefined'
                    ? callData.arg0
                    : callData.result
            ),
            callData.settings.timeout || 0
        );
    }
}

wrap(api, 'value', saveToLocalStorage, {listen: true, timeout: 50});

// Validation, filtering or conversion

function filter(callData) {
    const { arg, bySet } = callData;
    const argList = [];
    for (let item of arg) {
        const itemType = typeof item;
        if ( (itemType === 'number' && ! isNaN(item))
                || (bySet && itemType === 'string' && item && (item = Number(item))) ) {
            argList.push(item);
        }
    }
    if (argList.length || ! bySet) {
        return callData.runApply(argList);
    }
}

wrap(api, 'value', filter);
api.value = 'some data';   // value isn't changed, saveToLocalStorage isn't called
api.value = 9;   // value is changed, saveToLocalStorage is called
api.value = '-53';   // string is converted to number and value is changed, saveToLocalStorage is called

const sum = wrap(api.sum, filter);
const positive = wrap(api.positive, filter);

sum(false, 3, NaN, new Date(), 8, {}, 'sum', '2');   // Returns 11
positive(true, -5, NaN, 4, new Date(), 1, {a: 5}, 0, 'positive', -1);   // Returns [4, 1]
```

See additional examples in tests.

## API <a name="api"></a> [&#x2191;](#start)

### wrap(target, field, handler?, settings?): Function

Wraps specified object's field/method or standalone function into new (wrapping) function
that calls passed handler which eventually may run wrapped function or get/set field's value.

Arguments:

* `target: Function | object` - Function that should be wrapped or an object whose field/method will be wrapped and replaced.
* `field: Function | string` - Name of field/method that should be wrapped or a handler when function is passed for `target` parameter.
* `handler: Function | object` - A function (interceptor) that should be executed when newly created function is called or get/set operation for the field is applied,
or optional settings when function is passed for `target` parameter.
* `settings: object` - Optional settings that will be available in `handler`.
* `settings.after: boolean` (optional) - Whether original function, method or field's operation should be called after `handler`.
* `settings.before: boolean` (optional) - Whether original function, method or field's operation should be called before `handler`.
* `settings.bind: boolean` (optional) - Whether wrapping function should be bound to `target` object.
* `settings.context: object` (optional) - Context (`this`) that should be used for `handler` call.
* `settings.data: any` (optional) - Any data that should be available in `handler`.
* `settings.get: boolean | Function` (optional) - Whether field's get operation should be intercepted
and whether created wrapping function should be used as field's getter
(by default `true` for usual (non-functional) field and `false` for method).
* `settings.listen: boolean` (optional) - Whether original function, method or field's operation
should be called before `handler` and whether original's result should be returned.
* `settings.set: boolean | Function` (optional) - Whether field's set operation should be intercepted
and whether created wrapping function should be used as field's setter
(by default `true` for usual (non-functional) field and `false` for method).

Returns wrapping function when `target` is a function,
or a function that restores original field/method when `target` is an object.

An object with the following fields will be passed into `handler`:

* `arg: any[]` - Array of arguments that were passed to the wrapping function.
* `arg0: any` - Value of `arg[0]`.
* `byCall: boolean` - Whether wrapping function is called as object's method or as usual function (by a call operation).
* `byGet: boolean` - Whether wrapping function is called to get field's value (by get operation, as field's getter).
* `bySet: boolean` - Whether wrapping function is called to set field's value (by set operation, as field's setter).
* `byUnwrap: boolean` - Whether wrapping function (and `handler`) is called during unwrapping.
* `context: object` - Context (`this`) with which wrapping function is called.
* `data: any` - Value of `settings.data` option.
* `field: string | undefined` - Name of the field or method that was wrapped.
* `fieldWrap: boolean` - Whether field's get and/or set operation was wrapped.
* `funcWrap: boolean` - Whether standalone function (not object's field/method) was wrapped.
* `get: (() => any) | undefined` - Function that returns field's current value if field was wrapped.
* `method: string` - Name of the method or function that was wrapped.
* `methodWrap: boolean` - Whether method was wrapped.
* `number: number` - Number of `handler`'s call (starting from 1).
* `result: any` - Result of original function/method when it is called before `handler`.
* `run: (...args?) => any` - Method that calls original function/method or field's getter/setter;
by default values from `arg` will be used as arguments;
but you may pass arguments to `run` and they will be used instead of the original arguments.
* `runApply: (any[]?) => any` - Similar to `run` but accepts an array of new arguments,
e.g. `runApply([1, 2, 3])` is equivalent to `run(1, 2, 3)`;
if the first argument of `runApply` is not an array it will be wrapped into array (i.e. `[arguments[0]]`);
only the first argument  of `runApply` is used.
* `save: object` - An object that can be used to preserve some values between `handler` calls.
* `set: ((value: any) => any) | undefined` - Function that changes field's current value if field was wrapped.
* `settings: object` - Value of `settings` parameter; except for `settings.bind` and `settings.context`,
it is possible to change any setting to alter following execution;
so be careful when you change a field's value of `settings` object.
* `target: ((...args) => any) | string` - Original function or method that was wrapped, or name of wrapped field.
* `targetObj: object | null` - An object whose field/method was wrapped and replaced.
* `value: any` - Previous value returned by wrapping function.

When `settings.after` and `settings.listen` are `false`, result of `handler` will be returned from wrapping function.

### intercept(target, field, handler?, settings?): Function

Wraps specified object's field(s)/method(s) or standalone function into new (wrapping) function
that calls passed handler which eventually may run wrapped function or get/set field's value.

Arguments:

* `target: Function | object` - Function that should be wrapped or an object whose field(s)/method(s) will be wrapped and replaced.
* `field: Function | string | string[]` - Name of field/method (or list of field/method names)
that should be wrapped or a handler when function is passed for `target` parameter.
* `handler: Function | object` - A function (interceptor) that should be executed when newly created function is called
or get/set operation for the field is applied, or settings when function is passed for `target` parameter.
* `settings: object` - Optional settings that will be available in `handler`. See `wrap` for details.

Returns wrapping function when `target` is a function,
or a function that restores original field(s)/method(s) when `target` is an object.

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
