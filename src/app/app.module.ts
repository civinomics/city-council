import {BrowserModule} from "@angular/platform-browser";
import {NgModule} from "@angular/core";

import {AppComponent} from "./app.component";
import {SplashModule} from "./splash/splash.module";
import {AppRoutingModule} from "./app.routing.module";
import {SharedModule} from "./shared/shared.module";
import { AboutComponent } from './about/about.component';
import { CareersComponent } from './careers/careers.component';

@NgModule({
  declarations: [
    AppComponent,
    AboutComponent,
    CareersComponent
  ],
  imports: [
    BrowserModule,
    SharedModule,

    AppRoutingModule,

    SplashModule


  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
