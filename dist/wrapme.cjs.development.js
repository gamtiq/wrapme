'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

/* eslint-disable @typescript-eslint/no-explicit-any */
function wrap(target, method, handler, settings) {
  var number = 0;
  var save = {};
  var original;
  var targetObj;

  if (typeof method === 'string') {
    original = target[method];
    targetObj = target;
  }
  /* eslint-disable no-param-reassign */
  else {
      original = target;
      targetObj = null;
      settings = handler;
      handler = method;
      method = target.name;
    }

  if (!settings) {
    settings = {};
  }
  /* eslint-enable no-param-reassign */


  var handlerContext = settings.context;

  function wrapper() {
    // eslint-disable-next-line prefer-rest-params
    var arg = Array.prototype.slice.call(arguments); // eslint-disable-next-line consistent-this, no-invalid-this, @typescript-eslint/no-this-alias

    var context = this;
    var env = {
      arg: arg,
      context: context,
      data: settings.data,
      method: method,
      number: ++number,
      save: save,
      settings: settings,
      target: original,
      targetObj: targetObj,
      run: run,
      runApply: function runApply(firstArg) {
        return original.apply(context, // eslint-disable-next-line no-nested-ternary
        arguments.length ? Array.isArray(firstArg) ? firstArg : [firstArg] : arg);
      }
    };
    var result;

    function run() {
      // eslint-disable-next-line multiline-ternary, prefer-rest-params
      return original.apply(context, arguments.length ? arguments : arg);
    }

    if (settings.before || settings.beforeResult) {
      result = run();
    }

    env.result = result;
    env.result = handlerContext ? handler.call(handlerContext, env) : handler(env);

    if (settings.after) {
      result = run();
    } else if (!settings.beforeResult) {
      result = env.result;
    }

    return result;
  }

  if (targetObj) {
    targetObj[method] = settings.bind ? wrapper.bind(targetObj) : wrapper;
    return function unwrap() {
      targetObj[method] = original;
    };
  }

  return wrapper;
}
function intercept(target, method, handler, settings) {
  if (Array.isArray(method)) {
    var unwrapList = [];

    for (var i = 0, len = method.length; i < len; i++) {
      unwrapList.push(wrap(target, method[i], handler, settings));
    }

    return unwrapList.length > 1 ? function unwrap() {
      for (var _i = 0, _len = unwrapList.length; _i < _len; _i++) {
        unwrapList[_i]();
      }
    } : unwrapList[0];
  }

  return wrap(target, method, handler, settings);
}

exports.default = intercept;
exports.intercept = intercept;
exports.wrap = wrap;
//# sourceMappingURL=wrapme.cjs.development.js.map
