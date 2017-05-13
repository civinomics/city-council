import * as admin from 'firebase-admin';
import {
  Comment,
  DenormalizedComment,
  DenormalizedVote,
  Group,
  Item,
  Meeting,
  parseComment,
  parseGroup,
  parseItem,
  parseMeeting,
  parseUser,
  parseVote,
  User,
  Vote
} from '@civ/city-council';

import 'rxjs/add/observable/timer';
import 'rxjs/add/observable/forkJoin';
import 'rxjs/add/observable/fromPromise';
import 'rxjs/add/observable/from';
import 'rxjs/add/operator/take';
import 'rxjs/add/operator/toPromise';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/scan';


export async function getItem(id: string, database: admin.database.Database): Promise<Item> {
  const snapshot = await database.ref(`/item/${id}`).once('value');

  if (!snapshot.exists()) {
    throw new Error(`Item ${id} does not exist.`)
  }
  return parseItem({ ...snapshot.val(), id });
}

export async function getMeeting(id: string, database: admin.database.Database): Promise<Meeting> {
  const snapshot = await database.ref(`/meeting/${id}`).once('value');
  if (!snapshot.exists()) {
    throw new Error(`Meeting ${id} does not exist.`)
  }
  return parseMeeting({ ...snapshot.val(), id });
}

export async function getGroup(id: string, database: admin.database.Database): Promise<Group> {
  const snapshot = await database.ref(`/group/${id}`).once('value');

  if (!snapshot.exists()) {
    throw new Error(`Group ${id} does not exist.`)
  }

  return parseGroup({ ...snapshot.val(), id });
}

export async function getUser(userId: string, database: admin.database.Database, throwIfNotFound: boolean = true): Promise<User> {
  const snapshot = await database.ref(`/user/${userId}`).once('value');

  if (!snapshot.exists()) {
    if (throwIfNotFound) {
      throw new Error(`User ${userId} does not exist.`)
    } else {
      return null;
    }
  }

  return parseUser({ ...snapshot.val(), id: userId });
}


export async function getComment(itemId: string,
                                 commentId: string,
                                 database: admin.database.Database): Promise<DenormalizedComment> {
  const snapshot = await database.ref(`/comment/${itemId}/${commentId}`).once('value');

  if (!snapshot.exists()) {
    throw new Error(`Comment ${itemId}/${commentId} does not exist!`);
  }

  const comment = parseComment({ ...snapshot.val(), id: commentId });

  const [ author, votes, replies ]: [ User, Vote[], Comment[] ] = await Promise.all([
    getUser(comment.owner, database, false),
    getVotesOn(comment.id, database),
    getCommentsOn(comment.id, database)
  ]);

  if (author == null) {
    console.log(`cannot find author: ${comment.owner} | itemId: ${itemId} | commentId: ${comment.id}`);
  }

  let voteStats = {
    up: votes.filter(it => it.value == 1).length,
    down: votes.filter(it => it.value == -1).length
  };

  if (votes.length > 0) {
    console.log('yee');
  }

  return {
    ...comment,
    author,
    votes,
    voteStats,
    replies
  }
}

export async function getFollowers(type: 'meeting' | 'group' | 'item', id: string, database: admin.database.Database): Promise<string[]> {
  const dict = await database.ref(`following/${type}/${id}`).once('value');
  return Object.keys(dict || {}).filter(id => dict[ id ] == true)

}

export async function getVotesOn(id: string, database: admin.database.Database): Promise<DenormalizedVote[]> {
  const snapshot = (await database.ref(`/vote/${id}`).once('value'));
  if (!snapshot.exists()) {
    return [];
  }
  const val = snapshot.val();

  const votes = Object.keys(val).map(voteId => parseVote({ ...val[ voteId ], id: voteId }));

  const authors = await Promise.all(votes.map(vote => getUser(vote.owner, database, false)));

  return votes.map((vote, idx) => ({ ...vote, author: authors[ idx ] }));
}


export async function getCommentsOn(itemId: string,
                                    database: admin.database.Database): Promise<DenormalizedComment[]> {
  const snapshot = await database.ref(`/comment/${itemId}`).once('value');

  if (!snapshot.exists()) {
    return [] as (Comment & { author: User, votes: Vote[], replies: Comment[] })[];
  }

  return await Promise.all(Object.keys(snapshot.val()).map(commentId => getComment(itemId, commentId, database)))
}


export async function getUserEmail(id: string, database: admin.database.Database): Promise<string> {
  return await database.ref(`/user_private/${id}/email`).once('value');
}


export async function getFollowersWithEmailAddresses(type: 'meeting' | 'group' | 'item', id: string, database: admin.database.Database): Promise<{ [id: string]: string }> {
  const followers = await getFollowers(type, id, database);

  const emails = await Promise.all(followers.map(userId => getUserEmail(userId, database)));

  return emails.reduce((result, email, idx) => ({ ...result, [followers[ idx ]]: email }), {});

}

