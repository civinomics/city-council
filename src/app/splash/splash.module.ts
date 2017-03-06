import {NgModule} from "@angular/core";
import {SharedModule} from "../shared/shared.module";
import {SplashComponent} from "./splash.component";

@NgModule({
  imports: [
    SharedModule
  ],
  declarations: [ SplashComponent ]
})
export class SplashModule {

}
