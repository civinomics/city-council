import * as functions from 'firebase-functions';
import {uniqBy} from 'lodash';
import {initializeApp} from './_internal';
import {Observable} from 'rxjs/Observable';
import {Observer} from 'rxjs/Observer';
import {Meeting, parseMeeting} from './models/meeting';
import {Vote} from './models/vote';
import {Group, parseGroup} from './models/group';
import {Comment} from './models/comment';
import {merge} from 'rxjs/observable/merge';
import 'rxjs/add/operator/take';
import 'rxjs/add/operator/reduce';
import 'rxjs/add/operator/map';
import 'rxjs/add/observable/combineLatest';
import 'rxjs/add/observable/forkJoin';

import 'rxjs/add/operator/mergeMap';

const app = initializeApp();

export const stats = functions.https.onRequest((req, res) => {
  let meetingId = req.query['meeting'];

  computeMeetingStats(meetingId).subscribe(result => {
    res.send(200, JSON.stringify(result))
  });
});

export function computeMeetingStats(meetingId: string)/*: Observable<MeetingStatsAdt>*/ {

  return getMeeting(meetingId)
    .mergeMap(meeting => {
      console.log(meeting);

      let group = getGroup(meeting.groupId);

      let itemVotes$ = merge(...meeting.agendaIds.map(id => getVotesForItem(id).take(1).map(votes => ({
        itemId: id,
        votes
      }))))
        .reduce((result, next: { itemId: string, votes: Vote[] }) => ({
          ...result,
          [next.itemId]: next.votes
        }), {});


      let itemComments$ = merge(...meeting.agendaIds.map(id => getCommentsForItem(id).take(1).map(comments => ({
        itemId: id,
        comments
      }))))
        .reduce((result, next: { itemId: string, comments: Comment[] }) => ({
          ...result,
          [next.itemId]: next.comments
        }), {});

      return Observable.combineLatest(group.take(1), itemVotes$.take(1), itemComments$.take(1))
        .map(([group, votes, comments]) => ({
          group,
          meeting,
          votes,
          comments
        }))

    }).map((data: {
        meeting: Meeting,
        group: Group,
        votes: { [id: string]: Vote[] },
        comments: { [id: string]: (Comment & { votes: { up: number; down: number; } })[] }
      }) =>
        prepareReport(data.meeting, data.group, data.votes, data.comments)
    );
}

function prepareReport(meeting: Meeting,
                       group: Group,
                       votes: { [id: string]: Vote[] },
                       comments: { [id: string]: (Comment & { votes: { up: number; down: number; } })[] }) {

  let districtIds = group.districts.map(it => it.id);

  let allVotes = Object.keys(votes).reduce((result, itemId) => [...result, ...votes[itemId]], []),
    allComments = Object.keys(comments).reduce((result, itemId) => [...result, ...comments[itemId]], []);

  let uniqueParticipants = uniqBy([...allComments, ...allVotes].map(it =>
    ({userId: it.owner, district: it.userDistrict})), 'userId');

  let districtTotals = districtIds.reduce((result, districtId) => ({
    ...result,
    [districtId]: {
      votes: allVotes.filter(vote => vote.userDistrict == districtId),
      comments: allComments.filter(comment => comment.userDistrict == districtId),
      participants: uniqueParticipants.filter(it => it.district == districtId)
    }
  }), {
    'NO_DISTRICT': {
      votes: allVotes.filter(vote => vote.userDistrict == null),
      comments: allComments.filter(comment => comment.userDistrict == null),
      participants: uniqueParticipants.filter(it => it.district == null)
    }
  });


  let total = {
    votes: allVotes.length,
    comments: allComments.length,
    participants: uniqueParticipants.length,
    byDistrict: districtTotals
  };

  let byItem = meeting.agendaIds.reduce((itemsResult, itemId) => {
    let itemVotes = votes[itemId],
      itemComments = comments[itemId];

    let total = {
      votes: {
        yes: itemVotes.filter(vote => vote.value == 1),
        no: itemVotes.filter(vote => vote.value == -1)
      },
      comments: {
        pro: itemComments.filter(it => it.role == 'pro'),
        con: itemComments.filter(it => it.role == 'con'),
        neutral: itemComments.filter(it => it.role == 'neutral')
      }
    };

    let byDistrict = districtIds.reduce((districtResults, districtId) => {
      let itemVotesInDistrict = itemVotes.filter(vote => vote.userDistrict == districtId);
      let itemCommentsInDistrict = itemComments.filter(comment => comment.userDistrict == districtId);

      return {
        ...districtResults,
        [districtId]: {
          votes: {
            yes: itemVotesInDistrict.filter(it => it.value == 1).length,
            no: itemVotesInDistrict.filter(it => it.value == -1).length
          },
          comments: {
            pro: itemCommentsInDistrict.filter(it => it.role == 'pro'),
            con: itemCommentsInDistrict.filter(it => it.role == 'con'),
            neutral: itemCommentsInDistrict.filter(it => it.role == 'neutral')
          }
        }
      }
    }, {});

    return {
      ...itemsResult,
      [itemId]: {total, byDistrict}
    }


  }, {});

  return {
    total, byItem
  }


}

