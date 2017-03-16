import {NgModule} from "@angular/core";
import {RouterModule, Routes} from "@angular/router";
import {SplashComponent} from "./splash/splash.component";
import {AboutComponent} from "./about/about.component";

export const APP_ROUTES: Routes = [
  {
    path: '',
    component: SplashComponent
  },
  {
    path: 'about',
    component: AboutComponent
  }
];

@NgModule({
  imports: [ RouterModule.forRoot(APP_ROUTES) ],
  exports: [ RouterModule ]
})
export class AppRoutingModule {
}
