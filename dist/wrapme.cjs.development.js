'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

/* eslint-disable @typescript-eslint/no-explicit-any */
function wrap(target, field, handler, settings) {
  var fieldWrap = false;
  var funcWrap = false;
  var methodWrap = false;
  var number = 0;
  var save = {};
  var descr = 1;
  var fieldValue;
  var get;
  var method;
  var original;
  var targetObj;
  var set;
  var value;

  if (typeof field === 'string') {
    targetObj = target;
    original = target[field];

    if (typeof original === 'function' && (!settings || !settings.get && !settings.set)) {
      method = field;
      methodWrap = true;
    } else {
      fieldValue = original;
      original = field;
      fieldWrap = true;
    }
  }
  /* eslint-disable no-param-reassign */
  else {
      original = target;
      targetObj = null;
      settings = handler;
      handler = field;
      field = method;
      method = target.name;
      funcWrap = true;
    }

  if (!settings) {
    settings = {};
  }
  /* eslint-enable no-param-reassign */


  var handlerContext = settings.context;

  function wrapper() {
    // eslint-disable-next-line prefer-rest-params
    var arg = Array.prototype.slice.call(arguments);
    var byCall = !fieldWrap;
    var byGet = fieldWrap && !arg.length;
    var bySet = fieldWrap && !byGet; // eslint-disable-next-line consistent-this, no-invalid-this, @typescript-eslint/no-this-alias

    var context = this;

    function exec(argList) {
      if (byGet) {
        return get();
      }

      if (bySet) {
        return set(argList[0]);
      }

      return original.apply(context, argList);
    }

    var env = {
      arg: arg,
      arg0: arg[0],
      byCall: byCall,
      byGet: byGet,
      bySet: bySet,
      byUnwrap: !descr,
      context: context,
      data: settings.data,
      field: field,
      fieldWrap: fieldWrap,
      funcWrap: funcWrap,
      get: get,
      method: method,
      methodWrap: methodWrap,
      number: ++number,
      save: save,
      set: set,
      settings: settings,
      target: original,
      targetObj: targetObj,
      run: run,
      runApply: function runApply(firstArg) {
        return exec( // eslint-disable-next-line no-nested-ternary
        arguments.length ? Array.isArray(firstArg) ? firstArg : [firstArg] : arg);
      },
      value: value
    };
    var result;

    function run() {
      // eslint-disable-next-line multiline-ternary, prefer-rest-params
      return exec(arguments.length ? arguments : arg);
    }

    if (settings.before || settings.listen) {
      result = run();
    }

    env.result = result;
    env.result = handlerContext ? handler.call(handlerContext, env) : handler(env);

    if (settings.after) {
      result = run();
    } else if (!settings.listen) {
      result = env.result;
    } // eslint-disable-next-line no-return-assign


    return value = result;
  }

  if (targetObj) {
    if (methodWrap) {
      targetObj[method] = settings.bind ? wrapper.bind(targetObj) : wrapper;
      return function unwrap() {
        targetObj[method] = original;
      };
    } else {
      var originalDescr = Object.getOwnPropertyDescriptor(targetObj, field) || {
        value: fieldValue,
        writable: true,
        enumerable: true,
        configurable: true
      };
      descr = Object.getOwnPropertyDescriptor(targetObj, field);

      if (descr) {
        delete descr.value;
        delete descr.writable;
      } else {
        descr = {
          enumerable: true,
          configurable: true
        };
      } // eslint-disable-next-line @typescript-eslint/unbound-method


      get = descr.get || (typeof settings.get === 'function' ? settings.get : null) // eslint-disable-line multiline-ternary
      || function get() {
        return fieldValue;
      }; // eslint-disable-next-line @typescript-eslint/unbound-method


      set = descr.set || (typeof settings.set === 'function' ? settings.set : null) // eslint-disable-line multiline-ternary
      || function set(val) {
        // eslint-disable-next-line no-return-assign
        return fieldValue = val;
      };

      if (!('get' in settings) || settings.get) {
        // eslint-disable-next-line @typescript-eslint/unbound-method
        descr.get = wrapper;
      }

      if (!('set' in settings) || settings.set) {
        // eslint-disable-next-line @typescript-eslint/unbound-method
        descr.set = wrapper;
      }

      Object.defineProperty(targetObj, field, descr);
      return function unwrap() {
        if ('value' in originalDescr) {
          descr = 0;
          originalDescr.value = targetObj[field];
        }

        Object.defineProperty(targetObj, field, originalDescr);
      };
    }
  }

  return wrapper;
}
function intercept(target, field, handler, settings) {
  if (Array.isArray(field)) {
    var unwrapList = [];

    for (var i = 0, len = field.length; i < len; i++) {
      unwrapList.push(wrap(target, field[i], handler, settings));
    }

    return unwrapList.length > 1 ? function unwrap() {
      for (var _i = 0, _len = unwrapList.length; _i < _len; _i++) {
        unwrapList[_i]();
      }
    } : unwrapList[0];
  }

  return wrap(target, field, handler, settings);
}

exports.default = intercept;
exports.intercept = intercept;
exports.wrap = wrap;
//# sourceMappingURL=wrapme.cjs.development.js.map
