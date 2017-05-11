import 'zone.js/dist/zone-node';

import 'core-js/es6/reflect';
import 'core-js/es7/reflect';
import { INITIAL_CONFIG, platformServer, PlatformState } from '@angular/platform-server';
import { Comment, MeetingReportAdt } from '@civ/city-council';
import { ALL_COMMENTS, ALL_DISTRICTS, FOR_DISTRICT, REPORT_DATA } from './tokens';
import { MeetingReportModuleNgFactory } from '../ngfactory/build/report.module.ngfactory';
import { ApplicationRef, enableProdMode, NgModuleRef } from '@angular/core';
import { MeetingReportModule } from './report.module';
import 'rxjs/add/operator/filter';
import 'rxjs/add/operator/first';
const templateCache = {}; // cache for page templates
const outputCache = {};   // cache for rendered pages

export const DOC = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>ReportRenderer</title>
  <base href="/">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Work+Sans:300,400,500,600,700,800">
  <style>html, body { margin: 0; font-family: 'Work Sans', Helvetica, Arial, sans-serif; font-size: 13px; }</style>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="icon" type="image/x-icon" href="favicon.ico">
</head>
<body>
  <civ-report-root>Loading...</civ-report-root>
</body>
</html>
`;

enableProdMode();

export function renderReport(meetingId: string, reportData: MeetingReportAdt, allComments: { [id: string]: Comment[] }, forDistrict: string = ALL_DISTRICTS): Promise<string> {
  return new Promise((resolve, reject) => {
    let url = `https://civinomics.com/meeting_report/${meetingId}`;
    if (forDistrict == '') {
      forDistrict = ALL_DISTRICTS;
    }

    platformServer([
      {
        provide: INITIAL_CONFIG,
        useValue: {
          document: DOC,
          url: url
        }
      },

      {
        provide: FOR_DISTRICT,
        useValue: forDistrict
      },
      {
        provide: REPORT_DATA,
        useValue: reportData
      },
      {
        provide: ALL_COMMENTS,
        useValue: allComments
      },
    ]).bootstrapModuleFactory(MeetingReportModuleNgFactory).then((moduleRef: NgModuleRef<MeetingReportModule>) => {
      console.log('bootstrapped module');
      const state = moduleRef.injector.get(PlatformState);
      const appRef = moduleRef.injector.get(ApplicationRef);

      appRef.isStable
        .filter(val => val == true)
        .first()
        .subscribe(() => {

          /* call functions on the module before toStringing and destroying it
           moduleRef.instance.serializeState();
           */

          const html = state.renderToString();
          console.log('rendered module');

          moduleRef.destroy();

          resolve(html);

        }, err => {
          reject(err);
        });
    });
  });
}
