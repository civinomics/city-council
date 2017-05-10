import * as admin from 'firebase-admin';
import { Comment, Group, Item, Meeting, parseComment, parseGroup, parseItem, parseMeeting } from '@civ/city-council';


export function getUserEmail(id: string, database: admin.database.Database): Promise<string> {
  return new Promise((resolve, reject) => {
    database.ref(`/user_private/${id}/email`).once('value', (snapshot) => {
      resolve(snapshot.val());
    }).catch(err => {
      reject(err);
    })
  });
}

export function getItem(id: string, database: admin.database.Database): Promise<Item> {
  return new Promise((resolve, reject) => {
    database.ref(`/item/${id}`).once('value', (snapshot) => {
      resolve(parseItem({ ...snapshot.val(), id }));
    }).catch(err => reject(err));
  });
}

export function getMeeting(id: string, database: admin.database.Database): Promise<Meeting> {
  return new Promise((resolve, reject) => {
    database.ref(`/meeting/${id}`).once('value', (snapshot) => {
      resolve(parseMeeting({ ...snapshot.val(), id }));
    }).catch(err => reject(err));
  });
}

export function getGroup(id: string, database: admin.database.Database): Promise<Group> {
  return new Promise((resolve, reject) => {
    database.ref(`/group/${id}`).once('value', (snapshot) => {
      resolve(parseGroup({ ...snapshot.val(), id }));
    }).catch(err => reject(err));
  });
}


export function getComment(itemId: string, commentId: string, database: admin.database.Database): Promise<Comment> {
  return new Promise((resolve, reject) => {
    database.ref(`/comment/${itemId}/${commentId}`).once('value', (snapshot) => {
      resolve(parseComment({ ...snapshot.val(), commentId }));
    }).catch(err => reject(err));
  });
}

export function getFollowers(type: 'meeting' | 'group' | 'item', id: string, database: admin.database.Database): Promise<string[]> {

  return new Promise((resolve, reject) => {
    database.ref(`following/${type}/${id}`).once('value', (snapshot) => {

      let dict = snapshot.val();

      resolve(
        Object.keys((dict || {})).filter(id => dict[ id ] == true))

    }).catch(err => reject(err));
  });

}
