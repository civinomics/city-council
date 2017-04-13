import 'zone.js/dist/zone-node';

import 'core-js/es6/reflect';
import 'core-js/es7/reflect';
import {renderModuleFactory} from '@angular/platform-server';
import {MeetingStatsAdt} from '@civ/city-council/dist/app/models';
import {Observable} from 'rxjs/Observable';
import {Observer} from 'rxjs/Observer';
import {MEETING_STATS} from './tokens';
import {MeetingReportModuleNgFactory} from './ngfactory/src/report.module.ngfactory';

const templateCache = {}; // cache for page templates
const outputCache = {};   // cache for rendered pages

export const DOC = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>ReportRenderer</title>
  <base href="/">

  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="icon" type="image/x-icon" href="favicon.ico">
</head>
<body>
  <civ-report-root>Loading...</civ-report-root>
</body>
</html>
`;

export function renderReport(meetingId: string, data: MeetingStatsAdt): Observable<string> {
  return Observable.create((observer: Observer<string>) => {
    let url = `https://civinomics.com/meeting_report/${meetingId}`;

    renderModuleFactory(MeetingReportModuleNgFactory, {
      document: DOC,
      url: url,
      extraProviders: [
        {
          provide: MEETING_STATS,
          useValue: data
        }
      ]
    }).then(str => {
      observer.next(str);
      observer.complete();
    }, err => {
      observer.error(err);
    });
  });
}
