import 'zone.js/dist/zone-node';

import 'core-js/es6/reflect';
import 'core-js/es7/reflect';
import { renderModuleFactory } from '@angular/platform-server';
import { MeetingReportAdt } from '@civ/city-council';
import { REPORT_DATA } from './tokens';
import { MeetingReportModuleNgFactory } from '../ngfactory/build/report.module.ngfactory';
import { reportData } from './dev-stats';
const templateCache = {}; // cache for page templates
const outputCache = {};   // cache for rendered pages

export const DOC = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>ReportRenderer</title>
  <base href="/">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Work+Sans:300,400,500,600,700,800">
  <style>html, body{ margin: 0; font-family: 'Work Sans', Helvetica, Arial, sans-serif; }</style>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="icon" type="image/x-icon" href="favicon.ico">
</head>
<body>
  <civ-report-root>Loading...</civ-report-root>
</body>
</html>
`;

export function renderReport(meetingId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    let url = `https://civinomics.com/meeting_report/${meetingId}`;

    getMeetingData(meetingId).then(data => {
      renderModuleFactory(MeetingReportModuleNgFactory, {
        document: DOC,
        url: url,
        extraProviders: [
          {
            provide: REPORT_DATA,
            useValue: data
          }
        ]
      }).then(str => {
        console.log('rendered module');
        resolve(str);
      }, err => {
        reject(err);
      });
    });
  })
}
function getMeetingData(meetingId: string): Promise<MeetingReportAdt> {
  return new Promise((resolve, reject) => {
    resolve(reportData);
  });
}
