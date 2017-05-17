import { initializeAdminApp } from './_internal';
import { Comment, parseComment, parseUser } from '@civ/city-council';
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

export function getMeetingComments(meetingId: string): Observable<{ [id: string]: Comment[] }> {
  return Observable.fromPromise(
    new Promise((resolve, reject) => {
        db.ref(`/meeting/${meetingId}`).once('value', snapshot => {
          if (!snapshot.exists()) {
            reject(`Meeting ${meetingId} does not exist`)
          }
          resolve(Object.keys(snapshot.val().agenda));
        }).catch(err => {
          console.info(`Error getting comments for meeting id ${meetingId}: ${JSON.stringify(err)}`);
          reject(err);
        })
      }
    )
  ).flatMap((agendaItemIds: string[]) => Observable.from(agendaItemIds).flatMap(itemId =>
      Observable.fromPromise(new Promise((resolve, reject) => {
        db.ref(`/comment/${itemId}`)
          .once('value', snapshot => {
            let dict = snapshot.val();
            if (dict == null) {
              resolve([]);
              return;
            }
            const comments = [];
            snapshot.forEach(commentChild => {
              comments.push(parseComment({ ...commentChild.val(), id: commentChild.key }));
              return false;
            });

            Promise.all(comments.map(comment => new Promise((resolveComm, rejectComm) => {
              let author, votes;
              db.ref(`/user/${comment.owner}`).once('value', userSnapshot => {
                author = parseUser({ ...userSnapshot.val(), id: userSnapshot.key });

                db.ref(`/vote/${comment.id}`).once('value', votesSnapshot => {
                  if (votesSnapshot.val() == null) {
                    votes = { up: 0, down: 0 };
                  } else {
                    let ups = 0, downs = 0;
                    votesSnapshot.forEach(voteChild => {
                      let value = (voteChild.val().value);
                      if (value == -1) {
                        downs++;
                      } else if (value == 1) {
                        ups++;
                      } else {
                        console.warn(`unexpected value ${value} for vote ${votesSnapshot.key}`);
                      }
                      return false;
                    });
                    votes = { up: ups, down: downs };
                  }
                  resolveComm({ ...comment, author, votes });
                }).catch(err => rejectComm(`error getting comment votes: ${JSON.stringify(err)}`))

              }).catch(err => rejectComm(`error getting comment author: ${JSON.stringify(err)}`))

            }))).then(comments => {
              resolve(comments)
            });
          }).catch(err => reject(err))
      })).take(1)
        .map((comments: Comment[]) => ({ [itemId]: comments }))
    )
  ).reduce((result, entry) => {
    return { ...result, ...entry };
  }, {});


}
/*

 getMeetingComments('id_meeting_511').subscribe(res => {
 fs.writeFileSync('comments.json', JSON.stringify(res));
 console.log('done');
 });
 */
