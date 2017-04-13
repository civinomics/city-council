import * as admin from 'firebase-admin';
import * as firebase from 'firebase';
import {firebaseAppConfig, serviceAppCreds} from '../firebase-creds';
import {Observable} from 'rxjs/Observable';
import {Observer} from 'rxjs/Observer';
import * as gcloud from 'gcloud';

const adminCreds = require('./admin-creds.json');


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

  const app = gcloud.storage({
    projectId: 'civ-cc',
    keyFileName: './admin-creds.json'
  });

  return app.bucket('civ-cc.appspot.com');


}
