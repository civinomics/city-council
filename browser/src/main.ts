import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { CivBrowserModule } from './app/app.module';
import { environment } from './environments/environment';

function startApp() {

}

if (environment.production) {
  enableProdMode();

}
platformBrowserDynamic().bootstrapModule(CivBrowserModule);
