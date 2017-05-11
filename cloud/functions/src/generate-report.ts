import { renderReport } from '@civ/meeting-reports';
import { Comment } from '@civ/city-council';
import * as functions from 'firebase-functions';
import * as moment from 'moment';
import { getStorageBucket, initializeAdminApp } from './_internal';
import * as pdf from 'html-pdf';
//import {computeMeetingStats} from './meeting-stats';
import { Observable } from 'rxjs/Observable';

import 'rxjs/add/observable/of';

import { reportData } from './dev-stats';
import { getMeetingComments } from './meeting-comments';

const cors = require('cors')({ origin: true });

const app = initializeAdminApp();


export const report = functions.https.onRequest(handle);

function handle(req, res) {
  const meetingId = req.query[ 'meetingId' ];

  if (!!meetingId) {
    /*cors(req, res, () => {
     res.send(JSON.stringify({
     success: false,
     error: 'No meeting ID provided - please include a meetingId query param.'
     }));
     });
     return;*/
  }

  const forDistrict = req.query[ 'forDistrict' ];


  checkCached(meetingId).then(url => {
    if (url == null) {
      createMeetingReport(meetingId, forDistrict).then(url => {
        cacheUrl(meetingId, url).then(() => {

          cors(req, res, () => {
            res.send(JSON.stringify({
              success: true,
              fromCache: false,
              url
            }));
          })

        })
      })
    } else {
      cors(req, res, () => {
        res.send(JSON.stringify({
          success: true,
          fromCache: true,
          url
        }));
      })

    }
  });
}

function checkCached(meetingId): Promise<string | null> {
  return new Promise((resolve, reject) => {

    app.database().ref(`internal/meeting_report/${meetingId}`).once('value', snapshot => {
      if (!snapshot.exists()) {
        resolve(null);
        return;
      }

      let val = snapshot.val(),
        timestamp = moment(val.timestamp);

      if (timestamp.isSameOrAfter(moment().subtract(1, 'hour'))) {
        resolve(val.url);
      } else {
        resolve(null);
      }

    }).catch(err => reject(err));


  });
}


function cacheUrl(meetingId, url) {
  return new Promise((resolve, reject) => {
    app.database().ref(`internal/meeting_report/${meetingId}`).set({
      timestamp: moment().toISOString(),
      url
    }).then(() => {
      resolve();
    }).catch(err => reject(err));
  })
}

export function createMeetingReport(meetingId: string, forDistrict?: string): Promise<string> {

  return new Promise((resolve, reject) => {

    console.log(`generating report for meeting ${meetingId}`);

    const stats$: Observable<any> = Observable.of(reportData).take(1); //computeMeetingStats(meetingId);

    let comments$: Observable<{ [id: string]: Comment[] }> = getMeetingComments(meetingId);


    Observable.forkJoin(stats$.take(1), comments$.take(1))
      .subscribe(([ stats, comments ]) => {

        renderReport(meetingId, forDistrict, stats, comments).then(htmlString => {

          console.log(htmlString);


          pdf.create(htmlString, { format: 'letter', orientation: 'portrait' }).toStream(function (err, stream) {


            const bucket = getStorageBucket();

            const now = moment().toISOString().split('.')[ 0 ];

            const path = `meeting_reports%2f${meetingId}-${now}.pdf`;

            const file = bucket.file(path);

            const writeStream = file.createWriteStream();

            stream.pipe(writeStream).on('finish', (x) => {
              file.makePublic((err, response) => {
                if (err) {
                  reject(err);
                }

                file.getMetadata().then(resp => {
                  let metadata = resp[ 0 ];
                  resolve(metadata.mediaLink);
                }, err => {
                  reject(err);
                })

                /*              file.getSignedUrl({
                 action: 'read',
                 expires: moment().add(6, 'months').format('MM-DD-YYYY').toString()
                 }, (err, url) => {

                 if (err){
                 reject(err);
                 } else {
                 resolve(url);
                 }
                 })*/

              });

            });


          });

        })


      });


  });

}
/************ TEST  *************/

/*
 handle({query:{meetingId:'id_meeting_511'}} as any, {} as any);
 */
