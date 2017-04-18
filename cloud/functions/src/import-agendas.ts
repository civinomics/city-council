import * as functions from 'firebase-functions';

import * as admin from 'firebase-admin';
import { initializeAdminApp } from './_internal';
import * as moment from 'moment';
import Moment = moment.Moment;
import { testPayload } from './test-agenda-input';
import { Observable } from 'rxjs/Observable';
import { Observer } from 'rxjs';
import { RawItem, RawMeeting } from '@civ/city-council';
import 'rxjs/add/observable/forkJoin';
import 'rxjs/add/operator/take';
import 'rxjs/add/operator/do';

import 'rxjs/add/operator/reduce';
import 'rxjs/add/operator/map';

export type SocrataItem = {
  completeagenda: string,
  date: string,
  itemnumber: string,
  linktoclerkswebsite: string,
  meetingtype: string,
  postinglanguage: string,
  row_id: string;
  sirelinkwithdraftbackup: string,
  source_id: string;
};

export type PushableItem = {
  [P in keyof RawItem]: RawItem[P]
  } & {
  id: null
}


const instanceData = { //this will ultimately be persisted and loaded for the relavant group
  groupId: 'id_acc',
  adminId: 'id_doug',
  canEditIds: [ 'id_doug' ],
  restEndpoint: '',
  pullMeetingTypes: [ 'Austin City Council' ],
  meetingTypeDisplayNames: {
    'Austin City Council': 'Regular Meeting of the Austin City Council'
  },
  closeFeedback: 1440, //number of minutes before meeting to close feedback (1440 = 24 * 60)
  meetingLength: 120, //number of minutes after start that meeting ends
  timeZone: '+06:00'
};


/**
 *
 * @param payload
 * @return array of id's of new meetings created
 */
function processPayload(payload: SocrataItem[])/*: string[]*/ {

  const app = initializeAdminApp();
  const db = app.database();

  let uniqueDates = payload
    .filter(item => instanceData.pullMeetingTypes.indexOf(item.meetingtype) >= 0) // for now, only importing main ACC meetings
    .reduce((result, next) => result.indexOf(next.date) < 0 ? [ ...result, next.date ] : result, []);

  getExtantMeetingDates().subscribe(extantDates => {
    console.log(`extant dates: ${JSON.stringify(extantDates)}`);
    let newDates = uniqueDates.filter(date => extantDates.indexOf(date) < 0);
    console.log(`new dates: ${JSON.stringify(newDates)}`);

    if (newDates.length == 0) {
      return [];
    }

    newDates
     /* .map(date => moment(date))
      .sort((x, y) => x.isAfter(y) ? -1 : 1)
      .map(date => date.toString())*/
      .slice(0, 1) //DEV
      .forEach(date => {

        let itemsOnDate = payload
          .filter(item => instanceData.pullMeetingTypes.indexOf(item.meetingtype) >= 0)
          .filter(item => item.date == date);

        let meetingTypes = itemsOnDate.reduce((result, next) =>
          result.indexOf(next.meetingtype) < 0 ? [ ...result, next.meetingtype ] : result, []);

        meetingTypes
          .slice(0, 1) //DEV
          .forEach(type => {


            let startTime = moment(appendTimeZoneIfMissing(date, instanceData.timeZone));
            let endTime = moment(startTime).add(instanceData.closeFeedback, 'minutes');
            let feedbackDeadline = moment(startTime).subtract(instanceData.closeFeedback, 'minutes');
            let title = instanceData.meetingTypeDisplayNames[ type ];
            let groupId = instanceData.groupId;
            let owner = instanceData.adminId;
            let editors = instanceData.canEditIds;

            let posted = moment().toISOString();

            //create meeting object
            pushMeeting({
              title,
              groupId,
              owner,
              editors,
              startTime: startTime.toISOString(),
              endTime: endTime.toISOString(),
              feedbackDeadline: feedbackDeadline.toISOString(),
              published: false,
              agenda: [],
            }).subscribe(meetingId => {

              console.log(`pushed meeting ${meetingId}`);
              addToGroupMeetings(groupId, meetingId);


              //create objects for each item
              let meetingItems = itemsOnDate.filter(item => item.meetingtype == type);

              Observable.forkJoin(...meetingItems
                .map(item => parseItem(item))
                .map(item => pushItem(item).do(it => console.log(it)))
              ).take(1).subscribe((itemIds: string[]) => {
                console.log(`item ids: ${JSON.stringify(itemIds)}`);
                updateMeetingAgenda(meetingId, itemIds).subscribe(result => {
                  console.log(`wee! done with mtg ${meetingId}`);
                });

              });


              function parseItem(it: SocrataItem): RawItem {
                return {
                  text: it.postinglanguage,
                  sireLink: it.sirelinkwithdraftbackup,
                  posted,
                  owner,
                  editors,
                  onAgendas: {
                    [meetingId]: {
                      groupId,
                      meetingId,
                      itemNumber: parseInt(it.itemnumber),
                      feedbackDeadline: feedbackDeadline.toISOString(),
                      closedSession: false,
                    }
                  }

                }
              }


            });


          });


      });
  });

  function addToGroupMeetings(groupId: string, meetingId: string){
    db.ref(`/group/${groupId}/meetings`).update({[meetingId]: true}).then(val => {
      console.log(`successfully added mtgId ${meetingId} to group ${groupId}`)
    }).catch(err => {
      throw new Error(err);
    })
  }


  function updateMeetingAgenda(mtgId: string, agendaIds: string[]): Observable<void> {
    return Observable.create((observer: Observer<string>) => {

      db.ref(`/meeting/${mtgId}`).update({ agendaIds }).then(val => {
        observer.next(null);
        observer.complete();
      }).catch(err => {
        observer.error(err);
      })
    });
  }

  function pushMeeting(it: RawMeeting): Observable<string> {
    return push('/meeting', it);
  }

  function pushItem(it: RawItem): Observable<string> {
    return push('/item', it);
  }

  function push(path: string, it: any): Observable<string> {
    return Observable.create((observer: Observer<string>) => {
      db.ref(path).push(it).then(val => {
        observer.next(val.key);
        observer.complete();
      }).catch(err => {
        observer.error(err);
      })
    });
  }


  function getExtantMeetingDates(): Observable<string[]> {
    return Observable.create((observer: Observer<string[]>) => {
      db.ref(`/meeting`).once('value', (snapshot) => {
        const meetings = snapshot.val();
        let dates = Object.keys(meetings).map(id => meetings[ id ].startTime);
        observer.next(dates);
        observer.complete();
      }, err => {
        observer.error(err);
      })
    });
  }


}


function appendTimeZoneIfMissing(date: string, offset: string): string {
  if (date.indexOf('+') < 0) { //TODO this will only work for western world
    return `${date}${offset}`;
  }
  return date;
}


/*** TEST */



processPayload(testPayload);


/* ****/
