/**
 * Creates a GraphQL.js field resolver that batches together multiple resolves
 * together that share the *exact* same GraphQL field selection.
 */
export function createBatchResolver(batchResolveFn) {
  // Throw an error early of the batch resolver is not a function instead of
  // throwing an error at query execution time.
  if (typeof batchResolveFn !== 'function') {
    throw new Error(
      'Expected a function as the first argument when creating a batch ' +
        `resolver. Instead found: '${typeof batchResolveFn}'.`,
    );
  }
  const batcher = new Batcher(batchResolveFn);
  return (source, args, context, info) => {
    return new Promise((resolve, reject) => {
      batcher.batch(source, args, context, info, resolve, reject);
    });
  };
}

/**
 * A structure that batches GraphQL resolves together based on the GraphQL field
 * nodes.
 */
class Batcher {
  constructor(batchResolveFn) {
    this._batchResolveFn = batchResolveFn;
    this._batches = new Map();
  }

  /**
   * Registers a batch execution for the provided GraphQL field node ASTs. The
   * batch resolver function should be scheduled to execute on the next tick and
   * the batch resolver finishes the `resolve` and `reject` functions will be
   * executed.
   *
   * We group batches together by the first item in `info.fieldNodes`.
   */
  batch(source, args, context, info, resolve, reject) {
    // We only use the first field node because the array is reconstructed for
    // every value. Using only the first node *should not matter*. The nodes
    // should not get reused and we should not be missing any information from
    // the other fields.
    const { fieldNodes: [fieldNode] } = info;
    let batch = this._batches.get(fieldNode);

    // If no batch currently exists for this array of field nodes then we want
    // to create one.
    if (typeof batch === 'undefined') {
      batch = {
        // We only use the first set of `args`, `context`, and `info` that we
        // are passed.
        //
        // It is mostly safe to assume that these variables will be the same
        // for the same `fieldNodes` from the execution implementation.
        args,
        context,
        info,

        // We will push our sources and promise callbacks into these arrays.
        sources: [],
        callbacks: [],
      };
      this._batches.set(fieldNode, batch);
    }

    // Add our source and callbacks to the batch.
    batch.sources.push(source);
    batch.callbacks.push({ resolve, reject });

    // Schedule a resolve if none has already been scheduled.
    this._scheduleResolve();
  }

  /**
   * Schedules a resolve for the next tick if a resolve has not already been
   * scheduled.
   */
  _scheduleResolve() {
    if (!this._hasScheduledResolve) {
      this._hasScheduledResolve = true;
      process.nextTick(() => {
        this._resolve();
        this._hasScheduledResolve = false;
      });
    }
  }

  /**
   * Resolves all of the batch callbacks by actually executing the batch
   * resolver.
   */
  _resolve() {
    // Execute every batch that has accumulated.
    this._batches.forEach(batch => {
      // Execute our batch resolver function with the appropriate arguments. We
      // use the `executePromise` function to normalize synchronous and
      // asynchronous execution.
      executePromise(
        this._batchResolveFn,
        batch.sources,
        batch.args,
        batch.context,
        batch.info,
      )
        .then(
          // If we got back an array of values then we want to resolve all of our
          // callbacks for this batch.
          values => {
            // Throw an error if we did not get an array of values back from the
            // batch resolver function.
            if (!Array.isArray(values)) {
              throw new Error(
                'Must return an array of values from the batch resolver ' +
                  'function. Instead the function returned a ' +
                  `'${Object.prototype.toString.call(values)}'.`,
              );
            }
            // Throw an error if the array of values we got back from the resolver
            // is not equal to the number of values we expected when looking at
            // the sources.
            if (values.length !== batch.sources.length) {
              throw new Error(
                'Must return the same number of values from the batch ' +
                  'resolver as there were sources. Expected ' +
                  `${batch.sources.length} value(s) but got ` +
                  `${values.length} value(s).`,
              );
            }
            // We want to call all of our callbacks with a value returned by our
            // batch resolver.
            batch.callbacks.forEach(({ resolve, reject }, i) => {
              // Get the value for this set of callbacks. If it is an error then
              // we want to reject this promise. Otherwise we will resolve to the
              // value.
              const value = values[i];
              if (value instanceof Error) {
                reject(value);
              } else {
                resolve(value);
              }
            });
          },
        )
        // If we got an error we want to reject all of our callbacks.
        .catch(error => {
          batch.callbacks.forEach(({ reject }) => {
            reject(error);
          });
        });
    });
    // Clean out our batches map.
    this._batches.clear();
  }
}

/**
 * Executes a function and *always* returns a function. If the function executes
 * synchronously then the result will be coerced into a promise, and if the
 * function returns a promise then that promise will be returned.
 */
function executePromise(fn, ...args) {
  try {
    // Execute the function. We do not bind a `this` variable. This is
    // expected to be done by the caller.
    const result = fn(...args);
    // If the result is thenable (most likely a promise) then we want to return
    // the result directly. Otherwise we will turn the value into a promise with
    // `Promise.resolve`.
    return result && typeof result.then === 'function'
      ? result
      : Promise.resolve(result);
  } catch (error) {
    // If the functioned errored synchronously we want to return a promise that
    // immeadiately rejects.
    return Promise.reject(error);
  }
}
