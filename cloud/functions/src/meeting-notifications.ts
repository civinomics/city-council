import * as functions from 'firebase-functions';
import { Event } from 'firebase-functions';
import * as admin from 'firebase-admin';
import { DeltaSnapshot } from 'firebase-functions/lib/providers/database';
import { getEmailTransport, initializeAdminApp } from './_internal';
import { Group, Meeting, parseMeeting } from '@civ/city-council';
import { getFollowers, getFollowersWithEmailAddresses, getGroup, getMeeting, getUserEmail } from './utils';
import 'rxjs/add/observable/fromPromise';
import 'rxjs/add/observable/forkJoin';
import 'rxjs/add/observable/from';
import 'rxjs/add/operator/mergeMap';
import 'rxjs/add/operator/take';
import 'rxjs/add/operator/map';
import { Observable } from 'rxjs/Observable';
import { SendMailOptions } from 'nodemailer';
import * as moment from 'moment';
import { createMeetingReport } from './generate-report';
import Moment = moment.Moment;

let app: admin.app.App;

app = initializeAdminApp();

let db: admin.database.Database = app.database();

export const closedMeetingNotifications = functions.pubsub.topic('hourly-tick').onPublish((event) => {
  console.info(`Checking for newly closed meetings`);
  doClosedMeetingRoutine().then(result => {
    console.info(`Closed meeting routine completed successfully.`)
  }).catch(err => {
    console.error(`Error in closed meeting routine: ${err.message}`);
  })
});


export const newMeetingNotifications = functions.database.ref(`/meeting`).onWrite((event: Event<DeltaSnapshot>) => {
  console.info(`handling meeting write event`);
  handleMeetingWriteEvent(event.data).then(result => {
    console.info(`successfully handled meeting write event.`)
  }).catch(err => {
    console.error(`error handling meeting write event: ${JSON.stringify(err)}`)
  })
});

function doClosedMeetingRoutine() {
  return new Promise((resolve, reject) => {
    findNewlyClosedMeetings().then(meetings => {
      console.info(`found ${meetings.length} newly closed meetings: ${JSON.stringify(meetings.map(it => it.id))}`);
      meetings.forEach(meeting => {
        sendNotificationsForClosedMeeting(meeting).then(result => {
          console.info(result);
          markMeetingNotificationsSent(meeting.id).then(() => {
            console.info(`Marked notifications for meeting ${meeting.id} as sent, returning successfully.`);
          }).catch(err => {
            console.error(`Error marking notifications as sent: ${JSON.stringify(err)}`);
            reject(err);
          })
        }).catch(err => {
          console.error(`Error sending emails: ${JSON.stringify(err)}`);
          reject(err);
        })
      });
      resolve('success');
    });
  })
}

async function sendNotificationsForClosedMeeting(meeting: Meeting) {

  const followers = await getFollowersWithEmailAddresses('group', meeting.groupId, db);
  console.info(`notifying: ${JSON.stringify(followers)}`);
  const reportUrl = await createMeetingReport(meeting.id);
  console.info(`got report`);
  const transport = getEmailTransport();

  return await Promise.all(Object.keys(followers).map(userId => new Promise((resolve, reject) => {
    transport.sendMail(createClosedMeetingNotification(followers[ userId ], meeting, reportUrl as string)).then(res => {
      console.info(`successfully notified ${followers[ userId ]}`);
      resolve(res);
    }, err => {
      console.error(`error notifying ${followers[ userId ]}: ${JSON.stringify(err)}`);
      reject(err);
    })
  })));
}

function markMeetingNotificationsSent(id: string): Promise<any> {
  return db.ref(`/meeting/${id}`).update({ notificationsSent: true });
};

function unmarkMeetingNotificationsSent(id: string): Promise<any> {
  return db.ref(`/meeting/${id}`).update({ notificationsSent: false });
};


function findNewlyClosedMeetings(): Promise<Meeting[]> {
  return new Promise((resolve, reject) => {
    db.ref(`/meeting`).once('value', snapshot => {
      const newlyClosed = [];
      const now = moment();
      snapshot.forEach(child => {
        let meeting = child.val();
        let deadline = moment(meeting.feedbackDeadline);
        if (deadline.isBefore(now) && !meeting.notificationsSent) {
          newlyClosed.push(parseMeeting({ ...meeting, id: child.key }));
        }
        return false;
      });
      resolve(newlyClosed);
    }).catch(err => reject(err));
  });
}

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

function checkIfNotificationsNulled(delta: DeltaSnapshot) {

}

function sendNewMeetingNotifications(emails: string[], meeting: Meeting, group: Group) {
  const transport = getEmailTransport();

  return Promise.all(emails.map(email =>
    transport.sendMail(createNewMeetingtNotification(email, meeting, group))
  ));
}

function createNewMeetingtNotification(to: string, meeting: Meeting, group: Group): SendMailOptions {

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

function createClosedMeetingNotification(to: string, meeting: Meeting, reportUrl: string) {
  let subject = `Final feedback report available for ${meeting.title}`;

  let meetingStatsLink = `https://civinomics.com/group/${meeting.groupId}/meeting/${meeting.id}/stats`;
  return {
    to,
    subject,
    html: `<p>The feedback period for ${meeting.title} has ended! </p>
           <p>The final feedback report is available for download <a href="${reportUrl}">here</a>, or can be viewed via our web interface <a href="${meetingStatsLink}">here</a>.</p>`
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
  });

  return newMeetings;

}
