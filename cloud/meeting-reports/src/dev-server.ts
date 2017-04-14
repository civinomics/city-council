import 'zone.js/dist/zone-node';
// import { AppServerModule } from './app.server';
import * as express from 'express';
import {renderModuleFactory} from '@angular/platform-server';
import {MeetingReportModuleNgFactory} from './ngfactory/src/report.module.ngfactory';
import {DOC} from './main';
import {REPORT_DATA} from './tokens';
import {reportData} from './dev-stats';

//enableProdMode();


export function ngUniversalEngine() {

  return function (filePath: string, options: { req: Request }, callback: (err: Error, html: string) => void) {
    let url: string = options.req.url;

    renderModuleFactory(MeetingReportModuleNgFactory, {
      document: DOC,
      url: options.req.url,
      extraProviders: [
        {
          provide: REPORT_DATA,
          useValue: reportData
        }
      ]
    }).then(str => {
      console.log(str);

      callback(null, str);
    });

  };
}

const server = express();

// set our angular engine as the handler for html files, so it will be used to render them.
server.engine('html', ngUniversalEngine());

// set default view directory
server.set('views', 'src');
server.set('view engine', 'html');

// handle requests for routes in the app.  ngExpressEngine does the rendering.
server.get(['/report'], (req, res) => {
  res.render('index', {req});
});


// start the server
server.listen(3200, () => {
  console.log('listening on port 3200...');
});
