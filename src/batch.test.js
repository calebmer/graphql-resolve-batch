import { graphql } from 'graphql';
import ExampleGraphQLSchema from '../examples/graphql';
import { createBatchResolver } from './batch';

describe('createBatchResolver', () => {
  it('will throw an error if a function is not the first argument', () => {
    expect(() => {
      createBatchResolver();
    }).toThrow(
      'Expected a function as the first argument when creating a batch ' +
        "resolver. Instead found: 'undefined'.",
    );
    expect(() => {
      createBatchResolver('hello world');
    }).toThrow(
      'Expected a function as the first argument when creating a batch ' +
        "resolver. Instead found: 'string'.",
    );
    expect(() => {
      createBatchResolver(42);
    }).toThrow(
      'Expected a function as the first argument when creating a batch ' +
        "resolver. Instead found: 'number'.",
    );
    expect(() => {
      createBatchResolver({});
    }).toThrow(
      'Expected a function as the first argument when creating a batch ' +
        "resolver. Instead found: 'object'.",
    );
    expect(() => {
      createBatchResolver(null, () => {});
    }).toThrow(
      'Expected a function as the first argument when creating a batch ' +
        "resolver. Instead found: 'object'.",
    );
  });

  it('will batch basic synchronous resolves grouping with `fieldNodes`', () => {
    const batchResolve = jest.fn(sources =>
      sources.map(source => source + 0.5));

    const resolve = createBatchResolver(batchResolve);

    const fieldNodes1 = [Symbol('fieldNodes')];
    const fieldNodes2 = [Symbol('fieldNodes')];

    return Promise.resolve()
      .then(() => {
        return resolve(0, null, null, { fieldNodes: fieldNodes1 });
      })
      .then(value => {
        expect(value).toEqual(0.5);
        expect(batchResolve.mock.calls.length).toEqual(1);
        return resolve(1, null, null, { fieldNodes: fieldNodes1 });
      })
      .then(value => {
        expect(value).toEqual(1.5);
        expect(batchResolve.mock.calls.length).toEqual(2);
        return resolve(2, null, null, { fieldNodes: fieldNodes1 });
      })
      .then(value => {
        expect(value).toEqual(2.5);
        expect(batchResolve.mock.calls.length).toEqual(3);
        return Promise.all([
          resolve(3, null, null, { fieldNodes: fieldNodes1 }),
          resolve(4, null, null, { fieldNodes: fieldNodes1 }),
          resolve(5, null, null, { fieldNodes: fieldNodes1 }),
        ]);
      })
      .then(values => {
        expect(values).toEqual([3.5, 4.5, 5.5]);
        expect(batchResolve.mock.calls.length).toEqual(4);
        return Promise.all([
          resolve(6, null, null, { fieldNodes: fieldNodes1 }),
          resolve(7, null, null, { fieldNodes: fieldNodes2 }),
          resolve(8, null, null, { fieldNodes: fieldNodes1 }),
          resolve(9, null, null, { fieldNodes: fieldNodes1 }),
        ]);
      })
      .then(values => {
        expect(values).toEqual([6.5, 7.5, 8.5, 9.5]);
        expect(batchResolve.mock.calls.length).toEqual(6);
        expect(batchResolve.mock.calls).toEqual([
          [[0], null, null, { fieldNodes: fieldNodes1 }],
          [[1], null, null, { fieldNodes: fieldNodes1 }],
          [[2], null, null, { fieldNodes: fieldNodes1 }],
          [[3, 4, 5], null, null, { fieldNodes: fieldNodes1 }],
          [[6, 8, 9], null, null, { fieldNodes: fieldNodes1 }],
          [[7], null, null, { fieldNodes: fieldNodes2 }],
        ]);
      });
  });

  it('will pass the first `args` to the batch resolver', () => {
    const batchResolve = jest.fn(sources =>
      sources.map(source => source + 0.5));

    const resolve = createBatchResolver(batchResolve);

    const fieldNodes = [Symbol('fieldNodes')];
    const args1 = Symbol('args1');
    const args2 = Symbol('args2');
    const args3 = Symbol('args3');

    return Promise.resolve()
      .then(() => {
        return Promise.all([
          resolve(0, args1, null, { fieldNodes }),
          resolve(1, args2, null, { fieldNodes }),
          resolve(2, args3, null, { fieldNodes }),
        ]);
      })
      .then(values => {
        expect(values).toEqual([0.5, 1.5, 2.5]);
        expect(batchResolve.mock.calls).toEqual([
          [[0, 1, 2], args1, null, { fieldNodes }],
        ]);
      });
  });

  it('will pass the first `context` to the batch resolver', () => {
    const batchResolve = jest.fn(sources =>
      sources.map(source => source + 0.5));

    const resolve = createBatchResolver(batchResolve);

    const fieldNodes = [Symbol('fieldNodes')];
    const context1 = Symbol('context1');
    const context2 = Symbol('context2');
    const context3 = Symbol('context3');

    return Promise.resolve()
      .then(() => {
        return Promise.all([
          resolve(0, null, context1, { fieldNodes }),
          resolve(1, null, context2, { fieldNodes }),
          resolve(2, null, context3, { fieldNodes }),
        ]);
      })
      .then(values => {
        expect(values).toEqual([0.5, 1.5, 2.5]);
        expect(batchResolve.mock.calls).toEqual([
          [[0, 1, 2], null, context1, { fieldNodes }],
        ]);
      });
  });

  it(
    'will pass the first `info` to the batch resolver even if `fieldNodes` ' +
      'is the same',
    () => {
      const batchResolve = jest.fn(sources =>
        sources.map(source => source + 0.5));

      const resolve = createBatchResolver(batchResolve);

      const fieldNodes = [Symbol('fieldNodes')];
      const extra1 = Symbol('extra1');
      const extra2 = Symbol('extra2');
      const extra3 = Symbol('extra3');

      return Promise.resolve()
        .then(() => {
          return Promise.all([
            resolve(0, null, null, { fieldNodes, extra1 }),
            resolve(1, null, null, { fieldNodes, extra2 }),
            resolve(2, null, null, { fieldNodes, extra3 }),
          ]);
        })
        .then(values => {
          expect(values).toEqual([0.5, 1.5, 2.5]);
          expect(batchResolve.mock.calls).toEqual([
            [[0, 1, 2], null, null, { fieldNodes, extra1 }],
          ]);
        });
    },
  );

  it('will reject if an array is not returned by the resolver', () => {
    const resolve0 = createBatchResolver(() => null);
    const resolve1 = createBatchResolver(() => 42);
    const resolve2 = createBatchResolver(() => 'Hello, world!');
    const resolve3 = createBatchResolver(() => ({}));

    const fieldNodes = [Symbol('fieldNodes')];

    const identity = value => value;
    const unexpected = () => {
      throw new Error('Unexpected.');
    };

    return Promise.all([
        resolve0(null, null, null, { fieldNodes }).then(unexpected, identity),
        resolve1(null, null, null, { fieldNodes }).then(unexpected, identity),
        resolve2(null, null, null, { fieldNodes }).then(unexpected, identity),
        resolve3(null, null, null, { fieldNodes }).then(unexpected, identity),
      ])
      .then(errors => {
        expect(errors.map(({ message }) => message)).toEqual([
          'Must return an array of values from the batch resolver ' +
            "function. Instead the function returned a '[object Null]'.",
          'Must return an array of values from the batch resolver ' +
            "function. Instead the function returned a '[object Number]'.",
          'Must return an array of values from the batch resolver ' +
            "function. Instead the function returned a '[object String]'.",
          'Must return an array of values from the batch resolver ' +
            "function. Instead the function returned a '[object Object]'.",
        ]);
      });
  });

  it(
    'will reject if the returned value does not have the same length as ' +
      'the sources',
    () => {
      const resolve0 = createBatchResolver(() => []);
      const resolve1 = createBatchResolver(() => [1]);
      const resolve2 = createBatchResolver(() => [1, 2]);

      const fieldNodes = [Symbol('fieldNodes')];

      const identity = value => value;
      const unexpected = () => {
        throw new Error('Unexpected.');
      };

      return Promise.all([
          resolve0(null, null, null, { fieldNodes }).then(unexpected, identity),
          resolve1(null, null, null, { fieldNodes }).then(unexpected, identity),
          resolve1(null, null, null, { fieldNodes }).then(unexpected, identity),
          resolve1(null, null, null, { fieldNodes }).then(unexpected, identity),
          resolve2(null, null, null, { fieldNodes }).then(unexpected, identity),
        ])
        .then(errors => {
          expect(errors.map(({ message }) => message)).toEqual([
            'Must return the same number of values from the batch resolver ' +
              'as there were sources. Expected 1 value(s) but got 0 value(s).',
            'Must return the same number of values from the batch resolver ' +
              'as there were sources. Expected 3 value(s) but got 1 value(s).',
            'Must return the same number of values from the batch resolver ' +
              'as there were sources. Expected 3 value(s) but got 1 value(s).',
            'Must return the same number of values from the batch resolver ' +
              'as there were sources. Expected 3 value(s) but got 1 value(s).',
            'Must return the same number of values from the batch resolver ' +
              'as there were sources. Expected 1 value(s) but got 2 value(s).',
          ]);
          expect(errors[1]).not.toBe(errors[0]);
          expect(errors[1]).toBe(errors[1]);
          expect(errors[1]).toBe(errors[2]);
          expect(errors[1]).toBe(errors[3]);
          expect(errors[1]).not.toBe(errors[4]);
        });
    },
  );

  it('will reject individual promises if errors are returned', () => {
    const error1 = new Error('Yikes 1');
    const error2 = new Error('Yikes 1');

    const resolve = createBatchResolver(() => [1, error1, 3, 4, error2]);

    const fieldNodes = [Symbol('fieldNodes')];

    const identity = value => value;
    const unexpected = () => {
      throw new Error('Unexpected.');
    };

    return Promise.all([
        resolve(null, null, null, { fieldNodes }).then(identity, unexpected),
        resolve(null, null, null, { fieldNodes }).then(unexpected, identity),
        resolve(null, null, null, { fieldNodes }).then(identity, unexpected),
        resolve(null, null, null, { fieldNodes }).then(identity, unexpected),
        resolve(null, null, null, { fieldNodes }).then(unexpected, identity),
      ])
      .then(results => {
        expect(results).toEqual([1, error1, 3, 4, error2]);
        expect(results[1]).toEqual(error1);
        expect(results[4]).toEqual(error2);
      });
  });
});

