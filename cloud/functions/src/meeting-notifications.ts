import * as functions from 'firebase-functions';
import { Event } from 'firebase-functions';
import * as admin from 'firebase-admin';
import { DeltaSnapshot } from 'firebase-functions/lib/providers/database';
import { getEmailTransport, initializeAdminApp, initializeMockAdminApp } from './_internal';
import { Group, Meeting, parseMeeting } from '@civ/city-council';
import { getFollowers, getGroup, getMeeting, getUserEmail } from './notification-utils';
import 'rxjs/add/observable/fromPromise';
import 'rxjs/add/observable/forkJoin';
import 'rxjs/add/observable/from';
import 'rxjs/add/operator/mergeMap';
import 'rxjs/add/operator/take';
import 'rxjs/add/operator/map';
import { Observable } from 'rxjs/Observable';
import { SendMailOptions } from 'nodemailer';

let app: admin.app.App;

if (process.argv.indexOf('dev') >= 0) {
  app = initializeMockAdminApp();
} else {
  app = initializeAdminApp();
}

let db: admin.database.Database = app.database();

export const closedMeetingNotifications = functions.pubsub.topic('hourly-tick').onPublish((event) => {
  console.log('got hourly tick, checking for newly closed meetings');
});

export const newMeetingNotifications = functions.database.ref(`/meeting`).onWrite((event: Event<DeltaSnapshot>) => {
  console.info(`handling meeting write event`);
  handleMeetingWriteEvent(event.data).then(result => {
    console.info(`successfully handled meeting write event.`)
  }).catch(err => {
    console.error(`error handling meeting write event: ${JSON.stringify(err)}`)
  })
});

function handleMeetingWriteEvent(delta: DeltaSnapshot) {
  return new Promise((resolve, reject) => {
    let newMeetings = findNewlyPublishedMeetings(delta);
    if (newMeetings.length == 0) {
      reject('No new meetings found (unexpected since I\'m called on writes to /meeting)');
      return;
    }
    newMeetings.forEach(meeting => {
      //we only ever expect there to be one, as this is called on each write to /meeting

      Observable.fromPromise(getFollowers('group', meeting.groupId, db))
        .flatMap(followerIds => Observable.forkJoin(
          ...followerIds.map(id => Observable.fromPromise(getUserEmail(id, db)).take(1))
          )
        ).subscribe(emails => {
        Promise.all([ getMeeting(meeting.id, db), getGroup(meeting.groupId, db) ])
          .then(([ meeting, group ]) => {
            sendNewMeetingNotifications(emails, meeting, group).then(result => {
              resolve(result);
            }).catch(err => reject(err));
          })
      });


    })

  });
}

function sendNewMeetingNotifications(emails: string[], meeting: Meeting, group: Group) {
  const transport = getEmailTransport();

  return Promise.all(emails.map(email =>
    transport.sendMail(createNewMeetingtNotificationEmail(email, meeting, group))
  ));
}

function createNewMeetingtNotificationEmail(to: string, meeting: Meeting, group: Group,): SendMailOptions {

  let subject = `New meeting agenda published for ${group.name}`;

  let groupLink = `https://civinomics.com/group/${group}`;
  let meetingLink = `https://civinomics.com/group/${group.id}/meeting/${meeting.id}/`;
  return {
    to,
    subject,
    html: `<p>A new meeting agenda for <a href="${groupLink}">${group.name}</a> has been published on Civinomics. Check it out here:</p>
           <p><a href="${meetingLink}">${meeting.title}</a></p>`
  }

}


function findNewlyPublishedMeetings(delta: DeltaSnapshot): Meeting[] {
  const newMeetings = [];
  delta.forEach(meeting => {
    if (meeting.val().published == true) {
      if (meeting.previous.exists() && meeting.previous.val().published == false) {
        newMeetings.push(parseMeeting({ ...meeting.val(), id: meeting.key }));

      }
    }
    return false; //keep iterating
  })

  return newMeetings;

}
