export declare type TargetFunction = (...args: any[]) => any;
export declare type AnyObject = {
    [field in (number | string)]: any;
};
export declare type TargetObject = AnyObject;
export declare type SaveObject = AnyObject;
export declare type Target = TargetObject | TargetFunction;
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
export declare type Handler = (param: HandlerParam) => any;
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
export declare type Wrapper = TargetFunction;
export declare type Unwrap = () => void;
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
export declare function wrap(target: TargetObject, method: string, handler: Handler, settings?: WrapSettings): Unwrap;
export declare function wrap(target: TargetFunction, handler: Handler, settings?: WrapSettings): Wrapper;
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
export declare function intercept(target: TargetObject, method: string | string[], handler: Handler, settings?: WrapSettings): Unwrap;
export declare function intercept(target: TargetFunction, handler: Handler, settings?: WrapSettings): Wrapper;
export default intercept;
