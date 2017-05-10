import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

import * as firebase from 'firebase';
import { firebaseAppConfig, serviceAppCreds } from './firebase-creds';
import { Observable } from 'rxjs/Observable';
import { Observer } from 'rxjs/Observer';
import { createTransport, Transporter } from 'nodemailer';
import * as sinon from 'sinon';

const creds = require('./admin-creds');

const gcs = require('@google-cloud/storage')(
  { projectId: 'civ-cc', keyFileName: './admin-creds.json' }
);

const adminCreds = require('./admin-creds.json');
const SOCRATA_ENV_VAR_KEY = 'civcc.socrata-key';

export function initializeMockAdminApp(): admin.app.App {

  if (admin.apps.length > 0) {
    return admin.apps[ 0 ];
  }

  let configStub = sinon.stub(functions, 'config').returns({
    firebase: {
      databaseURL: 'https://civ-cc.firebaseio.com',
      storageBucket: 'civ-cc.appspot.com',
    }
    // You can stub any other config values needed by your functions here, for example:
    // foo: 'bar'
  });

  return admin.initializeApp({
    credential: admin.credential.cert(adminCreds),
    databaseURL: 'https://civ-cc.firebaseio.com',
    storageBucket: 'civ-cc.appspot.com',
  })
}

export function initializeAdminApp(): admin.app.App {
  if (admin.apps.length > 0) {
    return admin.apps[0];
  }
  return admin.initializeApp({
    credential: admin.credential.cert(adminCreds),
    databaseURL: 'https://civ-cc.firebaseio.com',
    storageBucket: 'civ-cc.appspot.com',
  })
}

export function initializeFirebaseApp(): Observable<firebase.app.App> {
  if (firebase.apps.length > 0) {
    return Observable.of(firebase.apps[0]).take(1);
  }
  return Observable.create((observer: Observer<firebase.app.App>) => {
    const app = firebase.initializeApp(firebaseAppConfig);
    app.auth().signInWithEmailAndPassword(serviceAppCreds.email, serviceAppCreds.password).then(() => {
      observer.next(app);
      observer.complete();
    }).catch(err => {
      observer.error(err);
    });
  })
}

export function getStorageBucket() {
  return gcs.bucket('civ-cc.appspot.com');
}
export interface EmailSender {
  send(message: { to: string, message: string; subject?: string });
}

export function getEmailTransport(): Transporter {
  return createTransport({
    service: 'Gmail',
    auth: {
      user: functions.config().notifications.address,
      pass: functions.config().notifications.pw
    }
  });
}
