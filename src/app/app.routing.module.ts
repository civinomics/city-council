import {NgModule} from "@angular/core";
import {RouterModule, Routes} from "@angular/router";
import {SplashComponent} from "./splash/splash.component";

export const APP_ROUTES: Routes = [
  {
    path: '',
    component: SplashComponent
  }
];

@NgModule({
  imports: [ RouterModule.forRoot(APP_ROUTES) ],
  exports: [ RouterModule ]
})
export class AppRoutingModule {
}