/* eslint-disable no-console */
describe('examples', () => {
  const schemas = [{ name: 'GraphQL.js', schema: ExampleGraphQLSchema }];

  let originalConsoleLog;

  beforeAll(() => {
    originalConsoleLog = console.log;
    console.log = jest.fn();
  });

  afterAll(() => {
    console.log = originalConsoleLog;
  });

  schemas.forEach(({ name, schema }) => {
    describe(name, () => {
      it('will call the batch resolver once for every level', async () => {
        console.log.mockClear();
        const query = `
          {
            user(id: 5) {
              friends(limit: 4) {
                friends(limit: 3) {
                  friends(limit: 2) {
                    friends(limit: 1) {
                      id
                    }
                  }
                }
              }
            }
          }
        `;
        const result = await graphql(schema, query);
        expect(console.log).toHaveBeenCalledTimes(4);
        expect(result).toEqual({
          data: {
            user: {
              friends: [
                {
                  friends: [
                    {
                      friends: [
                        { friends: [{ id: 5 }, { id: 6 }] },
                        { friends: [{ id: 1 }, { id: 5 }] },
                        { friends: [{ id: 5 }, { id: 6 }] },
                      ],
                    },
                    {
                      friends: [
                        { friends: [{ id: 5 }, { id: 6 }] },
                        { friends: [{ id: 1 }, { id: 6 }] },
                        { friends: [{ id: 2 }, { id: 6 }] },
                      ],
                    },
                    {
                      friends: [
                        { friends: [{ id: 5 }, { id: 6 }] },
                        { friends: [{ id: 7 }, { id: 10 }] },
                        { friends: [{ id: 10 }, { id: 14 }] },
                      ],
                    },
                    {
                      friends: [
                        { friends: [{ id: 5 }, { id: 6 }] },
                        { friends: [{ id: 1 }, { id: 6 }] },
                        { friends: [{ id: 2 }, { id: 6 }] },
                      ],
                    },
                  ],
                },
                {
                  friends: [
                    {
                      friends: [
                        { friends: [{ id: 1 }, { id: 6 }] },
                        { friends: [{ id: 1 }, { id: 5 }] },
                        { friends: [{ id: 1 }, { id: 2 }] },
                      ],
                    },
                    {
                      friends: [
                        { friends: [{ id: 5 }, { id: 6 }] },
                        { friends: [{ id: 1 }, { id: 5 }] },
                        { friends: [{ id: 5 }, { id: 6 }] },
                      ],
                    },
                    {
                      friends: [
                        { friends: [{ id: 7 }, { id: 10 }] },
                        { friends: [{ id: 1 }, { id: 5 }] },
                        { friends: [{ id: 7 }, { id: 16 }] },
                      ],
                    },
                    {
                      friends: [
                        { friends: [{ id: 1 }, { id: 6 }] },
                        { friends: [{ id: 1 }, { id: 5 }] },
                        { friends: [{ id: 2 }, { id: 6 }] },
                      ],
                    },
                  ],
                },
                {
                  friends: [
                    {
                      friends: [
                        { friends: [{ id: 5 }, { id: 6 }] },
                        { friends: [{ id: 1 }, { id: 5 }] },
                        { friends: [{ id: 5 }, { id: 6 }] },
                      ],
                    },
                    {
                      friends: [
                        { friends: [{ id: 5 }, { id: 6 }] },
                        { friends: [{ id: 1 }, { id: 6 }] },
                        { friends: [{ id: 2 }, { id: 6 }] },
                      ],
                    },
                    {
                      friends: [
                        { friends: [{ id: 7 }, { id: 10 }] },
                        { friends: [{ id: 1 }, { id: 5 }] },
                        { friends: [{ id: 7 }, { id: 16 }] },
                      ],
                    },
                    {
                      friends: [
                        { friends: [{ id: 5 }, { id: 6 }] },
                        { friends: [{ id: 7 }, { id: 10 }] },
                        { friends: [{ id: 10 }, { id: 14 }] },
                      ],
                    },
                  ],
                },
                {
                  friends: [
                    {
                      friends: [
                        { friends: [{ id: 1 }, { id: 6 }] },
                        { friends: [{ id: 1 }, { id: 5 }] },
                        { friends: [{ id: 1 }, { id: 2 }] },
                      ],
                    },
                    {
                      friends: [
                        { friends: [{ id: 5 }, { id: 6 }] },
                        { friends: [{ id: 1 }, { id: 5 }] },
                        { friends: [{ id: 5 }, { id: 6 }] },
                      ],
                    },
                    {
                      friends: [
                        { friends: [{ id: 7 }, { id: 10 }] },
                        { friends: [{ id: 1 }, { id: 5 }] },
                        { friends: [{ id: 7 }, { id: 16 }] },
                      ],
                    },
                    {
                      friends: [
                        { friends: [{ id: 1 }, { id: 5 }] },
                        { friends: [{ id: 1 }, { id: 4 }] },
                        { friends: [{ id: 1 }, { id: 4 }] },
                      ],
                    },
                  ],
                },
                {
                  friends: [
                    {
                      friends: [
                        { friends: [{ id: 5 }, { id: 6 }] },
                        { friends: [{ id: 1 }, { id: 5 }] },
                        { friends: [{ id: 5 }, { id: 6 }] },
                      ],
                    },
                    {
                      friends: [
                        { friends: [{ id: 7 }, { id: 10 }] },
                        { friends: [{ id: 1 }, { id: 5 }] },
                        { friends: [{ id: 7 }, { id: 16 }] },
                      ],
                    },
                    {
                      friends: [
                        { friends: [{ id: 1 }, { id: 6 }] },
                        { friends: [{ id: 1 }, { id: 5 }] },
                        { friends: [{ id: 2 }, { id: 6 }] },
                      ],
                    },
                    {
                      friends: [
                        { friends: [{ id: 5 }, { id: 6 }] },
                        { friends: [{ id: 7 }, { id: 10 }] },
                        { friends: [{ id: 10 }, { id: 14 }] },
                      ],
                    },
                  ],
                },
              ],
            },
          },
        });
      });
    });
  });
});
/* eslint-enable no-console */
