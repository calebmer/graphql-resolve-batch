import {
  GraphQLObjectType,
  GraphQLInt,
  GraphQLString,
  GraphQLList,
  GraphQLNonNull,
  GraphQLSchema,
} from 'graphql';
import { createBatchResolver } from '../src/batch';
import { getUser, getFriendsForUsers } from './data';

const UserType = new GraphQLObjectType({
  name: 'User',
  fields: () => ({
    id: { type: GraphQLInt },
    name: { type: GraphQLString },
    friends: {
      type: new GraphQLList(UserType),
      args: {
        limit: { type: GraphQLInt },
      },
      resolve: createBatchResolver((users, { limit }) => {
        console.log('Resolving friends 👫'); // eslint-disable-line no-console
        return getFriendsForUsers(users, limit);
      }),
    },
  }),
});

const QueryType = new GraphQLObjectType({
  name: 'Query',
  fields: {
    user: {
      type: UserType,
      args: {
        id: { type: new GraphQLNonNull(GraphQLInt) },
      },
      resolve: (source, { id }) => getUser(id),
    },
  },
});

const Schema = new GraphQLSchema({
  query: QueryType,
});

export default Schema;
