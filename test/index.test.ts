import * as api from '../src';
// eslint-disable-next-line no-duplicate-imports
import { AnyObject, HandlerParam, Wrapper, WrapSettings } from '../src';

describe('API', function testSuite() {
    interface TestObj extends AnyObject {
        a: number;
        inc(value?: number): number;
        dec(value?: number): number;
        add(...valueList: unknown[]): number;
        reset(): number;
    }

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
        const firstArg = param.arg[0];

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


    function prepare(): void {
        testObj = {
            a: 0,
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

        testValue = 0;
    }

    beforeEach(prepare);

    function testFunction(value: unknown): number {
        if (typeof value === 'number') {
            testValue += value;
        }

        return testValue;
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
            
            describe('wrap(targetObject, method, handler, {beforeResult: true})', function beforeResultMethodWrapTestSuite() {
                it('should call original method before handler and original\'s result should be returned from wrapper', () => {
                    wrap(testObj, 'inc', useResult, {beforeResult: true});

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
                            param.settings.beforeResult = false;

                            return param.result * 100;
                        },
                        {beforeResult: true}
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
    });

    describe('intercept', function interceptTestSuite() {
        const { intercept } = api;

        it('should replace specified methods and return function that restores original methods', () => {
            const watcher = {
                counter: 0,
                watch(param: HandlerParam): unknown {
                    this.counter++;

                    return param.run();
                }
            };

            // eslint-disable-next-line @typescript-eslint/unbound-method
            const unwrap = intercept(testObj, ['inc', 'dec', 'add', 'reset'], watcher.watch, {context: watcher});

            testObj.inc();
            testObj.add(3, 4, 7);
            testObj.dec(5);

            expect( testObj.a )
                .toBe( 10 );
            expect( watcher.counter )
                .toBe( 3 );

            testObj.reset();
            testObj.inc(7);

            expect( testObj.a )
                .toBe( 7 );
            expect( watcher.counter )
                .toBe( 5 );

            unwrap();

            testObj.dec(4);
            testObj.add(8, -2);

            expect( testObj.a )
                .toBe( 9 );
            expect( watcher.counter )
                .toBe( 5 );
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

        it('should return new function that calls specified handler', () => {
            const wrapper = intercept(testFunction, changeFirstArg);

            expect( wrapper )
                .not.toBe( testFunction );

            checkFunc(wrapper, [-2], 8, 8);
        });
    });
});
