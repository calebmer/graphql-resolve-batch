/**
 * This file contains the data that is used in our examples. This file does not
 * contain an example itself. For a real example see the other files in the
 * examples folder.
 */

/**
 * Lookup a user by an id and return that user.
 */
export function getUser(id) {
  return userByID.get(id);
}

/**
 * A batch function which will take an array of users and return an array of the
 * friends for each user.
 *
 * If a limit is provided then it will configure the maximum number of friends
 * that are returned. If no limit is provided then all of the friends are
 * returned.
 */
export function getFriendsForUsers(users, limit = Infinity) {
  return users.map(user => {
    const allFriendIDs = friendsByID.get(user.id) || [];
    const friendIDs = allFriendIDs.slice(0, limit + 1);
    return friendIDs.map(id => getUser(id));
  });
}

/**
 * Our raw user data. We have a small set of named users with ids.
 */
const rawUsers = [
  { id: 1, name: 'Shirley Hanson' },
  { id: 2, name: 'Linda Bishop' },
  { id: 3, name: 'Arthur Ford' },
  { id: 4, name: 'Martha Franklin' },
  { id: 5, name: 'Helen Gutierrez' },
  { id: 6, name: 'Mary Gonzalez' },
  { id: 7, name: 'Christina Mcdonald' },
  { id: 8, name: 'Alice Ryan' },
  { id: 9, name: 'Samuel Harrison' },
  { id: 10, name: 'Christopher Ellis' },
  { id: 11, name: 'Matthew Spencer' },
  { id: 12, name: 'Julie Reid' },
  { id: 13, name: 'Elizabeth Freeman' },
  { id: 14, name: 'Jose Vasquez' },
  { id: 15, name: 'Martha Henderson' },
  { id: 16, name: 'Virginia Butler' },
  { id: 17, name: 'Mark Fernandez' },
  { id: 18, name: 'Martin Cole' },
  { id: 19, name: 'Anna Price' },
  { id: 20, name: 'Debra Henderson' },
  { id: 21, name: 'Barbara Carroll' },
  { id: 22, name: 'Jennifer Weaver' },
  { id: 23, name: 'Dennis Hart' },
  { id: 24, name: 'Chris Ryan' },
  { id: 25, name: 'Alan Rivera' },
];

/**
 * Convert our user data into a map where we can have efficient searches for
 * users by id.
 */
const userByID = new Map(rawUsers.map(user => [user.id, user]));

/**
 * Raw friendship data. It is an array of distinct pairs in which no pairs are a
 * duplicate.
 *
 * In other words we do not have the pairs `[1, 2]` and `[2, 1]` as they are not
 * distinct. They both have the ids `1` and `2`. We also do not have a pair like
 * `[1, 1]` which has duplicate `1`s.
 *
 * This array and the pairs within are sorted to make it easy to spot incorrect
 * pairs.
 */
const rawFriendships = [
  [1, 5],
  [1, 6],
  [1, 10],
  [1, 11],
  [1, 17],
  [1, 19],
  [1, 20],
  [1, 22],
  [1, 25],
  [2, 7],
  [2, 10],
  [2, 21],
  [2, 22],
  [3, 15],
  [3, 18],
  [3, 20],
  [3, 21],
  [3, 22],
  [3, 25],
  [4, 10],
  [4, 14],
  [4, 17],
  [4, 19],
  [4, 21],
  [5, 6],
  [5, 9],
  [5, 11],
  [5, 12],
  [5, 18],
  [6, 7],
  [6, 9],
  [6, 16],
  [6, 17],
  [7, 8],
  [7, 9],
  [7, 11],
  [7, 12],
  [7, 18],
  [7, 19],
  [7, 22],
  [8, 16],
  [8, 22],
  [9, 10],
  [9, 12],
  [9, 14],
  [9, 20],
  [9, 24],
  [9, 25],
  [10, 12],
  [10, 18],
  [11, 13],
  [11, 15],
  [11, 17],
  [11, 18],
  [11, 21],
  [11, 24],
  [12, 20],
  [13, 17],
  [13, 19],
  [13, 21],
  [14, 23],
  [15, 20],
  [15, 22],
  [16, 18],
  [16, 20],
  [16, 24],
  [16, 25],
  [17, 18],
  [17, 20],
  [17, 23],
  [17, 24],
  [18, 22],
  [18, 25],
  [19, 21],
  [19, 23],
  [20, 22],
  [21, 25],
];

/**
 * A map of a user id to the ids that user’s friends.
 */
const friendsByID = new Map();

{
  // Populate the `friendsByID` array using the `addFriendOneWay` utility
  // function.
  rawFriendships.forEach(([id1, id2]) => {
    addFriendOneWay(id1, id2);
    addFriendOneWay(id2, id1);
  });

  /**
   * A utility function we use to populate the `friendsByID` map. It adds a
   * directed friendship. Call this function twice, the second time with
   * arguments reversed, for the friendship to go both ways.
   */
  function addFriendOneWay(id1, id2) {
    if (friendsByID.has(id1)) {
      friendsByID.get(id1).push(id2);
    } else {
      friendsByID.set(id1, [id2]);
    }
  }
}
