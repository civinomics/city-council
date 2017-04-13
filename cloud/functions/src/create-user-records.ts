import * as functions from 'firebase-functions';

import * as admin from 'firebase-admin';
import {initializeAdminApp} from './_internal';
import UserRecord = admin.auth.UserRecord;

const app = initializeAdminApp();
const database = admin.database();


export const createUserRecords = functions.auth.user().onCreate(event => {
  const user: UserRecord = event.data;

  console.info(`Creating new records for user ${user.displayName} (id: ${user.uid})`);

  if (!!user.displayName) {

    const firstName = user.displayName.split(' ')[0];
    const lastName = user.displayName.split(' ')[1];

    database.ref(`/user/${user.uid}`).set({
      firstName, lastName,
      icon: user.photoURL,
      joined: user.metadata.createdAt,
      lastOn: user.metadata.lastSignedInAt
    }).then(res => {
      console.info(`created public record successfully for ${user.uid}`);
    }, err => {
      console.error(`error creating public record for ${user.uid}: `);
      console.error(err.toString());
    });

    database.ref(`/user_private/${user.uid}`).set({
      email: user.email,
      isVerified: true
    }).then(res => {
      console.info(`created private record successfully for ${user.uid}`);
    }, err => {
      console.error(`error creating private record for ${user.uid}: `);
      console.error(err.toString());
    });

  }

});
