import * as functions from 'firebase-functions';
import { uniqBy } from 'lodash';
import { initializeAdminApp } from './_internal';
import { Observable } from 'rxjs/Observable';
import { Observer } from 'rxjs/Observer';
import * as moment from 'moment';
import 'rxjs/add/operator/take';
import 'rxjs/add/observable/from';
import 'rxjs/add/operator/reduce';
import 'rxjs/add/operator/map';
import 'rxjs/add/observable/combineLatest';
import 'rxjs/add/observable/forkJoin';
import 'rxjs/add/operator/mergeMap';

import {
  DenormalizedComment,
  DenormalizedVote,
  Group,
  Item,
  Meeting,
  MeetingStats,
  userDistrict
} from '@civ/city-council';
import { getCommentsOn, getGroup, getItem, getMeeting, getVotesOn } from './utils';

const NO_DISTRICT = 'NO_DISTRICT';
const cors = require('cors')({ origin: true });

const app = initializeAdminApp();
const db = app.database();
export const stats = functions.https.onRequest((req, res) => {
  let meetingId = req.query[ 'meeting' ];

  getOrComputeMeetingStats(meetingId).then(result => {
    cors(req, res, () => {
      res.send(200, JSON.stringify(result));
    })
    }).catch(err => {
    cors(req, res, () => {
      res.send(500, JSON.stringify(err));
    })
  });
});

export async function getOrComputeMeetingStats(meetingId: string): Promise<MeetingStats> {

  const cacheSnapshot = await db.ref(`/internal/meeting_stats/${meetingId}`).once('value');

  if (!cacheSnapshot.exists() || moment(cacheSnapshot.val().timestamp).isBefore(moment().subtract(1, 'hours'))) {
    const stats = await computeMeetingStats(meetingId);

    await db.ref(`internal/meeting_stats/${meetingId}`).set({
      timestamp: moment().toISOString(),
      payload: JSON.stringify(stats)
    });

    return stats;
  }

  return JSON.parse(cacheSnapshot.val().payload) as MeetingStats;

}


export async function computeMeetingStats(meetingId: string): Promise<MeetingStats> {

  const meeting = await getMeeting(meetingId, db);

  //do these all in parallel
  const [ group, items, votes, comments ]: [ Group, Item[], DenormalizedVote[][], DenormalizedComment[][] ] = await Promise.all([
    getGroup(meeting.groupId, db),
    Promise.all(meeting.agenda.map(itemId => getItem(itemId, db))),
    Promise.all(meeting.agenda.map(itemId => getVotesOn(itemId, db))),
    Promise.all(meeting.agenda.map(itemId => getCommentsOn(itemId, db))),
  ]);


  return prepareReport(meeting, group, items.map((item, idx) => ({
    ...item,
    votes: votes[ idx ],
    comments: comments[ idx ]
  })));
}


function prepareReport(meeting: Meeting,
                       group: Group,
                       items: (Item & { comments: DenormalizedComment[], votes: DenormalizedVote[] })[]): MeetingStats {

  let districtIds = group.districts.map(it => it.id).concat([ null ]); //null signifies undistricted users

  let allVotes: DenormalizedVote[] = items.reduce((result, item) => [ ...result, ...item.votes ], []),
    allComments: DenormalizedComment[] = items.reduce((result, item) => [ ...result, ...item.comments ], []);

  let uniqueParticipants = uniqBy(
    [ ...allComments, ...allVotes ].map(it => ({
      userId: it.owner,
      district: (it.userDistrict || { id: null } as any).id
    })),
    'userId'
  );

  let districtTotals = districtIds.reduce((result, districtId) => ({
    ...result,
    [districtId || NO_DISTRICT]: {
      votes: allVotes.filter(vote => userDistrict(vote.author, meeting.groupId) == districtId).length,
      comments: allComments.filter(comment => userDistrict(comment.author, meeting.groupId) == districtId).length,
      participants: uniqueParticipants.filter(it => it.district == districtId).length
    }
  }), {});


  let total = {
    votes: allVotes.length,
    comments: allComments.length,
    participants: uniqueParticipants.length,
    byDistrict: districtTotals
  };


  const sortByNetVotes = (x, y) => (y.votes.up - y.votes.down) - (x.votes.up - x.votes.down);


  let byItem = items.reduce((byItemResult, item) => {

    let itemTotal = {
      votes: {
        yes: item.votes.filter(vote => vote.value == 1).length,
        no: item.votes.filter(vote => vote.value == -1).length
      },
      comments: {
        pro: item.comments.filter(it => it.role == 'pro').length,
        con: item.comments.filter(it => it.role == 'con').length,
        neutral: item.comments.filter(it => it.role == 'neutral').length
      }
    };

    let byDistrict = districtIds.reduce((byDistrictResult, districtId) => {
      let districtVotes = item.votes.filter(vote => userDistrict(vote.author, meeting.groupId) == districtId);
      let districtComments = item.comments.filter(comment => userDistrict(comment.author, meeting.groupId) == districtId);

      return {
        ...byDistrictResult,
        [districtId || NO_DISTRICT]: { // use NO_DISTRICT as key for the null entry
          votes: {
            yes: districtVotes.filter(it => it.value == 1).length,
            no: districtVotes.filter(it => it.value == -1).length
          },
          comments: {
            pro: districtComments.filter(it => it.role == 'pro').length,
            con: districtComments.filter(it => it.role == 'con').length,
            neutral: districtComments.filter(it => it.role == 'neutral').length
          }
        }
      }

    }, {});

    return {
      ...byItemResult, [item.id]: {
        text: item.text,
        itemNumber: item.onAgendas[ meeting.id ].itemNumber,
        comments: item.comments,
        total: itemTotal,
        byDistrict
      }
    };

  }, {});


  return {
    total, byItem
  }
}

function getPriorMeetingActivity(meetingId: string): Observable<{ date: string, value: number }[]> {
  return Observable.create((observer: Observer<{ date: string, value: number }[]>) => {
    app.database().ref(`/meeting`).once('value', (snapshot) => {
      let meetingDict = snapshot.val();

      let targetMtg = meetingDict[ meetingId ],
        targetMtgDate = moment(targetMtg.startTime);

      let prevMeetings = Object.keys(meetingDict)
        .filter(id => moment(meetingDict[ id ].startTime).isBefore(targetMtgDate));

      Observable.forkJoin(...prevMeetings.map(id => getSimpleActivityTotalForMeeting(id).map(value => ({
          date: meetingDict[ id ].startTime,
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
