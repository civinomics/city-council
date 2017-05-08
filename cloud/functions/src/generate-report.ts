import { renderReport } from '@civ/meeting-reports';
import * as functions from 'firebase-functions';
import * as moment from 'moment';
import { getStorageBucket } from './_internal';
import * as pdf from 'html-pdf';
//import {computeMeetingStats} from './meeting-stats';
import { Observable } from 'rxjs/Observable';

import 'rxjs/add/observable/of';

import { reportData } from './dev-stats';


export const report = functions.https.onRequest((request, response) => {
  doRender(request, response);
});

export function doRender(req, response) {


  const meetingId = req.query[ 'meetingId' ] || 'test';

  console.log(`generating report for meeting ${meetingId}`);

  const stats$: Observable<any> = Observable.of(reportData); //computeMeetingStats(meetingId);


  stats$.subscribe(stats => {

    renderReport(meetingId).then(htmlString => {

      console.log(htmlString);

      /*            pdf.create(htmlString, {format:"letter", orientation: "portrait"}).toFile('test.pdf', function(err, file){
       console.log('wrote it');
       console.log(file)
       });
       */


      pdf.create(htmlString, { format: 'letter', orientation: 'portrait' }).toStream(function (err, stream) {

        /*              response.setHeader('Content-Type', 'application/pdf');
         response.setHeader('Content-Disposition', `attachment; filename=${meetingId.pdf}`);

         */

        const bucket = getStorageBucket();

        const now = moment().toISOString().split('.')[ 0 ];

        const path = `meeting_reports/${meetingId}-${now}.pdf`;

        const file = bucket.file(path);

        const writeStream = file.createWriteStream();


        stream.pipe(writeStream).on('finish', (x) => {
          file.makePublic((err, response) => {
            let xx = 3;

            file.getSignedUrl(url => {
              let yy = 4;
            })

          });

        });


        console.log(`https://firebasestorage.googleapis.com/v0/b/civ-cc.appspot.com/o/${path}?alt=media`)
        ;
        /*  response.send(JSON.stringify({
         success: true,
         filePath: `https://firebasestorage.googleapis.com/v0/b/civ-cc.appspot.com/o/${path}?alt=media`
         }));*/


      });

    })


  })

}
