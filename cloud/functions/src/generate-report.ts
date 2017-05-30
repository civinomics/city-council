import { renderReport } from '@civ/meeting-reports';
import { MeetingReportAdt } from '@civ/city-council';
import * as functions from 'firebase-functions';
import * as moment from 'moment';
import { getStorageBucket, initializeAdminApp } from './_internal';
import * as pdf from 'html-pdf';
import 'rxjs/add/operator/toPromise';
import 'rxjs/add/observable/of';
import { getMeetingComments } from './meeting-comments';
import { getOrComputeMeetingStats } from './meeting-stats';
import { getGroup, getMeeting } from './utils';

const cors = require('cors')({ origin: true });

const app = initializeAdminApp();
const database = app.database();

export const report = functions.https.onRequest(handle);

function handle(req, res) {
  const meetingId = req.query[ 'meetingId' ];

  if (!meetingId) {
    cors(req, res, () => {
      res.send(JSON.stringify({
        success: false,
        error: 'No meeting ID provided - please include a meetingId query param.'
      }));
    });
    return;
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

    database.ref(`internal/meeting_report/${meetingId}`).once('value', snapshot => {
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
    database.ref(`internal/meeting_report/${meetingId}`).set({
      timestamp: moment().toISOString(),
      url
    }).then(() => {
      resolve();
    }).catch(err => reject(err));
  })
}

export function createMeetingReport(meetingId: string, forDistrict?: string): Promise<string> {

  return new Promise((resolve, reject) => {

    console.info(`generating report for meeting ${meetingId}`);

    Promise.all([
      getReportData(meetingId),
      getMeetingComments(meetingId).toPromise()
    ]).then(([ reportData, comments ]) => {
      renderReport(meetingId, reportData, comments, forDistrict).then(htmlString => {

        console.log(`successfully rendered report for meeting ${meetingId}`);

        pdf.create(htmlString, {
          format: 'letter',
          orientation: 'portrait',
          timeout: 240000
        }).toStream(function (err, stream) {
          if (!!err) {
            console.error(`error in PDF generation: ${JSON.stringify(err)}`);
            reject(err);
            return;
          }

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

            });

          });


        });

      })


    });

  });

}

function getReportData(meetingId: string): Promise<MeetingReportAdt> {


  return new Promise((resolve, reject) => {
    getMeeting(meetingId, database).then(meeting => {
      Promise.all([
        getOrComputeMeetingStats(meetingId),
        getGroup(meeting.groupId, database)
      ]).then(([ stats, group ]) => {
        resolve({
          group,
          meeting,
          stats
        })
      }).catch(err => {
        reject(err);
      })
    })
  })
}


/************ TEST  *************/

/*
 handle({query:{meetingId:'id_meeting_511'}} as any, {} as any);
 */


/*

 renderReport('id_meeting_511', require('../devStats').reportData, JSON.parse(fs.readFileSync('./comments.json').toString())).then(htmlString => {

 pdf.create(htmlString, { format: 'letter', orientation: 'portrait', timeout: 180000 }).toStream(function (err, stream) {
 stream.pipe(fs.createWriteStream('testreport.pdf')).on('finish', ()=> {
 console.log('done');
 });

 });

 });
 */
