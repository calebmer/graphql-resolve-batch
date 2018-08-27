# GraphQL Batch Resolver

A method for batching the resoluition of GraphQL fields as an alternative to [`dataloader`][] that works with both [GraphQL.js][] and [`graphql-tools`][].

[`dataloader`]: https://github.com/facebook/dataloader

```js
import { GraphQLObjectType, GraphQLString } from 'graphql';
import { createBatchResolver } from 'graphql-resolve-batch';

const UserType = new GraphQLObjectType({
  // ...
});

const QueryType = new GraphQLObjectType({
  name: 'Query',
  fields: {
    user: {
      type: UserType,
      resolve: createBatchResolver(async (sources, args, context) => {
        const { db } = context;
        const users = await db.loadUsersByIds(sources.map(({ id }) => id));
        return users;
      }),
    },
  },
});
```

For a complete examples with usage for both [GraphQL.js][] and [`graphql-tools`][], be sure to check out the [**`./examples` directory**][].

[GraphQL.js]: https://github.com/graphql/graphql-js
[`graphql-tools`]: https://github.com/apollographql/graphql-tools
[**`./examples` directory**]: https://github.com/calebmer/graphql-resolve-batch/tree/master/examples

## Installation

`graphql-resolve-batch` has a peer dependency on `graphql`, so make sure you have installed that package as well.

```
npm install --save graphql graphql-resolve-batch
```

[`graphql`]: https://github.com/graphql/graphql-js

## Why?

GraphQL is a powerful data querying language for both frontend and backend developers. However, because of how GraphQL queries are executed, it can be difficult to define an efficient GraphQL schema. Take for example the following query:

```graphql
{
  users(limit: 5) {
    name
    friends(limit: 5) {
      name
    }
  }
}
```

This demonstrates the power of GraphQL to select arbitrarily nested data. Yet it is a difficult pattern to optimize from the schema developer’s perspective. If we naïvely translate this GraphQL query into say, SQL, we get the following pseudo queries:

```
Select the first 5 users.
Select the first 5 friends for the first user.
Select the first 5 friends for the second user.
Select the first 5 friends for the third user.
Select the first 5 friends for the fourth user.
Select the first 5 friends for the fifth user.
```

We have an N+1 problem! For every user we are executing a database query. This is noticably inefficient and does not scale. What happens when we have:

```graphql
{
  users(limit: 5) {
    name
    friends(limit: 5) {
      name
      friends(limit: 5) {
        name
        friends(limit: 5) {
          name
        }
      }
    }
  }
}
```

This turns into 156 queries!

The canonical solution to this problem is to use [`dataloader`][] which supposedly implements a pattern that Facebook uses to optimize their GraphQL API in JavaScript. `dataloader` is excellent for batching queries with a simple key. For example this query:

[`dataloader`]: https://github.com/facebook/dataloader

```graphql
{
  users(limit: 5) {
    name
    bestFriend {
      name
    }
  }
}
```

Is easy to optimize this GraphQL query with `dataloader` because assumedly the value we use to fetch the `bestFriend` is a scalar. A simple string identifier for instance. However, when we add arguments into the equation:

```graphql
{
  users(limit: 5) {
    name
    friends1: friends(limit: 5) {
      name
    }
    friends2: friends(limit: 5, offset: 5) {
      name
    }
  }
}
```

All of a sudden the keys are not simple scalars. If we wanted to use `dataloader` we might need to use *two* `dataloader` instances. One for `friends(limit: 5)` and one for `friends(limit: 5, offset: 5)` and then on each instance we can use a simple key. An implementation like this can get very complex very quickly and is likely not what you want to spend your time building.

This package offers an alternative to the `dataloader` batching strategy. This package implements an opinionated batching strategy customized for GraphQL. Instead of batching using a simple key, this package batches by the *GraphQL field*. So for example, let us again look at the following query:

```graphql
{
  users(limit: 5) {
    name
    friends(limit: 5) { # Batches 5 executions.
      name
      friends(limit: 5) { # Batches 25 executions.
        name
        friends(limit: 5) { # Batches 125 executions.
          name
        }
      }
    }
  }
}
```

Here we would only have *4* executions instead of 156. One for the root field, one for the first `friends` field, one for the second `friends` field, and so on. This is a powerful alternative to `dataloader` in a case where `dataloader` falls short.

## How?

A batch resolver will run once per GraphQL *field*. So if we assume that you are using a batch resolver on your `friends` field and a frontend engineer writes a query like this:

```graphql
{
  users(limit: 5) {
    name
    friends(limit: 5) {
      name
      friends(limit: 5) {
        name
        friends(limit: 5) {
          name
        }
      }
    }
  }
}
```

Every `friends(limit: 5)` field will run exactly one time. How does this work? A GraphQL.js resolver has the following signature:

```js
(source, args, context, info) => fieldValue
```

To batch together calls to this function by field, `graphql-resolve-batch` defers the resolution until the next tick while synchronously bucketing `source` values together using the field GraphQL.js AST information from `info`. On the next tick the function you passed into `createBatchResolver` is called with all of the sources that were bucketed in the last tick.

The implementation is very similar to the `dataloader` implementation. Except `graphql-resolve-batch` takes a more opionated approach to how batching should be implemented in GraphQL whereas `dataloader` is less opionated in how it batches executions together.

To see how to optimize the above query with a batch resolver, be sure to check out the [**GraphQL.js example**][].

[**GraphQL.js example**]: https://github.com/calebmer/graphql-resolve-batch/blob/master/examples/graphql.js

## When do I use `dataloader` and when do I use `graphql-resolve-batch`?

If you answer yes to any of these questions:

- Do you have a simple primitive key like a string or number that you can use to batch with?
- Do you want to batch requests across your entire schema?
- Do you want to cache data with the same key so that it does not need to be re-requested?

Use `dataloader`. But for all of the cases where `dataloader` is useful, `graphql-resolve-batch` will likely also be useful. If you find `dataloader` to complex to set up, and its benefits not very attractive you could just use `graphql-resolve-batch` for everywhere you need to hit the database.

However, if you answer yes to any of these questions:

- Does your field have arguments?
- Is it hard for you to derive a primitive value from your source values for your field?
- Do you not have the ability to add any new values to `context`? (such as in an embedded GraphQL schema)

You almost certainly want to use `graphql-resolve-batch`. If you are using `dataloader` then `graphql-resolve-batch` will only be better in a few niche cases. However, `graphql-resolve-batch` is easier to set up.

## Credits

Enjoy efficient GraphQL APIs? Follow the author, [`@calebmer`][] on Twitter for more awesome work like this.

[`@calebmer`]: http://twitter.com/calebmer