function getVotesForItem(itemId: string): Observable<Vote[]> {
  return Observable.create((observer: Observer<Vote[]>) => {
    app.database().ref(`/vote/${itemId}`).once('value', (snapshot) => {
      let val = snapshot.val();
      if (val == null) {
        observer.next([]);
      } else {
        observer.next(Object.keys(val).map(id => ({...val[id], id})));
      }
      observer.complete();
    }, err => {
      observer.error(err);
    })
  })
}

function getCommentsForItem(itemId: string): Observable<(Comment & { votes: { up: number; down: number; } })[]> {
  return Observable.create((observer: Observer<Comment[]>) => {
    app.database().ref(`/comment/${itemId}`).once('value', (snapshot) => {
      let val = snapshot.val();
      if (val == null) {
        observer.next([]);
        observer.complete();
      } else {
        let commentIds = Object.keys(val);

        Observable.forkJoin(...commentIds.map(id =>
            getCommentVoteStats(id).take(1).map(votes => ({...val[id], votes}))
          )
        ).subscribe(result => {
          observer.next(result);
          observer.complete();
        }, err => {
          observer.error(err);
        });

      }
    }, err => {
      observer.error(err);
    })
  })
}

function getCommentVoteStats(commentId: string): Observable<{ up: number, down: number }> {
  return Observable.create((observer: Observer<{ up: number, down: number }>) => {
      app.database().ref(`/vote/${commentId}`).once('value', (snapshot) => {
          let votes = snapshot.val();
          if (votes == null) {
            observer.next({up: 0, down: 0});
          } else {
            votes = Object.keys(votes).map(id => votes[id]);
            observer.next({
              up: votes.filter(vote => vote.value == 1).length,
              down: votes.filter(vote => vote.value == -1).length
            });
          }
          observer.complete();
        }, err => {
          observer.error(err || null);
        }
      )
    }
  )
}

function getMeeting(meetingId): Observable<Meeting> {
  return Observable.create((observer: Observer<Meeting>) => {
    app.database().ref(`/meeting/${meetingId}`).once('value', (snapshot) => {
      observer.next(parseMeeting(snapshot.val()));
      observer.complete();
    }, err => {
      observer.error(err);
    })
  })

}

function getGroup(groupId): Observable<Group> {
  return Observable.create((observer: Observer<Group>) => {
    app.database().ref(`/group/${groupId}`).once('value', (snapshot) => {
      observer.next(parseGroup(snapshot.val()));
      observer.complete();
    }, err => {
      observer.error(err);
    })
  })

}


computeMeetingStats('id_meeting_511').subscribe(it => {
  console.log(it);
})
