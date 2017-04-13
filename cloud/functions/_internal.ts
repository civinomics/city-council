import * as admin from 'firebase-admin';

const creds = require('./creds.json');


export function initializeApp(): admin.app.App {
  if (admin.apps.length > 0) {
    return admin.apps[0];
  }
  return admin.initializeApp({
    credential: admin.credential.cert(creds),
    databaseURL: 'https://civ-cc.firebaseio.com',
    storageBucket: 'civ-cc.appspot.com',
  })
}


