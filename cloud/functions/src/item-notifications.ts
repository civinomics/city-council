import * as functions from 'firebase-functions';
import { Event } from 'firebase-functions';
import * as admin from 'firebase-admin';
import { getEmailTransport, initializeAdminApp, initializeMockAdminApp } from './_internal';
import { Comment, Item } from '@civ/city-council';
import { Observable } from 'rxjs/Observable';

import 'rxjs/add/observable/forkJoin';
import 'rxjs/add/observable/fromPromise';
import 'rxjs/add/observable/from';
import 'rxjs/add/operator/take';
import 'rxjs/add/operator/map';

import 'rxjs/add/operator/reduce';
import { DeltaSnapshot } from 'firebase-functions/lib/providers/database';
import { getComment, getFollowers, getItem, getUserEmail } from './utils';

let args = process.argv;

let app: admin.app.App;

if (args.indexOf('dev') >= 0) {
  app = initializeMockAdminApp();
} else {
  app = initializeAdminApp();
}

const database: admin.database.Database = app.database();


export const newCommentNotifications = functions.database.ref(`/comment`).onWrite((event: Event<DeltaSnapshot>) => {
  handleNewComment(event);
});

function handleNewComment(event: Event<DeltaSnapshot>) {
  let delta = event.data;
  let newComments = {};
  delta.forEach((itemEntry: DeltaSnapshot) => {
    //each child here is a list of comments for a different item.
    if (itemEntry.previous.numChildren() !== itemEntry.numChildren()) {
      newComments[ itemEntry.key ] = [];

      itemEntry.forEach(commentEntry => {
        if (!commentEntry.previous.exists()) {
          newComments[ itemEntry.key ].push(commentEntry.key);
        }
        return false; //keep iterating
      });
    }
    return false; //keep iterating
  });

  if (Object.keys(newComments).length == 0) {
    return;
  }

  else {
    //there should never be more than one as this function is called on every write
    Object.keys(newComments).forEach(itemId =>
      newComments[ itemId ].forEach(commentId =>
        notifyItemFollowersOfNewComment(itemId, commentId)
      )
    );
  }

}


function notifyItemFollowersOfNewComment(itemId: string, commentId: string): Promise<any> {

  return new Promise((resolve, reject) => {
    Observable.forkJoin(
      Observable.fromPromise(getComment(itemId, commentId, database)).take(1),
      Observable.fromPromise(getItem(itemId, database)).take(1),
      Observable.fromPromise(getFollowers('item', itemId, database)).take(1)
    ).subscribe(([ comment, item, followers ]) => {
      console.log(`got comment, item, ${followers.length} followers`);
      Observable.forkJoin(
        ...followers.map(userId => Observable.fromPromise(getUserEmail(userId, database)).take(1)
          .map(email => createCommentNotificationEmail(email, comment, item))
        )
      ).subscribe(emails => {
        console.log(`sending ${emails.length} emails`);
        const transport = getEmailTransport();

        Promise.all(emails.map(email => new Promise((resolve, reject) => {
          transport.sendMail(email, (err, info) => {
            if (err) {
              reject(err);
            } else {
              console.log(info);
              resolve();
            }
          });
        }))).then(() => resolve()).catch(err => reject(err));
      }, err => reject(err))

    }, err => reject(err));
  });

}

function createCommentNotificationEmail(to: string, comment: Comment, item: Item) {

  let subject = item.text.length >= 50 ? item.text.substring(0, 50).concat('...') : item.text;
  let meeting = item.onAgendas[ Object.keys(item.onAgendas)[ 0 ] ].meetingId;
  let group = item.onAgendas[ Object.keys(item.onAgendas)[ 0 ] ].groupId;

  let link = `https://civinomics.com/group/${group}/meeting/${meeting}/item/${item.id}`;
  return {
    to,
    subject: `New Comment on ${subject}`,
    html: `<p>A new comment has been posted on <a href="${link}">an item you followed on Civinomics</a>: ${item.text}: </p>
           <p>${comment.text}</p>
           <p>Click <a href="${link}">here</a> to see the item</p>`
  }

}
