import { Suite } from 'benchmark';
import {
  parse,
  execute,
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLInt,
} from 'graphql';
import { createBatchResolver } from './batch';

const suite = new Suite();

const TestType = new GraphQLObjectType({
  name: 'Test',
  fields: {
    singleSync: {
      type: GraphQLInt,
      resolve: () => 42,
    },
    singleAsync: {
      type: GraphQLInt,
      resolve: () => Promise.resolve(42),
    },
    batchConstant: {
      type: GraphQLInt,
      resolve: createBatchResolver(sources => Array(sources.length).fill(42)),
    },
    batchLinear: {
      type: GraphQLInt,
      resolve: createBatchResolver(sources => sources.map(42)),
    },
  },
});

const schema = new GraphQLSchema({
  query: TestType,
});

const singleSyncQuery = parse('{ singleSync }');
const singleAsyncQuery = parse('{ singleAsync }');
const batchConstantQuery = parse('{ batchConstant }');
const batchLinearQuery = parse('{ batchLinear }');

suite
  .add('single sync field', {
    defer: true,
    fn(deferred) {
      execute(schema, singleSyncQuery).then(() => deferred.resolve());
    },
  })
  .add('single async field', {
    defer: true,
    fn(deferred) {
      execute(schema, singleAsyncQuery).then(() => deferred.resolve());
    },
  })
  .add('batched constant time field', {
    defer: true,
    fn(deferred) {
      execute(schema, batchConstantQuery).then(() => deferred.resolve());
    },
  })
  .add('batched linear time field', {
    defer: true,
    fn(deferred) {
      execute(schema, batchLinearQuery).then(() => deferred.resolve());
    },
  })
  .on('cycle', event => {
    // eslint-disable-next-line no-console
    console.log(String(event.target));
  })
  .run({ async: true });
