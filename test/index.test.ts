import * as api from '../src';
// eslint-disable-next-line no-duplicate-imports
import { AnyFunction, AnyObject, FieldGetter, FieldSetter, HandlerParam, Wrapper, WrapSettings } from '../src';

describe('API', function testSuite() {
    interface TestObj extends AnyObject {
        a: number;
        b: number;
        c?: unknown;
        inc(value?: number): number;
        dec(value?: number): number;
        add(...valueList: unknown[]): number;
        reset(): number;
    }

    const getterLog: unknown[] = [];
    const setterLog: unknown[] = [];
    let testObj: TestObj;
    let testValue: number;
    let undef: undefined;

    function callReset(param: HandlerParam): number {
        const obj = param.targetObj;
        obj?.reset();

        return obj
            ? obj.a
            : 0;
    }

    function changeArgSet(param: HandlerParam): number {
        const { arg } = param;
        if (arg.length) {
            arg[0] = -arg[0];
            arg.push(arg.length);
        }

        return param.run();
    }

    function changeFirstArg(param: HandlerParam): number {
        // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
        return param.run( (param.arg[0] || 0) + 10 );
    }

    function changeResult(param: HandlerParam): number {
        return (param.run() as number) + 10;
    }

    function runApply(param: HandlerParam): unknown {
        const firstArg = param.arg0;

        return firstArg && typeof firstArg === 'object'
            ? param.runApply(...(firstArg as {data: unknown[]}).data)
            : param.runApply();
    }

    function saveResult(param: HandlerParam): number {
        const value = (param.save.value as number) || 1;
        const result = param.run(value);
        param.save.value = result;

        return result;
    }

    function skipNegative(param: HandlerParam): number | undefined {
        const { arg } = param;
        if (! arg.length || arg[0] >= 0) {
            return param.run();
        }

        return undef;
    }

    function useResult(param: HandlerParam): number {
        return param.result * 2;
    }

    function logFieldAccess(param: HandlerParam): unknown {
        const { byGet, bySet, settings } = param;
        let result;
        if (byGet) {
            result = settings.before || settings.listen
                ? param.result
                : (param.get as FieldGetter)();
            getterLog.push(result);
        }
        else if (bySet) {
            result = param.arg0;
            setterLog.push(result);
        }

        return result;
    }

    function resetFieldAccessLog(): void {
        getterLog.length = 0;
        setterLog.length = 0;
    }


    function prepare(): void {
        testObj = {
            a: 0,
            b: 1,
            inc(value?: number): number {
                this.a += typeof value === 'number'
                    ? value
                    : 1;

                return this.a;
            },
            dec(value?: number): number {
                this.a -= typeof value === 'number'
                    ? value
                    : 1;

                return this.a;
            },
            add(...valueList: number[]): number {
                for (let i = 0, len = valueList.length; i < len; i++) {
                    this.a += valueList[i];
                }

                return this.a;
            },
            reset(): number {
                return (this.a = 0);
            }
        };

        resetFieldAccessLog();
        testValue = 0;
    }

    beforeEach(prepare);

    function testFunction(value: unknown): number {
        if (typeof value === 'number') {
            testValue += value;
        }

        return testValue;
    }


    function changeAndCheckField(field: string, value: unknown, expected?: unknown): void {
        testObj[field] = value;
        expect( testObj[field] )
            .toEqual( arguments.length > 2 ? expected : value );   // eslint-disable-line multiline-ternary
    }

    function checkInc(expected?: number, value?: number): void {
        if (arguments.length > 1) {
            expect( testObj.inc(value) )
                .toBe( expected );
        }
        else {
            expect( testObj.inc() )
                .toBe( expected );
        }
        expect( testObj.a )
            .toBe( expected );
    }

    // eslint-disable-next-line max-params
    function checkFunc(func: Wrapper, argList?: unknown[] | null, expected?: unknown, expectedTestValue?: unknown): void {
        expect( func( ...(argList || []) ) )
            .toBe( expected );
        if (arguments.length > 3) {
            expect( testValue )
                .toBe( expectedTestValue );
        }
    }

    type ParamCheck = (param: AnyObject) => void;
    function getHandlerParamCheck(field: string, expected: unknown, run?: boolean): ParamCheck {
        return function check(param: AnyObject): void {
            expect( param[field] )
                .toBe( expected );
            if (run) {
                param.run();
            }
        };
    }


    describe('wrap', function wrapTestSuite() {
        const { wrap } = api;

        describe('wrap method', function methodWrapTestSuite() {
            describe('wrap(targetObject, method, handler)', function baseMethodWrapTestSuite() {
                it('should replace specified method of target object and return function that restores original method', () => {
                    const { inc } = testObj;
                    const unwrap = wrap(testObj, 'inc', changeFirstArg);
    
                    // eslint-disable-next-line @typescript-eslint/unbound-method
                    expect( testObj.inc )
                        .not.toBe( inc );
    
                    unwrap();
    
                    // eslint-disable-next-line @typescript-eslint/unbound-method
                    expect( testObj.inc )
                        .toBe( inc );
                });
    
                it('should save result of original method', () => {
                    wrap(testObj, 'inc', saveResult);
    
                    expect( testObj.inc() )
                        .toBe( 1 );
                    expect( testObj.inc() )
                        .toBe( 2 );
                    expect( testObj.inc() )
                        .toBe( 4 );
                    expect( testObj.inc(100) )
                        .toBe( 8 );
                });
    
                describe('replace specified method of target object', () => {
                    it('should change first argument of method', () => {
                        wrap(testObj, 'inc', changeFirstArg);
        
                        checkInc(10);
                        checkInc(25, 5);
                    });
    
                    it('should change argument list', () => {
                        wrap(testObj, 'add', changeArgSet);
        
                        expect( testObj.add(4, 3, 8) )
                            .toBe( 10 );
                        expect( testObj.a )
                            .toBe( 10 );
                    });
    
                    it('should change result of method', () => {
                        wrap(testObj, 'inc', changeResult);
        
                        expect( testObj.inc() )
                            .toBe( 11 );
                        expect( testObj.a )
                            .toBe( 1 );

                        expect( testObj.inc(5) )
                            .toBe( 16 );
                        expect( testObj.a )
                            .toBe( 6 );
                    });
    
                    it('handler should not call original method for some condition', () => {
                        wrap(testObj, 'inc', skipNegative);
        
                        checkInc(1);
                        checkInc(9, 8);

                        expect( testObj.inc(-5) )
                            .toBe( undef );
                        expect( testObj.a )
                            .toBe( 9 );

                        checkInc(10);

                        expect( testObj.inc(-3) )
                            .toBe( undef );
                        expect( testObj.a )
                            .toBe( 10 );
                    });
                });
    
                describe('handler parameter', () => {
                    // eslint-disable-next-line max-params
                    function checkHandlerParam(method: 'inc' | 'dec' | 'add' | 'reset', field: string, expected: unknown, settings?: WrapSettings): void {
                        wrap(testObj, method, getHandlerParamCheck(field, expected), settings);
                        testObj[method]();
                    }

                    it('"context" field should be reference to target object', () => {
                        checkHandlerParam('inc', 'context', testObj);
                        checkHandlerParam('dec', 'context', testObj);
                    });

                    it('"context" field should be reference to specified function context', () => {
                        const newTarget = {a: 100};
                        wrap(testObj, 'inc', getHandlerParamCheck('context', newTarget, true));

                        expect( testObj.a )
                            .toBe( 0 );

                        testObj.inc.call(newTarget);

                        expect( newTarget.a )
                            .toBe( 101 );
                        expect( testObj.a )
                            .toBe( 0 );
                    });

                    it('should have "method" field with name of replaced method', () => {
                        checkHandlerParam('inc', 'method', 'inc');
                        checkHandlerParam('dec', 'method', 'dec');
                        checkHandlerParam('reset', 'method', 'reset');
                    });

                    it('should have "number" field whose value is a number of call', () => {
                        const expected: unknown[] = [];
                        const log: unknown[] = [];

                        function handler(param: HandlerParam): void {
                            log.push( param.number );
                        }

                        wrap(testObj, 'inc', handler, {after: true});

                        for (let i = 0; i < 8; i++) {
                            expected.push(i + 1);

                            expect( testObj.inc() )
                                .toBe( i + 1 );
                        }

                        expect( log )
                            .toEqual( expected );
                    });

                    it('"settings" field should have value that is passed to "wrap"', () => {
                        const settings = {before: false, data: 1};
                        checkHandlerParam('inc', 'settings', settings, settings);
                    });

                    it('"target" field should be reference to original method', () => {
                        /* eslint-disable @typescript-eslint/unbound-method */
                        checkHandlerParam('inc', 'target', testObj.inc);
                        checkHandlerParam('dec', 'target', testObj.dec);
                        checkHandlerParam('reset', 'target', testObj.reset);
                        /* eslint-enable @typescript-eslint/unbound-method */
                    });

                    it('"targetObj" field should be reference to target object', () => {
                        checkHandlerParam('inc', 'targetObj', testObj);
                    });

                    it('should have "runApply" method that can be used to pass array of arguments', () => {
                        function checkAdd(argList: unknown[], expected: number): void {
                            expect( testObj.add(...argList) )
                                .toBe( expected );

                            testObj.reset();
                        }

                        wrap(testObj, 'add', runApply);

                        checkAdd([1, 2, 3, 4], 10);
                        checkAdd([1, 10, 100], 111);

                        checkAdd([ {data: [5]} ], 5);
                        checkAdd([ {data: [7, 8, 3, -4]} ], 7);
                        checkAdd([ {data: [ [7, 8, 3, -4] ]} ], 14);
                        // eslint-disable-next-line array-bracket-spacing
                        checkAdd([ {data: [ [5, 6, 1], [20, 30], 100 ]} ], 12);
                    });

                    it('should have "value" field witch contains last result returned by wrapping function', () => {
                        const log: unknown[] = [];

                        function handler(param: HandlerParam): void {
                            log.push(param.value);
                        }

                        wrap(testObj, 'inc', handler, {listen: true});

                        testObj.inc();
                        testObj.inc(4);
                        testObj.inc(-2);

                        expect( testObj.a )
                            .toBe( 3 );
                        expect( log )
                            .toEqual( [undef, 1, 5] );
                    });
                });
            });
            
            describe('wrap(targetObject, method, handler, {after: true})', function afterMethodWrapTestSuite() {
                it('should call original method after handler', () => {
                    checkInc(7, 7);

                    wrap(testObj, 'inc', callReset, {after: true});

                    for (let i = 0; i < 11; i++) {
                        checkInc(1);
                    }

                    testObj.add(50, 4);

                    expect( testObj.a )
                        .toBe( 55 );
                });
            });
            
            describe('wrap(targetObject, method, handler, {before: true})', function beforeMethodWrapTestSuite() {
                it('should call original method before handler', () => {
                    wrap(testObj, 'inc', useResult, {before: true});

                    expect( testObj.inc() )
                        .toBe( 2 );
                    expect( testObj.a )
                        .toBe( 1 );
                    
                    expect( testObj.inc() )
                        .toBe( 4 );
                    expect( testObj.a )
                        .toBe( 2 );
                    
                    expect( testObj.inc(3) )
                        .toBe( 10 );
                    expect( testObj.a )
                        .toBe( 5 );
                });

                it('should change settings in handler and call original method after handler', () => {
                    wrap(
                        testObj,
                        'inc',
                        function handler(param: HandlerParam) {
                            param.settings.after = true;

                            return param.result * 100;
                        },
                        {before: true}
                    );

                    checkInc(2);
                    checkInc(4);
                    checkInc(6);
                    checkInc(12, 3);
                });
            });
            
            describe('wrap(targetObject, method, handler, {listen: true})', function listenMethodWrapTestSuite() {
                it('should call original method before handler and original\'s result should be returned from wrapper', () => {
                    wrap(testObj, 'inc', useResult, {listen: true});

                    expect( testObj.inc() )
                        .toBe( 1 );
                    expect( testObj.a )
                        .toBe( 1 );
                    
                    expect( testObj.inc() )
                        .toBe( 2 );
                    expect( testObj.a )
                        .toBe( 2 );
                    
                    expect( testObj.inc(3) )
                        .toBe( 5 );
                    expect( testObj.a )
                        .toBe( 5 );
                });

                it('should change settings in handler and handler\'s result should be returned from wrapper', () => {
                    wrap(
                        testObj,
                        'inc',
                        function handler(param: HandlerParam) {
                            param.settings.listen = false;

                            return param.result * 100;
                        },
                        {listen: true}
                    );

                    expect( testObj.inc(2) )
                        .toBe( 200 );
                    expect( testObj.a )
                        .toBe( 2 );
                });
            });
            
            describe('wrap(targetObject, method, handler, {bind: true})', function bindMethodWrapTestSuite() {
                it('should bind created method to target object', () => {
                    // eslint-disable-next-line @typescript-eslint/unbound-method
                    const originalInc = testObj.inc;

                    wrap(testObj, 'inc', changeFirstArg, {bind: true});

                    // eslint-disable-next-line @typescript-eslint/unbound-method
                    const newInc = testObj.inc;

                    expect( newInc )
                        .not.toBe( originalInc );

                    expect( newInc() )
                        .toBe( 10 );
                    expect( testObj.a )
                        .toBe( 10 );

                    expect( newInc() )
                        .toBe( 20 );
                    expect( testObj.a )
                        .toBe( 20 );

                    expect( newInc(7) )
                        .toBe( 37 );
                    expect( testObj.a )
                        .toBe( 37 );
                });
            });
            
            describe('wrap(targetObject, method, handler, {context: someObj})', function contextMethodWrapTestSuite() {
                it('should call handler with specified context', () => {
                    const logger = {
                        log: [],
                        handle(param: HandlerParam): number {
                            (this.log as number[]).push(param.arg[0] || 0);

                            return param.run();
                        }
                    };

                    // eslint-disable-next-line @typescript-eslint/unbound-method
                    wrap(testObj, 'inc', logger.handle, {context: logger});

                    checkInc(1);
                    checkInc(2);
                    checkInc(10, 8);
                    checkInc(11);
                    checkInc(7, -4);

                    expect( logger.log )
                        .toEqual( [0, 0, 8, 0, -4] );
                });
            });
            
            describe('wrap(targetObject, method, handler, {data: someValue})', function dataMethodWrapTestSuite() {
                it('"settings.data" should be available as "data" field in handler parameter', () => {
                    interface TestParam extends HandlerParam {
                        data: {log: Array<number | string>};
                    }

                    function handler(param: TestParam): number {
                        param.data.log.push(param.arg[0] || 'no');

                        return param.run();
                    }

                    const data = {
                        log: []
                    };

                    wrap(testObj, 'inc', handler, {data});

                    checkInc(1);
                    checkInc(2);
                    checkInc(5, 3);
                    checkInc(4, -1);
                    checkInc(5);

                    expect( data.log )
                        .toEqual( ['no', 'no', 3, -1, 'no'] );
                });
            });
        });

        describe('wrap function', function functionWrapTestSuite() {
            describe('wrap(targetFunction, handler)', function baseFunctionWrapTestSuite() {
                it('should return new function that calls specified handler', () => {
                    const wrapper = wrap(testFunction, changeFirstArg);
    
                    expect( wrapper )
                        .not.toBe( testFunction );
    
                    checkFunc(wrapper, [], 10, 10);
                    checkFunc(wrapper, [-5], 15, 15);
                    checkFunc(wrapper, [4], 29, 29);
                    checkFunc(wrapper, [], 39, 39);
                });

                it('handler should have access to context object that is used to call wrapper function', () => {
                    interface ContextObject {
                        counter: number;
                        value: number;
                        update(val?: unknown): number;
                        change?(val?: unknown): unknown;
                    }

                    interface TestParam extends HandlerParam {
                        context: ContextObject;
                    }

                    function handler(param: TestParam): number {
                        param.context.counter++;

                        return param.run();
                    }

                    const obj: ContextObject = {
                        counter: 0,
                        value: 0,
                        update(val?: unknown) {
                            if (val && typeof val === 'number') {
                                this.value += val;
                            }

                            return this.value;
                        }
                    };
                    // eslint-disable-next-line @typescript-eslint/unbound-method
                    obj.change = wrap(obj.update, handler);

                    obj.change();
                    obj.change(3);
                    obj.change(-1);
                    obj.change();
                    obj.change(7);

                    expect( obj.counter )
                        .toBe( 5 );
                    expect( obj.value )
                        .toBe( 9 );
                });

                it('handler should not call original function for some condition', () => {
                    const wrapper = wrap(testFunction, skipNegative);
    
                    checkFunc(wrapper, [], 0, 0);
                    checkFunc(wrapper, [-5], undef, 0);
                    checkFunc(wrapper, [7], 7, 7);
                    checkFunc(wrapper, [], 7, 7);
                    checkFunc(wrapper, [-3], undef, 7);
                    checkFunc(wrapper, [3], 10, 10);
                });
            });

            describe('wrap(targetFunction, handler, settings)', function settingsFunctionWrapTestSuite() {
                it('should call original function after handler', () => {
                    let counter = 0;

                    function handler(): void {
                        counter++;
                    }

                    const wrapper = wrap(testFunction, handler, {after: true});

                    checkFunc(wrapper, [4], 4);
                    checkFunc(wrapper, [-6], -2);
                    checkFunc(wrapper, [4], 2);
                    checkFunc(wrapper, [], 2);
                    checkFunc(wrapper, [7], 9, 9);

                    expect( counter )
                        .toBe( 5 );
                });

                it('should call original function before handler', () => {
                    let counter = 0;

                    function handler(param: HandlerParam): unknown {
                        counter++;

                        return param.result;
                    }

                    const wrapper = wrap(testFunction, handler, {before: true});

                    checkFunc(wrapper, [2], 2);
                    checkFunc(wrapper, [-5], -3);
                    checkFunc(wrapper, [], -3);
                    checkFunc(wrapper, [7], 4);
                    checkFunc(wrapper, [3], 7, 7);

                    expect( counter )
                        .toBe( 5 );
                });

                it('should call handler with specified context', () => {
                    const watcher = {
                        counter: 0,
                        watch(param: HandlerParam): unknown {
                            this.counter++;

                            return param.run();
                        }
                    };

                    // eslint-disable-next-line @typescript-eslint/unbound-method
                    const wrapper = wrap(testFunction, watcher.watch, {context: watcher});

                    checkFunc(wrapper, [10], 10);
                    checkFunc(wrapper, [-7], 3);
                    checkFunc(wrapper, [1], 4);
                    checkFunc(wrapper, [-2], 2, 2);

                    expect( watcher.counter )
                        .toBe( 4 );
                });
            });
        });

        describe('wrap field', function fieldWrapTestSuite() {
            function changeAndCheckA(...argList: [unknown, unknown?]): void {
                return changeAndCheckField('a', ...argList);
            }

            function changeAndCheckC(...argList: [unknown, unknown?]): void {
                return changeAndCheckField('c', ...argList);
            }

            it('should change descriptor of specified field of target object, preserve value of field and return function that restores original descriptor', () => {
                const descr = Object.getOwnPropertyDescriptor(testObj, 'b');
                const unwrap = wrap(testObj, 'b', logFieldAccess);

                expect( Object.getOwnPropertyDescriptor(testObj, 'b') )
                    .not.toBe( descr );

                testObj.b = testObj.b + 3;
                const c = testObj.b - 1;
                testObj.b *= c;

                expect( getterLog )
                    .toEqual( [1, 1, 1] );
                expect( setterLog )
                    .toEqual( [4, 0] );

                unwrap();
                resetFieldAccessLog();

                expect( testObj.b )
                    .toBe( 1 );

                expect( Object.getOwnPropertyDescriptor(testObj, 'b') )
                    .toEqual( descr );

                testObj.b = -4;

                expect( getterLog.length )
                    .toBe( 0 );
                expect( setterLog.length )
                    .toBe( 0 );
            });

            it("should change descriptor of specified field of target object, accept changes for field's value and return function that restores original descriptor", () => {
                const descr = Object.getOwnPropertyDescriptor(testObj, 'b');
                const unwrap = wrap(testObj, 'b', logFieldAccess, {listen: true});

                expect( Object.getOwnPropertyDescriptor(testObj, 'b') )
                    .not.toBe( descr );

                testObj.b = testObj.b + 3;
                const c = testObj.b - 1;
                testObj.b *= c;

                expect( getterLog )
                    .toEqual( [1, 4, 4] );
                expect( setterLog )
                    .toEqual( [4, 12] );

                unwrap();
                resetFieldAccessLog();

                expect( testObj.b )
                    .toBe( 12 );

                (descr as PropertyDescriptor).value = testObj.b;

                expect( Object.getOwnPropertyDescriptor(testObj, 'b') )
                    .toEqual( descr );

                testObj.b = -4;

                expect( getterLog.length )
                    .toBe( 0 );
                expect( setterLog.length )
                    .toBe( 0 );
            });

            it('should add new field in target object', () => {
                expect( 'c' in testObj )
                    .toBe( false );
                expect( Object.getOwnPropertyDescriptor(testObj, 'c') )
                    .toBeUndefined();

                const unwrap = wrap(testObj, 'c', changeFirstArg);

                expect( 'c' in testObj )
                    .toBe( true );
                expect( Object.getOwnPropertyDescriptor(testObj, 'c') )
                    .toBeDefined();
                expect( testObj.c )
                    .toBeUndefined();

                changeAndCheckC(1, 11);
                changeAndCheckC(-7, 3);

                unwrap();

                expect( 'c' in testObj )
                    .toBe( true );
                expect( Object.getOwnPropertyDescriptor(testObj, 'c') )
                    .toBeDefined();
                expect( testObj.c )
                    .toBe( 3 );

                changeAndCheckC(5);
                changeAndCheckC(-2);
            });

            it("should save field's getter and setter, use them and return function that restores original descriptor", () => {
                let value = '';

                function get(): {value: string; words: number} {
                    const trimmed = value.replace(/^\s+|\s+$/g, '');

                    return {
                        value,
                        words: trimmed
                            ? trimmed.split(/\s+/).length
                            : 0
                    };
                }

                function set(val: string): void {
                    value = val.toLowerCase();
                }

                const descr = {
                    get,
                    set,
                    enumerable: true,
                    configurable: true
                };
                Object.defineProperty(testObj, 'c', descr);

                const unwrap = wrap(testObj, 'c', logFieldAccess, {listen: true});
                const newDescr = Object.getOwnPropertyDescriptor(testObj, 'c');

                // eslint-disable-next-line @typescript-eslint/unbound-method
                expect( (newDescr as PropertyDescriptor).get )
                    .not.toBe( descr.get );
                // eslint-disable-next-line @typescript-eslint/unbound-method
                expect( (newDescr as PropertyDescriptor).set )
                    .not.toBe( descr.set );

                const testStr = ' Test   FIELD  wrapPing  ';
                testObj.c = testStr;
                const { c } = testObj;

                expect( value )
                    .toBe( testStr.toLowerCase() );
                expect( c )
                    .toEqual( {value, words: 3} );
                expect( getterLog )
                    .toEqual( [c] );
                expect( setterLog )
                    .toEqual( [testStr] );

                unwrap();
                resetFieldAccessLog();

                expect( Object.getOwnPropertyDescriptor(testObj, 'c') )
                    .toEqual( descr );
                expect( testObj.c )
                    .toEqual( c );

                changeAndCheckC('', {value: '', words: 0});
                changeAndCheckC('   ', {value: '   ', words: 0});
                changeAndCheckC('new TEST', {value: 'new test', words: 2});

                expect( getterLog.length )
                    .toBe( 0 );
                expect( setterLog.length )
                    .toBe( 0 );
            });

            it("handler should control field's getter and setter", () => {
                function handler(param: HandlerParam): string {
                    let result = '';
                    if (param.byGet) {
                        result = ((param.get as FieldGetter)() || '') as string;
                        result += `:${result.length}`;
                    }
                    else if (param.bySet) {
                        result = (param.set as FieldSetter)(param.arg0.toLowerCase()) as string;
                    }

                    return result;
                }

                const unwrap = wrap(testObj, 'c', handler);

                expect( 'c' in testObj )
                    .toBe( true );
                expect( Object.getOwnPropertyDescriptor(testObj, 'c') )
                    .toBeDefined();
                expect( testObj.c )
                    .toBe( ':0' );

                changeAndCheckC('Some String', 'some string:11');
                changeAndCheckC('TEST', 'test:4');

                unwrap();

                expect( 'c' in testObj )
                    .toBe( true );
                expect( Object.getOwnPropertyDescriptor(testObj, 'c') )
                    .toBeDefined();
                expect( testObj.c )
                    .toBe( 'test:4' );

                changeAndCheckC('Abc...xyZ');
                changeAndCheckC('The Last Chance!');
            });

            it('should use getter and setter provided in settings', () => {
                function get(): number {
                    return testObj.b;
                }
                function set(val: unknown): void {
                    const value = Number(val);
                    if (value) {
                        testObj.b += value;
                    }
                }

                const unwrap = wrap(testObj, 'c', logFieldAccess, {listen: true, get, set});

                const descr = Object.getOwnPropertyDescriptor(testObj, 'c');
                // eslint-disable-next-line @typescript-eslint/unbound-method
                expect( (descr as PropertyDescriptor).get )
                    .not.toBe( get );
                // eslint-disable-next-line @typescript-eslint/unbound-method
                expect( (descr as PropertyDescriptor).set )
                    .not.toBe( set );
                expect( testObj.c )
                    .toBe( testObj.b );

                changeAndCheckC(1, 2);
                changeAndCheckC(-3, -1);
                changeAndCheckC(null, -1);
                changeAndCheckC(4, 3);
                changeAndCheckC('zero', 3);
                changeAndCheckC(0, 3);

                expect( testObj.c )
                    .toBe( testObj.b );
                expect( getterLog )
                    .toEqual( [1, 2, -1, -1, 3, 3, 3, 3] );
                expect( setterLog )
                    .toEqual( [1, -3, null, 4, 'zero', 0] );

                unwrap();

                expect( 'c' in testObj )
                    .toBe( true );
                expect( Object.getOwnPropertyDescriptor(testObj, 'c') )
                    .toBeDefined();
                expect( testObj.c )
                    .toBe( 3 );

                changeAndCheckC(18);
                changeAndCheckC('omega');

                expect( testObj.b )
                    .toBe( 3 );
            });

            it('should make read-only field', () => {
                const unwrap = wrap(testObj, 'a', logFieldAccess, {listen: true, set: false});

                expect( testObj.a )
                    .toBe( 0 );
                // eslint-disable-next-line no-return-assign
                expect(() => testObj.a = 11)
                    .toThrow();
                expect(() => testObj.inc(7))
                    .toThrow();

                expect( getterLog )
                    .toEqual( [0, 0] );
                expect( setterLog.length )
                    .toBe( 0 );

                unwrap();

                changeAndCheckA(8);

                testObj.inc(3);

                expect( testObj.a )
                    .toBe( 11 );
            });

            it('should make write-only field', () => {
                const unwrap = wrap(testObj, 'a', logFieldAccess, {listen: true, get: false});

                changeAndCheckA(3, undef);
                changeAndCheckA(false, undef);
                changeAndCheckA('end', undef);

                expect( getterLog.length )
                    .toBe( 0 );
                expect( setterLog )
                    .toEqual( [3, false, 'end'] );

                unwrap();

                expect( testObj.a )
                    .toBe( undef );
                changeAndCheckA(true);
                changeAndCheckA(null);
            });

            it('should wrap method as usual field', () => {
                /* eslint-disable @typescript-eslint/unbound-method */
                const { inc } = testObj;
                const log: unknown[] = [];
                function handler(param: HandlerParam): AnyFunction {
                    if (param.bySet) {
                        log.push(param.arg0);
                    }

                    return param.byUnwrap
                        ? inc
                        : testObj.dec;
                }

                const unwrap = wrap(testObj, 'inc', handler, {get: true, set: () => undef});

                expect( testObj.inc )
                    .toBe( testObj.dec );

                testObj.inc();
                testObj.inc = testObj.reset;
                testObj.inc(7);
                testObj.inc = testObj.add;

                expect( testObj.a )
                    .toBe( -8 );
                expect( log )
                    .toEqual( [testObj.reset, testObj.add] );

                unwrap();

                expect( testObj.inc )
                    .toBe( inc );

                testObj.inc(4);

                expect( testObj.a )
                    .toBe( -4 );
                /* eslint-enable @typescript-eslint/unbound-method */
            });
        });
    });

    describe('intercept', function interceptTestSuite() {
        const { intercept } = api;

        it('should replace specified fields and methods and return function that restores original fields and methods', () => {
            const watcher = {
                counter: 0,
                watch(param: HandlerParam): unknown {
                    if (! param.byUnwrap) {
                        this.counter++;
                    }

                    return param.run();
                }
            };

            // eslint-disable-next-line @typescript-eslint/unbound-method
            const unwrap = intercept(testObj, ['inc', 'dec', 'add', 'reset', 'b', 'c'], watcher.watch, {context: watcher});

            testObj.inc();
            testObj.add(3, 4, 7);
            testObj.dec(5);
            testObj.c = testObj.b;
            testObj.b += 3;

            expect( testObj.a )
                .toBe( 10 );
            expect( testObj.b )
                .toBe( 4 );
            expect( testObj.c )
                .toBe( 1 );
            expect( watcher.counter )
                .toBe( 9 );

            testObj.reset();
            testObj.b = testObj.a;
            testObj.inc(7);
            testObj.c = 4;

            expect( testObj.a )
                .toBe( 7 );
            expect( testObj.b )
                .toBe( 0 );
            expect( testObj.c )
                .toBe( 4 );
            expect( watcher.counter )
                .toBe( 15 );

            unwrap();

            testObj.dec(4);
            testObj.add(8, -2);
            testObj.b = testObj.c as number;

            expect( testObj.a )
                .toBe( 9 );
            expect( testObj.b )
                .toBe( 4 );
            expect( testObj.c )
                .toBe( 4 );
            expect( watcher.counter )
                .toBe( 15 );
        });

        it('should replace specified method and return function that restores original method', () => {
            function check(method: string | string[]): void {
                const unwrap = intercept(testObj, method, skipNegative);

                expect( testObj.inc(1) )
                    .toBe( 1 );
                expect( testObj.inc(-5) )
                    .toBe( undef );
                expect( testObj.inc(2) )
                    .toBe( 3 );
                expect( testObj.inc(-1) )
                    .toBe( undef );
    
                expect( testObj.a )
                    .toBe( 3 );
    
                unwrap();
    
                checkInc(1, -2);

                prepare();
            }

            check(['inc']);
            check('inc');
        });

        it('should replace specified field and return function that restores original field', () => {
            function check(list?: boolean): void {
                const value = 3;
                const unwrap = intercept(
                    testObj,
                    list
                        ? ['a']
                        : 'a',
                    logFieldAccess,
                    {
                        listen: true,
                        get: () => value,
                        set: () => undef
                    }
                );

                expect( testObj.a )
                    .toBe( value );
                expect( testObj.inc(1) )
                    .toBe( value);
                expect( testObj.dec(2) )
                    .toBe( value );
                expect( testObj.add(3, -4, 10) )
                    .toBe( value );
                expect( testObj.a )
                    .toBe( value );

                expect( getterLog )
                    .toEqual( Array(10).fill(value) );
                expect( setterLog )
                    .toEqual( [4, 1, 6, -1, 13] );
    
                unwrap();
    
                checkInc(value + 7, 7);

                prepare();
            }

            check();
            check(true);
        });

        it('should return new function that calls specified handler', () => {
            const wrapper = intercept(testFunction, changeFirstArg);

            expect( wrapper )
                .not.toBe( testFunction );

            checkFunc(wrapper, [-2], 8, 8);
        });
    });
});
