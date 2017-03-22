import * as admin from 'firebase-admin';

const creds = require('./creds.json');

export function initializeApp() {
  return admin.initializeApp({
    credential: admin.credential.cert(creds),
    databaseURL: 'https://civ-cc.firebaseio.com',
    storageBucket: 'civ-cc.appspot.com',
  })
}

