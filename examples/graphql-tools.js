import { makeExecutableSchema } from 'graphql-tools';
import { createBatchResolver } from '../src/batch';
import { getUser, getFriendsForUsers } from './data';

const typeDefs = `
type User {
  id: Int
  name: String
  friends(limit: Int!): [User]
}

type Query {
  user(id: Int!): User
}

schema {
  query: Query
}
`;

const resolvers = {
  User: {
    friends: createBatchResolver((users, { limit }) => {
      console.log('Resolving friends 👫'); // eslint-disable-line no-console
      return getFriendsForUsers(users, limit);
    }),
  },
  Query: {
    user(_, { id }) {
      return getUser(id);
    },
  },
};

const Schema = makeExecutableSchema({
  typeDefs,
  resolvers,
});

export default Schema;
