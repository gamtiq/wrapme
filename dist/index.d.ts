export declare type AnyFunction = (...args: any[]) => any;
export declare type TargetFunction = AnyFunction;
export declare type AnyObject = {
    [field in (number | string)]: any;
};
export declare type TargetObject = AnyObject;
export declare type SaveObject = AnyObject;
export declare type Target = TargetObject | TargetFunction;
export declare type FieldGetter = () => unknown;
export declare type FieldSetter = (value: unknown) => unknown;
/** Handler's parameter. */
export interface HandlerParam {
    /** Array of arguments that were passed to the wrapping function. */
    arg: any[];
    /** Value of `arg[0]`. */
    arg0: any;
    /** Whether wrapping function is called as object's method or as usual function (by a call operation). */
    byCall: boolean;
    /** Whether wrapping function is called to get field's value (by get operation, as field's getter). */
    byGet: boolean;
    /** Whether wrapping function is called to set field's value (by set operation, as field's setter). */
    bySet: boolean;
    /** Whether wrapping function (and `handler`) is called during unwrapping. */
    byUnwrap: boolean;
    /** Context (`this`) with which wrapping function is called. */
    context: any;
    /** Value of `settings.data` option. */
    data: any;
    /** Name of the field or method that was wrapped. */
    field: string | undefined;
    /** Whether field's get and/or set operation was wrapped. */
    fieldWrap: boolean;
    /** Whether standalone function (not object's field/method) was wrapped. */
    funcWrap: boolean;
    /** Function that returns field's current value if field was wrapped. */
    get: FieldGetter | undefined;
    /** Name of the method or function that was wrapped. */
    method: string | undefined;
    /** Whether method was wrapped. */
    methodWrap: boolean;
    /** Number of `handler`'s call (starting from 1). */
    number: number;
    /** Result of original function/method when it is called before `handler`. */
    result?: any;
    /**
     * Method that calls original function/method or field's getter/setter;
     * by default values from `arg` will be used as arguments;
     * but you may pass arguments to `run` and they will be used instead of the original arguments.
     */
    run: AnyFunction;
    /**
     * Similar to `run` but accepts an array of new arguments, e.g. `runApply([1, 2, 3])` is equivalent to `run(1, 2, 3)`;
     * if the first argument of `runApply` is not an array it will be wrapped into array (i.e. `[arguments[0]]`);
     * only the first argument  of `runApply` is used.
     */
    runApply: (paramSet?: any | any[]) => any;
    /** An object that can be used to preserve some values between `handler` calls. */
    save: SaveObject;
    /** Function that changes field's current value if field was wrapped. */
    set: FieldSetter | undefined;
    /**
     * Value of `settings` parameter; except for `settings.bind` and `settings.context`,
     * it is possible to change any setting to alter following execution;
     * so be careful when you change a field's value of `settings` object.
     */
    settings: WrapSettings;
    /** Original function or method that was wrapped, or name of wrapped field. */
    target: TargetFunction | string;
    /** An object whose field/method was wrapped and replaced. */
    targetObj: TargetObject | null;
    /** Previous value returned by wrapping function. */
    value: unknown;
}
export declare type Handler = (param: HandlerParam) => any;
/** Settings of {@link wrap} function. */
export interface WrapSettings {
    /**
     * Whether original function, method or field's operation should be called after `handler`.
     * When this option is set to `true`, the result of original function/method or field's operation
     * will be returned from wrapping function.
     */
    after?: boolean;
    /**
     * Whether original function, method or field's operation should be called before `handler`.
     * When this option is set to `true`, the result of original function/method or field's operation
     * will be available in `handler` and value returned from `handler` will be returned from wrapping function
     * if `settings.after` and `settings.listen` are set to `false`.
     */
    before?: boolean;
    /** Whether wrapping function should be bound to `target` object. */
    bind?: boolean;
    /** Context (`this`) that should be used for `handler` call. */
    context?: object;
    /** Any data that should be available in `handler`. */
    data?: any;
    /**
     * Whether field's get operation should be intercepted and
     * whether created wrapping function should be used as field's getter.
     * If a function is provided the function will be used as value for `HandlerParam.get`
     * when no getter is specified for the field.
     * Default value is `true` for usual (non-functional) field and `false` for method.
     */
    get?: boolean | FieldGetter;
    /**
     * Whether original function, method or field's operation should be called before `handler`.
     * When this option is set to `true`, the result of original function/method or field's operation
     * will be available in `handler` and will be returned from wrapping function
     * if `settings.after` is set to `false`.
     */
    listen?: boolean;
    /**
     * Whether field's set operation should be intercepted and
     * whether created wrapping function should be used as field's setter.
     * If a function is provided the function will be used as value for `HandlerParam.set`
     * when no getter is specified for the field.
     * Default value is `true` for usual (non-functional) field and `false` for method.
     */
    set?: boolean | FieldSetter;
    [field: string]: any;
}
export declare type Wrapper = TargetFunction;
export declare type Unwrap = () => void;
/**
 * Wraps specified object's field/method or standalone function into new (wrapping) function
 * that calls passed handler which eventually may run wrapped function or get/set field's value.
 *
 * @param target
 *   Function that should be wrapped or an object whose field/method will be wrapped and replaced.
 * @param field
 *   Name of field/method that should be wrapped or a handler when function is passed for `target` parameter.
 * @param handler
 *   A function (interceptor) that should be executed when newly created function is called
 *   or get/set operation for the field is applied, or settings when function is passed for `target` parameter.
 *   When `settings.after` and `settings.listen` are `false`, result of `handler` will be returned from wrapping function.
 * @param settings
 *   Optional settings that will be available in `handler`.
 * @return
 *   Wrapping function when `target` is a function, or a function that restores original field/method when `target` is an object.
 * @author Denis Sikuler
 */
export declare function wrap(target: TargetObject, field: string, handler: Handler, settings?: WrapSettings): Unwrap;
export declare function wrap(target: TargetFunction, handler: Handler, settings?: WrapSettings): Wrapper;
/**
 * Wraps specified object's field(s)/method(s) or standalone function into new (wrapping) function
 * that calls passed handler which eventually may run wrapped function or get/set field's value.
 *
 * @param target
 *   Function that should be wrapped or an object whose field(s)/method(s) will be wrapped and replaced.
 * @param field
 *   Name of field/method (or list of field/method names) that should be wrapped or a handler
 *   when function is passed for `target` parameter.
 * @param handler
 *   A function (interceptor) that should be executed when newly created function is called
 *   or get/set operation for the field is applied, or settings when function is passed for `target` parameter.
 *   See {@link wrap} for details.
 * @param settings
 *   Optional settings that will be available in `handler`. See {@link wrap} for details.
 * @return {Function}
 *   Wrapping function when `target` is a function, or a function that restores original field(s)/method(s)
 *   when `target` is an object.
 * @author Denis Sikuler
 */
export declare function intercept(target: TargetObject, field: string | string[], handler: Handler, settings?: WrapSettings): Unwrap;
export declare function intercept(target: TargetFunction, handler: Handler, settings?: WrapSettings): Wrapper;
export default intercept;
