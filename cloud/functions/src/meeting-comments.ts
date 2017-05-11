import * as functions from 'firebase-functions';
import { initializeAdminApp } from './_internal';
import { Comment, parseComment } from '@civ/city-council';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/forkJoin';
import 'rxjs/add/observable/fromPromise';
import 'rxjs/add/observable/from';
import 'rxjs/add/operator/take';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/mergeMap';
import 'rxjs/add/operator/do';
import 'rxjs/add/operator/reduce';
const cors = require('cors')({ origin: true });

const app = initializeAdminApp();
const db = app.database();


export const meeting_comments = functions.https.onRequest((req, res) => {

  const meetingId = req.query[ 'meetingId' ];

  if (!!meetingId) {
    cors(req, res, () => {
      res.send(JSON.stringify({
        success: false,
        error: 'No meeting ID provided - please include a meetingId query param.'
      }));
    });
    return;
  }

  getMeetingComments(meetingId).subscribe(result => {
    console.log(result);
  });

});

export function getMeetingComments(meetingId: string): Observable<{ [id: string]: Comment[] }> {

  return Observable.fromPromise(
    new Promise((resolve, reject) => {
        db.ref(`/meeting/${meetingId}`).once('value', snapshot => {
          resolve(Object.keys(snapshot.val().agenda));
        }).catch(err => {
          reject(err);
        })
      }
    )
  ).flatMap((agendaItemIds: string[]) => Observable.forkJoin(...agendaItemIds.map(itemId =>
      Observable.fromPromise(new Promise((resolveItem, rejectItem) => {
        db.ref(`/comment/${itemId}`).once('value', snapshot => resolveItem(snapshot.val())).catch(err => rejectItem(err))
      })).take(1)
        .do(it => {
          console.log(it);
        })
        .map((dict: { [id: string]: any }) => {

          return Object.keys(dict || {}).map(commentId => parseComment({ ...dict[ commentId ], id: commentId }));
        })
        .map((comments: Comment[]) => ({ [itemId]: comments }))
    )
    ).reduce((result, entry) => ({ ...result, ...entry }), {})
  );

}
/*

 getMeetingComments('id_meeting_511');
 */
