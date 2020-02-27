/* eslint-disable @typescript-eslint/no-explicit-any */

export type TargetFunction = (...args: any[]) => any;

export type AnyObject = {
    [field in (number | string)]: any;
};

export type TargetObject = AnyObject;
export type SaveObject = AnyObject;

export type Target = TargetObject | TargetFunction;

/** Handler's parameter. */
export interface HandlerParam {
    /** Array of arguments that were passed to the wrapping function or method. */
    arg: any[];
    /** Context (`this`) with which wrapping function is called. */
    context: any;
    /** Value of `settings.data` option. */
    data: any;
    /** Name of the method or function that was wrapped. */
    method: string;
    /** Number of `handler`'s call (starting from 1). */
    number: number;
    /** Result of original function/method when it is called before `handler`. */
    result?: any;
    /** 
     * Method that calls original function or method; by default values from `arg` will be used as arguments;
     * but you may pass arguments to `run` and they will be used instead of the original arguments.
     */
    run: TargetFunction;
    /**
     * Similar to `run` but accepts an array of new arguments, e.g. `runApply([1, 2, 3])` is equivalent to `run(1, 2, 3)`;
     * if the first argument of `runApply` is not an array it will be wrapped into array (i.e. `[arguments[0]]`);
     * only the first argument  of `runApply` is used.
     */
    runApply: (paramSet?: any | any[]) => any;
    /** An object that can be used to preserve some values between `handler` calls. */
    save: SaveObject;
    /**
     * Value of `settings` parameter; except for `settings.bind` and `settings.context`,
     * it is possible to change any setting to alter following execution;
     * so be careful when you change a field's value of `settings` object.
     */
    settings: WrapSettings;
    /** Original function or method that was wrapped. */
    target: TargetFunction;
    /** An object whose method was wrapped and replaced. */
    targetObj: TargetObject | null;
}

export type Handler = (param: HandlerParam) => any;

/** Settings of {@link wrap} function. */
export interface WrapSettings {
    /**
     * Whether original function or method should be called after `handler`.
     * When this option is set to `true`, the result of original function/method will be returned
     * from wrapping function.
     */
    after?: boolean;
    /**
     * Whether original function or method should be called before `handler`.
     * When this option is set to `true`, the result of original function/method will be available in `handler`
     * and value returned from `handler` will be returned from wrapping function or method
     * if `settings.after` is set to `false`.
     */
    before?: boolean;
    /**
     * Whether original function or method should be called before `handler`.
     * When this option is set to `true`, the result of original function/method will be available in `handler`
     * and will be returned from wrapping function or method if `settings.after` is set to `false`.
     */
    beforeResult?: boolean;
    /** Whether wrapping function should be bound to `target` object. */
    bind?: boolean;
    /** Context (`this`) that should be used for `handler` call. */
    context?: object;
    /** Any data that should be available in `handler`. */
    data?: any;
    [field: string]: any;
}

export type Wrapper = TargetFunction;

export type Unwrap = () => void;

/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * Wraps specified object's method or standalone function into new (wrapping) function
 * that calls passed handler which may run wrapped function eventually.
 * 
 * @param target
 *   Function that should be wrapped or an object whose method will be wrapped and replaced.
 * @param method
 *   Name of method that should be wrapped or a handler when function is passed for `target` parameter.
 * @param handler
 *   A function (interceptor) that should be executed when newly created function is called, or settings when function is passed for `target` parameter.
 *   When `settings.after` and `settings.beforeResult` are `false`, result of `handler` will be returned from wrapping function.
 * @param settings
 *   Optional settings that will be available in `handler`.
 * @return
 *   Wrapping function when `target` is a function, or a function that restores original method when `target` is an object.
 * @author Denis Sikuler
 */
export function wrap(target: TargetObject, method: string, handler: Handler, settings?: WrapSettings): Unwrap;
export function wrap(target: TargetFunction, handler: Handler, settings?: WrapSettings): Wrapper;
export function wrap(target: any, method: any, handler?: any, settings?: any): any {   // eslint-disable-line max-params, @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any
    let number = 0;
    const save = {};
    let original: TargetFunction;
    let targetObj: TargetObject | null;
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
    if (! settings) {
        settings = {};
    }
    /* eslint-enable no-param-reassign */
    const handlerContext = settings.context;

    function wrapper(this: unknown): unknown {
        // eslint-disable-next-line prefer-rest-params
        const arg = Array.prototype.slice.call(arguments);
        // eslint-disable-next-line consistent-this, no-invalid-this, @typescript-eslint/no-this-alias
        const context = this;
        const env: HandlerParam = {
            arg,
            context,
            data: settings.data,
            method,
            number: ++number,
            save,
            settings,
            target: original,
            targetObj,
            run,
            runApply(firstArg) {
                return original.apply(
                    context,
                    // eslint-disable-next-line no-nested-ternary
                    arguments.length
                        ? (Array.isArray(firstArg)
                            ? firstArg
                            : [firstArg]
                        )
                        : arg
                );
            }
        };
        let result;

        function run(): unknown {
            // eslint-disable-next-line multiline-ternary, prefer-rest-params
            return original.apply(context, (arguments.length ? arguments : arg) as unknown[]);
        }
        
        if (settings.before || settings.beforeResult) {
            result = run();
        }
        env.result = result;
        
        env.result = handlerContext
            ? handler.call(handlerContext, env)
            : handler(env);

        if (settings.after) {
            result = run();
        }
        else if (! settings.beforeResult) {
            result = env.result;
        }
        
        return result;
    }

    if (targetObj) {
        targetObj[method] = settings.bind
            ? wrapper.bind(targetObj)
            : wrapper;

        return function unwrap(): void {
            (targetObj as AnyObject)[method] = original;
        };
    }

    return wrapper;
}

/**
 * Wraps specified object's method(s) or standalone function into new (wrapping) function
 * that calls passed handler which may run wrapped function eventually.
 * 
 * @param target
 *   Function that should be wrapped or an object whose method(s) will be wrapped and replaced.
 * @param method
 *   Name of method (or list of method names) that should be wrapped or a handler when function is passed for `target` parameter.
 * @param handler
 *   A function (interceptor) that should be executed when newly created function is called,
 *   or settings when function is passed for `target` parameter. See {@link wrap} for details.
 * @param settings
 *   Optional settings that will be available in `handler`. See {@link wrap} for details.
 * @return {Function}
 *   Wrapping function when `target` is a function, or a function that restores original method(s) when `target` is an object.
 * @author Denis Sikuler
 */
export function intercept(target: TargetObject, method: string | string[], handler: Handler, settings?: WrapSettings): Unwrap;
export function intercept(target: TargetFunction, handler: Handler, settings?: WrapSettings): Wrapper;
export function intercept(target: any, method: any, handler?: any, settings?: any): any {   // eslint-disable-line max-params, @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any
    if (Array.isArray(method)) {
        const unwrapList: Unwrap[] = [];
        for (let i = 0, len = method.length; i < len; i++) {
            unwrapList.push( wrap(target, method[i], handler, settings) );
        }

        return unwrapList.length > 1
            ? function unwrap(): void {
                for (let i = 0, len = unwrapList.length; i < len; i++) {
                    unwrapList[i]();
                }
            }
            : unwrapList[0];
    }

    return wrap(target, method, handler, settings);
}

export default intercept;
