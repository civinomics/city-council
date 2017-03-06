import {BrowserModule} from "@angular/platform-browser";
import {NgModule} from "@angular/core";

import {AppComponent} from "./app.component";
import {SplashModule} from "./splash/splash.module";
import {AppRoutingModule} from "./app.routing.module";
import {SharedModule} from "./shared/shared.module";

@NgModule({
  declarations: [
    AppComponent
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
