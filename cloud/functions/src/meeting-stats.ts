import * as functions from 'firebase-functions';
import {uniqBy} from 'lodash';
import {initializeAdminApp} from './_internal';
import {Observable} from 'rxjs/Observable';
import {Observer} from 'rxjs/Observer';
import {merge} from 'rxjs/observable/merge';
import * as moment from 'moment';
import 'rxjs/add/operator/take';
import 'rxjs/add/operator/reduce';
import 'rxjs/add/operator/map';
import 'rxjs/add/observable/combineLatest';
import 'rxjs/add/observable/forkJoin';
import 'rxjs/add/operator/mergeMap';
import * as fs from 'fs';

import {Comment, Group, Meeting, MeetingStats, parseGroup, parseMeeting, Vote} from '@civ/city-council';


const cors = require('cors')({origin: true});

const app = initializeAdminApp();

export const stats = functions.https.onRequest((req, res) => {
  let meetingId = req.query['meeting'];

  computeMeetingStats(meetingId).subscribe(result => {
    cors(req, res, () => {
      res.send(200, JSON.stringify(result));
    })
  });
});

export function computeMeetingStats(meetingId: string): Observable<MeetingStats> {

  return getMeeting(meetingId)
    .mergeMap(meeting => {
      console.log(meeting);

      let group = getGroup(meeting.groupId);

      let priorMtgActivity = getPriorMeetingActivity(meetingId);

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

      return Observable.combineLatest(group.take(1), priorMtgActivity.take(1), itemVotes$.take(1), itemComments$.take(1))
        .map(([group, priors, votes, comments]) => ({
          group,
          priors,
          meeting,
          votes,
          comments
        }))

    }).map((data: {
        meeting: Meeting,
      priors: { date: string, value: number }[],
        group: Group,
        votes: { [id: string]: Vote[] },
        comments: { [id: string]: (Comment & { votes: { up: number; down: number; } })[] }
      }) =>
      prepareReport(data.meeting, data.group, data.priors, data.votes, data.comments)
    );
}

function prepareReport(meeting: Meeting,
                       group: Group,
                       priors: { date: string, value: number }[],
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
      votes: allVotes.filter(vote => vote.userDistrict == districtId).length,
      comments: allComments.filter(comment => comment.userDistrict == districtId).length,
      participants: uniqueParticipants.filter(it => it.district == districtId).length
    }
  }), {
    'NO_DISTRICT': {
      votes: allVotes.filter(vote => vote.userDistrict == null).length,
      comments: allComments.filter(comment => comment.userDistrict == null).length,
      participants: uniqueParticipants.filter(it => it.district == null).length
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
        yes: itemVotes.filter(vote => vote.value == 1).length,
        no: itemVotes.filter(vote => vote.value == -1).length
      },
      comments: {
        pro: itemComments.filter(it => it.role == 'pro').length,
        con: itemComments.filter(it => it.role == 'con').length,
        neutral: itemComments.filter(it => it.role == 'neutral').length
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
            pro: itemCommentsInDistrict.filter(it => it.role == 'pro').length,
            con: itemCommentsInDistrict.filter(it => it.role == 'con').length,
            neutral: itemCommentsInDistrict.filter(it => it.role == 'neutral').length
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
    priors, total, byItem
  }
}

function getPriorMeetingActivity(meetingId: string): Observable<{ date: string, value: number }[]> {
  return Observable.create((observer: Observer<{ date: string, value: number }[]>) => {
    app.database().ref(`/meeting`).once('value', (snapshot) => {
      let meetingDict = snapshot.val();

      let targetMtg = meetingDict[meetingId],
        targetMtgDate = moment(targetMtg.startTime);

      let prevMeetings = Object.keys(meetingDict)
        .filter(id => moment(meetingDict[id].startTime).isBefore(targetMtgDate));

      Observable.forkJoin(...prevMeetings.map(id => getSimpleActivityTotalForMeeting(id).map(value => ({
          date: meetingDict[id].startTime,
          value
        })
      ))).subscribe(result => {
        observer.next(result);
        observer.complete();
      }, err => {
        observer.error(err);
      });


    }, err => {
      observer.error(err);
    })
  })
}

function getSimpleActivityTotalForMeeting(mtgId: string): Observable<number> {
  return Observable.create((observer: Observer<number>) => {
    let totVotes = -1, totComments = -1;

    app.database().ref(`/vote/${mtgId}`).once('value', (snapshot) => {
      let val = snapshot.val();
      if (val == null) {
        totVotes = 0;
      } else {
        totVotes = Object.keys(val).length;
      }
      ;
      tryComplete();
    }, err => {
      observer.error(err);
    });


    app.database().ref(`/comment/${mtgId}`).once('value', (snapshot) => {
      let val = snapshot.val();
      if (val == null) {
        totComments = 0;
      } else {
        totComments = Object.keys(val).length;
      }
      ;
      tryComplete();
    }, err => {
      observer.error(err);
    });


    function tryComplete() {
      if (totVotes >= 0 && totComments >= 0) {
        observer.next(totVotes + totComments);
        observer.complete();
      }
    }

  })
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
  fs.writeFileSync('dev-stats.json', JSON.stringify(it));
  console.log('done');
});
